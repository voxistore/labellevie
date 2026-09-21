import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAdminSession } from './auth'

const links = [['Visão geral', '/admin'], ['Produtos', '/admin/produtos'], ['Coleções', '/admin/colecoes'], ['Categorias', '/admin/categorias'], ['Instagram', '/admin/instagram']]
export default function AdminLayout() {
  const user = useAdminSession(); const navigate = useNavigate()
  async function logout() { await supabase.auth.signOut(); navigate('/admin/login') }
  return <div className="admin-shell"><aside className="admin-sidebar"><a href="/" className="admin-logo"><img src="/logo.png.png" alt="La Belle Vie" onError={(e) => { e.currentTarget.style.display = 'none' }} /><span>LA BELLE VIE</span></a><p className="admin-caption">Administração</p><nav>{links.map(([label, to]) => <NavLink key={to} to={to} end={to === '/admin'}>{label}</NavLink>)}</nav><div className="admin-user"><span>{user?.email}</span><button onClick={logout}>Sair da conta</button></div></aside><div className="admin-main"><header className="admin-topbar"><a href="/" className="back-store">← Ver loja</a><span>La Belle Vie</span></header><Outlet /></div></div>
}
