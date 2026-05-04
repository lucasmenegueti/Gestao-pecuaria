// Alertas — lista priorizada por severidade. Filtros: severidade, tipo. Espelha alerts.ts do app.

function AlertsView({ period, navigate }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;
  const [filter, setFilter] = React.useState('all');
  const [kindFilter, setKindFilter] = React.useState('all');

  const kindLabels = {
    cerca:        { label: 'Cerca',        icon: 'zap' },
    agua:         { label: 'Aguada',       icon: 'droplets' },
    sanidade:     { label: 'Sanidade',     icon: 'stethoscope' },
    bombona:      { label: 'Bombona',      icon: 'box' },
    biologico:    { label: 'Biológico',    icon: 'flask-conical' },
    central:      { label: 'Estoque',      icon: 'package' },
    desalocados:  { label: 'Desalocados',  icon: 'users' },
  };

  const counts = {
    all:    M.ALERTS.length,
    danger: M.ALERTS.filter(a => a.severity === 'danger').length,
    warning:M.ALERTS.filter(a => a.severity === 'warning').length,
  };

  let filtered = M.ALERTS;
  if (filter !== 'all') filtered = filtered.filter(a => a.severity === filter);
  if (kindFilter !== 'all') filtered = filtered.filter(a => a.kind === kindFilter);
  filtered = [...filtered].sort((a, b) => {
    const sev = a.severity === 'danger' ? 0 : 1;
    const sev2 = b.severity === 'danger' ? 0 : 1;
    return sev - sev2;
  });

  const groupedByKind = {};
  M.ALERTS.forEach(a => { groupedByKind[a.kind] = (groupedByKind[a.kind] || 0) + 1; });

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:16}}>
        <div>
          <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:6}}>
            Operação · {M.ALERTS.length} alertas ativos
          </div>
          <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:NSA.inkPrimary}}>
            Alertas
          </h1>
        </div>
        <Btn icon="settings">Configurar limiares</Btn>
      </div>

      {/* Severity tabs */}
      <div style={{display:'flex', gap:6, marginBottom:14, padding:3, background:NSA.bgSubtle, borderRadius:8, width:'fit-content'}}>
        <SeverityTab active={filter === 'all'}    onClick={() => setFilter('all')}    label="Todos"  count={counts.all} />
        <SeverityTab active={filter === 'danger'} onClick={() => setFilter('danger')} label="Críticos" count={counts.danger} dot={NSA.danger} />
        <SeverityTab active={filter === 'warning'}onClick={() => setFilter('warning')}label="Atenção" count={counts.warning} dot={NSA.warn} />
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 240px', gap:16}}>
        {/* Alert list */}
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {filtered.map(a => (
            <AlertRow key={a.id} alert={a} kindLabel={kindLabels[a.kind]} navigate={navigate} />
          ))}
          {filtered.length === 0 && (
            <Card padding={32}>
              <EmptyState icon="check-circle" title="Sem alertas" body="Nenhum alerta nesse filtro." />
            </Card>
          )}
        </div>

        {/* Sidebar — by kind */}
        <Card title="Por tipo" padding={14}>
          <div style={{display:'flex', flexDirection:'column', gap:4}}>
            <KindRow kind="all" label="Todos os tipos" count={M.ALERTS.length} active={kindFilter === 'all'} onClick={() => setKindFilter('all')} icon="layers" />
            {Object.entries(groupedByKind).map(([k, n]) => (
              <KindRow key={k} kind={k} label={kindLabels[k]?.label || k} count={n}
                       icon={kindLabels[k]?.icon || 'circle'}
                       active={kindFilter === k} onClick={() => setKindFilter(k)} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SeverityTab({ active, onClick, label, count, dot }) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:8,
      padding:'7px 14px', borderRadius:6, border:'none', cursor:'pointer',
      fontSize:13, fontWeight:500,
      background: active ? '#fff' : 'transparent',
      color: active ? NSA.inkPrimary : NSA.inkMuted,
      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
    }}>
      {dot && <span style={{width:6, height:6, borderRadius:'50%', background:dot}}></span>}
      {label}
      <span style={{fontSize:11, fontWeight:500, padding:'1px 6px', borderRadius:999, background: active ? NSA.bgSubtle : 'transparent', color: active ? NSA.inkMuted : NSA.inkSubtle, fontVariantNumeric:'tabular-nums'}}>{count}</span>
    </button>
  );
}

function KindRow({ kind, label, count, icon, active, onClick }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'8px 10px', borderRadius:6, cursor:'pointer',
      background: active ? NSA.green100 : 'transparent',
      color: active ? NSA.green800 : NSA.inkPrimary,
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = NSA.bgSubtle; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      <i data-lucide={icon} style={{width:14, height:14, strokeWidth:1.75, flexShrink:0}}></i>
      <span style={{fontSize:13, fontWeight: active ? 500 : 400, flex:1}}>{label}</span>
      <span style={{fontSize:11, fontWeight:500, fontVariantNumeric:'tabular-nums', color: active ? NSA.green800 : NSA.inkMuted}}>{count}</span>
    </div>
  );
}

function AlertRow({ alert, kindLabel, navigate }) {
  const palette = alert.severity === 'danger'
    ? { bg: NSA.dangerBg, bd: '#f2c9c2', fg: '#7d2519', ic: 'alert-triangle' }
    : { bg: NSA.warnBg,   bd: '#eedbb0', fg: '#7a550f', ic: 'alert-circle' };
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div style={{
      padding:'12px 16px', background: palette.bg, border:`1px solid ${palette.bd}`,
      borderRadius:8, display:'flex', gap:12, alignItems:'center',
    }}>
      <i data-lucide={palette.ic} style={{width:18, height:18, color:palette.fg, strokeWidth:1.75, flexShrink:0}}></i>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:2}}>
          <span style={{
            fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:4,
            background:'rgba(255,255,255,0.6)', color:palette.fg, letterSpacing:'0.04em', textTransform:'uppercase',
          }}>{kindLabel?.label || alert.kind}</span>
          {alert.paddock !== '—' && alert.paddock !== 'Central' && (
            <span style={{fontSize:13, fontWeight:600, color:palette.fg}}>{alert.paddock}</span>
          )}
        </div>
        <div style={{fontSize:13, color:palette.fg}}>{alert.detail}</div>
      </div>
      <div style={{fontSize:11, color:palette.fg, opacity:0.7, whiteSpace:'nowrap'}}>{alert.time}</div>
      {alert.paddockId && (
        <button onClick={() => navigate('paddocks')} style={{
          background: 'rgba(255,255,255,0.7)', color: palette.fg, border: 'none',
          padding:'5px 10px', borderRadius:5, fontSize:11, fontWeight:500, cursor:'pointer',
        }}>Ver talhão →</button>
      )}
    </div>
  );
}

window.AlertsView = AlertsView;
