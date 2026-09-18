import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import ScheduleView from "@/components/ScheduleView";
import type { AvailabilityStatus, MemberStatus } from "@/lib/types";

// Everything the schedule needs is fetched once here (narrow columns, no
// select('*')) and handed to a client component that does all filtering,
// selection and aggregation in memory — no per-cell or per-selection
// Supabase queries.
export default async function SchedulePage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: members }, { data: availabilityRows }, { data: memberProjects }, { data: projects }] =
    await Promise.all([
      supabase.from("team_members").select("id, full_name, status").order("full_name"),
      supabase.from("team_member_availability").select("member_id, day_of_week, hour, status"),
      supabase.from("team_member_projects").select("member_id, project:projects(code)"),
      supabase.from("projects").select("code, name").order("name"),
    ]);

  const idsWithSchedule = new Set((availabilityRows ?? []).map((a) => a.member_id));

  const projectCodesByMember = new Map<string, string[]>();
  for (const mp of memberProjects ?? []) {
    const code = (mp.project as unknown as { code: string } | null)?.code;
    if (!code) continue;
    const list = projectCodesByMember.get(mp.member_id) ?? [];
    list.push(code);
    projectCodesByMember.set(mp.member_id, list);
  }

  const scheduleMembers = (members ?? []).map((m) => ({
    id: m.id as string,
    full_name: m.full_name as string,
    status: m.status as MemberStatus,
    hasSchedule: idsWithSchedule.has(m.id),
    projectCodes: projectCodesByMember.get(m.id) ?? [],
  }));

  const availability = (availabilityRows ?? []).map((a) => ({
    member_id: a.member_id as string,
    day_of_week: a.day_of_week as number,
    hour: a.hour as number,
    status: a.status as AvailabilityStatus,
  }));

  return (
    <ScheduleView
      members={scheduleMembers}
      availability={availability}
      projects={(projects ?? []) as { code: string; name: string }[]}
    />
  );
}
