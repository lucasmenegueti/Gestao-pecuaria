// TopBar com PeriodPicker global (hoje / 7 dias / semana passada / personalizado).

function TopBar({ crumb, title, period, setPeriod, primaryAction }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div style={{
      height: 56, padding: '0 28px',
      borderBottom: `1px solid ${NSA.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#ffffff', flexShrink: 0,
    }}>
      <div style={{display:'flex', alignItems:'center', gap:16, minWidth:0}}>
        {crumb && (
          <span style={{fontSize:13, color:NSA.inkMuted, whiteSpace:'nowrap'}}>
            {crumb} <span style={{color:NSA.borderStrong, margin:'0 6px'}}>/</span>
          </span>
        )}
        <span style={{fontSize:15, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.005em', whiteSpace:'nowrap'}}>{title}</span>
      </div>

      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <PeriodPicker value={period} onChange={setPeriod} />
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          background: NSA.bgSubtle, padding:'7px 12px',
          borderRadius:6, fontSize:13, color:NSA.inkMuted,
          width:200, border:'1px solid transparent',
        }}>
          <i data-lucide="search" style={{width:14, height:14, strokeWidth:2}}></i>
          <span>Buscar talhão, peão…</span>
        </div>
        <div style={{
          width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
          borderRadius:6, cursor:'pointer', color:NSA.inkMuted, position:'relative',
        }}>
          <i data-lucide="bell" style={{width:16, height:16, strokeWidth:1.75}}></i>
          <span style={{
            position:'absolute', top:6, right:6,
            width:8, height:8, borderRadius:'50%', background:NSA.danger,
            border:'2px solid #fff',
          }}></span>
        </div>
        {primaryAction && (
          <Btn variant="primary" icon={primaryAction.icon}>{primaryAction.label}</Btn>
        )}
      </div>
    </div>
  );
}

function PeriodPicker({ value, onChange }) {
  const opts = [
    { id: 'today',     label: 'Hoje' },
    { id: '7d',        label: '7 dias' },
    { id: 'lastweek',  label: 'Semana passada' },
    { id: 'custom',    label: 'Personalizado' },
  ];
  const [open, setOpen] = React.useState(false);
  const current = opts.find(o => o.id === value) || opts[0];
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  return (
    <div style={{position:'relative'}}>
      <button onClick={() => setOpen(!open)} style={{
        display:'inline-flex', alignItems:'center', gap:6,
        padding:'6px 11px', fontSize:13, fontWeight:500,
        background:'#fff', color:NSA.inkPrimary, border:`1px solid ${NSA.borderStrong}`,
        borderRadius:6, cursor:'pointer', whiteSpace:'nowrap',
      }}>
        <i data-lucide="calendar" style={{width:14, height:14, strokeWidth:1.75}}></i>
        <span>{current.label}</span>
        <i data-lucide="chevron-down" style={{width:12, height:12, strokeWidth:2, opacity:0.6}}></i>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:10,
          background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:8,
          minWidth:180, boxShadow:'0 8px 24px rgba(15,15,13,0.08)', padding:4,
        }}>
          {opts.map(o => (
            <div key={o.id} onClick={() => { onChange(o.id); setOpen(false); }} style={{
              padding:'7px 10px', fontSize:13, borderRadius:5, cursor:'pointer',
              background: o.id === value ? NSA.green100 : 'transparent',
              color: o.id === value ? NSA.green800 : NSA.inkPrimary,
              fontWeight: o.id === value ? 500 : 400,
              display:'flex', alignItems:'center', justifyContent:'space-between',
            }}
            onMouseEnter={e => { if (o.id !== value) e.currentTarget.style.background = NSA.bgSubtle; }}
            onMouseLeave={e => { if (o.id !== value) e.currentTarget.style.background = 'transparent'; }}>
              {o.label}
              {o.id === value && <i data-lucide="check" style={{width:12, height:12, strokeWidth:2.5, color:NSA.green800}}></i>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.TopBar = TopBar;
window.PeriodPicker = PeriodPicker;
