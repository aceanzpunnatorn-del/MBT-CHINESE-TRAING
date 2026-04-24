import 'server-only';

import { supabase, throwIfSupabaseError } from './supabase';
import type { AppUser } from '@/types/app';

function normalizeIdentityValue(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function getUserBySessionIdentity(input: {
  id: string;
  employeeCode: string;
}): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', input.id)
    .eq('employee_code', input.employeeCode)
    .maybeSingle();

  throwIfSupabaseError(error, 'Unable to verify active session');
  return (data as AppUser | null) ?? null;
}

export async function updateUserProfile(input: {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
}): Promise<AppUser> {
  const name = input.name.trim();
  const department = input.department.trim();

  if (!name || !department) {
    throw new Error('Name and Department are required.');
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      name,
      department,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('employee_code', input.employeeCode)
    .select('*')
    .single();

  throwIfSupabaseError(error, 'Unable to update learner profile');
  return data as AppUser;
}

export async function signInOrCreateUser(input: {
  employeeCode: string;
  name: string;
  department: string;
}): Promise<AppUser> {
  const employeeCode = input.employeeCode.trim();
  const name = input.name.trim();
  const department = input.department.trim();

  if (!employeeCode || !name || !department) {
    throw new Error('Employee ID, Name, and Department are required.');
  }

  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('employee_code', employeeCode)
    .maybeSingle();

  throwIfSupabaseError(findError, 'Unable to load user record');

  const loginPayload = {
    last_login_at: new Date().toISOString(),
  };

  if (existingUser) {
    const storedName = normalizeIdentityValue(existingUser.name);
    const incomingName = normalizeIdentityValue(name);

    if (storedName && incomingName && storedName !== incomingName) {
      throw new Error('Employee ID does not match the registered learner name.');
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(loginPayload)
      .eq('id', existingUser.id)
      .select('*')
      .single();

    throwIfSupabaseError(updateError, 'Unable to update user login');
    return updatedUser as AppUser;
  }

  const { data: createdUser, error: insertError } = await supabase
    .from('users')
    .insert({
      employee_code: employeeCode,
      name,
      department,
      ...loginPayload,
    })
    .select('*')
    .single();

  throwIfSupabaseError(insertError, 'Unable to create user');

  return createdUser as AppUser;
}
