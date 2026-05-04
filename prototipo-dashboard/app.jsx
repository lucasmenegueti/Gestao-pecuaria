// Top-level App. Controla login state + view atual + período global.

function App() {
  const [authed, setAuthed] = React.useState(false);
  const [view, setView] = React.useState('overview');
  const [period, setPeriod] = React.useState('today');

  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [view, authed]);

  if (!authed) {
    return <LoginView onLogin={() => setAuthed(true)} />;
  }

  const viewMeta = {
    overview:    { crumb:'Fazenda',  title:'Visão geral',  primaryAction: null },
    paddocks:    { crumb:'Pecuária', title:'Talhões',      primaryAction: { label:'Solicitar inspeção', icon:'plus' } },
    map:         { crumb:'Pecuária', title:'Mapa',         primaryAction: null },
    herd:        { crumb:'Pecuária', title:'Rebanho',      primaryAction: { label:'Registrar evento', icon:'plus' } },
    inventory:   { crumb:'Pecuária', title:'Estoque',      primaryAction: { label:'Nova rota', icon:'plus' } },
    team:        { crumb:'Operação', title:'Equipe',       primaryAction: null },
    alerts:      { crumb:'Operação', title:'Alertas',      primaryAction: null },
    inspections: { crumb:'Operação', title:'Inspeções',    primaryAction: { label:'Nova inspeção', icon:'plus' } },
  };
  const meta = viewMeta[view];

  const navigate = (id) => setView(id);

  return (
    <div style={{display:'flex', height:'100vh', background: NSA.bg}}>
      <Sidebar current={view} setCurrent={setView} onLogout={() => setAuthed(false)} />
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
        <TopBar
          crumb={meta.crumb}
          title={meta.title}
          period={period}
          setPeriod={setPeriod}
          primaryAction={meta.primaryAction}
        />
        <div style={{flex:1, overflow:'hidden', background: NSA.bg}}>
          {view === 'overview'    && <OverviewView    period={period} navigate={navigate} />}
          {view === 'paddocks'    && <PaddocksView    period={period} navigate={navigate} />}
          {view === 'map'         && <MapView         period={period} navigate={navigate} />}
          {view === 'herd'        && <HerdView        period={period} navigate={navigate} />}
          {view === 'inventory'   && <InventoryView   period={period} navigate={navigate} />}
          {view === 'team'        && <TeamView        period={period} navigate={navigate} />}
          {view === 'alerts'      && <AlertsView      period={period} navigate={navigate} />}
          {view === 'inspections' && <InspectionsView period={period} navigate={navigate} />}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
