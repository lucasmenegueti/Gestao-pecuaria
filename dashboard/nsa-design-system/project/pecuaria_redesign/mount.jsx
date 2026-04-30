function Phone({ children }) {
  return <IOSDevice width={390} height={820}>{children}</IOSDevice>;
}
function mount(id, El) {
  const node = document.getElementById(id);
  if (node) ReactDOM.createRoot(node).render(<Phone>{El}</Phone>);
}
setTimeout(() => {
  mount('login',            <LoginScreen/>);
  mount('dashboard',        <DashboardScreen/>);
  mount('ronda',            <RondaScreen/>);
  mount('menu-avaliacao',   <MenuAvaliacaoScreen/>);

  mount('sup-cocho',        <SupCochoScreen/>);
  mount('sup-sacos',        <SupSacosScreen/>);
  mount('sup-resumo',       <SupResumoScreen/>);
  mount('forragem',         <ForragemScreen/>);
  mount('aguada',           <AguadaScreen/>);
  mount('sanidade',         <SanidadeScreen/>);
  mount('cerca',            <CercaScreen/>);
  mount('peso',             <PesoScreen/>);

  mount('mapa',             <MapaScreen/>);
  mount('rebanho',          <RebanhoScreen/>);
  mount('estoque',          <EstoqueScreen/>);
  mount('lotacao',          <LotacaoScreen/>);
  mount('reab-rota',        <ReabRotaScreen/>);

  setInterval(() => window.lucide && window.lucide.createIcons(), 300);
}, 50);
