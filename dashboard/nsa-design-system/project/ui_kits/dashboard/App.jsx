function App() {
  const [view, setView] = React.useState('piquetes');
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [view]);

  const viewMeta = {
    dashboard: { crumb:'Fazenda', title:'Visão geral', primary:'Novo lançamento' },
    piquetes:  { crumb:'Pecuária', title:'Piquetes',   primary:'Registrar manejo' },
  };
  const meta = viewMeta[view];

  return (
    <div style={{display:'flex', height:'100vh', background:'#fcfcfb'}}>
      <Sidebar current={view} setCurrent={setView} />
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
        <TopBar crumb={meta.crumb} title={meta.title} primaryAction={meta.primary} />
        <div style={{flex:1, overflow:'hidden'}}>
          {view === 'dashboard' && <DashboardView />}
          {view === 'piquetes'  && <PiquetesView />}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
