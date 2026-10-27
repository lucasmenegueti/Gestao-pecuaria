// Section divider slide — cream on green with a number.
function SectionSlide({ number, title, blurb, slideNum, total }) {
  return (
    <div className="slide" style={{background:'#FFFFE3'}}>
      <SlideChrome eyebrow={`Seção ${number}`} slideNum={slideNum} total={total} />
      <div style={{
        position:'absolute', left:64, right:64, top:'50%',
        transform:'translateY(-50%)', maxWidth: 880,
      }}>
        <div style={{
          fontSize:180, fontWeight:600, color:'#172514',
          opacity:0.08, lineHeight:1, letterSpacing:'-0.04em',
          fontVariantNumeric:'tabular-nums',
          position:'absolute', top:-80, left:-12, pointerEvents:'none',
        }}>
          {String(number).padStart(2,'0')}
        </div>
        <div style={{position:'relative'}}>
          <div style={{
            fontSize:12, fontWeight:500, letterSpacing:'0.12em',
            textTransform:'uppercase', color:'#3f6340', marginBottom:16,
          }}>
            Seção {String(number).padStart(2,'0')}
          </div>
          <h1 style={{
            fontSize:72, fontWeight:600, letterSpacing:'-0.03em',
            lineHeight:1.02, margin:0, color:'#172514',
          }}>
            {title}
          </h1>
          {blurb && <p style={{
            fontSize:20, lineHeight:1.5, color:'#2d4a2e',
            marginTop:28, fontWeight:400, maxWidth:640,
          }}>{blurb}</p>}
        </div>
      </div>
    </div>
  );
}

window.SectionSlide = SectionSlide;
