import { z } from "zod";

// Structured-output schema for the LLM analysis. Optional values are modelled
// as `.nullable()` (not `.optional()`) because Anthropic structured outputs
// require every property to be present.

export const BillSummarySchema = z.object({
  retailer: z.string().nullable().describe("Current energy retailer on the bill"),
  planName: z.string().nullable().describe("Current plan/product name if shown"),
  state: z.string().nullable().describe("Australian state/territory, e.g. NSW, VIC"),
  billingPeriodDays: z.number().nullable().describe("Number of days the bill covers"),
  totalAmountAud: z.number().nullable().describe("Total amount due on this bill in AUD"),
  usageUnit: z
    .string()
    .describe("The consumption unit shown on the bill: 'kWh' for electricity, 'MJ' for gas"),
  usageQuantity: z.number().nullable().describe("Total energy used this period, in usageUnit"),
  averageDailyUsage: z.number().nullable().describe("Average daily usage, in usageUnit per day"),
  usageRateCentsPerUnit: z.number().nullable().describe("Usage/consumption rate in cents per usageUnit"),
  dailySupplyChargeCents: z.number().nullable().describe("Daily supply charge in cents per day"),
  feedInTariffCentsPerKwh: z
    .number()
    .nullable()
    .describe("Electricity only: solar feed-in tariff in c/kWh, if any. Null for gas."),
  hasSolar: z
    .boolean()
    .nullable()
    .describe("Electricity only: whether the household appears to have solar. Null for gas."),
  notes: z.string().describe("Anything notable or uncertain about what was read from the bill"),
});

export const VerdictSchema = z.object({
  isOverpaying: z
    .boolean()
    .describe("True if the customer is likely paying more than they need to vs the best plan"),
  annualOverpaymentAud: z
    .number()
    .nullable()
    .describe("Estimated amount overpaid per year vs the best recommended plan, in AUD"),
  headline: z
    .string()
    .describe("One short, plain-English sentence summarising the result, e.g. 'You're overpaying about $320 a year.'"),
  explanation: z
    .string()
    .describe("2-4 sentences: why they're paying more than needed (or why their plan is competitive) and how the top recommendation helps."),
});

export const RecommendationSchema = z.object({
  planId: z
    .string()
    .nullable()
    .describe("The exact `id` of the chosen plan from the provided catalogue, e.g. 'tango-home-select'. Null only if no catalogue plan matches."),
  retailer: z.string(),
  planName: z.string(),
  estimatedAnnualCostAud: z.number().describe("Estimated total annual cost on this plan in AUD"),
  estimatedAnnualSavingAud: z
    .number()
    .describe("Estimated annual saving vs the customer's current bill (negative if more expensive)"),
  whyItFits: z.string().describe("Plain-English reason this plan suits this specific household"),
  keyFeatures: z.array(z.string()).describe("Short bullet points of standout features"),
  considerations: z.array(z.string()).describe("Trade-offs or things to watch out for"),
});

export const UsageInsightSchema = z.object({
  title: z.string().describe("Short label for the issue, e.g. 'High daily supply charge'"),
  observation: z.string().describe("What in the usage/charges pattern is costing them more"),
  impact: z.string().describe("Why it matters and roughly what it costs them"),
  severity: z
    .enum(["info", "watch", "high"])
    .describe("How significant this issue is: info, watch, or high"),
});

export const OptimizationTipSchema = z.object({
  action: z.string().describe("A concrete action the household can take to use less / pay less"),
  detail: z.string().describe("How to do it and why it helps, specific to this household"),
  estimatedAnnualSavingAud: z
    .number()
    .nullable()
    .describe("Rough annual saving from this action in AUD, or null if not quantifiable"),
  effort: z.enum(["low", "medium", "high"]).describe("How much effort this takes"),
});

export const AnalysisResultSchema = z.object({
  verdict: VerdictSchema,
  billSummary: BillSummarySchema,
  estimatedCurrentAnnualSpendAud: z
    .number()
    .nullable()
    .describe("Estimated current annual spend extrapolated from this bill"),
  recommendations: z
    .array(RecommendationSchema)
    .describe("Best 2-3 alternative plans, ranked best-first"),
  usageInsights: z
    .array(UsageInsightSchema)
    .describe("Where the household's usage/charge pattern is going wrong"),
  optimizationTips: z
    .array(OptimizationTipSchema)
    .describe("Specific ways to optimise usage and lower the bill"),
  confidence: z.enum(["low", "medium", "high"]).describe("Confidence in this analysis"),
  disclaimer: z.string().describe("Honest disclaimer about indicative pricing and the need to verify"),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;

// The API response enriches each recommendation with a trusted signup link
// resolved server-side from the plan catalogue (never from the model).
export type AnalyzedRecommendation = Recommendation & {
  signupUrl: string | null;
};

export type AnalysisResponse = Omit<AnalysisResult, "recommendations"> & {
  recommendations: AnalyzedRecommendation[];
};
