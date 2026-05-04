// Talhões — grid de cards verde/amarelo/vermelho + drawer de detalhe.

function PaddocksView({ period, navigate }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(null);

  const rondaByPaddock = {};
  M.RONDAS_TODAY.forEach(r => { rondaByPaddock[r.paddockId] = r; });

  const enriched = M.PADDOCKS.map(p => {
    const ronda = rondaByPaddock[p.id];
    const status = ronda
      ? (M.REQUIRED.every(s => ronda.sections.includes(s)) ? 'green' : 'yellow')
      : 'red';
    return { paddock: p, ronda, status };
  });

  const counts = {
    all:    enriched.length,
    green:  enriched.filter(e => e.status === 'green').length,
    yellow: enriched.filter(e => e.status === 'yellow').length,
    red:    enriched.filter(e => e.status === 'red').length,
  };

  const filtered = filter === 'all' ? enriched : enriched.filter(e => e.status === filter);
  const ordered = [...filtered].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:16}}>
        <div>
          <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:6}}>
            Pecuária · {M.KPIS.totalPaddocks} talhões
          </div>
          <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:NSA.inkPrimary}}>
            Talhões
          </h1>
        </div>
        <div style={{display:'flex', gap:8}}>
          <Btn icon="download">Exportar CSV</Btn>
          <Btn icon="plus" variant="primary">Solicitar inspeção</Btn>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex', gap:6, marginBottom:18, padding:3, background: NSA.bgSubtle, borderRadius:8, width:'fit-content'}}>
        <FilterTab active={filter === 'all'}    onClick={() => setFilter('all')}    label="Todos"            count={counts.all}    />
        <FilterTab active={filter === 'green'}  onClick={() => setFilter('green')}  label="Cobertura completa" count={counts.green}  dot={NSA.ok} />
        <FilterTab active={filter === 'yellow'} onClick={() => setFilter('yellow')} label="Ronda parcial"     count={counts.yellow} dot={NSA.warn} />
        <FilterTab active={filter === 'red'}    onClick={() => setFilter('red')}    label="Sem ronda"          count={counts.red}    dot={NSA.danger} />
      </div>

      {/* Grid */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',
        gap:12,
      }}>
        {ordered.map(({ paddock, ronda }) => (
          <PaddockCard
            key={paddock.id}
            paddock={paddock}
            ronda={ronda}
            alerts={M.ALERTS}
            onClick={() => setSelected(paddock.id)}
          />
        ))}
      </div>

      {/* Drawer */}
      {selected != null && (
        <PaddockDrawer
          paddockId={selected}
          onClose={() => setSelected(null)}
          navigate={navigate}
        />
      )}
    </div>
  );
}

function FilterTab({ active, onClick, label, count, dot }) {
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
      <span style={{
        fontSize:11, fontWeight:500, padding:'1px 6px', borderRadius:999,
        background: active ? NSA.bgSubtle : 'transparent', color: active ? NSA.inkMuted : NSA.inkSubtle,
        fontVariantNumeric:'tabular-nums',
      }}>{count}</span>
    </button>
  );
}

function PaddockDrawer({ paddockId, onClose, navigate }) {
  const M = window.MOCK;
  const paddock = M.PADDOCKS.find(p => p.id === paddockId);
  const ronda = M.RONDAS_TODAY.find(r => r.paddockId === paddockId);
  const user = ronda ? M.USERS.find(u => u.id === ronda.userId) : null;
  const alerts = M.ALERTS.filter(a => a.paddockId === paddockId);
  const inspections = M.INSPECTIONS.filter(i => i.paddockId === paddockId);
  const bombona = M.INV_BOMBONA.find(b => b.paddockId === paddockId);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, background:'rgba(15,15,13,0.32)', zIndex:30,
      }}></div>
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, width:480,
        background:'#fff', boxShadow:'-8px 0 24px rgba(15,15,13,0.12)', zIndex:31,
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{padding:'20px 24px', borderBottom:`1px solid ${NSA.border}`, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12}}>
          <div>
            <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:4}}>
              Talhão
            </div>
            <h2 style={{fontSize:22, fontWeight:600, letterSpacing:'-0.01em', margin:0, color:NSA.inkPrimary}}>{paddock.name}</h2>
            <div style={{fontSize:13, color:NSA.inkMuted, marginTop:4}}>
              {paddock.area} ha · {paddock.heads} cabeças · {(paddock.heads / paddock.area).toFixed(2)} cab/ha
            </div>
          </div>
          <button onClick={onClose} style={{
            width:32, height:32, border:'none', background:'transparent', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, color:NSA.inkMuted,
          }}>
            <i data-lucide="x" style={{width:18, height:18, strokeWidth:1.75}}></i>
          </button>
        </div>

        {/* Body */}
        <div style={{flex:1, overflowY:'auto', padding:'20px 24px'}}>
          {/* Status */}
          <div style={{
            padding:'12px 14px', borderRadius:8, marginBottom:18,
            background: ronda ? (M.REQUIRED.every(s => ronda.sections.includes(s)) ? NSA.okBg : NSA.warnBg) : NSA.dangerBg,
            color: ronda ? (M.REQUIRED.every(s => ronda.sections.includes(s)) ? '#1f5d36' : '#7a550f') : '#7d2519',
            fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:8,
          }}>
            <i data-lucide={ronda ? (M.REQUIRED.every(s => ronda.sections.includes(s)) ? 'check-circle' : 'alert-circle') : 'x-circle'} style={{width:16, height:16, strokeWidth:2}}></i>
            {ronda
              ? (M.REQUIRED.every(s => ronda.sections.includes(s))
                  ? `Ronda completa por ${user?.name} às ${ronda.startTime}`
                  : `Ronda parcial por ${user?.name} — faltam: ${M.REQUIRED.filter(s => !ronda.sections.includes(s)).map(s => M.SECTION_LABELS[s]).join(', ')}`)
              : 'Nenhuma ronda registrada hoje neste talhão'}
          </div>

          {/* Seções avaliadas */}
          {ronda && (
            <Section title="Avaliações de hoje">
              {ronda.sections.map(sec => {
                const det = ronda.details[sec] || {};
                let summary = '';
                if (sec === 'supplement') summary = `${det.formula || ''} · ${det.sacks ?? '—'} sacos · cocho ${(det.trough || '').toLowerCase()}`;
                else if (sec === 'water') summary = det.available ? `Disponível · qualidade ${(det.quality || '').toLowerCase()}` : 'SEM ÁGUA';
                else if (sec === 'fence') summary = `${det.classification} · ${det.voltage}V · ${det.prevents_mixing ? 'evita mistura' : 'NÃO evita mistura'}`;
                else if (sec === 'health') summary = det.parasite_free ? 'Sem parasitas' : `${det.affected_pct}% afetado · ${det.observations || ''}`;
                else if (sec === 'forage') summary = `Altura média ${det.avg_cm} cm · ${(det.quality || '').toLowerCase()}`;
                else if (sec === 'biological') summary = det.applied ? `${det.quantity_g}g aplicados` : 'Não aplicou';
                else if (sec === 'weight') summary = `${det.estimated_kg} kg · ${det.category} (anterior ${det.prev_kg} em ${det.prev_date})`;
                else if (sec === 'washing') summary = det.was_washed ? 'Cocho lavado' : '';
                return (
                  <div key={sec} style={{
                    padding:'10px 12px', borderRadius:6, background:NSA.bgSubtle, marginBottom:6,
                    display:'flex', alignItems:'flex-start', gap:10,
                  }}>
                    <span style={{
                      width:6, height:6, borderRadius:'50%', background: M.SECTION_COLORS[sec],
                      marginTop:7, flexShrink:0,
                    }}></span>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:12, fontWeight:600, color:NSA.inkPrimary}}>{M.SECTION_LABELS[sec]}</div>
                      <div style={{fontSize:12, color:NSA.inkMuted, marginTop:2}}>{summary}</div>
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          {/* Bombona */}
          {bombona && (
            <Section title="Bombona">
              <div style={{
                padding:'12px 14px', borderRadius:8,
                background: bombona.severity === 'danger' ? NSA.dangerBg : (bombona.severity === 'warning' ? NSA.warnBg : NSA.bgSubtle),
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <div>
                  <div style={{fontSize:13, fontWeight:500, color:NSA.inkPrimary}}>{bombona.formula}</div>
                  <div style={{fontSize:11, color:NSA.inkMuted, marginTop:2, fontVariantNumeric:'tabular-nums'}}>
                    {bombona.sacks} sacos · zera em {bombona.daysLeft} dia{bombona.daysLeft === 1 ? '' : 's'}
                  </div>
                </div>
                {bombona.severity && (
                  <StatusPill kind={bombona.severity === 'danger' ? 'danger' : 'warn'} label={bombona.severity === 'danger' ? 'Vazia' : 'Atenção'} />
                )}
              </div>
            </Section>
          )}

          {/* Alertas */}
          {alerts.length > 0 && (
            <Section title={`Alertas ativos (${alerts.length})`}>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                {alerts.map(a => (
                  <AlertCard key={a.id} kind={a.severity === 'danger' ? 'danger' : 'warning'} title={a.detail} time={a.time} />
                ))}
              </div>
            </Section>
          )}

          {/* Inspeções */}
          {inspections.length > 0 && (
            <Section title={`Inspeções (${inspections.length})`}>
              {inspections.map(i => (
                <div key={i.id} style={{
                  padding:'10px 12px', borderRadius:6, marginBottom:6,
                  background: i.status === 'pending' ? NSA.warnBg : NSA.okBg,
                  display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10,
                }}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:12, fontWeight:600, color:NSA.inkPrimary, textTransform:'capitalize'}}>{i.kind}</div>
                    <div style={{fontSize:11, color:NSA.inkMuted, marginTop:2}}>{i.notes || '—'}</div>
                  </div>
                  <StatusPill kind={i.status === 'pending' ? 'warn' : 'ok'} label={i.status === 'pending' ? 'Aberta' : 'Concluída'} size="sm" />
                </div>
              ))}
            </Section>
          )}
        </div>

        {/* Footer actions */}
        <div style={{padding:'14px 24px', borderTop:`1px solid ${NSA.border}`, display:'flex', gap:8, justifyContent:'flex-end'}}>
          <Btn icon="map" onClick={() => { navigate('map'); onClose(); }}>Ver no mapa</Btn>
          <Btn icon="clipboard-check" variant="primary">Solicitar inspeção</Btn>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{
        fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase',
        color:NSA.inkMuted, marginBottom:8,
      }}>{title}</div>
      {children}
    </div>
  );
}

window.PaddocksView = PaddocksView;
