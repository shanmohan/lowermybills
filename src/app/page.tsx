import Link from "next/link";
import { auth, authProviders } from "@/auth";
import { GoogleSignInButton, DemoSignInButton } from "@/components/AuthButtons";

const FUTURE = ["Mortgage", "Phone & Internet", "Insurance"];

const STEPS = [
  { n: "1", t: "Upload your bill", d: "PDF or a clear photo. It never leaves your session." },
  { n: "2", t: "AI reads & compares", d: "We extract your usage and compare it across retailers." },
  { n: "3", t: "See your savings", d: "Get a clear verdict, better plans, and ways to use less." },
];

export default async function Home() {
  const session = await auth();

  return (
    <div className="app-bg min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
        <header className="flex items-center justify-between py-5">
          <div className="text-lg font-bold tracking-tight text-slate-900">
            Lower<span className="text-blue-600">My</span>Bills
          </div>
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Go to dashboard
            </Link>
          ) : null}
        </header>

        <section className="mt-12 flex flex-col items-center text-center sm:mt-20">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            AI-powered · Australian electricity &amp; gas
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Stop overpaying for energy.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Upload your latest electricity or gas bill. Our AI reads it, compares it against
            Australian retailers, and shows you exactly where you&apos;re overpaying — plus better
            plans and ways to lower your usage.
          </p>

          <div className="mt-10 w-full max-w-sm">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="block rounded-lg bg-blue-600 px-8 py-4 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Upload your bill →
              </Link>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Get started — it&apos;s free</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {authProviders.google ? <GoogleSignInButton /> : null}
                  {authProviders.google && authProviders.demo ? (
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="h-px flex-1 bg-slate-200" />
                      or
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                  ) : null}
                  {authProviders.demo ? <DemoSignInButton /> : null}
                </div>
                {!authProviders.google && (
                  <p className="mt-4 text-xs text-slate-400">
                    Google sign-in isn&apos;t configured yet — use the demo to try it now.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mt-24 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Coming soon
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {FUTURE.map((f) => (
              <span
                key={f}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600"
              >
                {f}
              </span>
            ))}
          </div>
        </section>

        <footer className="mt-auto border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          LowerMyBills gives general information only, based on indicative plan data. Always confirm
          current rates with the retailer before switching. Not financial advice.
        </footer>
      </main>
    </div>
  );
}
