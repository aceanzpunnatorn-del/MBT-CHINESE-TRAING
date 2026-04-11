import { supabase } from '@/lib/supabase'

export type AppUser = {
  id: string
  employee_code: string | null
  name: string | null
  department: string | null
  created_at?: string | null
}

export async function signInOrCreateUser(params: {
  employeeCode: string
  name: string
  department: string
}) {
  const employeeCode = params.employeeCode.trim()
  const name = params.name.trim()
  const department = params.department.trim()

  if (!employeeCode || !name || !department) {
    throw new Error('Please fill in all fields.')
  }

  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('employee_code', employeeCode)
    .maybeSingle()

  if (findError) {
    console.error('find user error:', findError)
    throw new Error(findError.message || 'Unable to find user.')
  }

  if (existingUser) {
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        name,
        department,
      })
      .eq('id', existingUser.id)
      .select()
      .single()

    if (updateError) {
      console.error('update user error:', updateError)
      throw new Error(updateError.message || 'Unable to update user.')
    }

    return updatedUser as AppUser
  }

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        employee_code: employeeCode,
        name,
        department,
      },
    ])
    .select()
    .single()

  if (insertError) {
    console.error('insert user error:', insertError)
    throw new Error(insertError.message || 'Unable to create user.')
  }

  return newUser as AppUser
}

export function saveUserSession(user: AppUser) {
  if (typeof window === 'undefined') return

  localStorage.setItem(
    'midea-user-session',
    JSON.stringify({
      id: user.id,
      employeeCode: user.employee_code ?? '',
      name: user.name ?? '',
      department: user.department ?? '',
      loggedInAt: new Date().toISOString(),
    })
  )

  localStorage.setItem('midea-player-name', user.name ?? '')
  localStorage.setItem('midea-employee-code', user.employee_code ?? '')
  localStorage.setItem('midea-department', user.department ?? '')
}

export function getUserSession() {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem('midea-user-session')
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearUserSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('midea-user-session')
}