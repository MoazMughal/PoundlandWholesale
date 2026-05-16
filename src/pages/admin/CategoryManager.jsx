import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';

// ─── helpers ────────────────────────────────────────────────────────────────
const btn = (extra = {}) => ({
  border: 'none', borderRadius: '6px', cursor: 'pointer',
  fontWeight: '600', fontSize: '12px', padding: '4px 10px', ...extra
});

const CategoryManager = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const [categories, setCategories]     = useState([]);   // all flat cats from API
  const [hierarchy,  setHierarchy]      = useState({});   // { parent: [children] }
  const [counts,     setCounts]         = useState({});
  const [loading,    setLoading]        = useState(true);
  const [saving,     setSaving]         = useState(false);
  const [msg,        setMsg]            = useState(null);  // { type:'ok'|'err', text }

  // ── selected category panel ──
  const [selected,        setSelected]        = useState(null);  // label
  const [selectedParent,  setSelectedParent]  = useState(null);  // parent label (for sub/sub-sub)
  const [selectedGrand,   setSelectedGrand]   = useState(null);  // grandparent label (for sub-sub)
  const [products,        setProducts]        = useState([]);
  const [prodLoad,        setProdLoad]        = useState(false);

  // ── inline editors ──
  const [renamingCat,   setRenamingCat]   = useState(null);
  const [renameVal,     setRenameVal]     = useState('');
  const [deletingCat,   setDeletingCat]   = useState(null);
  const [newCatName,    setNewCatName]    = useState('');
  const [showNewCat,    setShowNewCat]    = useState(false);

  // ── subcategory editor (per parent) ──
  const [editParent,    setEditParent]    = useState(null);
  const [editPath,      setEditPath]      = useState([]);   // breadcrumb: ['Fashion', "Girl's Fashion"]
  const [editSubs,      setEditSubs]      = useState([]);
  const [subInput,      setSubInput]      = useState('');
  const [renamingSub,   setRenamingSub]   = useState(null);
  const [renameSubVal,  setRenameSubVal]  = useState('');
  const [linkCatVal,    setLinkCatVal]    = useState('');

  useEffect(() => { fetchAll(); }, []);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  // ── data fetching ────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cR, hR] = await Promise.all([
        fetch(getApiUrl('products/public/categories?includeCounts=true&includeEmpty=true&deduplicate=true')),
        fetch(getApiUrl('products/public/category-hierarchy'))
      ]);
      const cD = await cR.json();
      const hD = await hR.json();
      const cats = (cD.categories || []).filter(c => c.value !== 'all');
      setCategories(cats);
      const c = {}; cats.forEach(x => { c[x.label] = x.count || 0; }); setCounts(c);
      const map = {}; (hD.hierarchy || []).forEach(h => { map[h.parent] = h.children || []; }); setHierarchy(map);
    } catch (e) { flash('err', 'Failed to load'); }
    finally { setLoading(false); }
  };

  const fetchProducts = async (label, parentLabel = null, grandparentLabel = null) => {
    setProdLoad(true); setProducts([]);
    try {
      const base = getApiUrl('products');
      let url;
      if (grandparentLabel) {
        // 3rd level: category=grandparent, subcategory=parent, subsubcategory=label
        url = `${base}?category=${encodeURIComponent(grandparentLabel)}&subcategory=${encodeURIComponent(parentLabel)}&subsubcategory=${encodeURIComponent(label)}&limit=60`;
      } else if (parentLabel) {
        // 2nd level: category=parent, subcategory=label
        url = `${base}?category=${encodeURIComponent(parentLabel)}&subcategory=${encodeURIComponent(label)}&limit=60`;
      } else {
        url = `${base}?category=${encodeURIComponent(label)}&limit=60`;
      }
      const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const d = await r.json();
      setProducts(d.products || []);
    } catch { } finally { setProdLoad(false); }
  };

  const selectCat = (label, parentLabel = null, grandparentLabel = null) => {
    if (selected === label && selectedParent === parentLabel && selectedGrand === grandparentLabel) {
      setSelected(null); setSelectedParent(null); setSelectedGrand(null); setProducts([]); return;
    }
    setSelected(label);
    setSelectedParent(parentLabel);
    setSelectedGrand(grandparentLabel);
    fetchProducts(label, parentLabel, grandparentLabel);
  };

  // ── category CRUD ────────────────────────────────────────────────────────
  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      const r = await fetch(getApiUrl('products/public/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ category: name })
      });
      const d = await r.json();
      if (r.ok) { flash('ok', `Category "${name}" added`); setNewCatName(''); setShowNewCat(false); fetchAll(); window.dispatchEvent(new CustomEvent('refreshCategories')); }
      else flash('err', d.message || 'Failed');
    } catch { flash('err', 'Error'); }
  };

  const renameCategory = async (oldName) => {
    const nv = renameVal.trim();
    if (!nv || nv === oldName) { setRenamingCat(null); return; }
    if (!confirm(`Rename "${oldName}" → "${nv}"? Updates all products.`)) return;
    try {
      const r = await fetch(getApiUrl(`products/admin/categories/${encodeURIComponent(oldName)}/rename`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newCategoryName: nv })
      });
      const d = await r.json();
      if (r.ok) { flash('ok', d.message || 'Renamed'); setRenamingCat(null); fetchAll(); window.dispatchEvent(new CustomEvent('refreshCategories')); }
      else flash('err', d.message || 'Failed');
    } catch { flash('err', 'Error'); }
  };

  const deleteCategory = async (name) => {
    if (!confirm(`Delete category "${name}"? This removes all its products.`)) return;
    try {
      const r = await fetch(getApiUrl(`products/admin/categories/${encodeURIComponent(name)}?force=true`), {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await r.json();
      if (r.ok) { flash('ok', d.message || 'Deleted'); setDeletingCat(null); if (selected === name) { setSelected(null); setProducts([]); } fetchAll(); window.dispatchEvent(new CustomEvent('refreshCategories')); }
      else flash('err', d.message || 'Failed');
    } catch { flash('err', 'Error'); }
  };

  // ── subcategory / hierarchy ops ──────────────────────────────────────────
  const openSubEditor = (parent, path = null) => {
    setEditParent(parent);
    setEditPath(path || [parent]);
    setEditSubs([...(hierarchy[parent] || [])]);
    setSubInput(''); setRenamingSub(null); setLinkCatVal('');
  };

  const saveHierarchy = async (parent, subs) => {
    setSaving(true);
    try {
      const r = await fetch(getApiUrl(`products/admin/category-hierarchy/${encodeURIComponent(parent)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ children: subs })
      });
      if (r.ok) {
        setHierarchy(prev => ({ ...prev, [parent]: subs }));
        setEditSubs([...subs]);
        localStorage.setItem('categoriesUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refreshCategories'));
        flash('ok', 'Subcategories saved');
      } else flash('err', 'Save failed');
    } catch { flash('err', 'Error'); }
    finally { setSaving(false); }
  };

  const addSub = () => {
    const v = subInput.trim();
    if (!v) return;
    if (editSubs.map(s => s.toLowerCase()).includes(v.toLowerCase())) { flash('err', `"${v}" already exists`); return; }
    const updated = [...editSubs, v];
    setEditSubs(updated);
    saveHierarchy(editParent, updated);
    setSubInput('');
  };

  const deleteSub = (sub) => {
    if (!confirm(`Remove subcategory "${sub}"?`)) return;
    const updated = editSubs.filter(s => s !== sub);
    setEditSubs(updated);
    saveHierarchy(editParent, updated);
  };

  const renameSub = async (oldSub) => {
    const nv = renameSubVal.trim();
    if (!nv || nv === oldSub) { setRenamingSub(null); return; }
    if (editSubs.map(s => s.toLowerCase()).includes(nv.toLowerCase())) { flash('err', `"${nv}" already exists`); return; }
    const updated = editSubs.map(s => s === oldSub ? nv : s);
    setEditSubs(updated);
    await saveHierarchy(editParent, updated);
    setRenamingSub(null); setRenameSubVal('');
  };

  const linkExistingCategory = async () => {
    if (!linkCatVal || !editParent) return;
    if (!confirm(`Link "${linkCatVal}" as subcategory of "${editParent}"?\n\nAll products in "${linkCatVal}" will move to category "${editParent}" with subcategory "${linkCatVal}".`)) return;
    try {
      const r = await fetch(getApiUrl(`products/admin/category-hierarchy/${encodeURIComponent(editParent)}/link-category`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ existingCategory: linkCatVal })
      });
      const d = await r.json();
      if (r.ok) {
        flash('ok', d.message);
        setLinkCatVal('');
        fetchAll();
        // re-open editor with fresh data
        setTimeout(() => openSubEditor(editParent), 600);
        window.dispatchEvent(new CustomEvent('refreshCategories'));
      } else flash('err', d.message || 'Failed');
    } catch { flash('err', 'Error'); }
  };

  // ── derived lists ────────────────────────────────────────────────────────
  const childLabels = new Set(Object.values(hierarchy).flat().map(s => s.toLowerCase()));
  const parentCats  = categories.filter(c => hierarchy[c.label]?.length > 0);
  const standAlone  = categories.filter(c => !hierarchy[c.label]?.length && !childLabels.has(c.label.toLowerCase()));
  // categories available to link (not already a sub of editParent, not editParent itself)
  const linkable = categories.filter(c =>
    c.label !== editParent &&
    !editSubs.map(s => s.toLowerCase()).includes(c.label.toLowerCase())
  );

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <button onClick={() => navigate('/admin/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '13px', fontWeight: '600', padding: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ← Back to Dashboard
          </button>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#1f2937' }}>🗂️ Category Manager</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
            Add · Rename · Delete categories &amp; manage subcategory dropdowns
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowNewCat(p => !p)} style={btn({ background: '#10b981', color: '#fff', padding: '8px 16px', fontSize: '13px' })}>
            + New Category
          </button>
          <button onClick={fetchAll} style={btn({ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px 14px', fontSize: '13px' })}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600',
          background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msg.type === 'ok' ? '#86efac' : '#fecaca'}`,
          color: msg.type === 'ok' ? '#166534' : '#dc2626' }}>
          {msg.type === 'ok' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Add new category form */}
      {showNewCat && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '14px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="New category name…"
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1.5px solid #86efac', borderRadius: '7px', fontSize: '13px' }} autoFocus />
          <button onClick={addCategory} style={btn({ background: '#10b981', color: '#fff', padding: '8px 18px', fontSize: '13px' })}>Add</button>
          <button onClick={() => { setShowNewCat(false); setNewCatName(''); }} style={btn({ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '13px' })}>Cancel</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }} /><div style={{ marginTop: '12px' }}>Loading…</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: editParent ? '1fr 380px' : '1fr 1fr', gap: '20px' }}>

          {/* ── LEFT: category tree ── */}
          <div>

            {/* Parent categories (have subcategories) */}
            {parentCats.length > 0 && (
              <section style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  📂 Categories with Subcategories ({parentCats.length})
                </div>
                {parentCats.map(cat => (
                  <CatRow key={cat.value} cat={cat} counts={counts} selected={selected}
                    subs={hierarchy[cat.label] || []}
                    hierarchy={hierarchy}
                    renamingCat={renamingCat} renameVal={renameVal}
                    onSelect={() => selectCat(cat.label)}
                    onRenameStart={() => { setRenamingCat(cat.label); setRenameVal(cat.label); }}
                    onRenameChange={setRenameVal}
                    onRenameSave={() => renameCategory(cat.label)}
                    onRenameCancel={() => setRenamingCat(null)}
                    onDelete={() => deleteCategory(cat.label)}
                    onEditSubs={() => openSubEditor(cat.label)}
                    editParent={editParent}
                    onSubSelect={selectCat}
                  />
                ))}
              </section>
            )}

            {/* Standalone categories */}
            <section>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                📁 Standalone Categories ({standAlone.length})
              </div>
              {standAlone.length === 0 && <div style={{ color: '#9ca3af', fontSize: '13px', padding: '12px 0' }}>All categories have subcategories.</div>}
              {standAlone.map(cat => (
                <CatRow key={cat.value} cat={cat} counts={counts} selected={selected}
                  subs={[]}
                  hierarchy={hierarchy}
                  renamingCat={renamingCat} renameVal={renameVal}
                  onSelect={() => selectCat(cat.label)}
                  onRenameStart={() => { setRenamingCat(cat.label); setRenameVal(cat.label); }}
                  onRenameChange={setRenameVal}
                  onRenameSave={() => renameCategory(cat.label)}
                  onRenameCancel={() => setRenamingCat(null)}
                  onDelete={() => deleteCategory(cat.label)}
                  onEditSubs={() => openSubEditor(cat.label)}
                  editParent={editParent}
                  onSubSelect={selectCat}
                />
              ))}
            </section>
          </div>

          {/* ── RIGHT: subcategory editor OR product panel ── */}
          {editParent ? (
            <SubEditor
              parent={editParent}
              path={editPath}
              hierarchy={hierarchy}
              subs={editSubs}
              subInput={subInput}
              setSubInput={setSubInput}
              renamingSub={renamingSub}
              renameSubVal={renameSubVal}
              setRenameSubVal={setRenameSubVal}
              linkCatVal={linkCatVal}
              setLinkCatVal={setLinkCatVal}
              linkable={linkable}
              saving={saving}
              onAdd={addSub}
              onDelete={deleteSub}
              onRenameStart={(sub) => { setRenamingSub(sub); setRenameSubVal(sub); }}
              onRenameSave={renameSub}
              onRenameCancel={() => setRenamingSub(null)}
              onLink={linkExistingCategory}
              onDrillDown={(sub) => openSubEditor(sub, [...editPath, sub])}
              onBreadcrumb={(idx) => {
                const newPath = editPath.slice(0, idx + 1);
                openSubEditor(newPath[newPath.length - 1], newPath);
              }}
              onClose={() => setEditParent(null)}
            />
          ) : selected ? (
            <ProductPanel
              label={selected}
              parentLabel={selectedParent}
              grandLabel={selectedGrand}
              products={products}
              loading={prodLoad}
              onClose={() => { setSelected(null); setSelectedParent(null); setSelectedGrand(null); setProducts([]); }}
              onNavigate={(id) => navigate(`/product/${id}`)}
              onManage={() => {
                // Build manage URL with correct filters
                if (selectedGrand) {
                  navigate(`/admin/products?category=${encodeURIComponent(selectedGrand)}&subcategory=${encodeURIComponent(selectedParent)}&subsubcategory=${encodeURIComponent(selected)}`);
                } else if (selectedParent) {
                  navigate(`/admin/products?category=${encodeURIComponent(selectedParent)}&subcategory=${encodeURIComponent(selected)}`);
                } else {
                  navigate(`/admin/products?category=${encodeURIComponent(selected)}`);
                }
              }}
            />
          ) : (
            <div style={{ background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
              <i className="fas fa-mouse-pointer" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }} />
              Click a category to browse products, or click <strong>Subcategories</strong> to manage its dropdown.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── CatRow ───────────────────────────────────────────────────────────────────
const CatRow = ({ cat, counts, selected, subs, hierarchy = {}, renamingCat, renameVal,
  onSelect, onRenameStart, onRenameChange, onRenameSave, onRenameCancel,
  onDelete, onEditSubs, editParent, onSubSelect }) => {
  const [open, setOpen] = useState(true);
  const isRenaming = renamingCat === cat.label;
  const isEditingThis = editParent === cat.label;

  return (
    <div style={{ background: 'white', border: `1px solid ${isEditingThis ? '#7c3aed' : '#e5e7eb'}`, borderRadius: '10px', marginBottom: '8px', overflow: 'hidden' }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: isEditingThis ? '#f5f3ff' : '#fafafa' }}>
        {subs.length > 0 && (
          <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '10px', padding: 0, flexShrink: 0 }}>
            {open ? '▼' : '▶'}
          </button>
        )}
        {isRenaming ? (
          <>
            <input value={renameVal} onChange={e => onRenameChange(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') onRenameSave(); if (e.key === 'Escape') onRenameCancel(); }}
              style={{ flex: 1, padding: '4px 8px', border: '1.5px solid #7c3aed', borderRadius: '5px', fontSize: '13px' }} />
            <button onClick={onRenameSave} style={btn({ background: '#10b981', color: '#fff' })}>✓ Save</button>
            <button onClick={onRenameCancel} style={btn({ background: '#f3f4f6', border: '1px solid #d1d5db' })}>✕</button>
          </>
        ) : (
          <>
            <button onClick={onSelect} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: selected === cat.label ? '#7c3aed' : '#1f2937' }}>
              {cat.label}
              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>{counts[cat.label] || 0} products</span>
              {subs.length > 0 && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#7c3aed', fontWeight: '600' }}>{subs.length} subcats</span>}
            </button>
            <button onClick={onEditSubs} style={btn({ background: isEditingThis ? '#7c3aed' : '#ede9fe', color: isEditingThis ? '#fff' : '#7c3aed' })} title="Manage subcategories">
              📁 Subcategories
            </button>
            <button onClick={onRenameStart} style={btn({ background: '#fef3c7', color: '#92400e' })} title="Rename">✏️</button>
            <button onClick={onDelete} style={btn({ background: '#fee2e2', color: '#dc2626' })} title="Delete">🗑️</button>
          </>
        )}
      </div>

      {/* Subcategory chips + their sub-subcategory chips */}
      {subs.length > 0 && open && !isRenaming && (
        <div style={{ padding: '6px 12px 8px 28px' }}>
          {subs.map(sub => {
            const subSubs = hierarchy[sub] || [];
            return (
              <div key={sub} style={{ marginBottom: subSubs.length ? '4px' : '0' }}>
                {/* Subcategory chip */}
                <button
                  onClick={() => onSubSelect(sub, cat.label)}
                  style={{
                    background: selected === sub ? '#7c3aed' : '#ede9fe',
                    color: selected === sub ? '#fff' : '#5b21b6',
                    border: 'none', borderRadius: '20px', padding: '3px 10px',
                    fontSize: '11px', fontWeight: '600', cursor: 'pointer', marginRight: '4px', marginBottom: '3px'
                  }}
                >
                  ↳ {sub}
                  {subSubs.length > 0 && (
                    <span style={{ marginLeft: '4px', opacity: 0.7, fontSize: '10px' }}>({subSubs.length})</span>
                  )}
                </button>

                {/* Sub-subcategory chips indented below */}
                {subSubs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '16px', marginBottom: '4px' }}>
                    {subSubs.map(ss => (
                      <button
                        key={ss}
                        onClick={() => onSubSelect(ss, sub, cat.label)}
                        style={{
                          background: selected === ss ? '#6d28d9' : '#f3e8ff',
                          color: selected === ss ? '#fff' : '#6d28d9',
                          border: '1px solid #ddd6fe', borderRadius: '20px',
                          padding: '2px 8px', fontSize: '10px', fontWeight: '600', cursor: 'pointer'
                        }}
                      >
                        ↳↳ {ss}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── SubEditor ────────────────────────────────────────────────────────────────
const SubEditor = ({ parent, path = [], hierarchy = {}, subs, subInput, setSubInput,
  renamingSub, renameSubVal, setRenameSubVal,
  linkCatVal, setLinkCatVal, linkable, saving, onAdd, onDelete,
  onRenameStart, onRenameSave, onRenameCancel, onLink, onDrillDown, onBreadcrumb, onClose }) => (
  <div style={{ background: 'white', border: '2px solid #7c3aed', borderRadius: '12px', overflow: 'hidden', alignSelf: 'start' }}>
    {/* Header */}
    <div style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', padding: '12px 16px' }}>
      {/* Breadcrumb */}
      {path.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
          {path.map((p, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {i > 0 && <span style={{ opacity: 0.6, fontSize: '10px' }}>›</span>}
              <button onClick={() => i < path.length - 1 && onBreadcrumb(i)}
                style={{ background: 'none', border: 'none', color: i === path.length - 1 ? '#fff' : 'rgba(255,255,255,0.7)', cursor: i < path.length - 1 ? 'pointer' : 'default', fontSize: '11px', fontWeight: i === path.length - 1 ? '700' : '400', padding: 0, textDecoration: i < path.length - 1 ? 'underline' : 'none' }}>
                {p}
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '14px' }}>
            📁 {path.length > 1 ? `Sub-subcategories of "${parent}"` : `Subcategories of "${parent}"`}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
            {path.length > 1 ? `Level ${path.length} subcategories` : 'Appear in header dropdown on hover'}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px' }}>✕</button>
      </div>
    </div>

    <div style={{ padding: '14px' }}>
      {/* Existing subcategories */}
      {subs.length === 0 && <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '12px' }}>No subcategories yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
        {subs.map(sub => {
          const children = hierarchy[sub] || [];
          const hasChildren = children.length > 0;
          return (
            <div key={sub}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#f8fafc', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
                {renamingSub === sub ? (
                  <>
                    <input value={renameSubVal} onChange={e => setRenameSubVal(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') onRenameSave(sub); if (e.key === 'Escape') onRenameCancel(); }}
                      style={{ flex: 1, padding: '4px 8px', border: '1.5px solid #7c3aed', borderRadius: '5px', fontSize: '12px' }} />
                    <button onClick={() => onRenameSave(sub)} style={btn({ background: '#7c3aed', color: '#fff' })}>Save</button>
                    <button onClick={onRenameCancel} style={btn({ background: '#f3f4f6', border: '1px solid #d1d5db' })}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#1f2937' }}>
                      ↳ {sub}
                      {hasChildren && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#7c3aed', fontWeight: '600' }}>{children.length} sub</span>}
                    </span>
                    {/* Drill into sub-of-sub — fix #1: replaced corrupted emoji with text */}
                    <button onClick={() => onDrillDown(sub)} title={`Manage subcategories of "${sub}"`}
                      style={btn({ background: '#ede9fe', color: '#7c3aed' })}>+ Sub</button>
                    <button onClick={() => onRenameStart(sub)} style={btn({ background: '#fef3c7', color: '#92400e' })}>✏️</button>
                    <button onClick={() => onDelete(sub)} style={btn({ background: '#fee2e2', color: '#dc2626' })}>🗑️</button>
                  </>
                )}
              </div>
              {/* fix #2: show sub-subcategory children as chips below each row */}
              {hasChildren && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 10px 4px 22px' }}>
                  {children.map(child => (
                    <button key={child} onClick={() => onDrillDown(sub)}
                      style={{ background: '#f3e8ff', color: '#6d28d9', border: '1px solid #ddd6fe', borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>
                      ↳↳ {child}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new subcategory — fix #4: label changes based on depth */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          {path.length > 1 ? 'Add New Sub-Subcategory' : 'Add New Subcategory'}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input value={subInput} onChange={e => setSubInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
            placeholder="e.g. Dresses, Tops…"
            style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: '7px', fontSize: '12px' }} />
          <button onClick={onAdd} disabled={saving} style={btn({ background: '#10b981', color: '#fff', padding: '8px 14px', fontSize: '12px' })}>
            {saving ? '…' : '+ Add'}
          </button>
        </div>
      </div>

      {/* Link existing category — only at top level */}
      {path.length <= 1 && linkable.length > 0 && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>🔗 Link Existing Category</div>
          <div style={{ fontSize: '11px', color: '#0369a1', marginBottom: '8px' }}>
            Moves all products from that category under <strong>{parent}</strong> as a subcategory.
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <select value={linkCatVal} onChange={e => setLinkCatVal(e.target.value)}
              style={{ flex: 1, padding: '7px 10px', border: '1.5px solid #7dd3fc', borderRadius: '7px', fontSize: '12px', background: 'white' }}>
              <option value="">-- Select category --</option>
              {linkable.map(c => <option key={c.value} value={c.label}>{c.label} ({c.count || 0} products)</option>)}
            </select>
            <button onClick={onLink} disabled={!linkCatVal} style={btn({ background: linkCatVal ? '#0369a1' : '#9ca3af', color: '#fff', padding: '7px 12px', fontSize: '12px' })}>
              Link
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

// ── ProductPanel ─────────────────────────────────────────────────────────────
const ProductPanel = ({ label, parentLabel, grandLabel, products, loading, onClose, onNavigate, onManage }) => {
  // Build breadcrumb title: Fashion › Girl's Fashion › Clothing
  const titleParts = [grandLabel, parentLabel, label].filter(Boolean);
  const title = titleParts.length > 1 ? titleParts.join(' › ') : label;

  return (
  <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', alignSelf: 'start' }}>
    <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: '700', fontSize: '14px' }}>{title}</div>
        <div style={{ fontSize: '11px', opacity: 0.85 }}>{products.length} products</div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={onManage} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
          Manage →
        </button>
        <button onClick={onClose} style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
      </div>
    </div>
    <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}><i className="fas fa-spinner fa-spin" /> Loading…</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No products found</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', padding: '14px' }}>
          {products.map(p => (
            <div key={p._id} onClick={() => onNavigate(p._id)}
              style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: 'white' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ height: '80px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
                {p.images?.[0]
                  ? <img src={p.images[0]} alt={p.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  : <i className="fas fa-box" style={{ color: '#d1d5db', fontSize: '1.2rem' }} />}
              </div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</div>
                <div style={{ fontSize: '10px', color: '#059669', fontWeight: '700', marginTop: '2px' }}>£{parseFloat(p.price || 0).toFixed(2)}</div>
                {p.subsubcategory
                  ? <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '1px' }}>{p.subcategory} › {p.subsubcategory}</div>
                  : p.subcategory
                    ? <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '1px' }}>{p.subcategory}</div>
                    : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  );
};

export default CategoryManager;
