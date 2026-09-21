import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { useCart } from './store/cart'

const images = { hero: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=85', dresses: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=800&q=80', sets: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80', blouses: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=800&q=80', pants: 'https://images.unsplash.com/photo-1506629905607-d405b7a30db9?auto=format&fit=crop&w=800&q=80', collection: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1800&q=85', insta1: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=75', insta2: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=75', insta3: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=75', insta4: 'https://images.unsplash.com/photo-1496217590455-aa63a8350eea?auto=format&fit=crop&w=600&q=75' }
const fallbackCategories = [['Vestidos', 'vestidos', images.dresses], ['Conjuntos', 'conjuntos', images.sets], ['Blusas', 'blusas', images.blouses], ['Calças', 'calcas', images.pants]]
const fallbackProducts = [{ id: 'midi', name: 'Vestido Midi', slug: 'vestido-midi', price: 329.9, image: images.dresses, category: 'vestidos' }, { id: 'elegance', name: 'Conjunto Elegance', slug: 'conjunto-elegance', price: 459.9, image: images.sets, category: 'conjuntos' }, { id: 'sofia', name: 'Blusa Sofia', slug: 'blusa-sofia', price: 189.9, image: images.blouses, category: 'blusas' }, { id: 'alfaiataria', name: 'Calça Alfaiataria', slug: 'calca-alfaiataria', price: 279.9, image: images.pants, category: 'calcas' }]
const price = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

function Icon({ name, size = 20 }) { const paths = { search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>, user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.5 3.1-5.5 7-5.5s6.3 2 7 5.5" /></>, bag: <><path d="M5 8.5h14l-1 12H6l-1-12Z" /><path d="M9 9V6.5a3 3 0 0 1 6 0V9" /></>, menu: <path d="M3 6h18M3 12h18M3 18h18" />, close: <path d="m5 5 14 14M19 5 5 19" />, arrow: <path d="M5 12h14M13 6l6 6-6 6" />, plus: <path d="M12 5v14M5 12h14" />, minus: <path d="M5 12h14" /> }; return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg> }

function ProductCard({ product }) { const { addItem } = useCart(); return <article className="product-card"><Link to={`/?produto=${product.slug}`} className="product-image"><img src={product.image} alt={product.name} /></Link><button className="quick-add" onClick={() => addItem(product)} aria-label={`Adicionar ${product.name} à sacola`}><Icon name="plus" size={18} /></button><div className="product-info"><h3>{product.name}</h3><p>{price(product.salePrice || product.price)}</p></div></article> }

function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem } = useCart()
  const [step, setStep] = useState('cart')
  const [customer, setCustomer] = useState({ name: '', phone: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' })
  const [formError, setFormError] = useState('')
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = subtotal >= 499 ? 0 : 30
  const total = subtotal + shipping

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }))
  }

  function goToCheckout() {
    setFormError('')
    setStep('checkout')
  }

  function sendToWhatsApp(event) {
    event.preventDefault()
    const requiredFields = ['name', 'phone', 'cep', 'street', 'number', 'neighborhood', 'city', 'state']
    if (requiredFields.some((field) => !customer[field].trim())) {
      setFormError('Preencha todos os campos obrigatórios para enviar o pedido.')
      return
    }

    const orderItems = items.map((item, index) => `${index + 1}. ${item.name}\n   ${item.quantity}x ${price(item.price)} = ${price(item.price * item.quantity)}`).join('\n')
    const address = `${customer.street}, ${customer.number}${customer.complement ? ` - ${customer.complement}` : ''}\n${customer.neighborhood} - ${customer.city}/${customer.state.toUpperCase()}\nCEP: ${customer.cep}`
    const message = [
      '*Novo pedido - La Belle Vie*',
      '',
      '*Dados da cliente*',
      `Nome: ${customer.name}`,
      `Telefone: ${customer.phone}`,
      '',
      '*Endereço de entrega*',
      address,
      '',
      '*Itens do pedido*',
      orderItems,
      '',
      `Subtotal: ${price(subtotal)}`,
      `Frete: ${shipping === 0 ? 'Grátis' : price(shipping)}`,
      `*Total: ${price(total)}*`,
      '',
      'Gostaria de finalizar este pedido.',
    ].join('\n')

    window.open(`https://wa.me/5518991453517?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid #dfd4c8', background: '#fffefa', padding: '10px', color: '#302923', fontSize: '12px' }
  const labelStyle = { display: 'grid', gap: '6px', color: '#5e544c', fontSize: '11px' }

  return <div className={`cart-layer ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
    <button className="cart-overlay" onClick={() => setIsOpen(false)} aria-label="Fechar sacola" />
    <aside className="cart-drawer">
      <header>
        <div><p className="eyebrow">{step === 'checkout' ? 'Finalizar pedido' : 'Sua seleção'}</p><h2>{step === 'checkout' ? 'Entrega' : 'Sacola'}</h2></div>
        <button onClick={() => setIsOpen(false)} aria-label="Fechar sacola"><Icon name="close" /></button>
      </header>

      {!items.length ? <div className="empty-cart"><p>Sua sacola está vazia.</p><button className="button button-dark" onClick={() => setIsOpen(false)}>Continuar comprando</button></div> : step === 'checkout' ? <form onSubmit={sendToWhatsApp} style={{ overflow: 'auto', flex: 1, padding: '22px 28px' }}>
        <section style={{ paddingBottom: '20px', borderBottom: '1px solid #eee6dc' }}>
          <h3 style={{ margin: '0 0 16px', font: "500 22px 'Playfair Display', serif" }}>Seus dados</h3>
          <div style={{ display: 'grid', gap: '13px' }}>
            <label style={labelStyle}>Nome completo *<input style={inputStyle} value={customer.name} onChange={(event) => updateCustomer('name', event.target.value)} autoComplete="name" /></label>
            <label style={labelStyle}>Telefone / WhatsApp *<input style={inputStyle} type="tel" value={customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} autoComplete="tel" /></label>
          </div>
        </section>
        <section style={{ padding: '20px 0' }}>
          <h3 style={{ margin: '0 0 16px', font: "500 22px 'Playfair Display', serif" }}>Endereço de entrega</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 90px', gap: '13px' }}>
            <label style={labelStyle}>CEP *<input style={inputStyle} inputMode="numeric" value={customer.cep} onChange={(event) => updateCustomer('cep', event.target.value)} autoComplete="postal-code" /></label>
            <label style={labelStyle}>Estado *<input style={inputStyle} maxLength="2" value={customer.state} onChange={(event) => updateCustomer('state', event.target.value)} autoComplete="address-level1" /></label>
          </div>
          <div style={{ display: 'grid', gap: '13px', marginTop: '13px' }}>
            <label style={labelStyle}>Rua / Avenida *<input style={inputStyle} value={customer.street} onChange={(event) => updateCustomer('street', event.target.value)} autoComplete="street-address" /></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '13px' }}>
              <label style={labelStyle}>Número *<input style={inputStyle} value={customer.number} onChange={(event) => updateCustomer('number', event.target.value)} /></label>
              <label style={labelStyle}>Complemento<input style={inputStyle} value={customer.complement} onChange={(event) => updateCustomer('complement', event.target.value)} /></label>
            </div>
            <label style={labelStyle}>Bairro *<input style={inputStyle} value={customer.neighborhood} onChange={(event) => updateCustomer('neighborhood', event.target.value)} autoComplete="address-level3" /></label>
            <label style={labelStyle}>Cidade *<input style={inputStyle} value={customer.city} onChange={(event) => updateCustomer('city', event.target.value)} autoComplete="address-level2" /></label>
          </div>
        </section>
        {formError && <p style={{ color: '#9b4037', fontSize: '12px', margin: '0 0 16px' }}>{formError}</p>}
        <div style={{ borderTop: '1px solid #e7ddd2', paddingTop: '18px', display: 'grid', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><span>Subtotal</span><strong>{price(subtotal)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><span>Frete</span><strong>{shipping === 0 ? 'Grátis' : price(shipping)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: "500 20px 'Playfair Display', serif" }}><span>Total</span><strong>{price(total)}</strong></div>
          <button className="button checkout-button" type="submit">Enviar no WhatsApp <Icon name="arrow" size={17} /></button>
          <button type="button" onClick={() => { setFormError(''); setStep('cart') }} style={{ border: 0, background: 'none', color: '#6d6057', fontSize: '11px', padding: '5px', textDecoration: 'underline', cursor: 'pointer' }}>← Voltar para a sacola</button>
        </div>
      </form> : <>
        <div className="cart-items">{items.map((item) => <article key={item.id} className="cart-item"><img src={item.image} alt={item.name} /><div><h3>{item.name}</h3><p>{price(item.price)}</p><div className="quantity"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Diminuir quantidade de ${item.name}`}><Icon name="minus" size={14} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Aumentar quantidade de ${item.name}`}><Icon name="plus" size={14} /></button></div></div><button className="remove-item" onClick={() => removeItem(item.id)}>Remover</button></article>)}</div>
        <footer>
          <div><span>Subtotal</span><strong>{price(subtotal)}</strong></div>
          <div style={{ fontSize: '14px', marginBottom: '12px' }}><span>Frete</span><strong>{shipping === 0 ? 'Grátis' : price(shipping)}</strong></div>
          <div style={{ borderTop: '1px solid #e7ddd2', paddingTop: '14px' }}><span>Total</span><strong>{price(total)}</strong></div>
          <button className="button checkout-button" onClick={goToCheckout}>Continuar para entrega <Icon name="arrow" size={17} /></button>
          <small>{shipping === 0 ? 'Você ganhou frete grátis!' : 'Frete fixo de R$ 30,00.'}</small>
        </footer>
      </>}
    </aside>
  </div>
}

function Header({ categories, products }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { items, setIsOpen } = useCart();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const nav = [['Novidades', '/'], ...categories.map(([name, slug]) => [name, `/?categoria=${slug}`]), ['Sale', '/?sale=1']];

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    return (products || []).filter((p) => p.name.toLowerCase().includes(term)).slice(0, 5);
  }, [searchTerm, products]);

  return (
    <>
      <div className="announcement">Frete grátis nas compras acima de R$ 499</div>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="La Belle Vie - início" onClick={() => setSearchOpen(false)}>
          <img src="/logo.png" alt="La Belle Vie" style={{ height: '68px', width: 'auto', objectFit: 'contain' }} />
        </Link>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`}>
          <div className="mobile-search">
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar produtos no celular"
            />
            {searchTerm.trim() && (
              <div className="mobile-search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((product) => (
                    <Link
                      key={product.id}
                      to={`/?produto=${product.slug}`}
                      className="search-result-item"
                      onClick={() => { setMenuOpen(false); setSearchTerm(''); }}
                    >
                      <img src={product.image} alt="" />
                      <div>
                        <strong>{product.name}</strong>
                        <span>{price(product.salePrice || product.price)}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="search-empty">Nenhum produto encontrado.</div>
                )}
              </div>
            )}
          </div>
          {nav.map(([label, href]) => (
            <Link key={label} to={href} className={label === 'Sale' ? 'sale-link' : ''} onClick={() => { setMenuOpen(false); setSearchOpen(false); }}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <div className={`search-wrapper ${searchOpen ? 'open' : ''}`}>
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              aria-label="Buscar produtos"
            />
            {searchOpen && (
              <div className="search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((product) => (
                    <Link
                      key={product.id}
                      to={`/?produto=${product.slug}`}
                      className="search-result-item"
                      onClick={() => { setSearchOpen(false); setSearchTerm(''); }}
                    >
                      <img src={product.image} alt="" />
                      <div>
                        <strong>{product.name}</strong>
                        <span>{price(product.salePrice || product.price)}</span>
                      </div>
                    </Link>
                  ))
                ) : searchTerm.trim() ? (
                  <div className="search-empty">Nenhum produto encontrado.</div>
                ) : null}
              </div>
            )}
          </div>
          <button className="icon-button desktop-action" aria-label="Buscar" onClick={() => setSearchOpen(!searchOpen)}>
            <Icon name={searchOpen ? 'close' : 'search'} />
          </button>
          <button className="icon-button mobile-search-toggle" aria-label="Buscar" onClick={() => { setMenuOpen(true); setSearchOpen(false); }}>
            <Icon name="search" />
          </button>
          <Link className="icon-button desktop-action" to="/admin/login" aria-label="Minha conta">
            <Icon name="user" />
          </Link>
          <button className="icon-button" onClick={() => setIsOpen(true)} aria-label="Abrir sacola">
            <Icon name="bag" />
            <span className="bag-count">{count}</span>
          </button>
          <button className="icon-button menu-toggle" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </header>
      {searchOpen && <div className="search-overlay" onClick={() => setSearchOpen(false)} />}
    </>
  );
}

function Footer() {
	return <footer className="footer">
		<div className="footer-top">
			<div className="footer-intro">
				<Link className="brand" to="/">
					<img src="/logo.png" alt="La Belle Vie" style={{ height: '72px', width: 'auto', objectFit: 'contain' }} />
				</Link>
				<p>Peças que celebram a sua essência e acompanham todos os seus momentos.</p>
			</div>
			<div>
				<h4>Institucional</h4>
				<Link to="/">Sobre nós</Link>
				<Link to="/?novidades=1">Novidades</Link>
				<Link to="/?colecoes=1">Nossas coleções</Link>
			</div>
			<div>
				<h4>Atendimento</h4>
				<a href="mailto:contato@labellevie.com.br">Fale conosco</a>
				<a href="#trocas">Trocas e devoluções</a>
				<a href="#privacidade">Política de privacidade</a>
			</div>
			<div>
				<h4>Conecte-se</h4>
				<a href="https://instagram.com/labellevie.reserva" target="_blank" rel="noreferrer">Instagram</a>
				<a href="https://wa.me/5518991453517" target="_blank" rel="noreferrer">WhatsApp</a>
				<a href="mailto:contato@labellevie.com.br">contato@labellevie.com.br</a>
			</div>
			<div>
				<h4>Sobre a Loja</h4>
				<p>Moda feminina Atacado & Pacote</p>
				<p>Enviamos para todo o Brasil</p>
				<p>Rua Miller, 365 - Brás-SP</p>
			</div>
		</div>
		<div className="footer-bottom">
			<span>© 2026 La Belle Vie. Todos os direitos reservados.</span>
			<span>Feito para mulheres que inspiram.</span>
		</div>
		<div id="trocas" className="footer-section">
			<h3>Trocas e Devoluções</h3>
			<p>Trocas em até 30 dias após a compra. Devoluções aceitas dentro de 7 dias.</p>
			<p>Frete de volta por conta do cliente.</p>
		</div>
		<div id="privacidade" className="footer-section">
			<h3>Política de Privacidade</h3>
			<p>Protegemos seus dados pessoais. Leia nossa política completa <a href="/politica-privacidade">aqui</a>.</p>
		</div>
	</footer>
}

function Catalog({ products, category, sale }) { const title = sale ? 'Sale' : category ? category.replace(/-/g, ' ') : 'Todos os produtos'; const visible = products.filter((item) => (!category || item.category === category) && (!sale || item.salePrice)); return <main className="catalog-page"><div className="catalog-hero"><p className="eyebrow">La Belle Vie</p><h1>{title}</h1><p>Peças selecionadas para acompanhar todos os seus momentos.</p></div><div className="catalog-toolbar"><Link to="/" className="text-link">← Voltar para início</Link><span>{visible.length} produto{visible.length === 1 ? '' : 's'}</span></div>{visible.length ? <div className="catalog-grid">{visible.map((item) => <ProductCard product={item} key={item.id} />)}</div> : <div className="catalog-empty">Ainda não há produtos publicados nesta categoria.</div>}</main> }

function ProductView({ product }) {
  const { addItem } = useCart();
  const gallery = product.images && product.images.length > 0 ? product.images : [product.image];
  const [activeImage, setActiveImage] = useState(gallery[0]);

  useEffect(() => {
    setActiveImage(gallery[0]);
  }, [product]);

  if (!product) return null;

  return (
    <main className="product-view">
      <Link to="/" className="text-link">← Continuar comprando</Link>
      <div className="product-detail">
        <div className="product-gallery">
          <div className="main-image-container">
            <img src={activeImage || product.image} alt={product.name} />
          </div>
          {gallery.length > 1 && (
            <div className="gallery-thumbnails">
              {gallery.map((imgUrl, index) => (
                <button
                  type="button"
                  key={index}
                  className={`thumb-btn ${activeImage === imgUrl ? 'active' : ''}`}
                  onClick={() => setActiveImage(imgUrl)}
                >
                  <img src={imgUrl} alt={`${product.name} miniatura ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="eyebrow">La Belle Vie</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{price(product.salePrice || product.price)}</p>
          <p>{product.description || 'Uma peça La Belle Vie pensada para acompanhar a sua essência.'}</p>
          <button className="button button-dark" onClick={() => addItem(product)}>
            Adicionar à sacola <Icon name="bag" size={17} />
          </button>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [products, setProducts] = useState(fallbackProducts); const [categories, setCategories] = useState(fallbackCategories); const [instagramPosts, setInstagramPosts] = useState([]); const [params] = useSearchParams(); const category = params.get('categoria'); const sale = params.get('sale') === '1'; const productSlug = params.get('produto')
  const fallbackInsta = [images.insta1, images.insta2, images.insta3, images.insta4]
  useEffect(() => {
    async function loadCatalog() {
      if (!isSupabaseConfigured) return;
      const [productResult, categoryResult, instaResult] = await Promise.all([
        supabase
          .from('products')
          .select('id,name,slug,description,price,sale_price,category_id,product_images(storage_path,is_primary,sort_order)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id,name,slug,image_path').eq('status', 'published').order('sort_order'),
        supabase.from('instagram_posts').select('image_url,caption,instagram_url').eq('status', 'published').order('sort_order')
      ]);

      const loadedCategories = categoryResult.data || [];

      if (categoryResult.data?.length) {
        setCategories(
          categoryResult.data.map((item, index) => [
            item.name,
            item.slug,
            item.image_path
              ? supabase.storage.from('product-media').getPublicUrl(item.image_path).data.publicUrl
              : fallbackCategories[index % fallbackCategories.length][2]
          ])
        );
      }

      if (productResult.data?.length) {
        setProducts(
          productResult.data.map((item) => {
            const sortedImages = (item.product_images || []).sort(
              (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
            );
            const primaryImage = sortedImages[0];
            const allImages = sortedImages.map(
              (img) => supabase.storage.from('product-media').getPublicUrl(img.storage_path).data.publicUrl
            );
            const matchedCategory = loadedCategories.find((c) => c.id === item.category_id);

            return {
              id: item.id,
              name: item.name,
              slug: item.slug,
              description: item.description,
              price: Number(item.price),
              salePrice: item.sale_price ? Number(item.sale_price) : null,
              category: matchedCategory?.slug || null,
              categoryName: matchedCategory?.name || null,
              image: primaryImage
                ? supabase.storage.from('product-media').getPublicUrl(primaryImage.storage_path).data.publicUrl
                : images.dresses,
              images: allImages.length ? allImages : [images.dresses]
            };
          })
        );
      }

      if (instaResult.data?.length) {
        setInstagramPosts(instaResult.data);
      }
    }
    loadCatalog();
  }, [])
  const selected = useMemo(() => products.find((item) => item.slug === productSlug), [products, productSlug]); const isCatalog = Boolean(category || sale || params.get('novidades') || params.get('colecoes'))
  return <><Header categories={categories} products={products} />{selected ? <ProductView product={selected} /> : isCatalog ? <Catalog products={products} category={category} sale={sale} /> : <main><section className="hero" id="inicio" style={{ backgroundImage: `url(${images.hero})` }}><div className="hero-shade" /><div className="hero-content"><p className="eyebrow light">Nova coleção</p><h1>Sua essência,<br />seu estilo.</h1><p>Moda feminina para todos os momentos.</p><Link className="button button-light" to="/?novidades=1">Comprar agora <Icon name="arrow" size={17} /></Link></div><span className="scroll-note">Descubra a coleção</span></section><section className="section categories"><div className="section-heading centered"><p className="eyebrow">Para cada momento</p><h2>Encontre seu estilo</h2></div><div className="category-grid">{categories.map(([name, slug, image]) => <Link to={`/?categoria=${slug}`} className="category-card" key={slug}><img src={image} alt={name} /><div><h3>{name}</h3><span>Explorar <Icon name="arrow" size={16} /></span></div></Link>)}</div></section><section className="section products-section"><div className="section-heading"><div><p className="eyebrow">Acabou de chegar</p><h2>Novidades</h2></div><Link className="text-link" to="/?novidades=1">Ver tudo <Icon name="arrow" size={17} /></Link></div><div className="product-grid">{products.slice(0, 4).map((item) => <ProductCard product={item} key={item.id} />)}</div></section><section className="collection-banner" style={{ backgroundImage: `url(${images.collection})` }}><div className="collection-content"><p className="eyebrow light">Primavera / Verão</p><h2>Coleção<br />La Belle Vie</h2><p>Elegância em cada detalhe.</p><Link className="button button-light" to="/?colecoes=1">Ver coleção <Icon name="arrow" size={17} /></Link></div></section><section className="benefits"><div><span className="benefit-number">01</span><h3>Compra segura</h3><p>Ambiente protegido para você comprar com tranquilidade.</p></div><div><span className="benefit-number">02</span><h3>Envio para todo o Brasil</h3><p>Entregamos estilo e cuidado onde você estiver.</p></div><div><span className="benefit-number">03</span><h3>Atendimento personalizado</h3><p>Uma experiência especial, do seu jeito.</p></div></section><section className="section instagram"><div className="section-heading centered"><p className="eyebrow">Inspire-se</p><h2>Siga a La Belle Vie</h2><a className="instagram-handle" href="https://instagram.com/labellevie.reserva" target="_blank" rel="noreferrer">@labellevie.reserva</a></div><div className="instagram-grid">{(instagramPosts.length ? instagramPosts : fallbackInsta.map((url, i) => ({ image_url: url, caption: `Inspiração La Belle Vie ${i + 1}`, instagram_url: 'https://instagram.com/labellevie.reserva' }))).slice(0, 8).map((post, i) => <a href={post.instagram_url} key={post.instagram_url + i} target="_blank" rel="noreferrer"><img src={post.image_url} alt={post.caption || 'Post do Instagram'} referrerPolicy="no-referrer" /></a>)}</div></section></main>}<Footer /><CartDrawer /></>
}
