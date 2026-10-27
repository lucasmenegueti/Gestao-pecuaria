// Screens: Dashboard + Máquinas.

function DashboardScreen() {
  const filtro = 'mes';
  const filtros = [
    { k:'ano',       l:'Ano' },
    { k:'mes',       l:'Mês atual' },
    { k:'ultimoMes', l:'Último mês' },
    { k:'custom',    l:'Período' },
  ];

  const mecanicos = [
    { nome:'Edmilson', n:14, max:14 },
    { nome:'Valdir',   n:9,  max:14 },
    { nome:'Marcos',   n:5,  max:14 },
  ];

  const paradas = [
    { nome:'Colheitadeira Case 2388', dias:12, max:12, kind:'danger' },
    { nome:'Trator JD 7210',          dias:9,  max:12, kind:'warn' },
    { nome:'Pulverizador Jacto',      dias:4,  max:12, kind:'neutral' },
  ];

  const kpis = [
    { v:'3',  l:'OS abertas',       k:'danger' },
    { v:'27', l:'Concluídas no mês',k:'ok' },
    { v:'5',  l:'Peças pendentes',  k:'warn' },
    { v:'4,2', suf:'d', l:'Tempo médio reparo', k:'info' },
  ];

  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%'}}>
      <BrandHeader title="Dashboard" context="Indicadores · abril/26" back="Menu" compact/>

      <div style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:14}}>
        {/* Filtros */}
        <div style={{display:'flex', gap:4, padding:3, background:NSA.bgMuted, borderRadius:10}}>
          {filtros.map(f => (
            <button key={f.k} style={{
              flex:1, padding:'7px 6px', fontSize:12, fontWeight:500,
              border:'none', borderRadius:7, cursor:'pointer',
              background: f.k === filtro ? '#fff' : 'transparent',
              color: f.k === filtro ? NSA.green : NSA.inkSecondary,
              boxShadow: f.k === filtro ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>{f.l}</button>
          ))}
        </div>

        {/* KPIs */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          {kpis.map(k => {
            const colors = { danger:NSA.danger, ok:NSA.ok, warn:NSA.warn, info:NSA.info };
            return (
              <div key={k.l} style={{
                background:'#fff', borderRadius:12,
                border:`1px solid ${NSA.border}`, padding:'14px',
              }}>
                <div style={{
                  fontSize:28, fontWeight:600, letterSpacing:'-0.02em',
                  color: colors[k.k], fontVariantNumeric:'tabular-nums',
                  lineHeight:1, display:'flex', alignItems:'baseline', gap:3,
                }}>
                  {k.v}{k.suf && <span style={{fontSize:14, color:NSA.inkMuted, fontWeight:500}}>{k.suf}</span>}
                </div>
                <div style={{fontSize:12, color:NSA.inkSecondary, marginTop:6}}>{k.l}</div>
              </div>
            );
          })}
        </div>

        {/* OS por mecânico */}
        <div style={{background:'#fff', borderRadius:12, border:`1px solid ${NSA.border}`, padding:16}}>
          <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:12}}>
            OS por mecânico
          </div>
          {mecanicos.map(m => (
            <div key={m.nome} style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
              <div style={{width:80, fontSize:13, color:NSA.inkSecondary}}>{m.nome}</div>
              <div style={{flex:1, height:8, background:NSA.bgMuted, borderRadius:4, overflow:'hidden'}}>
                <div style={{height:'100%', width:`${(m.n/m.max)*100}%`, background:NSA.green, borderRadius:4}}></div>
              </div>
              <div style={{width:24, fontSize:13, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums', textAlign:'right', fontWeight:500}}>{m.n}</div>
            </div>
          ))}
        </div>

        {/* Máquinas mais paradas */}
        <div style={{background:'#fff', borderRadius:12, border:`1px solid ${NSA.border}`, padding:16}}>
          <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:12}}>
            Máquinas mais paradas
          </div>
          {paradas.map(m => {
            const c = m.kind === 'danger' ? NSA.danger : m.kind === 'warn' ? NSA.warn : NSA.inkDisabled;
            return (
              <div key={m.nome} style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                <div style={{width:130, fontSize:12, color:NSA.inkSecondary, lineHeight:1.3}}>{m.nome}</div>
                <div style={{flex:1, height:8, background:NSA.bgMuted, borderRadius:4, overflow:'hidden'}}>
                  <div style={{height:'100%', width:`${(m.dias/m.max)*100}%`, background:c, borderRadius:4}}></div>
                </div>
                <div style={{width:32, fontSize:13, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums', textAlign:'right', fontWeight:500}}>{m.dias}d</div>
              </div>
            );
          })}
        </div>

        {/* Corretiva vs Preventiva */}
        <div style={{background:'#fff', borderRadius:12, border:`1px solid ${NSA.border}`, padding:16}}>
          <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:12}}>
            Origem das OS
          </div>
          <div style={{display:'flex', height:10, borderRadius:5, overflow:'hidden', marginBottom:10}}>
            <div style={{flex:68, background:NSA.info}}></div>
            <div style={{flex:32, background:NSA.ok}}></div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}>
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              <span style={{width:8, height:8, borderRadius:2, background:NSA.info}}></span>
              <span style={{color:NSA.inkSecondary}}>Corretiva</span>
              <span style={{color:NSA.inkPrimary, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>68%</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              <span style={{width:8, height:8, borderRadius:2, background:NSA.ok}}></span>
              <span style={{color:NSA.inkSecondary}}>Preventiva</span>
              <span style={{color:NSA.inkPrimary, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>32%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MaquinasScreen() {
  const maquinas = [
    { nome:'Trator JD 7210',         fab:'JOHN DEERE', status:'Em Manutenção', dias:9,  tipo:'trator' },
    { nome:'Colheitadeira Case 2388',fab:'CASE',       status:'Em Manutenção', dias:12, tipo:'colheitadeira' },
    { nome:'Pulverizador Jacto',     fab:'JACTO',      status:'Em Manutenção', dias:4,  tipo:'pulverizador' },
    { nome:'Trator Valtra BH180',    fab:'VALTRA',     status:'Ativo',                  tipo:'trator' },
    { nome:'Caminhão pipa',          fab:'MB',         status:'Ativo',                  tipo:'caminhao' },
    { nome:'Camionete Hilux',        fab:'TOYOTA',     status:'Ativo',                  tipo:'camionete' },
    { nome:'Trator Massey 4707',     fab:'MASSEY',     status:'Ativo',                  tipo:'trator' },
    { nome:'Moto XTZ 150',           fab:'YAMAHA',     status:'Inativo',                tipo:'moto' },
  ];

  // Lucide icons by category — each maquinário gets a distinct symbol
  const iconFor = {
    trator:        'tractor',
    colheitadeira: 'combine',     // máquina colheitadeira
    pulverizador:  'spray-can',   // pulverizador
    caminhao:      'truck',       // caminhão pipa / carga
    camionete:     'car',         // pickup
    moto:          'bike',        // moto
  };

  const pillFor = (s) => s === 'Em Manutenção' ? 'warn' : s === 'Inativo' ? 'danger' : 'ok';

  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%'}}>
      <BrandHeader title="Máquinas" context="Frota · 28 equipamentos" back="Menu" compact/>

      <div style={{padding:'14px 16px'}}>
        {/* Filtros */}
        <div style={{display:'flex', gap:6, marginBottom:14, overflow:'auto', paddingBottom:2}}>
          {['Todas','Em manutenção (3)','Ativo (23)','Inativo (2)'].map((f,i) => (
            <button key={f} style={{
              padding:'7px 12px', fontSize:12, fontWeight:500,
              background: i === 0 ? NSA.green : '#fff',
              color: i === 0 ? NSA.cream : NSA.inkSecondary,
              border: `1px solid ${i === 0 ? NSA.green : NSA.border}`,
              borderRadius:999, whiteSpace:'nowrap', cursor:'pointer',
            }}>{f}</button>
          ))}
        </div>

        {maquinas.map(m => (
          <div key={m.nome} style={{
            display:'flex', alignItems:'center', gap:12,
            background:'#fff', borderRadius:12,
            border:`1px solid ${NSA.border}`,
            padding:'12px 14px', marginBottom:8,
          }}>
            <div style={{
              width:36, height:36, borderRadius:9, background: NSA.bgMuted,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <i data-lucide={iconFor[m.tipo] || 'tractor'} style={{width:18, height:18, color:NSA.green, strokeWidth:1.75}}></i>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:14, fontWeight:500, color:NSA.inkPrimary, letterSpacing:'-0.01em'}}>{m.nome}</div>
              <div style={{fontSize:11, color:NSA.inkMuted, marginTop:2, display:'flex', gap:8}}>
                <span>{m.fab}</span>
                {m.dias && (
                  <span style={{
                    color: m.dias >= 7 ? NSA.danger : NSA.inkMuted,
                    fontWeight: m.dias >= 7 ? 600 : 400,
                    fontVariantNumeric:'tabular-nums',
                  }}>· {m.dias} dias parado{m.dias >= 7 ? ' · alerta' : ''}</span>
                )}
              </div>
            </div>
            <StatusPill kind={pillFor(m.status)} size="sm">{m.status}</StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen, MaquinasScreen });
