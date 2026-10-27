// Title slide — opens the deck. Big mark + title + meeting metadata.
function TitleSlide({ title, subtitle, meeting, date, slideNum, total }) {
  return (
    <div className="slide inverse">
      <SlideChrome eyebrow="Conselho · 2026" slideNum={slideNum} total={total} inverse />
      <div style={{
        position:'absolute', left:64, right:64, top:'50%',
        transform:'translateY(-50%)', maxWidth: 900,
      }}>
        <div style={{
          fontSize:12, fontWeight:500, letterSpacing:'0.12em',
          textTransform:'uppercase', color:'#8ba68c', marginBottom:20,
        }}>
          {meeting}
        </div>
        <h1 style={{
          fontSize:64, fontWeight:600, letterSpacing:'-0.03em',
          lineHeight:1.05, margin:0, color:'#FFFFE3',
        }}>
          {title}
        </h1>
        {subtitle && <p style={{
          fontSize:22, lineHeight:1.45, color:'rgba(255,255,227,0.75)',
          marginTop:24, fontWeight:400, maxWidth:780,
        }}>{subtitle}</p>}
        <div style={{
          marginTop:56, paddingTop:24,
          borderTop:'1px solid rgba(255,255,227,0.15)',
          fontSize:14, color:'rgba(255,255,227,0.65)',
          display:'flex', gap:32,
        }}>
          <div><strong style={{color:'#FFFFE3',fontWeight:500}}>Data</strong> &nbsp; {date}</div>
          <div><strong style={{color:'#FFFFE3',fontWeight:500}}>Safra</strong> &nbsp; 2024/5</div>
        </div>
      </div>
    </div>
  );
}

window.TitleSlide = TitleSlide;
