import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const blankPost = { image_url: '', instagram_url: '', caption: '', sort_order: 0, status: 'published' }

function InstagramPostEditor({ item, onClose, onSave }) {
  const [form, setForm] = useState(item ? { ...blankPost, ...item } : blankPost)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    try {
      const ext = file.name.split('.').pop()
      const fileName = `instagram/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('product-media').upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('product-media').getPublicUrl(fileName)
      if (data?.publicUrl) {
        change('image_url', data.publicUrl)
      }
    } catch (err) {
      setMessage(`Erro ao enviar imagem: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const payload = { ...form, sort_order: Number(form.sort_order || 0) }
    const query = item
      ? supabase.from('instagram_posts').update(payload).eq('id', item.id)
      : supabase.from('instagram_posts').insert(payload)
    const { error } = await query
    if (error) setMessage(error.message)
    else onSave()
    setSaving(false)
  }

  return (
    <div className="modal-backdrop">
      <form className="modal editor-modal" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <p className="admin-kicker">Conteúdo</p>
            <h2>{item ? 'Editar' : 'Novo'} post</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="editor-content">
          <section>
            <h3>Publicação do Instagram</h3>
            <div className="form-grid">
              <label>
                Foto / Imagem do Post
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ fontSize: '13px' }}
                  />
                  {uploading && <span style={{ fontSize: '12px', alignSelf: 'center' }}>Enviando...</span>}
                </div>
                <input
                  placeholder="Ou cole a URL direta da imagem (ex: https://...)"
                  value={form.image_url}
                  onChange={(event) => change('image_url', event.target.value)}
                  required
                />
                <small>Você pode fazer o upload da foto diretamente ou colar um link direto de imagem.</small>
              </label>

              {form.image_url && (
                <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Pré-visualização:</p>
                  <img
                    src={form.image_url}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.opacity = '0.4';
                    }}
                  />
                </div>
              )}

              <label>
                Link da publicação no Instagram
                <input
                  placeholder="https://instagram.com/p/..."
                  value={form.instagram_url}
                  onChange={(event) => change('instagram_url', event.target.value)}
                  required
                />
              </label>

              <label>
                Legenda / Texto alternativo
                <input
                  placeholder="Look do dia com vestido floral"
                  value={form.caption || ''}
                  onChange={(event) => change('caption', event.target.value)}
                />
              </label>

              <label>
                Ordem de exibição
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => change('sort_order', event.target.value)}
                />
                <small>Os menores números aparecem primeiro.</small>
              </label>

              <label>
                Status
                <select value={form.status} onChange={(event) => change('status', event.target.value)}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </label>
            </div>
          </section>
        </div>

        {message && <p className="form-message error">{message}</p>}

        <div className="modal-footer">
          <button type="button" className="admin-button secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-button" disabled={saving || uploading}>
            {saving ? 'Salvando…' : 'Salvar post'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function InstagramPosts() {
  const [items, setItems] = useState([])
  const [editor, setEditor] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const { data, error: queryError } = await supabase.from('instagram_posts').select('*').order('sort_order').order('created_at', { ascending: false })
    if (queryError) setError(queryError.message)
    else {
      setError('')
      setItems(data || [])
    }
  }

  useEffect(() => { load() }, [])

  async function remove(item) {
    if (!window.confirm('Excluir este post do Instagram? Esta ação não pode ser desfeita.')) return
    const { error: deleteError } = await supabase.from('instagram_posts').delete().eq('id', item.id)
    if (deleteError) setError(deleteError.message)
    else load()
  }

  const term = search.trim().toLowerCase()
  const filtered = items.filter((item) => !term || `${item.caption || ''} ${item.instagram_url}`.toLowerCase().includes(term))

  return (
    <section className="admin-page">
      <div className="page-heading">
        <div>
          <p className="admin-kicker">Conteúdo</p>
          <h1>Instagram</h1>
          <p>Escolha as publicações exibidas na página inicial do site.</p>
        </div>
        <button className="admin-button" onClick={() => setEditor({})}>+ Novo post</button>
      </div>

      {error && <p className="form-message error">{error}</p>}

      <div className="panel">
        <div className="table-toolbar">
          <input
            placeholder="Buscar por legenda ou link..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span>{filtered.length} publicação(ões)</span>
        </div>

        <div className="data-table">
          <div className="table-row head-row instagram-grid-row">
            <span>Foto</span>
            <span>Publicação</span>
            <span>Ordem</span>
            <span>Status</span>
            <span className="actions-col">Ações</span>
          </div>

          {filtered.map((item) => (
            <div className="table-row instagram-grid-row" key={item.id}>
              <span>
                <img
                  src={item.image_url}
                  alt={item.caption || 'Instagram'}
                  referrerPolicy="no-referrer"
                  style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '4px' }}
                />
              </span>
              <span>
                <strong>{item.caption || 'Sem legenda'}</strong>
                <a href={item.instagram_url} target="_blank" rel="noreferrer">Abrir publicação ↗</a>
              </span>
              <span>{item.sort_order}</span>
              <span className={`status ${item.status}`}>{item.status}</span>
              <span className="row-actions">
                <button onClick={() => setEditor(item)}>Editar</button>
                <button className="danger" onClick={() => remove(item)}>Excluir</button>
              </span>
            </div>
          ))}

          {!filtered.length && (
            <div className="empty-state">
              Nenhum post encontrado. Cadastre uma publicação para exibi-la na loja.
            </div>
          )}
        </div>
      </div>

      {editor && (
        <InstagramPostEditor
          item={editor.id ? editor : null}
          onClose={() => setEditor(null)}
          onSave={() => { setEditor(null); load() }}
        />
      )}
    </section>
  )
}
