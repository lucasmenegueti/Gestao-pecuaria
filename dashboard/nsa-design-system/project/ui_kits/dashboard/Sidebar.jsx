const sidebarStyles = {
  aside: {
    width: 232, height: '100vh',
    background: '#172514', color: '#FFFFE3',
    display: 'flex', flexDirection: 'column',
    padding: '20px 0', flexShrink: 0, boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    padding: '4px 20px 20px', display: 'flex', alignItems: 'center', gap: 10,
    borderBottom: '1px solid rgba(255,255,227,0.08)', marginBottom: 12,
  },
  logo: { height: 28 },
  wm: { fontFamily: 'Lora, Georgia, serif', letterSpacing: '0.14em', fontSize: 14 },
  wmSub: { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6, marginTop: 2 },
  section: { padding: '0 12px', marginBottom: 16 },
  sectionTitle: {
    fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'rgba(255,255,227,0.45)', padding: '8px 8px', marginTop: 4,
  },
  item: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 6, fontSize: 13.5, fontWeight: 500,
    color: 'rgba(255,255,227,0.75)', cursor: 'pointer',
    transition: 'background 120ms, color 120ms',
  },
  itemActive: { background: 'rgba(255,255,227,0.08)', color: '#FFFFE3' },
  itemHover: { background: 'rgba(255,255,227,0.04)' },
  icon: { width: 16, height: 16, strokeWidth: 1.75, flexShrink: 0 },
  user: {
    marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid rgba(255,255,227,0.08)',
    display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
  },
  avatar: {
    width: 28, height: 28, borderRadius: '50%', background: '#3f6340',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 600, color: '#FFFFE3', letterSpacing: '0.02em',
  },
};

function SidebarItem({ icon, label, active, onClick }) {
  const [hover, setHover] = React.useState(false);
  const style = {
    ...sidebarStyles.item,
    ...(active ? sidebarStyles.itemActive : {}),
    ...(hover && !active ? sidebarStyles.itemHover : {}),
  };
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div style={style} onClick={onClick}
         onMouseEnter={() => setHover(true)}
         onMouseLeave={() => setHover(false)}>
      <i data-lucide={icon} style={sidebarStyles.icon}></i>
      <span>{label}</span>
    </div>
  );
}

function Sidebar({ current, setCurrent }) {
  return (
    <aside style={sidebarStyles.aside}>
      <div style={sidebarStyles.header}>
        <img src="../../assets/logo-nsa-cream-transparent.png" style={sidebarStyles.logo} />
        <div>
          <div style={sidebarStyles.wm}>N.S.A</div>
          <div style={sidebarStyles.wmSub}>fazenda</div>
        </div>
      </div>

      <div style={sidebarStyles.section}>
        <SidebarItem icon="layout-dashboard" label="Visão geral"
                     active={current==='dashboard'}
                     onClick={() => setCurrent('dashboard')} />
      </div>

      <div style={sidebarStyles.section}>
        <div style={sidebarStyles.sectionTitle}>Pecuária</div>
        <SidebarItem icon="map" label="Piquetes"
                     active={current==='piquetes'}
                     onClick={() => setCurrent('piquetes')} />
        <SidebarItem icon="beef" label="Rebanho" />
        <SidebarItem icon="package" label="Estoque de sal & ração" />
        <SidebarItem icon="droplets" label="Consumo de água" />
      </div>

      <div style={sidebarStyles.section}>
        <div style={sidebarStyles.sectionTitle}>Agricultura</div>
        <SidebarItem icon="sprout" label="Talhões" />
        <SidebarItem icon="wheat" label="Safras" />
      </div>

      <div style={sidebarStyles.section}>
        <div style={sidebarStyles.sectionTitle}>Operação</div>
        <SidebarItem icon="users" label="Equipe" />
        <SidebarItem icon="file-text" label="Relatórios" />
        <SidebarItem icon="wrench" label="Manutenção" />
      </div>

      <div style={sidebarStyles.user}>
        <div style={sidebarStyles.avatar}>JR</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:500}}>João Roberto</div>
          <div style={{fontSize:11, opacity:0.6}}>Gestor</div>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
