import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { useBasket } from '../context/BasketContext';
import { useBuyer } from '../context/BuyerContext';
import { getApiUrl } from '../utils/api';

const SellerInformation = ({
  product,
  isSellerLoggedIn,
  isAdmin,
  currentSeller,
  onUpdatePrice,
  onRefreshProduct,
  quantity: globalQty = 1
}) => {
  const { convertPrice, formatPrice, currency, currencySymbols } = useCurrency();
  const { addToBasket } = useBasket();
  const { buyer, isLoggedIn: isBuyerLoggedIn } = useBuyer();
  const navigate = useNavigate();
  const [newPrice, setNewPrice] = useState('');
  const [updating, setUpdating] = useState(false);
  const [unlisting, setUnlisting] = useState(false);
  const [showAllSellers, setShowAllSellers] = useState(false);
  const [sellerQty, setSellerQty] = useState({});
  const [sending, setSending] = useState({});

  const handleUpdatePrice = async () => {
    if (!newPrice || newPrice <= 0) return;
    setUpdating(true);
    try {
      await onUpdatePrice(newPrice);
      setNewPrice('');
      if (onRefreshProduct) await onRefreshProduct();
    } catch { alert('Failed to update price.'); }
    finally { setUpdating(false); }
  };

  const handleUnlistProduct = async () => {
    if (!window.confirm('Remove your listing?')) return;
    setUnlisting(true);
    try {
      const token = localStorage.getItem('sellerToken');
      const res = await fetch(getApiUrl(`sellers/unlist-product/${product.id || product._id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) { alert('Unlisted successfully!'); if (onRefreshProduct) await onRefreshProduct(); }
      else alert(data.message || 'Failed to unlist');
    } catch { alert('Failed to unlist.'); }
    finally { setUnlisting(false); }
  };

  const getQty = (sid, moq) => sellerQty[sid] ?? Math.max(1, moq || 1);
  const setQty = (sid, val, moq) => {
    const min = Math.max(1, moq || 1);
    setSellerQty(prev => ({ ...prev, [sid]: Math.max(min, parseInt(val) || min) }));
  };

  const handleContactSupplier = async (se) => {
    const sid = se.sellerId || se._id;

    // Get buyer info from logged-in buyer profile
    const buyerName = buyer
      ? `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim()
      : 'Guest';
    const buyerPhone = buyer?.whatsappNo || buyer?.phone || '';

    setSending(prev => ({ ...prev, [sid]: true }));

    const mainPrice = parseFloat(String(product.price || '0').replace(/[£₨$€]/g, '')) || 0;
    const sp = parseFloat(se.sellerPrice) || mainPrice;
    const ss = parseFloat(se.sellerShipping) || 0;
    const qty = getQty(sid, se.moq);
    const showShipping = currency === 'GBP' && ss > 0;
    const total = (showShipping ? sp + ss : sp) * qty;

    // Save quotation to DB
    try {
      await fetch(getApiUrl('sellers/quotation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id || product.id,
          sellerId: sid,
          sellerUsername: se.username,
          sellerWhatsapp: se.whatsappNo,
          buyerName,
          buyerEmail: buyer?.email || '',
          buyerPhone,
          quantity: qty,
          sellerPrice: sp,
          message: `Buyer contacted via WhatsApp. Qty: ${qty}, Total: ${formatPrice(total)}`
        })
      });
    } catch (err) {
      console.error('Failed to save quotation:', err);
    }

    // Build WhatsApp message with buyer info
    const msg = [
      `Hi ${se.username},`,
      ``,
      `I'm interested in buying *${product.name}*.`,
      ``,
      `📦 Quantity: ${qty} units`,
      `💰 Price/unit: ${formatPrice(sp)}${showShipping ? ` + ${formatPrice(ss)} shipping` : ''}`,
      `💵 Total: ${formatPrice(total)}`,
      ``,
      `👤 Buyer Info:`,
      `Name: ${buyerName}`,
      ...(buyerPhone ? [`Phone/WhatsApp: ${buyerPhone}`] : []),
      ...(buyer?.email ? [`Email: ${buyer.email}`] : []),
      ``,
      `Please confirm availability.`
    ].join('\n');

    const phone = se.whatsappNo?.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');

    setSending(prev => ({ ...prev, [sid]: false }));
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    const c = phone.replace(/[^0-9+]/g, '');
    return c.length <= 4 ? c : c.slice(0, 4) + '****' + c.slice(-2);
  };

  const mainPrice = parseFloat(String(product.price || '0').replace(/[£₨$€]/g, '')) || 0;

  // Determine if current user is a buyer (not seller, not admin)
  const isBuyer = !isSellerLoggedIn && !isAdmin;

  if (!product.sellers || product.sellers.length === 0) {
    return (
      <div className="mb-2">
        <h3 className="fw-bold mb-2" style={{ fontSize: '0.85rem', color: '#1f2937' }}>Seller Information</h3>
        <div className="alert alert-info border-0 p-2" style={{ fontSize: '0.7rem' }}>
          <i className="fas fa-info-circle me-1"></i>No seller information available
        </div>
      </div>
    );
  }

  const uniqueSellers = product.sellers.reduce((acc, s) => {
    const id = s.sellerId || s._id;
    if (!id || acc.find(x => (x.sellerId || x._id) === id)) return acc;
    acc.push(s);
    return acc;
  }, []).sort((a, b) => {
    const ta = (parseFloat(a.sellerPrice) || mainPrice) + (parseFloat(a.sellerShipping) || 0);
    const tb = (parseFloat(b.sellerPrice) || mainPrice) + (parseFloat(b.sellerShipping) || 0);
    return ta - tb;
  });

  const visible = showAllSellers ? uniqueSellers : uniqueSellers.slice(0, 1);

  return (
    <div className="mb-2">
      <style>{`
        .seller-qty-input {
          width: 80px !important;
          height: 34px !important;
          min-width: 80px !important;
          max-width: 80px !important;
          flex: 0 0 80px !important;
          text-align: center !important;
          padding: 0 8px !important;
          font-size: 1rem !important;
          font-weight: 700 !important;
          border: 2px solid #d1d5db !important;
          border-radius: 6px !important;
          color: #1f2937 !important;
          background: #fff !important;
          box-sizing: border-box !important;
          outline: none !important;
          box-shadow: none !important;
          -moz-appearance: textfield !important;
        }
        .seller-qty-input:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(34,197,94,0.35) !important;
          border-color: #22c55e !important;
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
          padding: 0 8px !important;
        }
        .seller-qty-input::-webkit-outer-spin-button,
        .seller-qty-input::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        .seller-qty-btn {
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          max-width: 34px !important;
          min-height: 34px !important;
          flex: 0 0 34px !important;
        }
        .seller-qty-row {
          flex-wrap: nowrap !important;
        }
      `}</style>
      <h3 className="fw-bold mb-2" style={{ fontSize: '0.85rem', color: '#1f2937' }}>
        <i className="fas fa-store me-1 text-success"></i>Seller Information
      </h3>

      <div style={{ background: '#e8f5e9', borderRadius: '8px', padding: '10px', border: '1px solid #c8e6c9' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#2e7d32', marginBottom: '10px' }}>
          <i className="fas fa-users me-1"></i>
          Available from {uniqueSellers.length} seller{uniqueSellers.length > 1 ? 's' : ''}:
        </div>

        {visible.map((se, index) => {
          const sid = se.sellerId || se._id;
          const sp = parseFloat(se.sellerPrice) || mainPrice;
          const ss = parseFloat(se.sellerShipping) || 0;
          // Only add shipping to total for GBP (UK) — other currencies show price only
          const includeShipping = currency === 'GBP' && ss > 0;
          const total = includeShipping ? sp + ss : sp;
          const moq = se.moq || 1;
          const qty = getQty(sid, moq);
          const isMine = isSellerLoggedIn && currentSeller && sid?.toString() === currentSeller._id?.toString();

          return (
            <div key={`si-${sid}-${index}`} style={{
              background: index === 0 ? '#f0f9ff' : '#f8f9fa',
              border: `1px solid ${index === 0 ? '#bae6fd' : '#e5e7eb'}`,
              borderRadius: '8px', padding: '10px', marginBottom: '8px'
            }}>
              {index === 0 && (
                <div className="lowest-price-badge mb-2" style={{
                  display: 'inline-block', fontSize: '0.6rem', color: '#fff',
                  backgroundColor: '#16a34a', fontWeight: '700', padding: '3px 8px',
                  borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  <i className="fas fa-tag me-1"></i>Lowest Price
                </div>
              )}

              {/* Seller name + price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1f2937' }}>
                  {se.username}
                  <span style={{ fontSize: '0.62rem', fontWeight: '400', color: '#6b7280', marginLeft: '4px' }}>
                    ({includeShipping ? `${formatPrice(sp)} + ${formatPrice(ss)} shipping` : formatPrice(sp)})
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#059669', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {formatPrice(total)}
                </div>
              </div>

              {/* Location + MOQ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.65rem', color: '#6b7280', flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>📍 {se.city}, {se.country}</span>
                <span style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: '700', color: '#856404', whiteSpace: 'nowrap', flex: '0 0 auto' }}>
                  <i className="fas fa-boxes me-1"></i>MOQ:{moq}
                </span>
              </div>

              {/* Qty row — separate line so it never gets cut */}
              {!isMine && (
                <div className="seller-qty-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap', flexShrink: 0 }}>Qty:</span>
                  <button
                    onClick={() => setQty(sid, qty - 1, moq)}
                    disabled={qty <= moq}
                    className="seller-qty-btn"
                    style={{ width: '32px', height: '32px', minWidth: '32px', maxWidth: '32px', minHeight: '32px', maxHeight: '32px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f9fafb', cursor: qty <= moq ? 'not-allowed' : 'pointer', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qty <= moq ? 0.4 : 1, flexShrink: 0, color: '#374151', padding: '0', lineHeight: 1 }}>−</button>
                  <input
                    type="number"
                    value={qty}
                    min={moq}
                    onChange={e => setQty(sid, e.target.value, moq)}
                    className="seller-qty-input"
                    style={{
                      width: '80px',
                      height: '34px',
                      flex: '0 0 80px',
                      textAlign: 'center',
                      padding: '0 8px',
                      fontSize: '1rem',
                      fontWeight: '700',
                      border: '2px solid #d1d5db',
                      borderRadius: '6px',
                      flexShrink: 0,
                      flexGrow: 0,
                      color: '#1f2937',
                      background: '#fff',
                      boxSizing: 'border-box',
                      outline: 'none',
                      boxShadow: 'none',
                      MozAppearance: 'textfield',
                      WebkitAppearance: 'none',
                      display: 'block'
                    }} />
                  <button
                    onClick={() => setQty(sid, qty + 1, moq)}
                    className="seller-qty-btn"
                    style={{ width: '32px', height: '32px', minWidth: '32px', maxWidth: '32px', minHeight: '32px', maxHeight: '32px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f9fafb', cursor: 'pointer', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#374151', padding: '0', lineHeight: 1 }}>+</button>
                </div>
              )}

              {/* Buyer actions — only for buyers */}
              {!isMine && isBuyer && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {isBuyerLoggedIn ? (
                    <a
                      href="#"
                      onClick={e => { e.preventDefault(); handleContactSupplier(se); }}
                      style={{
                        flex: '3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: '#25d366', color: 'white', padding: '6px 8px',
                        borderRadius: '5px', fontSize: '0.65rem', fontWeight: '700', textDecoration: 'none',
                        cursor: sending[sid] ? 'not-allowed' : 'pointer', opacity: sending[sid] ? 0.7 : 1,
                        gap: '2px'
                      }}>
                      {sending[sid]
                        ? <><i className="fas fa-spinner fa-spin"></i><span>Sending...</span></>
                        : <>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                              <i className="fab fa-whatsapp" style={{ fontSize: '0.85rem' }}></i> Contact Supplier
                            </span>
                            <span style={{ opacity: 0.9, fontSize: '0.6rem', whiteSpace: 'nowrap' }}>{maskPhone(se.whatsappNo)}</span>
                          </>}
                    </a>
                  ) : (
                    <button
                      onClick={() => navigate('/login/buyer', { state: { returnTo: window.location.pathname + window.location.search } })}
                      title="Login as buyer to contact supplier"
                      style={{
                        flex: '3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: '#9ca3af', color: 'white', padding: '6px 8px',
                        borderRadius: '5px', fontSize: '0.65rem', fontWeight: '700', border: 'none',
                        cursor: 'pointer', gap: '2px'
                      }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-lock" style={{ fontSize: '0.75rem' }}></i> Login to Contact
                      </span>
                      <span style={{ opacity: 0.85, fontSize: '0.6rem', whiteSpace: 'nowrap' }}>Buyer login required</span>
                    </button>
                  )}
                  <button onClick={() => addToBasket({ ...product, selectedSeller: se })}
                    className="seller-add-to-cart-btn"
                    style={{
                      flex: '1', padding: '7px 6px', fontSize: '0.6rem', fontWeight: '700',
                      background: '#ff9900',
                      color: '#000000', border: 'none', borderRadius: '5px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                      minWidth: '70px', colorScheme: 'light'
                    }}>
                    <i className="fas fa-shopping-cart" style={{ fontSize: '0.7rem', color: '#000000' }}></i>
                    <span style={{ whiteSpace: 'nowrap', color: '#000000' }}>Add to Cart</span>
                  </button>
                </div>
              )}

              {/* Seller management panel */}
              {isMine && (
                <div style={{ marginTop: '8px', background: '#fff3cd', borderRadius: '6px', padding: '8px', border: '1px solid #ffc107' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#856404', marginBottom: '6px' }}>
                    <i className="fas fa-edit me-1"></i>Manage Your Listing
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem' }}>£</span>
                    <input type="number" placeholder="New price" value={newPrice}
                      onChange={e => setNewPrice(e.target.value)} step="0.01"
                      style={{ flex: 1, padding: '4px 6px', fontSize: '0.65rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                    <button onClick={handleUpdatePrice} disabled={updating || !newPrice}
                      style={{ padding: '4px 8px', fontSize: '0.65rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      {updating ? '...' : 'Update'}
                    </button>
                    <button onClick={handleUnlistProduct} disabled={unlisting}
                      style={{ padding: '4px 8px', fontSize: '0.65rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      {unlisting ? '...' : 'Unlist'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {uniqueSellers.length > 1 && (
          <button onClick={() => setShowAllSellers(!showAllSellers)}
            style={{
              width: '100%', padding: '6px', fontSize: '0.7rem', fontWeight: '600',
              background: 'transparent', border: '1px solid #16a34a', color: '#16a34a',
              borderRadius: '5px', cursor: 'pointer', marginTop: '4px'
            }}>
            <i className={`fas fa-chevron-${showAllSellers ? 'up' : 'down'} me-1`}></i>
            {showAllSellers ? 'See Less' : `See More (${uniqueSellers.length - 1} more seller${uniqueSellers.length - 1 > 1 ? 's' : ''})`}
          </button>
        )}
      </div>
    </div>
  );
};

export default SellerInformation;
