const kpiStyles = {
  card: {
    padding: '16px 18px', background: '#fff',
    border: '1px solid #e5e5e1', borderRadius: 8,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  label: {
    fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#787873',
  },
  value: {
    fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em',
    color: '#1f1f1c', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
    display: 'flex', alignItems: 'baseline', gap: 6,
  },
  unit: { fontSize: 14, color: '#787873', fontWeight: 400 },
  footer: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
    marginTop: 2,
  },
  deltaUp: { color: '#2e8c4f', fontWeight: 500 },
  deltaDown: { color: '#c0392b', fontWeight: 500 },
  deltaNeutral: { color: '#787873', fontWeight: 500 },
  note: { color: '#787873' },
};

function KPICard({ label, value, unit, delta, deltaDir, note, spark }) {
  const deltaStyle =
    deltaDir === 'up' ? kpiStyles.deltaUp :
    deltaDir === 'down' ? kpiStyles.deltaDown :
    kpiStyles.deltaNeutral;
  const arrow = deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : '→';
  return (
    <div style={kpiStyles.card}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={kpiStyles.label}>{label}</span>
        {spark && <Sparkline data={spark.data} color={spark.color} />}
      </div>
      <div style={kpiStyles.value}>
        {value}
        {unit && <span style={kpiStyles.unit}>{unit}</span>}
      </div>
      {(delta || note) && (
        <div style={kpiStyles.footer}>
          {delta && <span style={deltaStyle}>{arrow} {delta}</span>}
          {note && <span style={kpiStyles.note}>{note}</span>}
        </div>
      )}
    </div>
  );
}

window.KPICard = KPICard;
