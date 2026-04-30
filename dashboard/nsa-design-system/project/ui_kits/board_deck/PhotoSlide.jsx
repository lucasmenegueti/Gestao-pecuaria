// Full-bleed photo slide with overlay caption — for transitions, chapter intros.
function PhotoSlide({ image, eyebrow, title, quote, attribution, slideNum, total }) {
  return (
    <div className="slide inverse" style={{backgroundColor:'#0c1609'}}>
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:`url(${image})`,
        backgroundSize:'cover', backgroundPosition:'center',
      }} />
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(180deg, rgba(12,22,9,0.35) 0%, rgba(12,22,9,0.75) 70%, rgba(12,22,9,0.9) 100%)',
      }} />
      <div style={{position:'relative'}}>
        <SlideChrome eyebrow={eyebrow} slideNum={slideNum} total={total} inverse />
      </div>

      <div style={{
        position:'absolute', left:64, right:64, bottom:96, maxWidth:900,
      }}>
        {title && <h1 style={{
          fontSize:48, fontWeight:600, letterSpacing:'-0.02em',
          lineHeight:1.1, margin:0, color:'#FFFFE3',
        }}>{title}</h1>}
        {quote && <div style={{
          fontSize:32, fontWeight:500, lineHeight:1.3,
          color:'#FFFFE3', letterSpacing:'-0.015em',
          margin: 0, maxWidth: 820,
        }}>"{quote}"</div>}
        {attribution && <div style={{
          marginTop:20, fontSize:14, color:'rgba(255,255,227,0.7)',
          letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:500,
        }}>— {attribution}</div>}
      </div>
    </div>
  );
}

window.PhotoSlide = PhotoSlide;
