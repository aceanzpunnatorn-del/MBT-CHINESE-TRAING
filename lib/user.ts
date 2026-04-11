import { supabase } from './supabase';

export async function getOrCreateUser({
  name,
  employeeCode,
  department,
}: {
  name: string;
  employeeCode: string;
  department: string;
}) {
  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('*')
    .eq('employee_code', employeeCode)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('users')
    .insert({
      name,
      employee_code: employeeCode,
      department,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}