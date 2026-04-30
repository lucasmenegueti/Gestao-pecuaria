// Shared atoms for the redesign proposal.

const NSA = {
  green: '#172514',
  cream: '#FFFFE3',
  bgCanvas: '#fcfcfb',
  bgSurface: '#ffffff',
  bgMuted: '#f6f6f2',
  border: '#e5e5e1',
  borderStrong: '#d2d2cd',
  inkPrimary: '#1f1f1c',
  inkSecondary: '#54544f',
  inkMuted: '#787873',
  inkDisabled: '#a8a8a2',
  ok: '#2e8c4f', okBg: '#eaf4ec', okFg: '#1f5d36',
  warn: '#b88217', warnBg: '#faf1dc', warnFg: '#7a550f',
  danger: '#c0392b', dangerBg: '#faeae7', dangerFg: '#7d2519',
  info: '#3a6ea5', infoBg: '#eaf0f6', infoFg: '#264868',
};

function BrandHeader({ title, context, back = 'Menu', onBack, compact = false }) {
  return (
    <div style={{
      padding: compact ? '56px 20px 14px' : '56px 20px 18px',
      background: NSA.green, color: NSA.cream,
    }}>
      <div onClick={onBack} style={{
        display:'flex', alignItems:'center', gap:4, fontSize:13,
        opacity:0.7, marginBottom:10, cursor:'pointer',
      }}>
        <i data-lucide="chevron-left" style={{width:14, height:14, strokeWidth:2}}></i>
        {back}
      </div>
      {context && (
        <div style={{
          fontSize:11, fontWeight:500, letterSpacing:'0.1em',
          textTransform:'uppercase', opacity:0.6, marginBottom:4,
        }}>{context}</div>
      )}
      <div style={{
        fontSize:26, fontWeight:600, letterSpacing:'-0.02em',
        fontFamily:'Lora, serif', lineHeight:1.15,
      }}>{title}</div>
    </div>
  );
}

function StatusPill({ kind, children, size = 'md' }) {
  const pal = {
    ok:      { bg: NSA.okBg,     fg: NSA.okFg,     dot: NSA.ok },
    warn:    { bg: NSA.warnBg,   fg: NSA.warnFg,   dot: NSA.warn },
    danger:  { bg: NSA.dangerBg, fg: NSA.dangerFg, dot: NSA.danger },
    info:    { bg: NSA.infoBg,   fg: NSA.infoFg,   dot: NSA.info },
    neutral: { bg: '#efefec',    fg: NSA.inkSecondary, dot: NSA.inkDisabled },
  }[kind];
  const fontSize = size === 'sm' ? 10 : 11;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      background:pal.bg, color:pal.fg,
      padding:'2px 8px', borderRadius:999,
      fontSize, fontWeight:500, letterSpacing:0,
    }}>
      <span style={{width:5, height:5, borderRadius:'50%', background:pal.dot}}></span>
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, icon }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', padding:'14px 16px', border:'none',
      background: NSA.green, color: NSA.cream,
      borderRadius:10, fontSize:15, fontWeight:600,
      letterSpacing:'-0.01em', cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    }}>
      {icon && <i data-lucide={icon} style={{width:18, height:18, strokeWidth:1.75}}></i>}
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', padding:'14px 16px',
      background:'#fff', color: NSA.inkPrimary,
      border:`1px solid ${NSA.borderStrong}`,
      borderRadius:10, fontSize:15, fontWeight:500, cursor:'pointer',
    }}>{children}</button>
  );
}

function Segmented({ options, value, onChange, danger }) {
  return (
    <div style={{display:'flex', gap:6}}>
      {options.map(o => {
        const active = value === o;
        const isDanger = danger && o === 'Urgente';
        return (
          <button key={o} onClick={() => onChange && onChange(o)} style={{
            flex:1, padding:'10px 8px',
            borderRadius:8,
            border: `1px solid ${active ? (isDanger ? NSA.danger : NSA.green) : NSA.border}`,
            background: active ? (isDanger ? NSA.dangerBg : '#f0f1ee') : '#fff',
            color: active ? (isDanger ? NSA.dangerFg : NSA.green) : NSA.inkSecondary,
            fontSize:13, fontWeight: active ? 500 : 400,
            cursor:'pointer',
          }}>{o}</button>
        );
      })}
    </div>
  );
}

function Label({ children, required }) {
  return (
    <label style={{
      display:'block', fontSize:12, color: NSA.inkSecondary,
      marginBottom:6, fontWeight:500,
    }}>
      {children} {required && <span style={{color: NSA.danger}}>*</span>}
    </label>
  );
}

function Input({ value, placeholder, type='text', disabled, onChange }) {
  return (
    <input type={type} value={value || ''} placeholder={placeholder} disabled={disabled}
      onChange={e => onChange && onChange(e.target.value)}
      style={{
        width:'100%', padding:'11px 12px',
        border:`1px solid ${NSA.borderStrong}`, borderRadius:8,
        fontSize:14, background: disabled ? NSA.bgMuted : '#fff',
        color: disabled ? NSA.inkMuted : NSA.inkPrimary,
        fontFamily:'Inter', boxSizing:'border-box',
      }}/>
  );
}

function Select({ value, options, placeholder, onChange }) {
  return (
    <select value={value || ''} onChange={e => onChange && onChange(e.target.value)}
      style={{
        width:'100%', padding:'11px 12px',
        border:`1px solid ${NSA.borderStrong}`, borderRadius:8,
        fontSize:14, background:'#fff', color: value ? NSA.inkPrimary : NSA.inkMuted,
        fontFamily:'Inter', appearance:'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2354544f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center',
        paddingRight:32,
      }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.id || o} value={o.id || o}>{o.label || o}</option>)}
    </select>
  );
}

function Textarea({ value, placeholder, rows=3, onChange }) {
  return (
    <textarea value={value || ''} placeholder={placeholder} rows={rows}
      onChange={e => onChange && onChange(e.target.value)}
      style={{
        width:'100%', padding:'11px 12px',
        border:`1px solid ${NSA.borderStrong}`, borderRadius:8,
        fontSize:14, background:'#fff', color: NSA.inkPrimary,
        fontFamily:'Inter', resize:'none', boxSizing:'border-box',
      }}/>
  );
}

// ---------- Pecuária-specific atoms ----------

function TabBar({ active = 'painel' }) {
  const items = [
    { id:'painel',  label:'Painel',  icon:'layout-dashboard' },
    { id:'ronda',   label:'Ronda',   icon:'footprints' },
    { id:'rebanho', label:'Rebanho', icon:'beef' },
    { id:'estoque', label:'Estoque', icon:'package' },
    { id:'mapa',    label:'Mapa',    icon:'map' },
  ];
  return (
    <div style={{
      position:'absolute', left:0, right:0, bottom:0,
      background:'#fff', borderTop:`1px solid ${NSA.border}`,
      paddingBottom:18, paddingTop:8, display:'flex',
    }}>
      {items.map(it => {
        const on = active === it.id;
        return (
          <div key={it.id} style={{
            flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', gap:4,
            color: on ? NSA.green : NSA.inkMuted,
          }}>
            <i data-lucide={it.icon} style={{width:22, height:22, strokeWidth: on ? 2 : 1.75}}></i>
            <div style={{fontSize:10, fontWeight: on ? 600 : 500, letterSpacing:'-0.01em'}}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function SectionCaption({ children, right }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase',
      color: NSA.inkMuted, fontWeight:500, margin:'18px 20px 10px',
    }}>
      <span>{children}</span>
      {right}
    </div>
  );
}

// Domain color dots — used in menu avaliação + suplementação pills
const DOMAIN = {
  suplementacao: { tint:'#f4efd9', dot:'#8a7c2b' },
  forragem:      { tint:'#e6f1e4', dot:'#3b7a3b' },
  aguada:        { tint:'#e4eef5', dot:'#2b6a93' },
  sanidade:      { tint:'#ece5f1', dot:'#6e3b8a' },
  cerca:         { tint:'#faeae7', dot:'#b43a2c' },
  peso:          { tint:'#faf1dc', dot:'#8a6515' },
  lavagem:       { tint:'#e0edf2', dot:'#2b7a8c' },
};

function DomainTile({ domain, label, icon, last, onClick }) {
  const pal = DOMAIN[domain] || { tint: NSA.bgMuted, dot: NSA.green };
  return (
    <div onClick={onClick} style={{
      padding:'16px 14px', background:'#fff',
      border:`1px solid ${NSA.border}`, borderRadius:14,
      cursor:'pointer', minHeight:106, position:'relative',
      display:'flex', flexDirection:'column', gap:14,
    }}>
      <div style={{
        width:40, height:40, borderRadius:12, background: pal.tint,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <i data-lucide={icon} style={{width:20, height:20, strokeWidth:1.75, color: pal.dot}}></i>
      </div>
      <div>
        <div style={{fontSize:13, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.01em', lineHeight:1.25}}>{label}</div>
        {last && <div style={{fontSize:11, color:NSA.inkMuted, marginTop:3, fontVariantNumeric:'tabular-nums'}}>Últ. {last}</div>}
      </div>
    </div>
  );
}

function AlertRow({ kind='warn', title, body, icon='alert-triangle' }) {
  const pal = {
    danger: { bg: NSA.dangerBg, fg: NSA.dangerFg, edge: NSA.danger },
    warn:   { bg: NSA.warnBg,   fg: NSA.warnFg,   edge: NSA.warn },
    info:   { bg: NSA.infoBg,   fg: NSA.infoFg,   edge: NSA.info },
  }[kind];
  return (
    <div style={{
      display:'flex', gap:12, padding:'12px 14px', background:'#fff',
      border:`1px solid ${NSA.border}`, borderLeft:`3px solid ${pal.edge}`,
      borderRadius:12, alignItems:'flex-start',
    }}>
      <div style={{
        width:30, height:30, borderRadius:8, background: pal.bg,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        <i data-lucide={icon} style={{width:16, height:16, color: pal.fg, strokeWidth:1.75}}></i>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:13, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.01em'}}>{title}</div>
        <div style={{fontSize:12, color:NSA.inkSecondary, marginTop:1, lineHeight:1.4}}>{body}</div>
      </div>
      <i data-lucide="chevron-right" style={{width:16, height:16, color:NSA.inkMuted, flexShrink:0, marginTop:6}}></i>
    </div>
  );
}

function PiqueteCard({ code, area, grass, head, last, status='ok', extra, extraKind }) {
  const kindColor = { ok: NSA.ok, warn: NSA.warn, danger: NSA.danger }[status];
  const statusLabel = { ok:'OK', warn:'Atenção', danger:'Alerta' }[status];
  return (
    <div style={{
      background:'#fff', border:`1px solid ${NSA.border}`,
      borderLeft:`3px solid ${kindColor}`, borderRadius:12,
      padding:'12px 14px',
    }}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2}}>
        <div style={{display:'flex', alignItems:'baseline', gap:8}}>
          <span style={{fontFamily:'ui-monospace, Menlo, monospace', fontSize:11, color:NSA.inkMuted, letterSpacing:'0.04em'}}>{code}</span>
          <span style={{fontSize:15, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.01em'}}>Pasto {code.replace('P','')}</span>
        </div>
        <StatusPill kind={status}>{statusLabel}</StatusPill>
      </div>
      <div style={{fontSize:12, color:NSA.inkSecondary, marginBottom:8, fontVariantNumeric:'tabular-nums'}}>
        {area} ha · {grass} · <span style={{color:NSA.inkPrimary, fontWeight:500}}>{head} cab</span>
      </div>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        fontSize:12, color:NSA.inkMuted, fontVariantNumeric:'tabular-nums',
      }}>
        <span>Última ronda {last}</span>
        {extra && (
          <span style={{color: extraKind === 'danger' ? NSA.danger : extraKind === 'warn' ? NSA.warnFg : NSA.inkSecondary, fontWeight:500}}>
            {extra}
          </span>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, unit, hint, tone='default' }) {
  const color = tone === 'danger' ? NSA.danger : tone === 'warn' ? NSA.warnFg : tone === 'ok' ? NSA.ok : NSA.inkPrimary;
  return (
    <div style={{
      background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:12,
      padding:'12px 14px',
    }}>
      <div style={{fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:NSA.inkMuted, fontWeight:500}}>{label}</div>
      <div style={{display:'flex', alignItems:'baseline', gap:4, marginTop:6}}>
        <span style={{
          fontFamily:'Lora, serif', fontSize:28, fontWeight:600,
          color, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums',
        }}>{value}</span>
        {unit && <span style={{fontSize:12, color:NSA.inkSecondary, fontWeight:500}}>{unit}</span>}
      </div>
      {hint && <div style={{fontSize:11, color:NSA.inkMuted, marginTop:3, fontVariantNumeric:'tabular-nums'}}>{hint}</div>}
    </div>
  );
}

function ProgressBar({ pct, tone='default' }) {
  const color = { danger: NSA.danger, warn: NSA.warn, ok: NSA.ok, default: NSA.green }[tone];
  return (
    <div style={{height:6, background: NSA.bgMuted, borderRadius:999, overflow:'hidden'}}>
      <div style={{height:'100%', width:`${pct}%`, background:color, borderRadius:999}}></div>
    </div>
  );
}

function ChoiceCard({ label, desc, tone='default', selected, icon }) {
  const palette = {
    ok:      { edge: NSA.ok,    bg: NSA.okBg,     tint: NSA.okFg },
    warn:    { edge: NSA.warn,  bg: NSA.warnBg,   tint: NSA.warnFg },
    danger:  { edge: NSA.danger,bg: NSA.dangerBg, tint: NSA.dangerFg },
    default: { edge: NSA.green, bg: '#f0f1ee',    tint: NSA.green },
  }[tone];
  return (
    <div style={{
      background: selected ? palette.bg : '#fff',
      border: selected ? `1.5px solid ${palette.edge}` : `1px solid ${NSA.border}`,
      borderRadius:12, padding:'14px 14px',
      display:'flex', alignItems:'center', gap:12,
    }}>
      {icon && (
        <div style={{
          width:36, height:36, borderRadius:10,
          background: selected ? '#fff' : NSA.bgMuted,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <i data-lucide={icon} style={{width:18, height:18, color: palette.tint, strokeWidth:1.75}}></i>
        </div>
      )}
      <div style={{flex:1}}>
        <div style={{fontSize:14, fontWeight:600, color: selected ? palette.tint : NSA.inkPrimary, letterSpacing:'-0.01em'}}>{label}</div>
        {desc && <div style={{fontSize:12, color:NSA.inkSecondary, marginTop:2, lineHeight:1.35}}>{desc}</div>}
      </div>
      <div style={{
        width:18, height:18, borderRadius:'50%',
        border: selected ? `5px solid ${palette.edge}` : `1.5px solid ${NSA.borderStrong}`,
        background:'#fff',
      }}></div>
    </div>
  );
}

function WizardHeader({ domain, title, step, total, context, onBack }) {
  const pal = DOMAIN[domain] || { tint: NSA.cream, dot: NSA.cream };
  return (
    <div style={{padding:'56px 20px 16px', background: NSA.green, color: NSA.cream}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div onClick={onBack} style={{display:'flex', alignItems:'center', gap:4, fontSize:13, opacity:0.8, cursor:'pointer'}}>
          <i data-lucide="chevron-left" style={{width:14, height:14, strokeWidth:2}}></i>
          Voltar
        </div>
        <div style={{fontSize:11, letterSpacing:'0.08em', opacity:0.7, fontFamily:'ui-monospace, Menlo, monospace'}}>
          {step} / {total}
        </div>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
        <span style={{width:8, height:8, borderRadius:'50%', background: pal.dot}}></span>
        <span style={{fontSize:11, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', opacity:0.75}}>{context}</span>
      </div>
      <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em', fontFamily:'Lora, serif', lineHeight:1.2}}>{title}</div>
      {/* progress */}
      <div style={{marginTop:14, height:3, background:'rgba(255,255,227,0.18)', borderRadius:999, overflow:'hidden'}}>
        <div style={{height:'100%', width:`${(step/total)*100}%`, background:NSA.cream, borderRadius:999}}></div>
      </div>
    </div>
  );
}

function WizardFooter({ back='Voltar', next='Avançar', onBack, onNext, variant='primary' }) {
  return (
    <div style={{
      position:'absolute', left:0, right:0, bottom:0,
      padding:'14px 16px 24px', background:'#fff',
      borderTop:`1px solid ${NSA.border}`, display:'flex', gap:10,
    }}>
      <button onClick={onBack} style={{
        padding:'13px 18px', background:'#fff',
        border:`1px solid ${NSA.borderStrong}`, borderRadius:10,
        fontSize:14, fontWeight:500, color:NSA.inkSecondary, cursor:'pointer',
      }}>{back}</button>
      <button onClick={onNext} style={{
        flex:1, padding:'13px 16px', border:'none',
        background: variant === 'success' ? NSA.ok : NSA.green,
        color: NSA.cream, borderRadius:10,
        fontSize:15, fontWeight:600, letterSpacing:'-0.01em',
        display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer',
      }}>
        {next}
        {variant !== 'success' && <i data-lucide="arrow-right" style={{width:16, height:16, strokeWidth:2}}></i>}
      </button>
    </div>
  );
}

Object.assign(window, {
  NSA, BrandHeader, StatusPill, PrimaryButton, SecondaryButton,
  Segmented, Label, Input, Select, Textarea,
  TabBar, SectionCaption, DOMAIN, DomainTile, AlertRow, PiqueteCard, KPI,
  ProgressBar, ChoiceCard, WizardHeader, WizardFooter,
});
