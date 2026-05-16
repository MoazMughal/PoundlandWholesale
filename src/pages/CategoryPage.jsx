import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getApiUrl } from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
import { useBasket } from '../context/BasketContext';
import Pagination from '../components/Pagination';

const CategoryPage = () => {
  const { category, subcategory } = useParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { addToBasket, isInBasket } = useBasket();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subcategories, setSubcategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const LIMIT = 60;

  // Decode URL params to display names
  const categoryName = decodeURIComponent(category || '');
  const subcategoryName = subcategory ? decodeURIComponent(subcategory) : null;

  // Fetch subcategories for this category (for the sidebar/tabs)
  useEffect(() => {
    if (!categoryName) return;
    fetch(getApiUrl(`products/public/subcategories/${encodeURIComponent(categoryName)}`))
      .then(r => r.ok ? r.json() : { subcategories: [] })
      .then(d => setSubcategories(d.subcategories || []))
      .catch(() => setSubcategories([]));
  }, [categoryName]);

  // Fetch products
  useEffect(() => {
    if (!categoryName) return;
    setLoading(true);
    const params = new URLSearchParams({
      category: categoryName,
      page: currentPage,
      limit: LIMIT,
    });
    if (subcategoryName) params.append('subcategory', subcategoryName);

    fetch(getApiUrl(`products/public?${params}`))
      .then(r => r.ok ? r.json() : { products: [], totalPages: 1, total: 0 })
      .then(d => {
        setProducts(d.products || []);
        setTotalPages(d.totalPages || 1);
        setTotalProducts(d.total || 0);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [categoryName, subcategoryName, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const slugify = (str) => encodeURIComponent(str);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px 16px' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '13px', color: '#666', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <Link to="/" style={{ color: '#ff9900', textDecoration: 'none' }}>Home</Link>
        <span>›</span>
        <Link to={`/category/${slugify(categoryName)}`} style={{ color: subcategoryName ? '#ff9900' : '#333', textDecoration: 'none', fontWeight: subcategoryName ? '400' : '600' }}>
          {categoryName}
        </Link>
        {subcategoryName && (
          <>
            <span>›</span>
            <span style={{ color: '#333', fontWeight: '600' }}>{subcategoryName}</span>
          </>
        )}
      </nav>

      {/* Page Title */}
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
        {subcategoryName ? `${categoryName} › ${subcategoryName}` : categoryName}
        {!loading && <span style={{ fontSize: '0.9rem', fontWeight: '400', color: '#6b7280', marginLeft: '10px' }}>({totalProducts} products)</span>}
      </h1>

      {/* Subcategory tabs */}
      {subcategories.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <Link
            to={`/category/${slugify(categoryName)}`}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
              textDecoration: 'none', border: '2px solid',
              background: !subcategoryName ? '#ff9900' : 'white',
              color: !subcategoryName ? 'white' : '#ff9900',
              borderColor: '#ff9900', transition: 'all 0.2s'
            }}
          >
            All
          </Link>
          {subcategories.map(sub => (
            <Link
              key={sub}
              to={`/category/${slugify(categoryName)}/${slugify(sub)}`}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                textDecoration: 'none', border: '2px solid',
                background: subcategoryName === sub ? '#ff9900' : 'white',
                color: subcategoryName === sub ? 'white' : '#ff9900',
                borderColor: '#ff9900', transition: 'all 0.2s'
              }}
            >
              {sub}
            </Link>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ background: '#f3f4f6', borderRadius: '8px', height: '280px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
          <p style={{ fontSize: '1.1rem' }}>No products found in this {subcategoryName ? 'subcategory' : 'category'}.</p>
          <Link to="/" style={{ color: '#ff9900', textDecoration: 'none', fontWeight: '600', marginTop: '12px', display: 'inline-block' }}>
            Browse all products →
          </Link>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {products.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                formatPrice={formatPrice}
                addToBasket={addToBasket}
                isInBasket={isInBasket}
                navigate={navigate}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

const ProductCard = ({ product, formatPrice, addToBasket, isInBasket, navigate }) => {
  const image = product.images?.[0] || '';
  const price = parseFloat(product.price) || 0;
  const inBasket = isInBasket(product._id);

  return (
    <div
      onClick={() => navigate(`/product/${product._id}`)}
      style={{
        background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb',
        overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column'
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Image */}
      <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#fafafa' }}>
        {image ? (
          <img
            src={image}
            alt={product.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            loading="lazy"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{ fontSize: '2.5rem', color: '#d1d5db' }}>📦</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', margin: 0, lineHeight: '1.3',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </h3>
        {product.subcategory && (
          <span style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
            {product.subcategory}
          </span>
        )}
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#ff9900', marginTop: 'auto', paddingTop: '6px' }}>
          {formatPrice(price)}
        </div>
        <button
          onClick={e => { e.stopPropagation(); addToBasket(product); }}
          style={{
            marginTop: '6px', padding: '7px', borderRadius: '6px', border: 'none',
            background: inBasket ? '#10b981' : '#ff9900', color: 'white',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'
          }}
        >
          {inBasket ? '✓ In Basket' : '+ Add to Basket'}
        </button>
      </div>
    </div>
  );
};

export default CategoryPage;
