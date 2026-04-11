import { supabase } from './supabase';

export async function saveScore({
  name,
  employeeCode,
  department,
  score,
  mode,
}: {
  name: string;
  employeeCode: string;
  department: string;
  score: number;
  mode: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: existingError } = await supabase
    .from('daily_scores')
    .select('*')
    .eq('employee_code', employeeCode)
    .eq('score_date', today)
    .eq('mode', mode)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (score > Number(existing.score || 0)) {
      const { error } = await supabase
        .from('daily_scores')
        .update({
          name,
          department,
          score,
        })
        .eq('id', existing.id);

      if (error) throw error;
    }
    return;
  }

  const { error } = await supabase.from('daily_scores').insert({
    name,
    employee_code: employeeCode || null,
    department,
    score,
    mode,
    score_date: today,
  });

  if (error) throw error;
}