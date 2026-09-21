import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false)
  if (!isSupabaseConfigured) return <div className="login-page"><div className="login-card"><p className="admin-kicker">Configuração pendente</p><h1>Supabase não configurado</h1><p>Preencha as variáveis em <code>.env.local</code> para acessar o painel.</p></div></div>
  async function submit(event) { event.preventDefault(); setLoading(true); setMessage(''); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) { setMessage(error.message); setLoading(false); return }; const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single(); if (profile?.role !== 'admin') { await supabase.auth.signOut(); setMessage('Esta conta não tem permissão administrativa.'); setLoading(false); return }; navigate('/admin') }
  return <div className="login-page"><form className="login-card" onSubmit={submit}><a href="/" className="admin-logo"><img src="/logo.png.png" alt="La Belle Vie" /><span>LA BELLE VIE</span></a><p className="admin-kicker">Área restrita</p><h1>Bem-vinda de volta.</h1><p>Acesse a administração da sua loja.</p><label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{message && <p className="form-message error">{message}</p>}<button className="admin-button" disabled={loading}>{loading ? 'Entrando…' : 'Entrar no painel'}</button></form></div>
}
