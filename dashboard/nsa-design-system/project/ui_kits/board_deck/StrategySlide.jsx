// Two-column strategy slide — Agricultura / Pecuária, each with bulleted items.
function StrategyCol({ title, icon, items }) {
  return (
    <div>
      <div style={{
        display:'flex', alignItems:'center', gap:10, marginBottom:20,
        paddingBottom:14, borderBottom:'1px solid #d2d2cd',
      }}>
        <i data-lucide={icon} style={{width:22, height:22, color:'#172514', strokeWidth:1.75}}></i>
        <h2 style={{
          fontSize:22, fontWeight:600, letterSpacing:'-0.01em',
          margin:0, color:'#172514',
        }}>{title}</h2>
      </div>
      {items.map((it, i) => (
        <div key={i} style={{
          marginBottom: 18, paddingBottom: 18,
          borderBottom: i < items.length-1 ? '1px solid #efefec' : 'none',
        }}>
          <div style={{
            fontSize:15, fontWeight:600, color:'#1f1f1c', marginBottom:4,
            letterSpacing:'-0.005em',
          }}>{it.title}</div>
          <div style={{fontSize:14, color:'#54544f', lineHeight:1.5}}>{it.desc}</div>
        </div>
      ))}
    </div>
  );
}

function StrategySlide({ eyebrow, title, left, right, slideNum, total }) {
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, []);
  return (
    <div className="slide">
      <SlideChrome eyebrow={eyebrow} slideNum={slideNum} total={total} />
      <div style={{position:'absolute', left:64, right:64, top:120, bottom:80}}>
        <h1 style={{
          fontSize:36, fontWeight:600, letterSpacing:'-0.02em',
          lineHeight:1.15, margin:'0 0 36px 0', color:'#1f1f1c',
        }}>{title}</h1>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:56}}>
          <StrategyCol {...left} />
          <StrategyCol {...right} />
        </div>
      </div>
    </div>
  );
}

window.StrategySlide = StrategySlide;
