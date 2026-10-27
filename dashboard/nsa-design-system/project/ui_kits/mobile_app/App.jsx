function App() {
  React.useEffect(() => {
    const iv = setInterval(() => window.lucide && window.lucide.createIcons(), 200);
    return () => clearInterval(iv);
  }, []);
  return (
    <React.Fragment>
      <div className="stack">
        <IOSDevice width={390} height={800}>
          <OSListScreen />
        </IOSDevice>
        <div className="caption">Ordens de serviço · lista</div>
      </div>
      <div className="stack">
        <IOSDevice width={390} height={800}>
          <OSDetailScreen />
        </IOSDevice>
        <div className="caption">OS · detalhe</div>
      </div>
    </React.Fragment>
  );
}
ReactDOM.createRoot(document.getElementById('app')).render(<App />);
