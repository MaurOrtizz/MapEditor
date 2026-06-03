import { useState, useEffect } from 'react';

interface CountryData {
  name: string;
  color: string;
}

interface CountryPanelProps {
  countryName: string;
  data: CountryData;
  onChange: (data: CountryData) => void;
  onClose: () => void;
}

function CountryPanel({ countryName, data, onChange }: CountryPanelProps) {
  const [localColor, setLocalColor] = useState(data.color);

  // Si cambia el país seleccionado, sincroniza el color local
  useEffect(() => {
    setLocalColor(data.color);
  }, [countryName]);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 300,
      height: '100vh',
      background: 'white',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
      padding: 24,
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      overflowY: 'auto',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>NOMBRE EN TU MUNDO</label>
        <input
          type="text"
          value={data.name}
          onChange={e => onChange({ ...data, name: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 14
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>COLOR</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="color"
            value={localColor}
            onInput={e => setLocalColor((e.target as HTMLInputElement).value)}
            onBlur={() => onChange({ ...data, color: localColor })}
            style={{ width: 48, height: 36, cursor: 'pointer', border: 'none' }}
          />
          <span style={{ fontSize: 14, color: '#444' }}>{localColor}</span>
        </div>
      </div>
    </div>
  );
}

export default CountryPanel;