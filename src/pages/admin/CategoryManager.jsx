import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';

const CategoryManager = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [hierarchy, setHierarchy] = useState({}); // { parent: [children] }
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);

  // Edit states
  const [editingParent, setEditingParent] = useState(null); // category label being edited
  const [editChildren, setEditChildren] = useState([]);
  const [childInput, setChildInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Rename state
  const [renamingCat, setRenamingCat] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catRes, hierRes] = await Promise.all([
        fetch(getApiUrl('products/public/categories?includeCounts=true&includeEmpty=true&deduplicate=true')),
        fetch(getApiUrl('products/public/category-hierarchy'))
      ]);
      const catData = await catRes.json();
      const hierData = await hierRes.json();

      const cats = (catData.categories || []).filter(c => c.value !== 'all');
      setCategories(cats);

      const counts = {};
      cats.forEach(c => { counts[c.label] = c.count || 0; });
      setProductCounts(counts);

      const map = {};
      (hierData.hierarchy || []).forEach(h => { map[h.parent] = h.children; });
      setHierarchy(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (catLabel) => {
    setProductsLoading(true);
    setProducts([]);
    try {
      const res = await fetch(
        getApiUrl(`products/public?category=${encodeURIComponent(catLabel)}&limit=50`),
      );
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) { console.error(e); }
    finally { setProductsLoading(false); }
  };

  const handleCatClick = (label) => {
    if (selectedCat === label) {
      setSelectedCat(null);
      setProducts([]);
    } else {
      setSelectedCat(label);
      fetchProducts(label);
    }
  };

  const saveHierarchy = async (parent, children) => {
    setSaving(true);
    try {
      const res = await fetch(getApiUrl(`products/admin/category-hierarchy/${encodeURIComponent(parent)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ children })
      });
      if (res.ok) {
        setHierarchy(prev => ({ ...prev, [parent]: children }));
        setEditingParent(null);
        setEditChildren([]);
        setChildInput('');
      } else { alert('Failed to save'); }
    } catch (e) { alert('Error saving'); }
    finally { setSaving(false); }
  };

  const removeHierarchy = async (parent) => {
    if (!confirm(`Remove dropdown for "${parent}"?`)) return;
    await fetch(getApiUrl(`products/admin/category-hierarchy/${encodeURIComponent(parent)}`), {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
    });
    setHierarchy(prev => { const n = { ...prev }; delete n[parent]; return n; });
  };

  const renameCategory = async (oldName) => {
    if (!renameValue.trim() || renameValue.trim() === oldName) { setRenamingCat(null); return; }
    if (!confirm(`Rename "${oldName}" → "${renameValue.trim()}"? This updates all products.`)) return;
    try {
      const res = await fetch(getApiUrl(`products/admin/categories/${encodeURIComponent(oldName)}/rename`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newCategoryName: renameValue.trim() })
      });
      if (res.ok) { setRenamingCat(null); fetchAll(); }
      else { const d = await res.json(); alert(d.message || 'Failed'); }
    } catch (e) { alert('Error'); }
  };

  // Group: parents with children, then standalone
  const parentCats = categories.filter(c => hierarchy[c.label]);
  const childLabels = new Set(Object.values(hierarchy).flat());
  const standaloneCats = categories.filter(c => !hierarchy[c.label] && !childLabels.has(c.label));

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#1f2937' }}>
            🗂️ Category Manager
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
            Manage main categories, subcategory dropdowns, and browse products per category
          </p>
        </div>
        <button onClick={fetchAll} style={{
          padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db',
          borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600'
        }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          <div style={{ marginTop: '12px' }}>Loading categories...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* LEFT: Category tree */}
          <div>
            {/* Parent categories with dropdowns */}
            {parentCats.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  📂 Categories with Dropdown Menus
                </div>
                {parentCats.map(cat => (
                  <ParentCard
                    key={cat.value}
                    cat={cat}
                    children={hierarchy[cat.label] || []}
                    categories={categories}
                    productCounts={productCounts}
                    selectedCat={selectedCat}
                    editingParent={editingParent}
                    editChildren={editChildren}
                    childInput={childInput}
                    saving={saving}
                    renamingCat={renamingCat}
                    renameValue={renameValue}
                    onCatClick={handleCatClick}
                    onEditStart={(label, children) => { setEditingParent(label); setEditChildren([...children]); setChildInput(''); }}
                    onEditCancel={() => { setEditingParent(null); setEditChildren([]); setChildInput(''); }}
                    onEditSave={saveHierarchy}
                    onRemoveHierarchy={removeHierarchy}
                    onAddChild={(c) => { if (c.trim() && !editChildren.includes(c.trim())) setEditChildren(prev => [...prev, c.trim()]); setChildInput(''); }}
                    onRemoveChild={(c) => setEditChildren(prev => prev.filter(x => x !== c))}
                    setChildInput={setChildInput}
                    setEditChildren={setEditChildren}
                    onRenameStart={(label) => { setRenamingCat(label); setRenameValue(label); }}
                    onRenameCancel={() => setRenamingCat(null)}
                    onRenameSave={renameCategory}
                    setRenameValue={setRenameValue}
                  />
                ))}
              </div>
            )}

            {/* Standalone categories */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                📁 Standalone Categories ({standaloneCats.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {standaloneCats.map(cat => (
                  <div key={cat.value} style={{
                    background: selectedCat === cat.label ? '#ede9fe' : 'white',
                    border: `1px solid ${selectedCat === cat.label ? '#7c3aed' : '#e5e7eb'}`,
                    borderRadius: '8px', padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: '10px'
                  }}>
                    {renamingCat === cat.label ? (
                      <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                        <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                          style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '0.82rem' }}
                          onKeyDown={e => { if (e.key === 'Enter') renameCategory(cat.label); if (e.key === 'Escape') setRenamingCat(null); }}
                          autoFocus />
                        <button onClick={() => renameCategory(cat.label)} style={{ padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}>✓</button>
                        <button onClick={() => setRenamingCat(null)} style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => handleCatClick(cat.label)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', color: '#1f2937' }}>
                          {cat.label}
                          <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#9ca3af', fontWeight: '400' }}>{productCounts[cat.label] || 0} products</span>
                        </button>
                        <button onClick={() => { setEditingParent(cat.label); setEditChildren([]); setChildInput(''); }}
                          style={{ padding: '3px 8px', background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600' }}>
                          + Dropdown
                        </button>
                        <button onClick={() => { setRenamingCat(cat.label); setRenameValue(cat.label); }}
                          style={{ padding: '3px 8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem' }}>
                          ✏️
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Inline dropdown editor for standalone */}
            {editingParent && !hierarchy[editingParent] && (
              <div style={{ marginTop: '16px', background: '#f5f3ff', border: '1px solid #7c3aed', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontWeight: '700', marginBottom: '10px', fontSize: '0.9rem' }}>
                  Add dropdown subcategories for: <span style={{ color: '#7c3aed' }}>{editingParent}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <input
                    list="cat-opts"
                    value={childInput}
                    onChange={e => setChildInput(e.target.value)}
                    placeholder="Type or pick a category..."
                    style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.82rem' }}
                    onKeyDown={e => { if (e.key === 'Enter' && childInput.trim()) { if (!editChildren.includes(childInput.trim())) setEditChildren(prev => [...prev, childInput.trim()]); setChildInput(''); } }}
                  />
                  <datalist id="cat-opts">{categories.map(c => <option key={c.value} value={c.label} />)}</datalist>
                  <button onClick={() => { if (childInput.trim() && !editChildren.includes(childInput.trim())) { setEditChildren(prev => [...prev, childInput.trim()]); setChildInput(''); } }}
                    style={{ padding: '7px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>+ Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {editChildren.map((c, i) => (
                    <span key={i} style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {c}
                      <button onClick={() => setEditChildren(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontWeight: '700', padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => saveHierarchy(editingParent, editChildren)} disabled={saving || editChildren.length === 0}
                    style={{ padding: '8px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                    {saving ? 'Saving...' : '💾 Save Dropdown'}
                  </button>
                  <button onClick={() => { setEditingParent(null); setEditChildren([]); setChildInput(''); }}
                    style={{ padding: '8px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Products panel */}
          <div>
            {selectedCat ? (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem' }}>{selectedCat}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>{products.length} products shown</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => navigate(`/admin/products?category=${encodeURIComponent(selectedCat)}`)}
                      style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}>
                      Manage in Products →
                    </button>
                    <button onClick={() => { setSelectedCat(null); setProducts([]); }}
                      style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>✕</button>
                  </div>
                </div>
                <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {productsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <i className="fas fa-spinner fa-spin"></i> Loading products...
                    </div>
                  ) : products.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No products found</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', padding: '16px' }}>
                      {products.map(p => (
                        <div key={p._id} onClick={() => navigate(`/product/${p._id}`)}
                          style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: 'white', transition: 'box-shadow 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div style={{ height: '90px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt={p.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                              <i className="fas fa-box" style={{ color: '#d1d5db', fontSize: '1.5rem' }}></i>
                            )}
                          </div>
                          <div style={{ padding: '8px' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: '600', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700', marginTop: '2px' }}>£{parseFloat(p.price || 0).toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
                <i className="fas fa-mouse-pointer" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }}></i>
                Click any category on the left to browse its products
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ---- ParentCard sub-component ----
const ParentCard = ({
  cat, children, categories, productCounts, selectedCat,
  editingParent, editChildren, childInput, saving, renamingCat, renameValue,
  onCatClick, onEditStart, onEditCancel, onEditSave, onRemoveHierarchy,
  onAddChild, onRemoveChild, setChildInput, setEditChildren,
  onRenameStart, onRenameCancel, onRenameSave, setRenameValue
}) => {
  const [open, setOpen] = useState(true);
  const isEditing = editingParent === cat.label;

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' }}>
      {/* Parent row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#fafafa', borderBottom: open ? '1px solid #f3f4f6' : 'none' }}>
        <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#6b7280', padding: 0 }}>
          {open ? '▼' : '▶'}
        </button>
        {renamingCat === cat.label ? (
          <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
            <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
              style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '0.82rem' }}
              onKeyDown={e => { if (e.key === 'Enter') onRenameSave(cat.label); if (e.key === 'Escape') onRenameCancel(); }}
              autoFocus />
            <button onClick={() => onRenameSave(cat.label)} style={{ padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}>✓</button>
            <button onClick={onRenameCancel} style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
          </div>
        ) : (
          <>
            <button onClick={() => onCatClick(cat.label)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', color: selectedCat === cat.label ? '#7c3aed' : '#1f2937' }}>
              📂 {cat.label}
              <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#9ca3af', fontWeight: '400' }}>{productCounts[cat.label] || 0} products</span>
            </button>
            <button onClick={() => onEditStart(cat.label, children)} style={{ padding: '3px 8px', background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600' }}>✏️ Edit</button>
            <button onClick={() => onRenameStart(cat.label)} style={{ padding: '3px 8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem' }}>Rename</button>
            <button onClick={() => onRemoveHierarchy(cat.label)} style={{ padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem' }}>🗑️</button>
          </>
        )}
      </div>

      {/* Children */}
      {open && !isEditing && (
        <div style={{ padding: '8px 14px 10px 32px' }}>
          {children.map(child => (
            <div key={child} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: '1px solid #f9fafb' }}>
              <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>↳</span>
              <button onClick={() => onCatClick(child)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: selectedCat === child ? '#7c3aed' : '#374151', fontWeight: selectedCat === child ? '700' : '500' }}>
                {child}
                <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#9ca3af', fontWeight: '400' }}>{productCounts[child] || 0} products</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit panel */}
      {isEditing && (
        <div style={{ padding: '14px', background: '#f5f3ff' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <input list="cat-opts-parent" value={childInput} onChange={e => setChildInput(e.target.value)}
              placeholder="Add subcategory..."
              style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.82rem' }}
              onKeyDown={e => { if (e.key === 'Enter' && childInput.trim()) { onAddChild(childInput); } }}
            />
            <datalist id="cat-opts-parent">{categories.map(c => <option key={c.value} value={c.label} />)}</datalist>
            <button onClick={() => onAddChild(childInput)} style={{ padding: '7px 12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>+ Add</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {editChildren.map((c, i) => (
              <span key={i} style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {c}
                <button onClick={() => onRemoveChild(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontWeight: '700', padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onEditSave(cat.label, editChildren)} disabled={saving}
              style={{ padding: '7px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
              {saving ? 'Saving...' : '💾 Save'}
            </button>
            <button onClick={onEditCancel} style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;