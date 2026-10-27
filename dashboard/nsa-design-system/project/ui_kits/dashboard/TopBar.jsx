const topbarStyles = {
  bar: {
    height: 56, padding: '0 28px',
    borderBottom: '1px solid #e5e5e1',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#ffffff', flexShrink: 0,
  },
  left: { display: 'flex', alignItems: 'center', gap: 16 },
  crumb: { fontSize: 13, color: '#787873' },
  title: { fontSize: 15, fontWeight: 600, color: '#1f1f1c', letterSpacing: '-0.005em' },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  search: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#f7f7f5', padding: '7px 12px',
    borderRadius: 6, fontSize: 13, color: '#787873',
    width: 260, border: '1px solid transparent',
  },
  kbd: {
    marginLeft: 'auto',
    fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11,
    padding: '2px 6px', background: '#fff', borderRadius: 4,
    border: '1px solid #e5e5e1', color: '#787873',
  },
  btn: {
    display:'flex', alignItems:'center', gap:6,
    padding: '7px 11px', fontSize: 13, fontWeight: 500,
    background: '#fff', border: '1px solid #d2d2cd',
    borderRadius: 6, color: '#1f1f1c', cursor: 'pointer',
  },
  btnPrimary: {
    background: '#172514', color: '#FFFFE3', border: '1px solid #172514',
  },
  iconBtn: {
    width: 32, height: 32, display:'flex', alignItems:'center', justifyContent:'center',
    borderRadius: 6, cursor: 'pointer', color: '#54544f',
  },
};

function TopBar({ crumb, title, primaryAction }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div style={topbarStyles.bar}>
      <div style={topbarStyles.left}>
        {crumb && <span style={topbarStyles.crumb}>{crumb} <span style={{color:'#d2d2cd', margin:'0 6px'}}>/</span></span>}
        <span style={topbarStyles.title}>{title}</span>
      </div>
      <div style={topbarStyles.right}>
        <div style={topbarStyles.search}>
          <i data-lucide="search" style={{width:14, height:14, strokeWidth:2}}></i>
          <span>Buscar piquetes, lotes…</span>
          <span style={topbarStyles.kbd}>⌘K</span>
        </div>
        <div style={topbarStyles.iconBtn}><i data-lucide="bell" style={{width:16, height:16, strokeWidth:1.75}}></i></div>
        {primaryAction && (
          <button style={{...topbarStyles.btn, ...topbarStyles.btnPrimary}}>
            <i data-lucide="plus" style={{width:14, height:14, strokeWidth:2}}></i>
            {primaryAction}
          </button>
        )}
      </div>
    </div>
  );
}

window.TopBar = TopBar;
