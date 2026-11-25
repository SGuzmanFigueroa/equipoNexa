import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { missingProfileKeys } from "@/lib/types";
import Header from "@/components/Header";
import PendingProfilePrompt from "@/components/PendingProfilePrompt";
import OffboardingScreen from "@/components/OffboardingScreen";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const isLeader = profile.role === "lider";

  // Cualquier cuenta vinculada a una ficha (integrante o líder) ve el aviso
  // de datos pendientes en toda la app hasta completarlos.
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("full_name, dni, phone, career, university, position, linkedin_url, skills, area, join_date, status")
    .eq("profile_id", profile.id)
    .maybeSingle();

  // Integrante en estado "Retirado": en lugar de la app, solo el
  // agradecimiento + encuesta de salida + certificado (nunca para un admin).
  const offboarding = member?.status === "retirado" && profile.role !== "admin";

  const missing = member && !offboarding ? missingProfileKeys(member) : [];

  return (
    <div className="min-h-screen bg-nexa-gray dark:bg-slate-900">
      <Header profile={profile} isLeader={isLeader} />
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
        {offboarding ? (
          <OffboardingScreen firstName={(member?.full_name ?? "").trim().split(/\s+/)[0] ?? ""} />
        ) : (
          <>
            {missing.length > 0 && <PendingProfilePrompt key={missing.join(",")} missing={missing} />}
            {children}
          </>
        )}
      </main>
    </div>
  );
}
