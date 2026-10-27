function Phone({ children }) {
  return <IOSDevice width={390} height={820}>{children}</IOSDevice>;
}

function mount(id, El) {
  const node = document.getElementById(id);
  if (node) ReactDOM.createRoot(node).render(<Phone>{El}</Phone>);
}

setTimeout(() => {
  mount('menu-phone',       <MenuScreen/>);
  mount('login-phone',      <LoginScreen/>);
  mount('os-list-phone',    <OSListScreen/>);
  mount('os-detail-phone',  <OSDetailScreen/>);
  mount('os-nova-phone',    <NovaOSScreen/>);
  mount('dashboard-phone',  <DashboardScreen/>);
  mount('maquinas-phone',   <MaquinasScreen/>);

  // Keep lucide icons refreshed as React re-renders
  setInterval(() => window.lucide && window.lucide.createIcons(), 250);
}, 40);
