import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { adminGet, adminPut } from '../../utils/adminApi';
import { getApiUrl } from '../../utils/api';

const EditProductModal = ({ open, onClose, productId, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '', price: 0, shipping: 0, category: '', brand: '',
    asin: '', sku: '', stock: 0, status: 'active', isAmazonsChoice: false,
  });

  useEffect(() => {
    if (open && productId) loadData();
  }, [open, productId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch(getApiUrl('products/public/categories')),
        adminGet(`products/${productId}`)
      ]);
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
      }
      const prod = await prodRes.json();
      setForm({
        name: prod.name || '',
        price: prod.price || 0,
        shipping: prod.shipping || 0,
        category: prod.category || '',
        brand: prod.brand || '',
        asin: prod.asin || '',
        sku: prod.sku || '',
        stock: prod.stock || 0,
        status: prod.status || 'active',
        isAmazonsChoice: prod.isAmazonsChoice || false,
      });
    } catch {
      alert('Failed to load product');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminPut(`products/${productId}`, form);
      if (res.ok) {
        onSaved?.();
        onClose();
      } else {
        alert('Failed to save');
      }
    } catch {
      alert('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const sx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 3,
          m: { xs: 1, sm: 2 },
          maxHeight: { xs: '95vh', sm: '90vh' },
        }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          py: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
          Edit Product
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => window.open(`/admin/products/edit/${productId}`, '_blank')}
            sx={{ color: '#fff' }}
            title="Open full edit page"
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3, overflowY: 'auto' }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Box
              sx={{
                display: 'inline-block',
                width: 40,
                height: 40,
                border: '4px solid #f3f4f6',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                label="Product Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                fullWidth
                sx={sx}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Price (£)"
                name="price"
                type="number"
                value={form.price}
                onChange={handleChange}
                required
                fullWidth
                sx={sx}
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Shipping (£)"
                name="shipping"
                type="number"
                value={form.shipping}
                onChange={handleChange}
                fullWidth
                sx={sx}
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth sx={sx}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  label="Category"
                >
                  {categories.map(c => (
                    <MenuItem key={c.value} value={c.label}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Brand"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                fullWidth
                sx={sx}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="ASIN"
                name="asin"
                value={form.asin}
                onChange={handleChange}
                fullWidth
                sx={sx}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="SKU"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                fullWidth
                sx={sx}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Stock"
                name="stock"
                type="number"
                value={form.stock}
                onChange={handleChange}
                fullWidth
                sx={sx}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth sx={sx}>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ mb: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isAmazonsChoice}
                    onChange={e => setForm(p => ({ ...p, isAmazonsChoice: e.target.checked }))}
                    color="warning"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Amazon's Choice Product
                  </Typography>
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  background: '#f0f4ff',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <OpenInNewIcon sx={{ fontSize: 16, color: '#667eea' }} />
                <Typography variant="caption" sx={{ color: '#667eea' }}>
                  For images, profit calculations, and advanced settings — use Full Edit Page.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          gap: 1,
        }}
      >
        <Button onClick={onClose} disabled={saving} sx={{ color: '#6b7280', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          onClick={() => window.open(`/admin/products/edit/${productId}`, '_blank')}
          variant="outlined"
          disabled={saving}
          sx={{ borderColor: '#667eea', color: '#667eea', fontWeight: 600 }}
          startIcon={<OpenInNewIcon />}
        >
          Full Edit
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || loading}
          sx={{
            background: '#667eea',
            '&:hover': { background: '#5a67d8' },
            fontWeight: 700,
            px: 3,
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProductModal;

