import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AnalysisResultSchema, type AnalysisResponse } from "@/lib/schema";
import electricityData from "@/data/electricity-plans.json";
import gasData from "@/data/gas-plans.json";

export type Category = "electricity" | "gas";
export const CATEGORIES: Category[] = ["electricity", "gas"];

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

type CataloguePlan = { id: string; retailer: string; website: string };

interface CategoryConfig {
  label: string;
  unit: string; // kWh | MJ
  rateFieldName: string; // usageRateCentsPerKwh | usageRateCentsPerMJ
  data: unknown; // full catalogue JSON passed to the model
  plans: CataloguePlan[];
}

const CONFIG: Record<Category, CategoryConfig> = {
  electricity: {
    label: "electricity",
    unit: "kWh",
    rateFieldName: "usageRateCentsPerKwh",
    data: electricityData,
    plans: electricityData.plans as CataloguePlan[],
  },
  gas: {
    label: "gas",
    unit: "MJ",
    rateFieldName: "usageRateCentsPerMJ",
    data: gasData,
    plans: gasData.plans as CataloguePlan[],
  },
};

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  }
  if (!_client) _client = new Anthropic();
  return _client;
}

function resolveSignupUrl(category: Category, planId: string | null, retailer: string): string | null {
  const plans = CONFIG[category].plans;
  if (planId) {
    const byId = plans.find((p) => p.id === planId);
    if (byId) return byId.website;
  }
  const key = retailer?.toLowerCase?.() ?? "";
  const byRetailer = plans.find((p) => p.retailer.toLowerCase() === key);
  return byRetailer?.website ?? null;
}

function buildSystemPrompt(category: Category): string {
  const { label, unit, rateFieldName, data } = CONFIG[category];

  const feedInTerm =
    category === "electricity"
      ? "\n                      - feedInTariffCentsPerKwh × annual exported kWh (only if the household has solar; if exported kWh is unknown, ignore feed-in or state the assumption)"
      : "";

  const solarRule =
    category === "electricity"
      ? `- If the household has solar, factor in the feed-in tariff and self-consumption. Set hasSolar and feedInTariffCentsPerKwh accordingly.`
      : `- Gas has no solar or feed-in. ALWAYS set hasSolar and feedInTariffCentsPerKwh to null.`;

  const optimisationExamples =
    category === "electricity"
      ? "shift dishwasher/laundry/pool pump/EV charging to off-peak or solar hours, increase solar self-consumption, switch to time-of-use if usage is shiftable, check concession/rebate eligibility, reduce standby and heating/cooling load"
      : "improve hot-water and space-heating efficiency, service or upgrade old gas appliances, reduce heating losses (draughts, insulation, thermostat setpoints), consider efficient reverse-cycle electric alternatives for heating, check concession/rebate eligibility";

  return `You are an expert Australian energy bill analyst for "LowerMyBills".

You are analysing a ${label.toUpperCase()} bill. ${label === "gas" ? "Gas consumption is billed in megajoules (MJ)." : "Electricity consumption is billed in kilowatt-hours (kWh)."}

Your job: read the customer's ${label} bill, tell them plainly whether they're overpaying,
recommend better ${label} plans from the provided catalogue, and show them where their usage
pattern is costing them and how to optimise it — all tailored to THIS household.

How to work:
1. Extract the key facts from the bill (retailer, plan, state, billing period, total amount,
   total ${unit} used, average daily usage in ${unit}, usage rate c/${unit}, daily supply charge
   c/day). Set billSummary.usageUnit to "${unit}". If a value isn't visible, set it to null —
   never invent figures.
2. Estimate the customer's current annual spend by extrapolating from the billing period.
3. For each candidate plan in the catalogue that serves the customer's state, estimate the
   annual cost using the customer's actual usage:
       annual cost ≈ (${rateFieldName} × annual ${unit}
                      + dailySupplyChargeCents × 365${feedInTerm}) / 100
4. Rank and return the best 2-3 plans, best-first, each with an estimated annual saving
   versus the customer's CURRENT bill, a household-specific reason it fits, key features,
   and honest considerations/trade-offs.

5. VERDICT — lead with the bottom line:
   - Set isOverpaying true if the best plan would meaningfully beat their current bill
     (roughly $60+/year). Put the annual overpayment (current annual spend minus the best
     plan's estimated annual cost) in annualOverpaymentAud.
   - headline: one short, friendly sentence, e.g. "You're overpaying about $180 a year." or
     "You're already on a competitive ${label} plan."
   - explanation: 2-4 sentences saying WHY they're paying more than needed and HOW the top
     recommendation fixes it.

6. USAGE INSIGHTS — where they're going wrong. Look at the actual numbers and call out
   pattern problems that cost money (usage rate above market, high daily supply charge, high
   consumption vs a typical home), each with a title, observation, impact, and severity
   (info | watch | high). Only include insights the bill actually supports.

7. OPTIMIZATION TIPS — concrete ways to use less or pay less, each with an action, household-
   specific detail, an estimatedAnnualSavingAud (or null), and an effort level
   (low | medium | high). Examples for ${label}: ${optimisationExamples}.

Important rules:
- For every recommendation, set planId to the EXACT \`id\` value of the chosen plan from the
  catalogue. Only recommend plans that exist in the catalogue.
${solarRule}
- The catalogue rates are INDICATIVE seed data, not live market offers. Be transparent about
  this in the disclaimer and choose a "confidence" that reflects how much you could read.
- Only recommend plans available in the customer's state. If the state is unknown, say so and
  recommend broadly-available plans while noting the uncertainty.
- All currency is AUD. Keep dollar figures realistic and rounded sensibly.
- Be encouraging, specific, and clear, but never overstate certainty or invent numbers.

The ${label} plan catalogue (JSON) you must compare against:
${JSON.stringify(data)}`;
}

export interface BillInput {
  /** base64-encoded file contents (no data: prefix) */
  base64: string;
  /** mime type, e.g. application/pdf or image/png */
  mediaType: string;
}

export async function analyzeBill(
  bill: BillInput,
  category: Category = "electricity",
): Promise<AnalysisResponse> {
  const isPdf = bill.mediaType === "application/pdf";

  const documentBlock = isPdf
    ? ({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: bill.base64,
        },
      } as const)
    : ({
        type: "image",
        source: {
          type: "base64",
          media_type: bill.mediaType as
            | "image/png"
            | "image/jpeg"
            | "image/gif"
            | "image/webp",
          data: bill.base64,
        },
      } as const);

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(category),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          documentBlock,
          {
            type: "text",
            text: `Analyse this ${CONFIG[category].label} bill and recommend the best plans for this household.`,
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(AnalysisResultSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("The analysis could not be completed. Please try a clearer copy of the bill.");
  }

  const result = response.parsed_output;
  return {
    ...result,
    recommendations: result.recommendations.map((r) => ({
      ...r,
      signupUrl: resolveSignupUrl(category, r.planId, r.retailer),
    })),
  };
}
