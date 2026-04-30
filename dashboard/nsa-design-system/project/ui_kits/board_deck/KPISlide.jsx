// KPI Slide — headline metric + supporting grid.
function KPIStat({ label, value, unit, delta, deltaDir, note, large }) {
  const dColor = deltaDir === 'up' ? '#2e8c4f' :
                 deltaDir === 'down' ? '#c0392b' : '#787873';
  const arrow = deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : '';
  return (
    <div style={{
      padding: large ? '28px 0' : '20px 0',
      borderTop:'1px solid #e5e5e1',
    }}>
      <div style={{
        fontSize: 12, fontWeight:500, letterSpacing:'0.08em',
        textTransform:'uppercase', color:'#787873', marginBottom: 10,
      }}>{label}</div>
      <div style={{
        fontSize: large ? 72 : 36, fontWeight:600, letterSpacing:'-0.025em',
        color:'#1f1f1c', fontVariantNumeric:'tabular-nums', lineHeight:1,
      }}>
        {value}
        {unit && <span style={{
          fontSize: large ? 28 : 18, color:'#787873', fontWeight:400, marginLeft:8,
        }}>{unit}</span>}
      </div>
      {(delta || note) && <div style={{
        marginTop: 10, fontSize: 13, display:'flex', gap:14, alignItems:'center',
      }}>
        {delta && <span style={{color:dColor, fontWeight:500}}>{arrow} {delta}</span>}
        {note && <span style={{color:'#787873'}}>{note}</span>}
      </div>}
    </div>
  );
}

function KPISlide({ eyebrow, title, hero, stats, slideNum, total }) {
  return (
    <div className="slide">
      <SlideChrome eyebrow={eyebrow} slideNum={slideNum} total={total} />
      <div style={{
        position:'absolute', left:64, right:64, top:128,
        display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:80,
      }}>
        <div>
          <h1 style={{
            fontSize:44, fontWeight:600, letterSpacing:'-0.02em',
            lineHeight:1.1, margin:'0 0 32px 0', color:'#1f1f1c',
            maxWidth: 480,
          }}>{title}</h1>
          <KPIStat {...hero} large />
        </div>
        <div>
          {stats.map((s, i) => <KPIStat key={i} {...s} />)}
        </div>
      </div>
    </div>
  );
}

window.KPISlide = KPISlide;
