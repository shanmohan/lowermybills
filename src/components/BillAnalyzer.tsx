"use client";

import { useRef, useState } from "react";
import type { AnalysisResponse } from "@/lib/schema";

type Status = "idle" | "uploading" | "done" | "error";
type Category = "electricity" | "gas";

const aud = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export function BillAnalyzer() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("electricity");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError(null);
    setResult(null);
    setFileName(file.name);

    const body = new FormData();
    body.append("file", file);
    body.append("category", category);

    try {
      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setResult(data.result as AnalysisResponse);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setError(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Which bill are you uploading?</p>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(["electricity", "gas"] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              disabled={status === "uploading"}
              className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition disabled:cursor-not-allowed ${
                category === c
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center"
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={onSelect}
          className="hidden"
        />
        <svg
          className="mx-auto h-10 w-10 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="mt-3 text-slate-600">Drag &amp; drop your bill here, or</p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading"}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "uploading" ? "Analysing…" : "Choose a file"}
        </button>
        <p className="mt-3 text-xs text-slate-400">PDF, PNG, JPG or WEBP · up to 10 MB</p>
        {fileName && status !== "idle" ? (
          <p className="mt-4 text-sm text-slate-500">
            {status === "uploading" ? "Reading " : "Analysed: "}
            <span className="font-medium text-slate-700">{fileName}</span>
          </p>
        ) : null}
      </div>

      {status === "uploading" ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-600 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Reading your bill and comparing plans… this takes ~20–40 seconds.
        </div>
      ) : null}

      {status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      {status === "done" && result ? (
        <>
          <Results result={result} />
          <div>
            <button
              onClick={reset}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Analyse another bill
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Results({ result }: { result: AnalysisResponse }) {
  const b = result.billSummary;
  const v = result.verdict;
  const overpaying = v.isOverpaying;

  return (
    <div className="flex flex-col gap-6">
      {/* Verdict banner */}
      <section
        className={`rounded-2xl border p-6 ${
          overpaying ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
              overpaying ? "bg-amber-500" : "bg-emerald-600"
            }`}
          >
            {overpaying ? "!" : "✓"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{v.headline}</h2>
            {overpaying && v.annualOverpaymentAud != null ? (
              <p className="mt-1 text-sm font-medium text-amber-800">
                Estimated overpayment: {aud(v.annualOverpaymentAud)} per year
              </p>
            ) : null}
            <p className="mt-2 text-slate-700">{v.explanation}</p>
          </div>
        </div>
      </section>

      {/* Bill summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">What we read from your bill</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs capitalize text-slate-500">
            {result.confidence} confidence
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <Fact label="Retailer" value={b.retailer ?? "—"} />
          <Fact label="Plan" value={b.planName ?? "—"} />
          <Fact label="State" value={b.state ?? "—"} />
          <Fact label="Billing period" value={b.billingPeriodDays ? `${b.billingPeriodDays} days` : "—"} />
          <Fact label="Bill total" value={aud(b.totalAmountAud)} />
          <Fact label="Usage" value={b.usageQuantity != null ? `${b.usageQuantity} ${b.usageUnit}` : "—"} />
          <Fact label="Avg daily use" value={b.averageDailyUsage != null ? `${b.averageDailyUsage} ${b.usageUnit}/day` : "—"} />
          <Fact label="Usage rate" value={b.usageRateCentsPerUnit != null ? `${b.usageRateCentsPerUnit} c/${b.usageUnit}` : "—"} />
          <Fact label="Supply charge" value={b.dailySupplyChargeCents != null ? `${b.dailySupplyChargeCents} c/day` : "—"} />
          {b.hasSolar != null ? (
            <Fact label="Solar" value={b.hasSolar ? "Yes" : "No"} />
          ) : null}
        </dl>
        {result.estimatedCurrentAnnualSpendAud != null ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            Estimated current annual spend:{" "}
            <span className="font-semibold text-slate-900">
              {aud(result.estimatedCurrentAnnualSpendAud)}
            </span>
          </p>
        ) : null}
        {b.notes ? <p className="mt-2 text-xs text-slate-400">{b.notes}</p> : null}
      </section>

      {/* Recommendations */}
      {result.recommendations.length ? (
        <section>
          <h2 className="text-base font-semibold text-slate-900">
            Better plans for your household
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {result.recommendations.map((r, i) => (
              <div
                key={`${r.retailer}-${r.planName}-${i}`}
                className={`rounded-2xl border bg-white p-6 shadow-sm ${
                  i === 0 ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {i === 0 ? (
                      <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                        Best match
                      </span>
                    ) : null}
                    <h3 className="text-lg font-semibold text-slate-900">
                      {r.retailer} — {r.planName}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Est. annual cost</div>
                    <div className="text-xl font-bold text-slate-900">
                      {aud(r.estimatedAnnualCostAud)}
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        r.estimatedAnnualSavingAud >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {r.estimatedAnnualSavingAud >= 0 ? "Save " : "Costs "}
                      {aud(Math.abs(r.estimatedAnnualSavingAud))}/yr
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-600">{r.whyItFits}</p>

                {r.keyFeatures.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {r.keyFeatures.map((f, j) => (
                      <li
                        key={j}
                        className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {r.considerations.length ? (
                  <p className="mt-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Watch out: </span>
                    {r.considerations.join(" · ")}
                  </p>
                ) : null}

                {r.signupUrl ? (
                  <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <a
                      href={r.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition ${
                        i === 0
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border border-blue-600 text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      Go to {r.retailer}
                      <span aria-hidden="true">↗</span>
                    </a>
                    <span className="text-xs text-slate-400">Sign up on the retailer&apos;s site</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Usage insights — where you're going wrong */}
      {result.usageInsights.length ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Where your usage is costing you
          </h2>
          <div className="mt-4 flex flex-col divide-y divide-slate-100">
            {result.usageInsights.map((u, i) => (
              <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <SeverityDot severity={u.severity} />
                <div>
                  <p className="font-medium text-slate-900">{u.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{u.observation}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{u.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Optimization tips */}
      {result.optimizationTips.length ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Ways to optimise your usage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {result.optimizationTips.map((t, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{t.action}</p>
                  <EffortBadge effort={t.effort} />
                </div>
                <p className="mt-1 text-sm text-slate-600">{t.detail}</p>
                {t.estimatedAnnualSavingAud != null ? (
                  <p className="mt-2 text-sm font-semibold text-emerald-600">
                    ~{aud(t.estimatedAnnualSavingAud)}/yr potential saving
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-xs text-slate-400">{result.disclaimer}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function SeverityDot({ severity }: { severity: "info" | "watch" | "high" }) {
  const color =
    severity === "high" ? "bg-red-500" : severity === "watch" ? "bg-amber-500" : "bg-slate-400";
  return <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />;
}

function EffortBadge({ effort }: { effort: "low" | "medium" | "high" }) {
  const map = {
    low: "bg-emerald-50 text-emerald-700",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-slate-100 text-slate-600",
  } as const;
  return (
    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${map[effort]}`}>
      {effort} effort
    </span>
  );
}
