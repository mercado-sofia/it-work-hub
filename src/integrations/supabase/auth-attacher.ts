import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'
import { hasSupabaseBrowserConfig } from './env'

// Optional: this app signs IT users in with cookies, not Supabase Auth.
// Skip when Cloud client keys are absent so public/IT server functions still run.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    if (!hasSupabaseBrowserConfig()) {
      return next()
    }
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
