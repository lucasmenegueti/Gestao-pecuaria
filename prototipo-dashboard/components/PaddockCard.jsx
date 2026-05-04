// PaddockCard — card verde/amarelo/vermelho do dashboard de Talhões.
// Mostra status do dia, lotação, última ronda, seções feitas, alertas no piquete.

function PaddockCard({ paddock, ronda, alerts, onClick }) {
  const status = ronda
    ? (window.MOCK.REQUIRED.every(s => ronda.sections.includes(s)) ? 'green' : 'yellow')
    : 'red';

  const palette = {
    green:  { edge: NSA.ok,     bg: '#fff', tagBg: NSA.okBg,    tagFg: '#1f5d36', label: 'Cobertura completa', icon: 'check-circle' },
    yellow: { edge: NSA.warn,   bg: '#fff', tagBg: NSA.warnBg,  tagFg: '#7a550f', label: 'Ronda parcial',      icon: 'alert-circle' },
    red:    { edge: NSA.danger, bg: '#fff', tagBg: NSA.dangerBg,tagFg: '#7d2519', label: 'Sem ronda',          icon: 'x-circle' },
  }[status];

  const user = ronda ? window.MOCK.USERS.find(u => u.id === ronda.userId) : null;
  const stockingRate = (paddock.heads / paddock.area).toFixed(2);
  const paddockAlerts = (alerts || []).filter(a => a.paddockId === paddock.id);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  return (
    <div onClick={onClick} style={{
      background: palette.bg, border: `1px solid ${NSA.border}`,
      borderLeft: `4px solid ${palette.edge}`,
      borderRadius: 8, padding: '14px 16px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'box-shadow 120ms, transform 120ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,15,13,0.06)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>

      {/* Header: nome + status */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8}}>
        <div style={{minWidth:0, flex:1}}>
          <div style={{fontSize:15, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.01em'}}>{paddock.name}</div>
          <div style={{fontSize:11, color:NSA.inkMuted, marginTop:2, display:'flex', gap:6, alignItems:'center'}}>
            <span>{paddock.area} ha</span>
            <span style={{color:NSA.borderStrong}}>·</span>
            <span style={{fontVariantNumeric:'tabular-nums'}}>{paddock.heads} cab</span>
            <span style={{color:NSA.borderStrong}}>·</span>
            <span style={{fontVariantNumeric:'tabular-nums'}}>{stockingRate} cab/ha</span>
          </div>
        </div>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:4,
          fontSize: 10, fontWeight: 600, padding:'3px 7px', borderRadius:999,
          background: palette.tagBg, color: palette.tagFg, letterSpacing: '0.04em', textTransform:'uppercase',
        }}>
          <i data-lucide={palette.icon} style={{width:10, height:10, strokeWidth:2.5}}></i>
          {palette.label}
        </span>
      </div>

      {/* Última ronda */}
      {ronda ? (
        <div style={{display:'flex', alignItems:'center', gap:8, fontSize:12}}>
          <Avatar initials={user?.initials || '—'} color={user?.color} size={22} />
          <div style={{flex:1, minWidth:0}}>
            <div style={{color:NSA.inkPrimary, fontWeight:500}}>{user?.name || '—'}</div>
            <div style={{color:NSA.inkMuted, fontSize:11}}>
              {ronda.startTime} – {ronda.endTime} · {ronda.sections.length} {ronda.sections.length === 1 ? 'seção' : 'seções'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{fontSize:12, color:NSA.inkMuted, fontStyle:'italic'}}>Nenhuma interação no período</div>
      )}

      {/* Seções feitas (mini-pills) */}
      {ronda && (
        <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
          {ronda.sections.map(sec => (
            <SectionPill
              key={sec}
              section={sec}
              label={window.MOCK.SECTION_LABELS[sec].slice(0,3).toUpperCase()}
              color={window.MOCK.SECTION_COLORS[sec]}
              active={true}
            />
          ))}
        </div>
      )}

      {/* Alertas do piquete */}
      {paddockAlerts.length > 0 && (
        <div style={{
          padding: '6px 8px', borderRadius: 6,
          background: paddockAlerts.some(a => a.severity === 'danger') ? NSA.dangerBg : NSA.warnBg,
          fontSize: 11, color: paddockAlerts.some(a => a.severity === 'danger') ? '#7d2519' : '#7a550f',
          display:'flex', alignItems:'center', gap:5,
        }}>
          <i data-lucide="alert-triangle" style={{width:11, height:11, strokeWidth:2, flexShrink:0}}></i>
          <span style={{flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {paddockAlerts.length} {paddockAlerts.length === 1 ? 'alerta' : 'alertas'}: {paddockAlerts[0].detail}
          </span>
        </div>
      )}
    </div>
  );
}

window.PaddockCard = PaddockCard;
