import { supabase } from '../lib/supabase'
export const slugify = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
export async function uploadFiles(productId, files) {
  const records = []
  for (const [index, file] of Array.from(files).entries()) {
    const path = `${productId}/${Date.now()}-${index}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const { error } = await supabase.storage.from('product-media').upload(path, file)
    if (error) throw error
    records.push({ product_id: productId, storage_path: path, alt_text: file.name, sort_order: index, is_primary: index === 0 })
  }
  return records
}
export function publicImage(path) { return path ? supabase.storage.from('product-media').getPublicUrl(path).data.publicUrl : '' }
export async function uploadCategoryCover(file, categoryId) {
  const ext = file.name.split('.').pop()
  const timestamp = Date.now()
  const id = categoryId || 'new'
  const path = `categories/${id}/${timestamp}.${ext}`
  const { error } = await supabase.storage.from('product-media').upload(path, file, { upsert: true })
  if (error) throw error
  return path
}
