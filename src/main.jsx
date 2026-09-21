import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import './admin/admin.css'
import './store/cart.css'
import App from './App.jsx'
import AdminLayout from './admin/AdminLayout.jsx'
import AdminLogin from './admin/AdminLogin.jsx'
import Dashboard from './admin/Dashboard.jsx'
import Products from './admin/Products.jsx'
import CatalogSettings from './admin/CatalogSettings.jsx'
import InstagramPosts from './admin/InstagramPosts.jsx'
import { ProtectedRoute } from './admin/auth.jsx'
import { CartProvider } from './store/cart.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode><CartProvider><BrowserRouter><Routes>
    <Route path="/" element={<App />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="produtos" element={<Products />} />
      <Route path="colecoes" element={<CatalogSettings type="collections" />} />
      <Route path="categorias" element={<CatalogSettings type="categories" />} />
      <Route path="instagram" element={<InstagramPosts />} />
    </Route>
  </Routes></BrowserRouter></CartProvider></StrictMode>,
)
