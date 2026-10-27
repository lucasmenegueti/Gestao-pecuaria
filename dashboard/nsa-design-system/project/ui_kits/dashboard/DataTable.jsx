const tableStyles = {
  wrap: {
    background: '#fff', border: '1px solid #e5e5e1',
    borderRadius: 8, overflow: 'hidden',
  },
  header: {
    padding: '14px 18px', borderBottom: '1px solid #e5e5e1',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: 14, fontWeight: 600, color: '#1f1f1c' },
  sub: { fontSize: 12, color: '#787873', marginTop: 2 },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
  },
  th: {
    textAlign: 'left', padding: '10px 18px',
    fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: '#787873',
    borderBottom: '1px solid #e5e5e1', background: '#fcfcfb',
  },
  td: {
    padding: '12px 18px', borderBottom: '1px solid #efefec',
    color: '#1f1f1c',
  },
};

function DataTable({ title, subtitle, action, columns, rows }) {
  return (
    <div style={tableStyles.wrap}>
      {(title || action) && (
        <div style={tableStyles.header}>
          <div>
            {title && <div style={tableStyles.title}>{title}</div>}
            {subtitle && <div style={tableStyles.sub}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <table style={tableStyles.table}>
        <thead><tr>
          {columns.map((c, i) => (
            <th key={i} style={{...tableStyles.th, textAlign: c.align || 'left'}}>
              {c.label}
            </th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={{background: ri % 2 === 1 ? '#fcfcfb' : '#fff'}}>
              {columns.map((c, ci) => (
                <td key={ci} style={{
                  ...tableStyles.td,
                  textAlign: c.align || 'left',
                  borderBottom: ri === rows.length - 1 ? 'none' : tableStyles.td.borderBottom,
                }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

window.DataTable = DataTable;
