// Estoque — fórmulas central + bombonas por talhão + reabastecimentos.

function InventoryView({ period, navigate }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;
  const [tab, setTab] = React.useState('central');

  const centralCritical = M.INV_CENTRAL.filter(i => i.severity === 'danger').length;
  const bombonasCritical = M.INV_BOMBONA.filter(b => b.severity === 'danger').length;
  const bombonasWarn = M.INV_BOMBONA.filter(b => b.severity === 'warning').length;
  const totalSacks = M.INV_CENTRAL.reduce((s, i) => s + i.sacks, 0) +
                     M.INV_BOMBONA.reduce((s, b) => s + b.sacks, 0);

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:16}}>
        <div>
          <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:6}}>
            Pecuária · {M.FORMULAS.length} fórmulas · {M.INV_BOMBONA.length} bombonas
          </div>
          <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:NSA.inkPrimary}}>
            Estoque & Reabastecimento
          </h1>
        </div>
        <Btn icon="plus" variant="primary">Nova rota</Btn>
      </div>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:24}}>
        <KPICard label="Sacos no central" value={M.INV_CENTRAL.reduce((s, i) => s + i.sacks, 0).toLocaleString('pt-BR')} note={`${M.INV_CENTRAL.length} fórmulas ativas`} />
        <KPICard label="Sacos em bombonas" value={M.INV_BOMBONA.reduce((s, b) => s + b.sacks, 0).toFixed(0)} note={`${M.INV_BOMBONA.length} talhões`} />
        <KPICard label="Bombonas críticas" value={bombonasCritical} accent={bombonasCritical > 0 ? NSA.danger : null} note={`${bombonasWarn} em atenção`} />
        <KPICard label="Rotas em curso" value={M.RESUPPLY.filter(r => r.status !== 'completed').length} note="reabastecimento ativo" />
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:6, marginBottom:14, padding:3, background:NSA.bgSubtle, borderRadius:8, width:'fit-content'}}>
        <FilterTab2 active={tab === 'central'}  onClick={() => setTab('central')}  label="Estoque central"     count={M.INV_CENTRAL.length} />
        <FilterTab2 active={tab === 'bombonas'} onClick={() => setTab('bombonas')} label="Bombonas por talhão" count={M.INV_BOMBONA.length} />
        <FilterTab2 active={tab === 'rotas'}    onClick={() => setTab('rotas')}    label="Rotas de reabastecimento" count={M.RESUPPLY.length} />
      </div>

      {tab === 'central' && (
        <Card title="Fórmulas no estoque central" subtitle="Saldo, consumo projetado e dias até zerar (com base no rebanho atual)" padding={0}>
          <DataTable
            columns={[
              { key:'formula', label:'Fórmula', render: r => <span style={{fontWeight:500}}>{r.formula}</span> },
              { key:'sacks',   label:'Saldo',     align:'right', render: r => <span style={{fontVariantNumeric:'tabular-nums', fontWeight:500}}>{r.sacks} sacos</span> },
              { key:'min',     label:'Mínimo',    align:'right', render: r => <span style={{color:NSA.inkMuted}}>{r.min}</span> },
              { key:'days',    label:'Dias até zerar', align:'right', render: r => (
                <span style={{
                  fontWeight:600, fontVariantNumeric:'tabular-nums',
                  color: r.severity === 'danger' ? NSA.danger : (r.severity === 'warning' ? NSA.warn : NSA.inkPrimary),
                }}>{r.daysLeft}</span>
              )},
              { key:'status', label:'Status', render: r => (
                r.severity === 'danger' ? <StatusPill kind="danger" label="Crítico" /> :
                r.severity === 'warning' ? <StatusPill kind="warn" label="Atenção" /> :
                <StatusPill kind="ok" label="Saudável" />
              )},
            ]}
            rows={M.INV_CENTRAL}
          />
        </Card>
      )}

      {tab === 'bombonas' && (
        <Card title="Bombonas por talhão" subtitle="Saldo nos cochos e projeção de consumo. Ordenado pelos mais críticos" padding={0}>
          <DataTable
            columns={[
              { key:'paddock', label:'Talhão',  render: r => <span style={{fontWeight:500}}>{r.paddock}</span> },
              { key:'formula', label:'Fórmula', render: r => <span style={{color:NSA.inkMuted}}>{r.formula}</span> },
              { key:'sacks',   label:'Saldo',   align:'right', render: r => <span style={{fontVariantNumeric:'tabular-nums', fontWeight:500}}>{r.sacks}</span> },
              { key:'days',    label:'Zera em', align:'right', render: r => (
                <span style={{
                  fontWeight:600, fontVariantNumeric:'tabular-nums',
                  color: r.severity === 'danger' ? NSA.danger : (r.severity === 'warning' ? NSA.warn : NSA.inkPrimary),
                }}>{r.daysLeft}d</span>
              )},
              { key:'status', label:'Status', render: r => (
                r.severity === 'danger' ? <StatusPill kind="danger" label="Vazia" /> :
                r.severity === 'warning' ? <StatusPill kind="warn" label="Atenção" /> :
                <StatusPill kind="ok" label="Saudável" />
              )},
              { key:'action', label:'',       render: r => (
                <Btn icon="truck" size="sm">Reabastecer</Btn>
              )},
            ]}
            rows={[...M.INV_BOMBONA].sort((a, b) => a.daysLeft - b.daysLeft)}
          />
        </Card>
      )}

      {tab === 'rotas' && (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {M.RESUPPLY.map(rt => <RouteCard key={rt.id} route={rt} />)}
        </div>
      )}
    </div>
  );
}

function FilterTab2({ active, onClick, label, count }) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:8,
      padding:'7px 14px', borderRadius:6, border:'none', cursor:'pointer',
      fontSize:13, fontWeight:500,
      background: active ? '#fff' : 'transparent',
      color: active ? NSA.inkPrimary : NSA.inkMuted,
      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
    }}>
      {label}
      <span style={{
        fontSize:11, fontWeight:500, padding:'1px 6px', borderRadius:999,
        background: active ? NSA.bgSubtle : 'transparent', color: active ? NSA.inkMuted : NSA.inkSubtle,
        fontVariantNumeric:'tabular-nums',
      }}>{count}</span>
    </button>
  );
}

function RouteCard({ route }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const isActive = route.status !== 'completed';
  return (
    <Card padding={16}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, gap:12}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{
            width:36, height:36, borderRadius:8,
            background: isActive ? NSA.warnBg : NSA.okBg,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <i data-lucide="truck" style={{width:18, height:18, strokeWidth:1.75, color: isActive ? NSA.warn : NSA.ok}}></i>
          </div>
          <div>
            <div style={{fontSize:14, fontWeight:600, color:NSA.inkPrimary}}>Rota #{route.id}</div>
            <div style={{fontSize:12, color:NSA.inkMuted, marginTop:2}}>
              {route.user} · {route.start}{route.end ? ` → ${route.end}` : ''}
            </div>
          </div>
        </div>
        <StatusPill
          kind={route.status === 'completed' ? 'ok' : route.status === 'distributing' ? 'warn' : 'info'}
          label={route.status === 'completed' ? 'Concluída' : route.status === 'distributing' ? 'Em distribuição' : 'Carregando'}
        />
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
        <div>
          <div style={{fontSize:11, fontWeight:500, color:NSA.inkMuted, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:6}}>Carga</div>
          {route.loaded.map((l, i) => (
            <div key={i} style={{fontSize:13, color:NSA.inkPrimary, marginBottom:3}}>
              <span style={{fontWeight:500, fontVariantNumeric:'tabular-nums'}}>{l.sacks}</span>
              <span style={{color:NSA.inkMuted}}> sacos · {l.formula}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:11, fontWeight:500, color:NSA.inkMuted, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:6}}>Entregas ({route.deliveries.length})</div>
          {route.deliveries.map((d, i) => (
            <div key={i} style={{fontSize:13, color:NSA.inkPrimary, marginBottom:3}}>
              <span style={{fontWeight:500}}>{d.paddock}</span>
              <span style={{color:NSA.inkMuted, fontVariantNumeric:'tabular-nums'}}> · {d.sacks} sacos</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

window.InventoryView = InventoryView;
