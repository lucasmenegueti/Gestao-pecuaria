// Visão Geral — KPIs + cobertura do dia + feed cronológico + heatmap + alertas críticos.

function OverviewView({ period, navigate }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;

  const periodLabels = {
    today: 'Hoje', '7d': 'Últimos 7 dias', lastweek: 'Semana passada', custom: 'Personalizado',
  };

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%'}}>
      {/* Eyebrow */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:6}}>
          {periodLabels[period]} · 30 abr 2026 · 18.400 hectares
        </div>
        <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:NSA.inkPrimary}}>
          Visão geral da fazenda
        </h1>
      </div>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:18}}>
        <KPICard
          label="Cobertura do dia"
          value={`${M.KPIS.coveragePct}%`}
          note={`${M.KPIS.paddocksGreen + M.KPIS.paddocksYellow} de ${M.KPIS.totalPaddocks} talhões`}
          accent={M.KPIS.coveragePct >= 70 ? NSA.ok : NSA.warn}
          spark={{ data: [42, 51, 58, 62, 68, 72, M.KPIS.coveragePct], color: NSA.ok }}
        />
        <KPICard
          label="Rebanho"
          value={M.KPIS.totalHeads.toLocaleString('pt-BR')}
          unit="cab"
          note={`${M.KPIS.stockingRate} cab/ha · ${M.KPIS.totalArea} ha`}
        />
        <KPICard
          label="Alertas ativos"
          value={M.KPIS.activeAlerts}
          note={`${M.KPIS.criticalAlerts} críticos`}
          accent={M.KPIS.criticalAlerts > 0 ? NSA.danger : NSA.warn}
        />
        <KPICard
          label="Inspeções abertas"
          value={M.KPIS.pendingInspections}
          note="solicitadas pelo admin"
        />
      </div>

      {/* Status strip — verde/amarelo/vermelho count */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:24,
      }}>
        <StatusStrip kind="ok"     label="Cobertura completa" count={M.KPIS.paddocksGreen}  total={M.KPIS.totalPaddocks} icon="check-circle" onClick={() => navigate('paddocks')} />
        <StatusStrip kind="warn"   label="Ronda parcial"      count={M.KPIS.paddocksYellow} total={M.KPIS.totalPaddocks} icon="alert-circle" onClick={() => navigate('paddocks')} />
        <StatusStrip kind="danger" label="Sem ronda"          count={M.KPIS.paddocksRed}    total={M.KPIS.totalPaddocks} icon="x-circle"     onClick={() => navigate('paddocks')} />
      </div>

      {/* Two-col: feed + alerts */}
      <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16, marginBottom:24}}>
        <Card
          title="Atividade do dia"
          subtitle={`${M.FEED.length} eventos · ${[...new Set(M.FEED.map(f => f.userId))].length} peões em campo`}
          padding={0}
          action={<a onClick={() => navigate('team')} style={{fontSize:12, fontWeight:500, color:NSA.green800, cursor:'pointer'}}>Ver por pessoa →</a>}
        >
          <div style={{maxHeight:540, overflowY:'auto'}}>
            {M.FEED.slice(0, 18).map((evt, i) => (
              <FeedRow key={evt.id} evt={evt} last={i === Math.min(17, M.FEED.length - 1)} onClick={() => navigate('paddocks')} />
            ))}
          </div>
        </Card>

        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          <Card
            title="Alertas críticos"
            subtitle={`${M.KPIS.criticalAlerts} crítico${M.KPIS.criticalAlerts === 1 ? '' : 's'} · ${M.KPIS.activeAlerts - M.KPIS.criticalAlerts} de atenção`}
            padding={14}
            action={<a onClick={() => navigate('alerts')} style={{fontSize:12, fontWeight:500, color:NSA.green800, cursor:'pointer'}}>Ver todos →</a>}
          >
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {M.ALERTS.filter(a => a.severity === 'danger').slice(0, 4).map(a => (
                <AlertCard key={a.id} kind="danger" title={a.detail} paddock={a.paddock} time={a.time} />
              ))}
              {M.ALERTS.filter(a => a.severity === 'danger').length === 0 && (
                <EmptyState icon="check-circle" title="Sem alertas críticos" body="Tudo no verde por aqui." />
              )}
            </div>
          </Card>

          <Card title="Estoque crítico" padding={14}>
            <div style={{display:'flex', flexDirection:'column', gap:6}}>
              {M.INV_CENTRAL.filter(i => i.severity).slice(0, 4).map(i => (
                <div key={i.formulaId} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 10px', borderRadius:6,
                  background: i.severity === 'danger' ? NSA.dangerBg : NSA.warnBg,
                }}>
                  <div>
                    <div style={{fontSize:13, fontWeight:500, color: i.severity === 'danger' ? '#7d2519' : '#7a550f'}}>{i.formula}</div>
                    <div style={{fontSize:11, color: i.severity === 'danger' ? '#7d2519' : '#7a550f', opacity:0.8}}>
                      {i.sacks} sacos · zera em {i.daysLeft}d
                    </div>
                  </div>
                  <StatusPill kind={i.severity === 'danger' ? 'danger' : 'warn'} label={i.severity === 'danger' ? 'Crítico' : 'Atenção'} dot={false} size="sm" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Heatmap de cobertura */}
      <Card
        title="Cobertura nos últimos 14 dias"
        subtitle="Cada célula é um dia. Verde = ronda completa (Suplementação + Aguada + Cerca). Amarelo = ronda parcial. Cinza = sem ronda."
        padding={16}
      >
        <Heatmap paddocks={M.PADDOCKS} data={M.HEATMAP} days={14} />
      </Card>
    </div>
  );
}

function StatusStrip({ kind, label, count, total, icon, onClick }) {
  const palette = {
    ok:     { bg: NSA.okBg,     fg: '#1f5d36', edge: NSA.ok },
    warn:   { bg: NSA.warnBg,   fg: '#7a550f', edge: NSA.warn },
    danger: { bg: NSA.dangerBg, fg: '#7d2519', edge: NSA.danger },
  }[kind];
  const pct = Math.round((count / total) * 100);
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div onClick={onClick} style={{
      background: '#fff', border: `1px solid ${NSA.border}`, borderLeft: `4px solid ${palette.edge}`,
      borderRadius: 8, padding: '14px 18px', cursor:'pointer',
      display:'flex', alignItems:'center', gap:14,
    }}>
      <div style={{
        width:38, height:38, borderRadius:8, background:palette.bg,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        <i data-lucide={icon} style={{width:18, height:18, strokeWidth:1.75, color:palette.fg}}></i>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:12, color:NSA.inkMuted, fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase'}}>{label}</div>
        <div style={{display:'flex', alignItems:'baseline', gap:6, marginTop:2}}>
          <span style={{fontSize:22, fontWeight:600, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums'}}>{count}</span>
          <span style={{fontSize:13, color:NSA.inkMuted}}>/ {total}</span>
          <span style={{fontSize:12, color:palette.fg, fontWeight:500, marginLeft:6}}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function FeedRow({ evt, last, onClick }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div onClick={onClick} style={{
      padding:'10px 16px', borderBottom: last ? 'none' : `1px solid ${NSA.borderSubtle}`,
      display:'flex', alignItems:'center', gap:12, cursor:'pointer',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = NSA.bgSubtle; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      <span style={{fontSize:11, color:NSA.inkMuted, fontVariantNumeric:'tabular-nums', width:42, flexShrink:0}}>{evt.time}</span>
      <Avatar initials={evt.initials} color={evt.userColor} size={24} />
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:13, color:NSA.inkPrimary}}>
          <span style={{fontWeight:500}}>{evt.user}</span>
          <span style={{color:NSA.inkMuted}}> · </span>
          <span>{evt.sectionLabel}</span>
          <span style={{color:NSA.inkMuted}}> em </span>
          <span style={{fontWeight:500}}>{evt.paddock}</span>
        </div>
        {evt.summary && (
          <div style={{fontSize:11, color:NSA.inkMuted, marginTop:2}}>{evt.summary}</div>
        )}
      </div>
      <span style={{
        width:8, height:8, borderRadius:'50%', background: evt.sectionColor, flexShrink:0,
      }}></span>
    </div>
  );
}

window.OverviewView = OverviewView;
