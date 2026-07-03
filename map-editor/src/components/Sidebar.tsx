interface SidebarProps {
  isAddingCountry: boolean;
  onToggleAddCountry: () => void;
}

function Sidebar({ isAddingCountry, onToggleAddCountry }: SidebarProps) {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      right: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      background: '#1a1a2e',
      borderRadius: 8,
      padding: 6,
      zIndex: 20
    }}>
      <button
        onClick={onToggleAddCountry}
        title="Add Polygon"
        style={{
          width: 36,
          height: 36,
          border: 'none',
          borderRadius: 6,
          background: isAddingCountry ? '#4f46e5' : 'transparent',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18
        }}
      >
        ⬡
      </button>
    </div>
  );
}

export default Sidebar;