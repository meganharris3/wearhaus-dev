import { supabase } from '../lib/supabase';
import type { CampusInfo } from '../data/campusDomains';

export async function joinCampusCloset(campusInfo: CampusInfo, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('hauses')
    .select('id')
    .eq('campus_id', campusInfo.id)
    .eq('haus_type', 'campus')
    .limit(1);

  let hausId: string;

  if (existing && existing.length > 0) {
    hausId = existing[0].id;
  } else {
    const { data: newHaus, error } = await supabase
      .from('hauses')
      .insert({
        name: `${campusInfo.name} Closet`,
        haus_type: 'campus',
        campus_id: campusInfo.id,
        is_system_owned: true,
        // member_count/piece_count intentionally omitted — trg_haus_member_count
        // (supabase/migrations/001_initial_schema.sql) owns member_count from its
        // column default of 0, incrementing it when the membership row below is
        // inserted. Setting it here would double-count, same bug as hausService.ts's
        // createHaus (see supabase/migrations/010_fix_member_count_trigger.sql).
        description: `The official campus closet for ${campusInfo.name} students.`,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    hausId = newHaus.id;
  }

  const { error: memberError } = await supabase
    .from('haus_memberships')
    .upsert({ user_id: userId, haus_id: hausId, role: 'member' });
  if (memberError) throw new Error(memberError.message);

  return hausId;
}

export async function getCampusClosetStats(campusId: string): Promise<{ memberCount: number; activeLenders: number; itemCount: number }> {
  const { data } = await supabase
    .from('hauses')
    .select('member_count')
    .eq('campus_id', campusId)
    .eq('haus_type', 'campus')
    .limit(1);

  const memberCount = data?.[0]?.member_count ?? 0;
  const activeLenders = Math.max(1, Math.round(memberCount * 0.4));
  const itemCount = memberCount * 3;

  return { memberCount, activeLenders, itemCount };
}

export async function updateUserCampus(userId: string, campusInfo: CampusInfo, schoolEmail: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      campus_verified: true,
      campus_id: campusInfo.id,
      campus_name: campusInfo.name,
      school_email: schoolEmail,
    })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function sendCampusOtp(userId: string, schoolEmail: string): Promise<void> {
  const { error } = await supabase.rpc('send_campus_otp', {
    p_user_id: userId,
    p_school_email: schoolEmail,
  });
  if (error) throw new Error(error.message);
}

export async function verifyCampusOtp(userId: string, schoolEmail: string, code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_campus_otp', {
    p_user_id: userId,
    p_school_email: schoolEmail,
    p_code: code,
  });
  if (error) throw new Error(error.message);
  return !!data;
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ onboarding_complete: true })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}
