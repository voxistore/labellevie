import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { money, publicImage, slugify, uploadFiles } from './helpers'

const blankProduct = {
  name: '',
  sku: '',
  description: '',
  category_id: '',
  collection_ids: [],
  brand: 'La Belle Vie',
  status: 'draft',
  is_featured: false,
  is_new: false,
  price: '',
  sale_price: '',
  material: '',
  care_instructions: '',
  fit: '',
  notes: '',
  availability_note: '',
}

const measureFields = [
  ['bust', 'Busto'],
  ['waist', 'Cintura'],
  ['hips', 'Quadril'],
  ['length', 'Comprimento'],
  ['sleeve_length', 'Manga'],
  ['shoulder', 'Ombro'],
  ['hem', 'Barra'],
  ['rise', 'Gancho'],
  ['inseam', 'Entrepernas'],
  ['other', 'Outras'],
]

function ProductEditor({ item, categories, collections, onClose, onSave }) {
  const [form, setForm] = useState(
    item
      ? {
          ...blankProduct,
          ...item,
          category_id: item.category_id || '',
          collection_ids: item.product_collections?.map((x) => x.collection_id) || [],
        }
      : blankProduct
  )
  const [variants, setVariants] = useState(item?.product_variants || [{ size: '', color: '', stock: 0, sku: '' }])
  const [measurements, setMeasurements] = useState(
    item?.product_measurements?.map((row) => ({ size_label: row.size_label, ...row.measurements })) || [{ size_label: 'Único' }]
  )
  const [existingImages, setExistingImages] = useState(item?.product_images || [])
  const [files, setFiles] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const modifyRow = (setRows, index, key, value) =>
    setRows((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)))

  async function handleDeleteExistingImage(imageId) {
    if (!window.confirm('Remover esta foto do produto?')) return
    try {
      const { error } = await supabase.from('product_images').delete().eq('id', imageId)
      if (error) throw error
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (err) {
      alert(`Erro ao excluir imagem: ${err.message}`)
    }
  }

  async function handleSetPrimaryImage(imageId) {
    try {
      if (!item?.id) return
      // Set all images of this product to is_primary = false
      await supabase.from('product_images').update({ is_primary: false }).eq('product_id', item.id)
      // Set chosen one to true
      await supabase.from('product_images').update({ is_primary: true }).eq('id', imageId)
      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        }))
      )
    } catch (err) {
      alert(`Erro ao definir imagem principal: ${err.message}`)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const payload = {
      ...form,
      slug: form.slug || slugify(form.name),
      category_id: form.category_id || null,
      price: Number(form.price),
      sale_price: form.sale_price === '' ? null : Number(form.sale_price),
    }

    delete payload.collection_ids
    delete payload.product_collections
    delete payload.product_variants
    delete payload.product_measurements
    delete payload.product_images

    let result = item
      ? await supabase.from('products').update(payload).eq('id', item.id).select().single()
      : await supabase.from('products').insert(payload).select().single()

    if (result.error) {
      setMessage(result.error.message)
      setSaving(false)
      return
    }

    const id = result.data.id

    // Collections
    await supabase.from('product_collections').delete().eq('product_id', id)
    if (form.collection_ids.length) {
      await supabase.from('product_collections').insert(
        form.collection_ids.map((collection_id) => ({ product_id: id, collection_id }))
      )
    }

    // Variants
    await supabase.from('product_variants').delete().eq('product_id', id)
    const validVariants = variants.filter((row) => row.size || row.color)
    if (validVariants.length) {
      await supabase.from('product_variants').insert(
        validVariants.map((row) => ({
          ...row,
          product_id: id,
          stock: Number(row.stock || 0),
          sku: row.sku || null,
          size: row.size || null,
          color: row.color || null,
        }))
      )
    }

    // Measurements
    await supabase.from('product_measurements').delete().eq('product_id', id)
    const validMeasures = measurements.filter((row) => row.size_label)
    if (validMeasures.length) {
      await supabase.from('product_measurements').insert(
        validMeasures.map(({ size_label, ...measurements }, sort_order) => ({
          product_id: id,
          size_label,
          measurements,
          sort_order,
        }))
      )
    }

    // Files / Images upload
    if (files?.length) {
      try {
        const records = await uploadFiles(id, files)
        // If there were already existing images, new ones shouldn't necessarily override primary unless there were none
        const hasExisting = existingImages.length > 0
        const formattedRecords = records.map((rec, idx) => ({
          ...rec,
          is_primary: hasExisting ? false : idx === 0,
        }))
        await supabase.from('product_images').insert(formattedRecords)
      } catch (error) {
        setMessage(`Produto salvo, mas houve erro no envio das imagens: ${error.message}`)
        setSaving(false)
        return
      }
    }

    onSave()
  }

  return (
    <div className="modal-backdrop">
      <form className="modal product-editor" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <p className="admin-kicker">Catálogo</p>
            <h2>{item ? 'Editar produto' : 'Novo produto'}</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-content">
          <section>
            <h3>Informações básicas</h3>
            <div className="form-grid">
              <label className="full">
                Nome do produto
                <input value={form.name} onChange={(e) => change('name', e.target.value)} required />
              </label>
              <label>
                SKU
                <input value={form.sku} onChange={(e) => change('sku', e.target.value)} required />
              </label>
              <label>
                Marca
                <input value={form.brand} onChange={(e) => change('brand', e.target.value)} />
              </label>
              <label>
                Categoria
                <select value={form.category_id} onChange={(e) => change('category_id', e.target.value)}>
                  <option value="">Sem categoria</option>
                  {categories.map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select value={form.status} onChange={(e) => change('status', e.target.value)}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="out_of_stock">Esgotado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </label>
              <label className="full">
                Descrição
                <textarea rows="5" value={form.description || ''} onChange={(e) => change('description', e.target.value)} />
              </label>
            </div>
            <div className="check-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => change('is_featured', e.target.checked)}
                />{' '}
                Produto em destaque
              </label>
              <label>
                <input type="checkbox" checked={form.is_new} onChange={(e) => change('is_new', e.target.checked)} /> Produto
                novo
              </label>
            </div>
          </section>

          <section>
            <h3>Preços e coleção</h3>
            <div className="form-grid">
              <label>
                Preço normal
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => change('price', e.target.value)}
                  required
                />
              </label>
              <label>
                Preço promocional <small>Opcional</small>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sale_price ?? ''}
                  onChange={(e) => change('sale_price', e.target.value)}
                />
              </label>
              <label className="full">
                Coleções
                <select
                  multiple
                  value={form.collection_ids}
                  onChange={(e) =>
                    change(
                      'collection_ids',
                      Array.from(e.target.selectedOptions, (option) => option.value)
                    )
                  }
                >
                  {collections.map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <small>Use Ctrl/Cmd para selecionar mais de uma.</small>
              </label>
            </div>
          </section>

          <section>
            <h3>Galeria de Fotos do Produto</h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
              Selecione uma ou mais fotos para o produto (frente, costas, detalhes, lookbook).
            </p>

            {existingImages.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>Fotos cadastradas:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                  {existingImages.map((image) => (
                    <div
                      key={image.id}
                      style={{
                        position: 'relative',
                        border: image.is_primary ? '2px solid #302923' : '1px solid #ddd',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        background: '#f9f9f9',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <img
                        src={publicImage(image.storage_path)}
                        alt="Foto do Produto"
                        style={{ width: '100%', height: '110px', objectFit: 'cover' }}
                      />
                      {image.is_primary && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            background: '#302923',
                            color: '#fff',
                            fontSize: '9px',
                            padding: '2px 5px',
                            borderRadius: '3px',
                          }}
                        >
                          Principal
                        </span>
                      )}
                      <div
                        style={{
                          padding: '6px 4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '4px',
                          background: '#fff',
                          borderTop: '1px solid #eee',
                        }}
                      >
                        {!image.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(image.id)}
                            style={{
                              fontSize: '10px',
                              padding: '2px 5px',
                              background: '#eee',
                              border: '0',
                              borderRadius: '2px',
                              cursor: 'pointer',
                            }}
                          >
                            ⭐ Principal
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingImage(image.id)}
                          style={{
                            fontSize: '10px',
                            padding: '2px 5px',
                            background: '#fee',
                            color: '#c00',
                            border: '0',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="file-input">
              Adicionar novas fotos (você pode selecionar vários arquivos de uma vez)
              <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
              <span>{files?.length ? `✓ ${files.length} foto(s) selecionada(s)` : '+ Escolher fotos do seu computador'}</span>
            </label>
            <small style={{ display: 'block', marginTop: '4px', color: '#777' }}>
              Dica: Segure <code>Ctrl</code> ou <code>Shift</code> na janela do computador para selecionar várias fotos juntas.
            </small>
          </section>

          <section>
            <h3>Variações e estoque</h3>
            <div className="inline-rows variant-rows">
              {variants.map((row, index) => (
                <div key={index}>
                  <input
                    placeholder="Tamanho"
                    value={row.size || ''}
                    onChange={(e) => modifyRow(setVariants, index, 'size', e.target.value)}
                  />
                  <input
                    placeholder="Cor"
                    value={row.color || ''}
                    onChange={(e) => modifyRow(setVariants, index, 'color', e.target.value)}
                  />
                  <input
                    placeholder="Estoque"
                    type="number"
                    min="0"
                    value={row.stock}
                    onChange={(e) => modifyRow(setVariants, index, 'stock', e.target.value)}
                  />
                  <input
                    placeholder="SKU variação"
                    value={row.sku || ''}
                    onChange={(e) => modifyRow(setVariants, index, 'sku', e.target.value)}
                  />
                  <button type="button" onClick={() => setVariants((rows) => rows.filter((_, i) => i !== index))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="add-row"
              onClick={() => setVariants((rows) => [...rows, { size: '', color: '', stock: 0, sku: '' }])}
            >
              + Adicionar combinação
            </button>
          </section>

          <section>
            <h3>Tabela de medidas</h3>
            <div className="measurement-table">
              {measurements.map((row, index) => (
                <div className="measure-row" key={index}>
                  <input
                    placeholder="Tamanho"
                    value={row.size_label || ''}
                    onChange={(e) => modifyRow(setMeasurements, index, 'size_label', e.target.value)}
                  />
                  {measureFields.map(([key, label]) => (
                    <input
                      key={key}
                      placeholder={label}
                      value={row[key] || ''}
                      onChange={(e) => modifyRow(setMeasurements, index, key, e.target.value)}
                    />
                  ))}
                  <button type="button" onClick={() => setMeasurements((rows) => rows.filter((_, i) => i !== index))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="add-row"
              onClick={() => setMeasurements((rows) => [...rows, { size_label: '' }])}
            >
              + Adicionar tamanho
            </button>
          </section>

          <section>
            <h3>Informações adicionais</h3>
            <div className="form-grid">
              <label>
                Composição / material
                <textarea rows="3" value={form.material || ''} onChange={(e) => change('material', e.target.value)} />
              </label>
              <label>
                Instruções de lavagem
                <textarea
                  rows="3"
                  value={form.care_instructions || ''}
                  onChange={(e) => change('care_instructions', e.target.value)}
                />
              </label>
              <label>
                Caimento
                <textarea rows="3" value={form.fit || ''} onChange={(e) => change('fit', e.target.value)} />
              </label>
              <label>
                Disponibilidade
                <textarea
                  rows="3"
                  value={form.availability_note || ''}
                  onChange={(e) => change('availability_note', e.target.value)}
                />
              </label>
              <label className="full">
                Observações
                <textarea rows="3" value={form.notes || ''} onChange={(e) => change('notes', e.target.value)} />
              </label>
            </div>
          </section>
        </div>

        {message && <p className="form-message error">{message}</p>}

        <div className="modal-footer">
          <button type="button" className="admin-button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="admin-button" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar produto'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Products() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [collections, setCollections] = useState([])
  const [editor, setEditor] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [error, setError] = useState('')

  async function load() {
    const [products, cats, cols] = await Promise.all([
      supabase
        .from('products')
        .select('*, product_images(*), product_variants(*), product_measurements(*), product_collections(collection_id)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('collections').select('*').order('name'),
    ])
    if (products.error) setError(products.error.message)
    else setItems(products.data || [])
    setCategories(cats.data || [])
    setCollections(cols.data || [])
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (params.get('novo')) {
      setEditor({})
      setParams({})
    }
  }, [params, setParams])

  async function remove(item) {
    if (!window.confirm(`Excluir “${item.name}”? Imagens e variações também serão removidas.`)) return
    const { error: deleteError } = await supabase.from('products').delete().eq('id', item.id)
    if (deleteError) setError(deleteError.message)
    else load()
  }

  const filtered = items.filter(
    (item) =>
      (status === 'all' || item.status === status) &&
      `${item.name} ${item.sku}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section className="admin-page">
      <div className="page-heading">
        <div>
          <p className="admin-kicker">Catálogo</p>
          <h1>Produtos</h1>
          <p>Cadastre peças, variações, medidas e imagens.</p>
        </div>
        <button className="admin-button" onClick={() => setEditor({})}>
          Novo produto
        </button>
      </div>

      <div className="admin-panel">
        <div className="table-toolbar">
          <input placeholder="Buscar por nome ou SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
            <option value="out_of_stock">Esgotados</option>
            <option value="archived">Arquivados</option>
          </select>
        </div>

        {error && <p className="form-message error">{error}</p>}

        <div className="data-table product-table">
          <div className="table-row table-header">
            <span>Produto</span>
            <span>Categoria</span>
            <span>Preço</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {filtered.map((item) => (
            <div className="table-row" key={item.id}>
              <span className="product-name">
                {item.product_images?.[0] && <img src={publicImage(item.product_images[0].storage_path)} alt="" />}
                <strong>
                  {item.name}
                  <small>SKU: {item.sku}</small>
                </strong>
              </span>
              <span>{categories.find((c) => c.id === item.category_id)?.name || item.categories?.name || '—'}</span>
              <span>{money(item.sale_price || item.price)}</span>
              <span className={`status ${item.status}`}>{item.status}</span>
              <span className="row-actions">
                <button onClick={() => setEditor(item)}>Editar</button>
                <button className="danger" onClick={() => remove(item)}>
                  Excluir
                </button>
              </span>
            </div>
          ))}

          {!filtered.length && <div className="empty-state">Nenhum produto encontrado.</div>}
        </div>
      </div>

      {editor && (
        <ProductEditor
          item={editor.id ? editor : null}
          categories={categories}
          collections={collections}
          onClose={() => setEditor(null)}
          onSave={() => {
            setEditor(null)
            load()
          }}
        />
      )}
    </section>
  )
}
