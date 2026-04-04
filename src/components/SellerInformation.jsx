import { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useBasket } from '../context/BasketContext';
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
  const { convertPrice, currency } = useCurrency();
  const { addToBasket } = useBasket();
  const [newPrice, setNewPrice] = useState('');
  const [updating, setUpdating] = useState(false);
  const [unlisting, setUnlisting] = useState(false);
  const [showAllSellers, setShowAllSellers] = useState(false);
  const [sellerQty, setSellerQty] = useState({});
  // Per-seller buyer form: { sellerId: { open, name, phone, sending } }
  const [buyerForm, setBuyerForm] = useState({});

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

  const openBuyerForm = (sid) => setBuyerForm(prev => ({ ...prev, [sid]: { open: true, name: '', phone: '', sending: false } }));
  const closeBuyerForm = (sid) => setBuyerForm(prev => ({ ...prev, [sid]: { ...prev[sid], open: false } }));
  const updateBuyerField = (sid, field, val) => setBuyerForm(prev => ({ ...prev, [sid]: { ...prev[sid], [field]: val } }));

  const handleContactSupplier = async (se) => {
    const sid = se.sellerId || se._id;
    const form = buyerForm[sid] || {};
    if (!form.name?.trim() || !form.phone?.trim()) {
      alert('Please enter your name and phone number.');
      return;
    }

    setBuyerForm(prev => ({ ...prev, [sid]: { ...prev[sid], sending: true } }));

    const mainPrice = parseFloat(String(product.price || '0').replace(/[£₨$€]/g, '')) || 0;
    const sp = parseFloat(se.sellerPrice) || mainPrice;
    const ss = parseFloat(se.sellerShipping) || 0;
    const qty = getQty(sid, se.moq);
    const total = (sp + ss) * qty;

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
          buyerName: form.name,
          buyerPhone: form.phone,
          quantity: qty,
          sellerPrice: sp,
          message: `Buyer contacted via WhatsApp. Qty: ${qty}, Total: £${total.toFixed(2)}`
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
      `💰 Price/unit: ${currency === 'PKR' ? convertPrice(`£${sp}`) : `£${sp.toFixed(2)}`}${ss > 0 ? ` + £${ss.toFixed(2)} shipping` : ''}`,
      `💵 Total: ${currency === 'PKR' ? convertPrice(`£${total}`) : `£${total.toFixed(2)}`}`,
      ``,
      `👤 Buyer Info:`,
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      ``,
      `Please confirm availability.`
    ].join('\n');

    const phone = se.whatsappNo?.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');

    setBuyerForm(prev => ({ ...prev, [sid]: { ...prev[sid], sending: false, open: false } }));
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
          const total = sp + ss;
          const moq = se.moq || 1;
          const qty = getQty(sid, moq);
          const isMine = isSellerLoggedIn && currentSeller && sid?.toString() === currentSeller._id?.toString();
          const form = buyerForm[sid] || {};

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
                    ({currency === 'PKR' ? convertPrice(`£${sp}`) : (ss > 0 ? `${convertPrice(`£${sp}`)} + ${convertPrice(`£${ss}`)} shipping` : convertPrice(`£${sp}`))})
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#059669', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {currency === 'PKR' ? convertPrice(`£${sp}`) : convertPrice(`£${total}`)}
                </div>
              </div>

              {/* Location + MOQ + Qty on one line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.65rem', color: '#6b7280', flex: '1 1 auto' }}>📍 {se.city}, {se.country}</span>
                <span style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: '700', color: '#856404', whiteSpace: 'nowrap' }}>
                  <i className="fas fa-boxes me-1"></i>MOQ:{moq}
                </span>
                {!isMine && (
                  <>
                    <span style={{ fontSize: '0.65rem', fontWeight: '600', color: '#374151' }}>Qty:</span>
                    <button onClick={() => setQty(sid, qty - 1, moq)} disabled={qty <= moq}
                      style={{ width: '20px', height: '20px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f9fafb', cursor: qty <= moq ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qty <= moq ? 0.4 : 1 }}>−</button>
                    <input type="number" value={qty} min={moq} onChange={e => setQty(sid, e.target.value, moq)}
                      style={{ width: '60px', textAlign: 'center', padding: '2px 4px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #d1d5db', borderRadius: '3px' }} />
                    <button onClick={() => setQty(sid, qty + 1, moq)}
                      style={{ width: '20px', height: '20px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f9fafb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </>
                )}
              </div>

              {/* Buyer actions — only for buyers */}
              {!isMine && isBuyer && (
                <>
                  {/* Buyer info form — shown before opening WhatsApp */}
                  {!form.open ? (
                    <button onClick={() => openBuyerForm(sid)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: '#25d366', color: 'white', padding: '7px 10px',
                        borderRadius: '5px', fontSize: '0.7rem', fontWeight: '700', border: 'none', cursor: 'pointer'
                      }}>
                      <i className="fab fa-whatsapp" style={{ fontSize: '0.9rem' }}></i>
                      Contact Supplier &nbsp;<span style={{ opacity: 0.85 }}>{maskPhone(se.whatsappNo)}</span>
                    </button>
                  ) : (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#15803d', marginBottom: '8px' }}>
                        <i className="fab fa-whatsapp me-1"></i>Contact {se.username} — Enter your details
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <input type="text" placeholder="Your Name *" value={form.name || ''}
                          onChange={e => updateBuyerField(sid, 'name', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '0.72rem', border: '1px solid #d1d5db', borderRadius: '4px', outline: 'none' }} />
                        <input type="tel" placeholder="Your Phone / WhatsApp *" value={form.phone || ''}
                          onChange={e => updateBuyerField(sid, 'phone', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '0.72rem', border: '1px solid #d1d5db', borderRadius: '4px', outline: 'none' }} />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleContactSupplier(se)} disabled={form.sending}
                            style={{
                              flex: '1', padding: '7px', fontSize: '0.7rem', fontWeight: '700',
                              background: '#25d366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}>
                            {form.sending
                              ? <><i className="fas fa-spinner fa-spin"></i> Sending...</>
                              : <><i className="fab fa-whatsapp"></i> Send & Open WhatsApp</>}
                          </button>
                          <button onClick={() => closeBuyerForm(sid)}
                            style={{ padding: '7px 12px', fontSize: '0.7rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
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
