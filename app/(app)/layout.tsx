import { requireAdmin } from "@/lib/auth";
import Header from "@/components/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen bg-nexa-gray dark:bg-slate-900">
      <Header profile={profile} />
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
