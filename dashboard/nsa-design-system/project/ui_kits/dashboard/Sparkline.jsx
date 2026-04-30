// Minimal inline sparkline — SVG polyline.
function Sparkline({ data, color = '#172514', width = 72, height = 24 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      <polyline fill="none" stroke={color} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

window.Sparkline = Sparkline;
