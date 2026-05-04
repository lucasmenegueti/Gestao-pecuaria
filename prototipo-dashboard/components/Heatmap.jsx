// Heatmap de cobertura: matriz piquete × dia. Cor = nível de cobertura.

function Heatmap({ paddocks, data, days = 14 }) {
  const cell = 16;
  const labelW = 90;
  const total = paddocks.length;
  const dayLabels = Array.from({ length: days }, (_, i) => {
    const d = new Date('2026-04-30');
    d.setDate(d.getDate() - (days - 1 - i));
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const colorOf = (v) => {
    if (v === 2) return NSA.ok;
    if (v === 1) return NSA.warn;
    return '#efefec';
  };

  return (
    <div style={{overflowX:'auto'}}>
      <div style={{minWidth: labelW + cell * days + 12}}>
        {/* Day header */}
        <div style={{display:'flex', marginLeft: labelW, marginBottom:4}}>
          {dayLabels.map((d, i) => (
            <div key={i} style={{
              width: cell, fontSize: 9, color: NSA.inkMuted, textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: i === days - 1 ? 600 : 400,
            }}>{d}</div>
          ))}
        </div>

        {/* Rows */}
        {paddocks.map(p => (
          <div key={p.id} style={{display:'flex', alignItems:'center', height: cell + 2, marginBottom: 1}}>
            <div style={{
              width: labelW, fontSize: 11, color: NSA.inkPrimary,
              paddingRight: 8, textAlign: 'right', fontWeight: 500,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{p.name}</div>
            {(data[p.id] || []).map((v, i) => (
              <div key={i} title={`${p.name} · ${dayLabels[i]} · ${['sem ronda','parcial','completa'][v]}`} style={{
                width: cell - 2, height: cell - 2, marginRight: 2,
                background: colorOf(v), borderRadius: 2,
                border: i === days - 1 ? `1px solid ${NSA.borderStrong}` : 'none',
              }}></div>
            ))}
          </div>
        ))}

        {/* Legend */}
        <div style={{display:'flex', alignItems:'center', gap:14, marginTop:14, paddingTop:12, borderTop:`1px solid ${NSA.borderSubtle}`, fontSize:11, color:NSA.inkMuted}}>
          <div style={{display:'flex', alignItems:'center', gap:5}}><span style={{width:10, height:10, background:'#efefec', borderRadius:2}}></span> sem ronda</div>
          <div style={{display:'flex', alignItems:'center', gap:5}}><span style={{width:10, height:10, background:NSA.warn, borderRadius:2}}></span> parcial</div>
          <div style={{display:'flex', alignItems:'center', gap:5}}><span style={{width:10, height:10, background:NSA.ok, borderRadius:2}}></span> completa</div>
        </div>
      </div>
    </div>
  );
}

window.Heatmap = Heatmap;
