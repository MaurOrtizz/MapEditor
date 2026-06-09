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
  isEditing: boolean;
  onEditBorders: () => void;
  onDoneEditing: () => void;
}

function CountryPanel({ countryName, data, onChange, onClose, isEditing, onEditBorders, onDoneEditing }: CountryPanelProps) {  const [localColor, setLocalColor] = useState(data.color);

  useEffect(() => {
    setLocalColor(data.color);
  }, [countryName]);

  return (
    <div style={{
      position: 'absolute',
      top: 52,
      right: 0,
      width: 300,
      height: 'calc(100vh - 52px)',
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
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 18, color: '#666' }}>✕</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>NAME</label>
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
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!isEditing ? (
          <button
            onClick={onEditBorders}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#4f46e5',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'sans-serif'
            }}
          >
            Edit Borders
          </button>
        ) : (
          <button
            onClick={onDoneEditing}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#16a34a',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'sans-serif'
            }}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

export default CountryPanel;