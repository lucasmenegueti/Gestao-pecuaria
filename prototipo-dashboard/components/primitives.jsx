// Shared primitives — KPICard, StatusPill, AlertCard, Sparkline, SectionPill, Card.

const NSA = {
  green800: '#172514', green700: '#1f3520', green500: '#3f6340', green100: '#e8ede7',
  cream: '#FFFFE3',
  ok: '#2e8c4f', okBg: '#eaf4ec',
  warn: '#b88217', warnBg: '#faf1dc',
  danger: '#c0392b', dangerBg: '#faeae7',
  info: '#3a6ea5', infoBg: '#eaf0f6',
  bg: '#fcfcfb', bgSubtle: '#f7f7f5',
  inkPrimary: '#1f1f1c', inkMuted: '#787873', inkSubtle: '#a8a8a2',
  border: '#e5e5e1', borderStrong: '#d2d2cd', borderSubtle: '#efefec',
};
window.NSA = NSA;

// ----------------------------------------------------------------------------
function Sparkline({ data, color = NSA.green800, width = 72, height = 24 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}
window.Sparkline = Sparkline;

// ----------------------------------------------------------------------------
function KPICard({ label, value, unit, delta, deltaDir, note, spark, accent }) {
  const deltaColor = deltaDir === 'up' ? NSA.ok : deltaDir === 'down' ? NSA.danger : NSA.inkMuted;
  const arrow = deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : '→';
  return (
    <div style={{
      padding: '16px 18px', background: '#fff', border: `1px solid ${NSA.border}`,
      borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8,
      borderLeft: accent ? `3px solid ${accent}` : `1px solid ${NSA.border}`,
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted}}>{label}</span>
        {spark && <Sparkline data={spark.data} color={spark.color || NSA.green800} />}
      </div>
      <div style={{fontSize:26, fontWeight:600, letterSpacing:'-0.02em', color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums', lineHeight:1, display:'flex', alignItems:'baseline', gap:6}}>
        {value}
        {unit && <span style={{fontSize:14, color:NSA.inkMuted, fontWeight:400}}>{unit}</span>}
      </div>
      {(delta || note) && (
        <div style={{display:'flex', alignItems:'center', gap:8, fontSize:12, marginTop:2}}>
          {delta && <span style={{color:deltaColor, fontWeight:500}}>{arrow} {delta}</span>}
          {note && <span style={{color:NSA.inkMuted}}>{note}</span>}
        </div>
      )}
    </div>
  );
}
window.KPICard = KPICard;

// ----------------------------------------------------------------------------
function StatusPill({ kind, label, dot = true, size = 'md' }) {
  const palette = {
    ok:      { bg: NSA.okBg,     fg: '#1f5d36', dot: NSA.ok },
    warn:    { bg: NSA.warnBg,   fg: '#7a550f', dot: NSA.warn },
    danger:  { bg: NSA.dangerBg, fg: '#7d2519', dot: NSA.danger },
    info:    { bg: NSA.infoBg,   fg: '#264868', dot: NSA.info },
    neutral: { bg: '#efefec',    fg: '#54544f', dot: NSA.inkSubtle },
    brand:   { bg: NSA.green100, fg: NSA.green800, dot: NSA.green500 },
  }[kind] || { bg: '#efefec', fg: '#54544f', dot: NSA.inkSubtle };
  const sz = size === 'sm' ? { p: '1px 7px', fs: 10 } : { p: '2px 9px', fs: 11 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: palette.bg, color: palette.fg,
      padding: sz.p, borderRadius: 999, fontSize: sz.fs, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: palette.dot }}></span>}
      {label}
    </span>
  );
}
window.StatusPill = StatusPill;

// ----------------------------------------------------------------------------
function SectionPill({ section, label, color, active = true, onClick }) {
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      background: active ? `${color}15` : '#efefec',
      color: active ? color : NSA.inkSubtle,
      border: `1px solid ${active ? color + '30' : 'transparent'}`,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {label}
    </span>
  );
}
window.SectionPill = SectionPill;

// ----------------------------------------------------------------------------
function AlertCard({ kind, title, body, time, paddock, onClick }) {
  const palette = {
    danger:  { bg: NSA.dangerBg, bd: '#f2c9c2', fg: '#7d2519', ic: 'alert-triangle' },
    warning: { bg: NSA.warnBg,   bd: '#eedbb0', fg: '#7a550f', ic: 'alert-circle' },
    info:    { bg: NSA.infoBg,   bd: '#cedde9', fg: '#264868', ic: 'info' },
  }[kind];
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div onClick={onClick} style={{
      padding: '11px 13px', background: palette.bg, border: `1px solid ${palette.bd}`,
      borderRadius: 8, display: 'flex', gap: 10,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <i data-lucide={palette.ic} style={{width:16, height:16, color:palette.fg, strokeWidth:1.75, flexShrink:0, marginTop:2}}></i>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8}}>
          <div style={{fontSize:13, fontWeight:600, color:palette.fg}}>
            {paddock && <span style={{opacity:0.7}}>{paddock} · </span>}{title}
          </div>
          {time && <div style={{fontSize:11, color:palette.fg, opacity:0.7, whiteSpace:'nowrap'}}>{time}</div>}
        </div>
        {body && <div style={{fontSize:12, color:palette.fg, opacity:0.85, marginTop:2, lineHeight:1.45}}>{body}</div>}
      </div>
    </div>
  );
}
window.AlertCard = AlertCard;

// ----------------------------------------------------------------------------
function Card({ title, subtitle, action, children, padding = 18, style = {} }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${NSA.border}`,
      borderRadius: 8, ...style,
    }}>
      {(title || action) && (
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${NSA.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            {title && <div style={{fontSize:14, fontWeight:600, color:NSA.inkPrimary}}>{title}</div>}
            {subtitle && <div style={{fontSize:12, color:NSA.inkMuted, marginTop:2}}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{padding}}>{children}</div>
    </div>
  );
}
window.Card = Card;

// ----------------------------------------------------------------------------
function Btn({ children, variant = 'default', icon, onClick, size = 'md' }) {
  const styles = {
    default: { bg: '#fff',         fg: NSA.inkPrimary, bd: NSA.borderStrong },
    primary: { bg: NSA.green800,   fg: NSA.cream,      bd: NSA.green800 },
    ghost:   { bg: 'transparent',  fg: NSA.inkPrimary, bd: 'transparent' },
    danger:  { bg: NSA.danger,     fg: '#fff',         bd: NSA.danger },
  }[variant];
  const sz = size === 'sm' ? { p: '5px 10px', fs: 12 } : { p: '7px 12px', fs: 13 };
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding: sz.p, fontSize: sz.fs, fontWeight: 500,
      background: styles.bg, color: styles.fg, border: `1px solid ${styles.bd}`,
      borderRadius: 6, cursor: 'pointer',
    }}>
      {icon && <i data-lucide={icon} style={{width:14, height:14, strokeWidth:1.75}}></i>}
      {children}
    </button>
  );
}
window.Btn = Btn;

// ----------------------------------------------------------------------------
function Avatar({ initials, color = NSA.green500, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 30 ? 11 : 13, fontWeight: 600, color: NSA.cream, letterSpacing: '0.02em',
      flexShrink: 0,
    }}>{initials}</div>
  );
}
window.Avatar = Avatar;

// ----------------------------------------------------------------------------
function EmptyState({ icon, title, body }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div style={{padding:'32px 16px', textAlign:'center', color:NSA.inkMuted}}>
      {icon && <i data-lucide={icon} style={{width:24, height:24, strokeWidth:1.5, marginBottom:8, opacity:0.6}}></i>}
      <div style={{fontSize:14, fontWeight:500, color:NSA.inkPrimary}}>{title}</div>
      {body && <div style={{fontSize:12, marginTop:4}}>{body}</div>}
    </div>
  );
}
window.EmptyState = EmptyState;

// ----------------------------------------------------------------------------
// Tabela leve, igual ao DataTable do dashboard kit (mantida aqui por completude).
function DataTable({ columns, rows, emptyLabel = 'Sem dados' }) {
  if (!rows.length) return <EmptyState icon="inbox" title={emptyLabel} />;
  return (
    <table style={{width:'100%', borderCollapse:'collapse', fontSize:13, fontVariantNumeric:'tabular-nums'}}>
      <thead><tr>
        {columns.map((c, i) => (
          <th key={i} style={{
            textAlign: c.align || 'left', padding: '10px 14px',
            fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: NSA.inkMuted, borderBottom: `1px solid ${NSA.border}`, background: '#fcfcfb',
          }}>{c.label}</th>
        ))}
      </tr></thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} style={{background: ri % 2 === 1 ? '#fcfcfb' : '#fff'}}>
            {columns.map((c, ci) => (
              <td key={ci} style={{
                padding: '11px 14px', textAlign: c.align || 'left',
                borderBottom: ri === rows.length - 1 ? 'none' : `1px solid ${NSA.borderSubtle}`,
                color: NSA.inkPrimary,
              }}>{c.render ? c.render(r) : r[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
window.DataTable = DataTable;
