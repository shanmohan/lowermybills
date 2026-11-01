import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/AuthButtons";
import { BillAnalyzer } from "@/components/BillAnalyzer";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="app-bg min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
            Lower<span className="text-blue-600">My</span>Bills
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Analyse your energy bill
        </h1>
        <p className="mt-2 text-slate-600">
          Pick electricity or gas, then upload a PDF or clear photo of your most recent bill.
          We&apos;ll tell you if you&apos;re overpaying, find better plans, and show you where to
          optimise.
        </p>

        <div className="mt-8">
          <BillAnalyzer />
        </div>
      </main>
    </div>
  );
}
