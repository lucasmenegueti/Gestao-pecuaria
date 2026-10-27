// Financial table slide — for projections, results, comparisons.
function TableSlide({ eyebrow, title, subtitle, columns, rows, footnote, slideNum, total }) {
  return (
    <div className="slide">
      <SlideChrome eyebrow={eyebrow} slideNum={slideNum} total={total} />
      <div style={{position:'absolute', left:64, right:64, top:120, bottom:80}}>
        <h1 style={{
          fontSize:36, fontWeight:600, letterSpacing:'-0.02em',
          lineHeight:1.15, margin:'0 0 8px 0', color:'#1f1f1c',
        }}>{title}</h1>
        {subtitle && <p style={{
          fontSize:16, color:'#54544f', margin:'0 0 28px 0', fontWeight:400,
        }}>{subtitle}</p>}

        <div style={{
          border:'1px solid #e5e5e1', borderRadius:8, overflow:'hidden',
          background:'#fff',
        }}>
          <table style={{
            width:'100%', borderCollapse:'collapse', fontSize:15,
            fontVariantNumeric:'tabular-nums',
          }}>
            <thead><tr>
              {columns.map((c, i) => <th key={i} style={{
                textAlign: c.align || 'left',
                padding:'14px 20px', fontSize:12, fontWeight:500,
                letterSpacing:'0.06em', textTransform:'uppercase',
                color:'#787873', borderBottom:'1px solid #e5e5e1',
                background:'#fcfcfb',
              }}>{c.label}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} style={{background: r.highlight ? '#f4f6f3' : ri%2===1 ? '#fcfcfb' : '#fff'}}>
                  {columns.map((c, ci) => (
                    <td key={ci} style={{
                      textAlign: c.align || 'left',
                      padding:'13px 20px', borderBottom:'1px solid #efefec',
                      color: r.highlight ? '#172514' : '#1f1f1c',
                      fontWeight: r.highlight ? 600 : 400,
                    }}>{r[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {footnote && <div style={{
          marginTop:20, fontSize:12, color:'#787873', lineHeight:1.55,
        }}>{footnote}</div>}
      </div>
    </div>
  );
}

window.TableSlide = TableSlide;
