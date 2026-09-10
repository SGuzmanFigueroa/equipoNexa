"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { decodeSlot } from "@/lib/types";

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
    .map(decodeSlot)
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => ({ member_id: member.id, ...s }));

  if (rows.length > 0) {
    await supabase.from("team_member_availability").insert(rows);
  }
}
