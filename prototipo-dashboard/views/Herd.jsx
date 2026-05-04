// Rebanho — distribuição por categoria, lotação por talhão, eventos do período (entrada/morte/venda/transferência).

function HerdView({ period, navigate }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;

  // Distribuição por categoria (somando heads de todos os paddocks)
  // No mock simplificamos: cada paddock tem uma categoria principal. Em prod, vem de herd.
  const byCat = {};
  M.PADDOCKS.forEach(p => {
    const key = p.cat;
    if (!byCat[key]) byCat[key] = { category: key, heads: 0, paddocks: 0, bodyKg: 0 };
    byCat[key].heads += p.heads;
    byCat[key].paddocks += 1;
    byCat[key].bodyKg += p.bodyKg;
  });
  const categories = Object.values(byCat).sort((a, b) => b.heads - a.heads);
  const total = categories.reduce((s, c) => s + c.heads, 0);

  // Top piquetes por lotação
  const topStocking = [...M.PADDOCKS]
    .map(p => ({ ...p, stockingRate: p.heads / p.area }))
    .sort((a, b) => b.stockingRate - a.stockingRate)
    .slice(0, 8);

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:18}}>
        <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:6}}>
          Pecuária · 11 categorias
        </div>
        <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:NSA.inkPrimary}}>
          Rebanho
        </h1>
      </div>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:24}}>
        <KPICard label="Rebanho ativo"   value={M.KPIS.totalHeads.toLocaleString('pt-BR')} unit="cab" note="alocado em piquetes" />
        <KPICard label="UA / ha média"   value={M.KPIS.stockingRate} note={`${M.KPIS.totalArea} ha pastoreáveis`} />
        <KPICard label="Mortalidade 30d" value="2" unit="cab" note="bicheira · cobra" accent={NSA.warn} />
        <KPICard label="Vendas 30d"      value="28" unit="cab" delta="R$ 168k" deltaDir="up" note="frigorífico Marfrig" />
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24}}>
        {/* Distribuição por categoria */}
        <Card title="Distribuição por categoria" subtitle="11 categorias · ordenado por cabeças">
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {categories.map(c => {
              const pct = (c.heads / total) * 100;
              return (
                <div key={c.category}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', fontSize:13, marginBottom:4}}>
                    <span style={{fontWeight:500, color:NSA.inkPrimary}}>{c.category}</span>
                    <span style={{color:NSA.inkMuted, fontVariantNumeric:'tabular-nums'}}>
                      <span style={{color:NSA.inkPrimary, fontWeight:500}}>{c.heads.toLocaleString('pt-BR')}</span>
                      <span style={{margin:'0 6px', color:NSA.borderStrong}}>·</span>
                      {pct.toFixed(1)}%
                      <span style={{margin:'0 6px', color:NSA.borderStrong}}>·</span>
                      {c.paddocks} {c.paddocks === 1 ? 'piquete' : 'piquetes'}
                    </span>
                  </div>
                  <div style={{height:6, background:NSA.borderSubtle, borderRadius:3, overflow:'hidden'}}>
                    <div style={{
                      width:`${pct}%`, height:'100%', background: c.category === 'PARES' ? NSA.green500 : c.category.startsWith('VACA') ? '#7a4d3b' : c.category === 'GARROTE' ? '#264868' : '#7a550f',
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top piquetes por lotação */}
        <Card title="Maior lotação" subtitle="UA por hectare — top 8" padding={0}>
          <DataTable
            columns={[
              { key:'name', label:'Talhão', render: r => <span style={{fontWeight:500}}>{r.name}</span> },
              { key:'area', label:'Área',    align:'right', render: r => `${r.area} ha` },
              { key:'heads', label:'Cabeças',align:'right', render: r => r.heads.toLocaleString('pt-BR') },
              { key:'rate', label:'cab/ha',   align:'right', render: r => (
                <span style={{
                  fontWeight:600,
                  color: r.stockingRate > 3 ? NSA.danger : (r.stockingRate > 2 ? NSA.warn : NSA.inkPrimary),
                }}>{r.stockingRate.toFixed(2)}</span>
              )},
            ]}
            rows={topStocking}
          />
        </Card>
      </div>

      {/* Eventos do rebanho */}
      <Card
        title="Eventos do rebanho"
        subtitle="Movimentações nos últimos 30 dias — entradas, mortes, vendas, transferências, evoluções"
        padding={0}
        action={<Btn icon="download" size="sm">Exportar</Btn>}
      >
        <DataTable
          columns={[
            { key:'date', label:'Quando', render: r => <span style={{color:NSA.inkMuted}}>{r.date}</span> },
            { key:'type', label:'Evento', render: r => <EventTypeBadge type={r.type} /> },
            { key:'category', label:'Categoria', render: r => <span style={{fontWeight:500}}>{r.category}</span> },
            { key:'heads', label:'Cab', align:'right', render: r => r.heads },
            { key:'flow', label:'De → Para', render: r => (
              <span style={{fontSize:12, color:NSA.inkMuted}}>
                <span style={{color:NSA.inkPrimary, fontWeight:500}}>{r.from}</span>
                {r.to !== '—' && <> <i data-lucide="arrow-right" style={{width:11, height:11, verticalAlign:'middle', margin:'0 4px', color:NSA.inkSubtle}}></i> <span style={{color:NSA.inkPrimary, fontWeight:500}}>{r.to}</span></>}
              </span>
            )},
            { key:'user', label:'Por', render: r => r.user },
            { key:'notes', label:'Obs', render: r => <span style={{color:NSA.inkMuted, fontSize:12}}>{r.notes || (r.weight_kg ? `${r.weight_kg} kg` : '—')}</span> },
          ]}
          rows={M.HERD_EVENTS}
        />
      </Card>
    </div>
  );
}

function EventTypeBadge({ type }) {
  const palette = {
    ENTRADA:        { kind: 'ok',      icon: 'log-in' },
    VENDA:          { kind: 'info',    icon: 'banknote' },
    MORTE:          { kind: 'danger',  icon: 'skull' },
    TRANSFERENCIA:  { kind: 'neutral', icon: 'arrow-right-left' },
    EVOLUCAO:       { kind: 'brand',   icon: 'trending-up' },
  }[type] || { kind: 'neutral', icon: 'circle' };
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:5}}>
      <i data-lucide={palette.icon} style={{width:11, height:11, strokeWidth:2, color:NSA.inkMuted}}></i>
      <StatusPill kind={palette.kind} label={type.toLowerCase()} dot={false} size="sm" />
    </span>
  );
}

window.HerdView = HerdView;
