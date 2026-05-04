// Equipe — lista de peões + detalhe (timeline + breakdown por seção + talhões cobertos).

function TeamView({ period, navigate }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;
  const [selected, setSelected] = React.useState(null);

  // Agrega por peão (excluindo admin)
  const peoes = M.USERS.filter(u => u.role === 'peao').map(u => {
    const myRondas = M.RONDAS_TODAY.filter(r => r.userId === u.id);
    const sectionsCount = myRondas.reduce((s, r) => s + r.sections.length, 0);
    const paddocks = myRondas.length;
    const lastEvt = M.FEED.find(f => f.userId === u.id);
    const completas = myRondas.filter(r => M.REQUIRED.every(s => r.sections.includes(s))).length;
    return {
      ...u,
      paddocks, sectionsCount, completas,
      lastTime: lastEvt ? lastEvt.time : '—',
      rondas: myRondas,
    };
  }).sort((a, b) => b.sectionsCount - a.sectionsCount);

  if (selected) {
    return <PersonDetail user={selected} period={period} navigate={navigate} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:18}}>
        <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:6}}>
          Operação · {peoes.length} peões em campo
        </div>
        <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:NSA.inkPrimary}}>
          Equipe
        </h1>
      </div>

      {/* Cards de peões */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12}}>
        {peoes.map(p => (
          <div key={p.id} onClick={() => setSelected(p)} style={{
            background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:8, padding:'16px 18px',
            cursor:'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,15,13,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:14}}>
              <Avatar initials={p.initials} color={p.color} size={40} />
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:15, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.01em'}}>{p.name}</div>
                <div style={{fontSize:11, color:NSA.inkMuted, marginTop:2}}>
                  {p.paddocks > 0 ? `Última atividade às ${p.lastTime}` : 'Sem atividade hoje'}
                </div>
              </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
              <MiniStat label="Talhões" value={p.paddocks} />
              <MiniStat label="Avaliações" value={p.sectionsCount} />
              <MiniStat label="Completas" value={p.completas} accent={p.completas === p.paddocks && p.paddocks > 0 ? NSA.ok : null} />
            </div>

            {p.paddocks > 0 && (
              <div style={{marginTop:12, paddingTop:12, borderTop:`1px solid ${NSA.borderSubtle}`, display:'flex', flexWrap:'wrap', gap:4}}>
                {[...new Set(p.rondas.flatMap(r => r.sections))].map(sec => (
                  <SectionPill key={sec} section={sec} label={M.SECTION_LABELS[sec].slice(0,3).toUpperCase()} color={M.SECTION_COLORS[sec]} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div>
      <div style={{
        fontSize:22, fontWeight:600, lineHeight:1, color: accent || NSA.inkPrimary,
        fontVariantNumeric:'tabular-nums', letterSpacing:'-0.01em',
      }}>{value}</div>
      <div style={{fontSize:11, color:NSA.inkMuted, marginTop:3, fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase'}}>{label}</div>
    </div>
  );
}

function PersonDetail({ user, period, navigate, onBack }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;
  const myFeed = M.FEED.filter(f => f.userId === user.id).sort((a, b) => a.timeMin - b.timeMin);
  const myRondas = M.RONDAS_TODAY.filter(r => r.userId === user.id);

  // Breakdown por seção
  const bySection = {};
  myFeed.forEach(f => {
    if (!bySection[f.section]) bySection[f.section] = 0;
    bySection[f.section]++;
  });

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%'}}>
      {/* Back */}
      <button onClick={onBack} style={{
        display:'inline-flex', alignItems:'center', gap:6,
        background:'transparent', border:'none', cursor:'pointer',
        color:NSA.inkMuted, fontSize:13, fontWeight:500, padding:0, marginBottom:14,
      }}>
        <i data-lucide="arrow-left" style={{width:14, height:14, strokeWidth:1.75}}></i>
        Voltar para equipe
      </button>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:24}}>
        <Avatar initials={user.initials} color={user.color} size={56} />
        <div>
          <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:NSA.inkPrimary}}>{user.name}</h1>
          <div style={{fontSize:13, color:NSA.inkMuted, marginTop:4}}>Peão · ativo em campo hoje</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:18}}>
        <KPICard label="Talhões cobertos"  value={user.paddocks} note={`de ${M.KPIS.totalPaddocks} no total`} />
        <KPICard label="Avaliações"        value={user.sectionsCount} note="seções preenchidas" />
        <KPICard label="Rondas completas"  value={user.completas} unit={`/ ${user.paddocks}`} accent={NSA.ok} />
        <KPICard label="Tempo em campo"    value="4h 38min" note="da 1ª à última avaliação" />
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16}}>
        {/* Timeline */}
        <Card title="Timeline do dia" subtitle={`${myFeed.length} eventos`} padding={0}>
          <div style={{maxHeight:600, overflowY:'auto', padding:'8px 0'}}>
            {myFeed.length === 0 ? (
              <EmptyState icon="moon" title="Sem atividade hoje" body="Este peão ainda não fez nenhuma ronda no período selecionado." />
            ) : myFeed.map((evt, i) => (
              <div key={evt.id} style={{
                display:'flex', alignItems:'flex-start', gap:12, padding:'10px 18px',
                position:'relative',
              }}>
                {/* Timeline rail */}
                <div style={{position:'absolute', left:43, top:0, bottom:0, width:2, background: i === myFeed.length - 1 ? 'transparent' : NSA.borderSubtle}}></div>
                <span style={{fontSize:11, color:NSA.inkMuted, fontVariantNumeric:'tabular-nums', width:42, flexShrink:0, marginTop:4}}>{evt.time}</span>
                <span style={{
                  width:14, height:14, borderRadius:'50%',
                  background: evt.sectionColor, border: '3px solid #fff',
                  marginTop:3, flexShrink:0, zIndex:1,
                }}></span>
                <div style={{flex:1, minWidth:0, paddingBottom:4}}>
                  <div style={{fontSize:13, color:NSA.inkPrimary}}>
                    <span style={{fontWeight:600}}>{evt.sectionLabel}</span>
                    <span style={{color:NSA.inkMuted}}> · </span>
                    <span style={{fontWeight:500}}>{evt.paddock}</span>
                  </div>
                  {evt.summary && (
                    <div style={{fontSize:12, color:NSA.inkMuted, marginTop:2}}>{evt.summary}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Breakdown */}
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          <Card title="Por tipo de seção" padding={16}>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {Object.entries(bySection).sort((a, b) => b[1] - a[1]).map(([sec, n]) => (
                <div key={sec} style={{display:'flex', alignItems:'center', gap:8, fontSize:13}}>
                  <span style={{width:8, height:8, borderRadius:'50%', background:M.SECTION_COLORS[sec]}}></span>
                  <span style={{flex:1, color:NSA.inkPrimary}}>{M.SECTION_LABELS[sec]}</span>
                  <span style={{fontWeight:600, fontVariantNumeric:'tabular-nums', color:NSA.inkPrimary}}>{n}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Talhões cobertos" padding={16}>
            <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
              {myRondas.map(r => {
                const p = M.PADDOCKS.find(x => x.id === r.paddockId);
                const isComplete = M.REQUIRED.every(s => r.sections.includes(s));
                return (
                  <span key={r.paddockId} style={{
                    fontSize:12, fontWeight:500, padding:'4px 10px', borderRadius:6,
                    background: isComplete ? NSA.okBg : NSA.warnBg,
                    color: isComplete ? '#1f5d36' : '#7a550f',
                  }}>{p?.name}</span>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.TeamView = TeamView;
