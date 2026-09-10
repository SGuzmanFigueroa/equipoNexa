"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function saveMyAvailability(slots: string[]) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!member) return;

  await supabase.from("team_member_availability").delete().eq("member_id", member.id);

  const rows = slots
    .map((slot) => {
      const [dayStr, hourStr] = slot.split("-");
      const day_of_week = Number(dayStr);
      const hour = Number(hourStr);
      if (Number.isNaN(day_of_week) || Number.isNaN(hour)) return null;
      return { member_id: member.id, day_of_week, hour };
    })
    .filter((r): r is { member_id: string; day_of_week: number; hour: number } => r !== null);

  if (rows.length > 0) {
    await supabase.from("team_member_availability").insert(rows);
  }
}
