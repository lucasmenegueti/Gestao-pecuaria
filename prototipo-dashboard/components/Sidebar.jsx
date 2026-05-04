function Sidebar({ current, setCurrent, onLogout }) {
  const items = [
    { group: null, items: [
      { id: 'overview', icon: 'layout-dashboard', label: 'Visão geral' },
    ]},
    { group: 'Pecuária', items: [
      { id: 'paddocks',   icon: 'grid-2x2',   label: 'Talhões' },
      { id: 'map',        icon: 'map',        label: 'Mapa' },
      { id: 'herd',       icon: 'beef',       label: 'Rebanho' },
      { id: 'inventory',  icon: 'package',    label: 'Estoque' },
    ]},
    { group: 'Operação', items: [
      { id: 'team',        icon: 'users',     label: 'Equipe' },
      { id: 'alerts',      icon: 'bell-ring', label: 'Alertas',     badge: 12 },
      { id: 'inspections', icon: 'clipboard-check', label: 'Inspeções', badge: 4 },
    ]},
  ];

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  return (
    <aside style={{
      width: 232, height: '100vh',
      background: NSA.green800, color: NSA.cream,
      display: 'flex', flexDirection: 'column',
      padding: '20px 0', flexShrink: 0,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        padding: '4px 20px 20px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,227,0.08)', marginBottom: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 6,
          background: NSA.cream, color: NSA.green800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: 13, letterSpacing: '0.06em',
        }}>NSA</div>
        <div>
          <div style={{fontFamily:'Lora, Georgia, serif', letterSpacing:'0.14em', fontSize:14}}>N.S.A</div>
          <div style={{fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', opacity:0.6, marginTop:2}}>pecuária</div>
        </div>
      </div>

      <div style={{flex:1, overflowY:'auto'}}>
        {items.map((sec, si) => (
          <div key={si} style={{padding:'0 12px', marginBottom: 14}}>
            {sec.group && (
              <div style={{
                fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(255,255,227,0.45)', padding: '8px 8px', marginTop: 4,
              }}>{sec.group}</div>
            )}
            {sec.items.map(it => (
              <SidebarItem key={it.id} {...it} active={current === it.id} onClick={() => setCurrent(it.id)} />
            ))}
          </div>
        ))}
      </div>

      <div style={{
        padding: '12px 16px', borderTop: '1px solid rgba(255,255,227,0.08)',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
      }}>
        <Avatar initials="LM" color={NSA.green500} />
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:500}}>Lucas Menegueti</div>
          <div style={{fontSize:11, opacity:0.6}}>Admin</div>
        </div>
        <i data-lucide="log-out" style={{width:16, height:16, strokeWidth:1.75, opacity:0.6, cursor:'pointer'}} onClick={onLogout}></i>
      </div>
    </aside>
  );
}

function SidebarItem({ icon, label, active, badge, onClick }) {
  const [hover, setHover] = React.useState(false);
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 6, fontSize: 13.5, fontWeight: 500,
        color: active ? NSA.cream : 'rgba(255,255,227,0.75)',
        background: active ? 'rgba(255,255,227,0.08)' : (hover ? 'rgba(255,255,227,0.04)' : 'transparent'),
        cursor: 'pointer', transition: 'background 120ms, color 120ms',
      }}>
      <i data-lucide={icon} style={{width:16, height:16, strokeWidth:1.75, flexShrink:0}}></i>
      <span style={{flex:1}}>{label}</span>
      {badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
          background: 'rgba(255,255,227,0.12)', color: NSA.cream, letterSpacing: '0.02em',
        }}>{badge}</span>
      )}
    </div>
  );
}

window.Sidebar = Sidebar;
