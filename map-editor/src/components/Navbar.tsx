interface NavbarProps {
  onSave: () => void;
  onMyWorlds: () => void;
}

function Navbar({ onSave, onMyWorlds }: NavbarProps) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 52,
      background: '#1a1a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 20,
    }}>
      <span style={{ color: 'white', fontFamily: 'sans-serif', fontWeight: 600, fontSize: 16 }}>
        Map Editor
      </span>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onMyWorlds}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid #ffffff40',
            background: 'transparent',
            color: 'white',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
            fontSize: 14
          }}
        >
          My Worlds
        </button>
        <button
          onClick={onSave}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: 'none',
            background: '#4f46e5',
            color: 'white',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
            fontSize: 14
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default Navbar;