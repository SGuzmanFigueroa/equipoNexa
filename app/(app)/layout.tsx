import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  let isLeader = false;
  if (profile.role !== "admin") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("team_members")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("is_leader", true)
      .maybeSingle();
    isLeader = Boolean(data);
  }

  return (
    <div className="min-h-screen bg-nexa-gray dark:bg-slate-900">
      <Header profile={profile} isLeader={isLeader} />
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
