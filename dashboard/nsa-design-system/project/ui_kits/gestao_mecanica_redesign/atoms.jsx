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

Object.assign(window, { NSA, BrandHeader, StatusPill, PrimaryButton, SecondaryButton, Segmented, Label, Input, Select, Textarea });
