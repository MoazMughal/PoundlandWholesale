import { useCurrency } from '../context/CurrencyContext';

const CurrencySelector = ({ position = 'fixed', style = {} }) => {
  const { currency, setCurrency, currencyFlags } = useCurrency();

  const defaultStyle = position === 'fixed' ? {
    position: 'fixed',
    top: '80px',
    right: '20px',
    zIndex: 999,
    background: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    ...style
  } : {
    background: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    ...style
  };

  return (
    <div style={defaultStyle}>
      <select 
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="form-select form-select-sm"
        style={{
          border: '1px solid #ddd',
          fontSize: '0.85rem',
          fontWeight: '600',
          cursor: 'pointer',
          outline: 'none',
          paddingRight: '30px',
          minWidth: '110px'
        }}
      >
        <option value="GBP">{currencyFlags?.GBP || '🇬🇧'} £ (GBP)</option>
        <option value="PKR">{currencyFlags?.PKR || '🇵🇰'} Rs (PKR)</option>
        <option value="USD">{currencyFlags?.USD || '🇺🇸'} $ (USD)</option>
        <option value="AED">{currencyFlags?.AED || '🇦🇪'} د.إ (AED)</option>
      </select>
    </div>
  );
};

export default CurrencySelector;
