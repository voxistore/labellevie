import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function ProtectedRoute({ children }) {
  const location = useLocation()
  const [state, setState] = useState({ loading: true, allowed: false })
  useEffect(() => {
    let active = true
    async function checkAccess() {
      if (!isSupabaseConfigured) return active && setState({ loading: false, allowed: false })
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return active && setState({ loading: false, allowed: false })
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') await supabase.auth.signOut()
      if (active) setState({ loading: false, allowed: profile?.role === 'admin' })
    }
    checkAccess()
    return () => { active = false }
  }, [])
  if (state.loading) return <div className="admin-loading">Verificando acesso…</div>
  return state.allowed ? children : <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
}

export function useAdminSession() {
  const [user, setUser] = useState(null)
  useEffect(() => { supabase?.auth.getUser().then(({ data }) => setUser(data.user ?? null)) }, [])
  return user
}
