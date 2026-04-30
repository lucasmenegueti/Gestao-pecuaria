// Shared chrome for NSA slides (top mark, slide counter, footer).
function SlideChrome({ eyebrow, slideNum, total, inverse }) {
  const logoSrc = inverse
    ? '../../assets/logo-nsa-cream-transparent.png'
    : '../../assets/logo-nsa-green-transparent.png';
  return (
    <React.Fragment>
      <div className="chrome">
        <div className="mark">
          <img src={logoSrc} alt="NSA" />
          <span className="wm">N.S.A</span>
        </div>
        <div>{eyebrow}</div>
      </div>
      <div className="foot">
        <div>Fazenda Nossa Senhora Aparecida</div>
        <div>{String(slideNum).padStart(2,'0')} / {String(total).padStart(2,'0')}</div>
      </div>
    </React.Fragment>
  );
}

window.SlideChrome = SlideChrome;
