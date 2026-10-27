// Piquetes (paddocks) view — table-centric list of paddocks with capacity, stock, consumption.
function PiquetesView() {
  const columns = [
    { key:'id', label:'Piquete', render: r => (
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div style={{
          width:28, height:28, borderRadius:6, background:'#e8ede7',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:600, color:'#172514', letterSpacing:'0.02em',
        }}>{r.id}</div>
        <div>
          <div style={{fontWeight:500, color:'#1f1f1c'}}>{r.name}</div>
          <div style={{fontSize:11, color:'#787873', marginTop:1}}>{r.species}</div>
        </div>
      </div>
    )},
    { key:'area', label:'Área (ha)', align:'right' },
    { key:'heads', label:'Cabeças', align:'right', render: r => (
      <span style={{fontVariantNumeric:'tabular-nums'}}>{r.heads} <span style={{color:'#a8a8a2', fontSize:11}}>/ {r.cap}</span></span>
    )},
    { key:'ua', label:'UA/ha', align:'right' },
    { key:'salt', label:'Sal · ração', render: r => (
      <div style={{display:'flex', gap:6, alignItems:'center'}}>
        <StockPill level={r.salt} label="sal" />
        <StockPill level={r.feed} label="ração" />
      </div>
    )},
    { key:'water', label:'Água 7d', align:'right', render: r => (
      <div style={{display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end'}}>
        <Sparkline data={r.water} color={r.waterAlert ? '#c0392b' : '#3f6340'} width={56} height={18} />
        <span style={{fontVariantNumeric:'tabular-nums', color: r.waterAlert ? '#c0392b' : '#1f1f1c', fontWeight: r.waterAlert ? 500 : 400}}>
          {r.waterLast}L
        </span>
      </div>
    )},
    { key:'status', label:'Estado', render: r => (
      <span style={{
        display:'inline-flex', alignItems:'center', gap:5,
        background: r.status==='ok' ? '#eaf4ec' : r.status==='warn' ? '#faf1dc' : '#efefec',
        color:    r.status==='ok' ? '#1f5d36' : r.status==='warn' ? '#7a550f' : '#54544f',
        padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:500,
      }}>
        <span style={{width:5, height:5, borderRadius:'50%',
          background: r.status==='ok' ? '#2e8c4f' : r.status==='warn' ? '#b88217' : '#a8a8a2'}}></span>
        {r.status==='ok' ? 'Saudável' : r.status==='warn' ? 'Atenção' : 'Descanso'}
      </span>
    )},
  ];

  const rows = [
    { id:'P01', name:'Sede · oeste', species:'Braquiarão', area:'120', heads:182, cap:200, ua:'1,8', salt:'ok', feed:'ok',  status:'ok',   water:[110,108,112,115,114,111,113], waterLast:113 },
    { id:'P08', name:'Baixada',      species:'Mavuno',     area:'180', heads:240, cap:280, ua:'1,9', salt:'ok', feed:'low', status:'warn', water:[130,128,120,100,90,85,82], waterLast:82, waterAlert:true },
    { id:'P12', name:'Mavuno norte', species:'Mavuno',     area:'210', heads:340, cap:360, ua:'2,1', salt:'ok', feed:'ok',  status:'ok',   water:[155,160,158,162,159,164,161], waterLast:161 },
    { id:'P14', name:'ILP talhão 3', species:'Braquiarão', area:'280', heads:412, cap:480, ua:'2,3', salt:'low',feed:'ok',  status:'warn', water:[200,205,198,201,199,204,203], waterLast:203 },
    { id:'P17', name:'Reserva sul',  species:'Braquiarão', area:'320', heads:0,   cap:400, ua:'0,0', salt:'-', feed:'-',   status:'rest', water:[0,0,0,0,0,0,0], waterLast:0 },
    { id:'P22', name:'Vale',         species:'Mavuno',     area:'150', heads:224, cap:240, ua:'2,0', salt:'ok', feed:'ok',  status:'ok',   water:[122,125,121,124,120,126,123], waterLast:123 },
    { id:'P27', name:'Entrada',      species:'Braquiarão', area:'280', heads:318, cap:400, ua:'1,6', salt:'ok', feed:'ok',  status:'ok',   water:[170,168,172,175,171,169,173], waterLast:173 },
  ];

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%', boxSizing:'border-box'}}>
      <div style={{marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
        <div>
          <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'#787873', marginBottom:6}}>
            Pecuária · 27 piquetes
          </div>
          <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:'#1f1f1c'}}>
            Piquetes
          </h1>
        </div>
        <FilterBar />
      </div>

      {/* Summary strip */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:16}}>
        <KPICard label="Área total pecuária" value="4.000" unit="ha" />
        <KPICard label="Rebanho ativo" value="3.675" unit="cabeças" />
        <KPICard label="UA/ha média" value="2,1" />
        <KPICard label="Alertas ativos" value="2" note="água baixa · sal baixo" />
      </div>

      <DataTable
        title="Status operacional"
        subtitle="Sparkline: consumo de água nos últimos 7 dias (litros)"
        action={
          <div style={{display:'flex', gap:8}}>
            <button style={{fontSize:12, fontWeight:500, color:'#1f1f1c', background:'#fff', border:'1px solid #d2d2cd', padding:'6px 10px', borderRadius:6, cursor:'pointer'}}>
              Exportar CSV
            </button>
            <button style={{fontSize:12, fontWeight:500, color:'#FFFFE3', background:'#172514', border:'1px solid #172514', padding:'6px 10px', borderRadius:6, cursor:'pointer'}}>
              + Registrar manejo
            </button>
          </div>
        }
        columns={columns}
        rows={rows}
      />
    </div>
  );
}

function StockPill({ level, label }) {
  const palette = {
    ok:   { bg:'#eaf4ec', fg:'#1f5d36' },
    low:  { bg:'#faeae7', fg:'#7d2519' },
    '-':  { bg:'#efefec', fg:'#787873' },
  }[level];
  return (
    <span style={{
      fontSize:11, padding:'1px 7px', borderRadius:4,
      background:palette.bg, color:palette.fg, fontWeight:500,
    }}>
      {label}
    </span>
  );
}

function FilterBar() {
  const [active, setActive] = React.useState('all');
  const opts = [
    { id:'all', label:'Todos' },
    { id:'ok', label:'Saudável' },
    { id:'warn', label:'Com atenção' },
    { id:'rest', label:'Em descanso' },
  ];
  return (
    <div style={{
      display:'inline-flex', padding:2, background:'#efefec', borderRadius:8, gap:2,
    }}>
      {opts.map(o => (
        <button key={o.id} onClick={() => setActive(o.id)}
          style={{
            fontSize:12, fontWeight:500, padding:'6px 12px', borderRadius:6,
            border:'none', cursor:'pointer',
            background: active===o.id ? '#fff' : 'transparent',
            color: active===o.id ? '#1f1f1c' : '#54544f',
            boxShadow: active===o.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

window.PiquetesView = PiquetesView;
