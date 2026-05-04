// FarmMap — mapa SVG simplificado da fazenda. Cada piquete é um polígono colorido
// pelo status do dia (verde/amarelo/vermelho). Click seleciona o talhão.
// Geometria fake gerada a partir do center [lat,lng] usando ruído determinístico —
// suficiente pro protótipo. Quando codarmos, troca por GeoJSON real do Supabase.

function FarmMap({ paddocks, statusFor, selected, onSelect, height = 480 }) {
  // Bounding box da fazenda (lat: -15.20 a -15.30, lng: -45.34 a -45.46)
  const lats = paddocks.map(p => p.center[0]);
  const lngs = paddocks.map(p => p.center[1]);
  const minLat = Math.min(...lats) - 0.005;
  const maxLat = Math.max(...lats) + 0.005;
  const minLng = Math.min(...lngs) - 0.008;
  const maxLng = Math.max(...lngs) + 0.008;

  const W = 720;
  const H = height;
  const pad = 12;

  const projX = (lng) => pad + ((lng - minLng) / (maxLng - minLng)) * (W - 2 * pad);
  const projY = (lat) => pad + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * pad);

  // Gera polígono fake ao redor do centro com base em area_ha.
  // Não é geometria real, mas dá ideia de tamanho relativo.
  function pseudoPoly(p) {
    const cx = projX(p.center[1]);
    const cy = projY(p.center[0]);
    const radius = 4 + Math.sqrt(p.area) * 1.2;
    const sides = 5 + (p.id % 3);
    const offset = (p.id * 13) % 360;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const ang = ((360 / sides) * i + offset) * (Math.PI / 180);
      const r = radius * (0.85 + (((p.id * (i + 1)) % 30) / 100));
      pts.push(`${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`);
    }
    return { cx, cy, points: pts.join(' ') };
  }

  const colorOf = (st) => {
    if (st === 'green') return { fill: NSA.ok, stroke: '#1f5d36', op: 0.4 };
    if (st === 'yellow') return { fill: NSA.warn, stroke: '#7a550f', op: 0.4 };
    return { fill: NSA.danger, stroke: '#7d2519', op: 0.32 };
  };

  return (
    <div style={{
      background: '#f4f6f3', border: `1px solid ${NSA.border}`, borderRadius: 8, padding: 12,
      position: 'relative',
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height: H, display:'block'}}>
        {/* Subtle grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e8ede7" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Sede label (canto inferior direito) */}
        <g transform={`translate(${W - 110}, ${H - 30})`}>
          <rect x={0} y={0} width={100} height={22} fill="#fff" stroke={NSA.border} rx={4}/>
          <circle cx={10} cy={11} r={3} fill={NSA.green800}/>
          <text x={20} y={15} fontSize="11" fill={NSA.inkPrimary} fontWeight="500">Sede da fazenda</text>
        </g>

        {/* Paddocks */}
        {paddocks.map(p => {
          const poly = pseudoPoly(p);
          const st = statusFor(p);
          const c = colorOf(st);
          const isSel = selected === p.id;
          return (
            <g key={p.id} onClick={() => onSelect && onSelect(p.id)} style={{cursor:'pointer'}}>
              <polygon
                points={poly.points}
                fill={c.fill}
                fillOpacity={isSel ? 0.65 : c.op}
                stroke={isSel ? NSA.green800 : c.stroke}
                strokeWidth={isSel ? 2 : 1}
              />
              <text
                x={poly.cx} y={poly.cy + 3}
                textAnchor="middle"
                fontSize="9"
                fontWeight={isSel ? 700 : 500}
                fill={isSel ? NSA.green800 : '#1f1f1c'}
                style={{pointerEvents:'none', userSelect:'none'}}
              >{p.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

window.FarmMap = FarmMap;
