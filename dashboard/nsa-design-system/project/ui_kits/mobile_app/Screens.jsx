// Screens for the NSA field app (gestão mecânica) — ordens de serviço.

const NSA_GREEN = '#172514';
const NSA_CREAM = '#FFFFE3';

function OSCard({ id, equipment, title, status, date, parts }) {
  const pal = {
    aberta:    { bg:'#faf1dc', fg:'#7a550f', dot:'#b88217' },
    andamento: { bg:'#eaf0f6', fg:'#264868', dot:'#3a6ea5' },
    concluida: { bg:'#eaf4ec', fg:'#1f5d36', dot:'#2e8c4f' },
  }[status];
  return (
    <div style={{
      background:'#fff', borderRadius:14, padding:'14px 16px',
      boxShadow:'0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)',
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
        <div style={{fontSize:11, color:'#787873', fontWeight:500, letterSpacing:'0.04em', fontFamily:'ui-monospace, Menlo, monospace'}}>OS {id}</div>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:5,
          background:pal.bg, color:pal.fg,
          padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:500,
        }}>
          <span style={{width:5, height:5, borderRadius:'50%', background:pal.dot}}></span>
          {status === 'aberta' ? 'Aberta' : status === 'andamento' ? 'Em andamento' : 'Concluída'}
        </span>
      </div>
      <div style={{fontSize:16, fontWeight:600, color:'#1f1f1c', letterSpacing:'-0.01em'}}>{title}</div>
      <div style={{fontSize:13, color:'#54544f', marginTop:2}}>{equipment}</div>
      <div style={{marginTop:10, paddingTop:10, borderTop:'1px solid #efefec', display:'flex', justifyContent:'space-between', fontSize:12, color:'#787873'}}>
        <span>{date}</span>
        {parts && <span>{parts} peças</span>}
      </div>
    </div>
  );
}

function OSListScreen() {
  return (
    <div style={{background:'#fcfcfb', minHeight:'100%', paddingBottom: 100}}>
      {/* Custom header (we skip the IOSNavBar to use brand styling) */}
      <div style={{padding:'56px 20px 16px', background:NSA_GREEN, color:NSA_CREAM}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
          <img src="../../assets/logo-nsa-cream-transparent.png" style={{height:22}}/>
          <div style={{fontFamily:'Lora, serif', letterSpacing:'0.16em', fontSize:13}}>N.S.A</div>
        </div>
        <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6, marginBottom:4}}>
          Mecânica · 18 de abril
        </div>
        <div style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', color:NSA_CREAM}}>
          Ordens de serviço
        </div>
      </div>

      {/* Segmented control */}
      <div style={{padding:'14px 16px 0', display:'flex', gap:6}}>
        {[
          { label:'Abertas', n:3, active:true },
          { label:'Em andamento', n:2 },
          { label:'Concluídas', n:12 },
        ].map((t,i) => (
          <div key={i} style={{
            flex:1, textAlign:'center', fontSize:13, fontWeight:500,
            padding:'8px 0', borderRadius:8,
            background: t.active ? '#fff' : 'transparent',
            color: t.active ? '#172514' : '#54544f',
            border: t.active ? '1px solid #e5e5e1' : '1px solid transparent',
          }}>
            {t.label} <span style={{opacity:0.6, fontWeight:400}}>{t.n}</span>
          </div>
        ))}
      </div>

      <div style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:10}}>
        <OSCard id="2026-042" equipment="Trator JD 7210" title="Troca de óleo hidráulico + filtros" status="aberta" date="Hoje · 08:00" parts={3} />
        <OSCard id="2026-041" equipment="Colheitadeira Case 2388" title="Revisão peneiras e esteira" status="aberta" date="Ontem" parts={5} />
        <OSCard id="2026-039" equipment="Pulverizador Jacto" title="Calibração de bicos" status="andamento" date="15/abr" />
        <OSCard id="2026-037" equipment="Caminhão pipa" title="Reparo bomba d'água" status="aberta" date="15/abr" parts={2} />
        <OSCard id="2026-035" equipment="Trator Valtra BH180" title="Troca de correia" status="concluida" date="12/abr" parts={1} />
      </div>

      {/* Tab bar */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        background:'rgba(255,255,255,0.92)', borderTop:'1px solid #e5e5e1',
        backdropFilter:'blur(20px)',
        paddingBottom:30, paddingTop:8,
        display:'flex', justifyContent:'space-around',
      }}>
        {[
          { icon:'clipboard-list', label:'Ordens', active:true },
          { icon:'package', label:'Peças' },
          { icon:'line-chart', label:'Histórico' },
          { icon:'user', label:'Perfil' },
        ].map((t,i)=>(
          <div key={i} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 12px'}}>
            <i data-lucide={t.icon} style={{width:22, height:22, strokeWidth:1.75, color: t.active ? '#172514' : '#a8a8a2'}}></i>
            <div style={{fontSize:10, fontWeight:500, color: t.active ? '#172514' : '#a8a8a2'}}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OSDetailScreen() {
  return (
    <div style={{background:'#fcfcfb', minHeight:'100%', paddingBottom:40}}>
      <div style={{padding:'56px 20px 16px', background:NSA_GREEN, color:NSA_CREAM}}>
        <div style={{display:'flex', alignItems:'center', gap:4, fontSize:13, opacity:0.7, marginBottom:10}}>
          <i data-lucide="chevron-left" style={{width:14, height:14, strokeWidth:2}}></i>
          Ordens
        </div>
        <div style={{fontSize:11, fontFamily:'ui-monospace, Menlo, monospace', opacity:0.6, marginBottom:4}}>OS 2026-042</div>
        <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em'}}>Troca de óleo hidráulico + filtros</div>
        <div style={{fontSize:14, opacity:0.8, marginTop:4}}>Trator JD 7210 · Agricultura</div>
      </div>

      <div style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:14}}>
        <div style={{background:'#fff', borderRadius:14, padding:16, boxShadow:'0 0 0 1px rgba(0,0,0,0.05)'}}>
          <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'#787873', marginBottom:12}}>Diagnóstico</div>
          <div style={{fontSize:15, color:'#1f1f1c', lineHeight:1.5}}>
            Vazamento pequeno na linha hidráulica. Óleo com 420h de uso. Filtros ressecados.
          </div>
        </div>

        <div style={{background:'#fff', borderRadius:14, padding:'4px 0', boxShadow:'0 0 0 1px rgba(0,0,0,0.05)'}}>
          <Row label="Responsável" value="Edmilson" />
          <Row label="Prazo" value="Hoje · 18:00" />
          <Row label="Prioridade" value="Alta" valueColor="#c0392b" />
          <Row label="Criada em" value="17/abr · 16:22" last />
        </div>

        <div style={{background:'#fff', borderRadius:14, padding:16, boxShadow:'0 0 0 1px rgba(0,0,0,0.05)'}}>
          <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'#787873', marginBottom:12}}>Peças necessárias</div>
          <Part name="Filtro hidráulico AT308594" qty={2} stock="em estoque" ok />
          <Part name="Óleo hidráulico 15L" qty={1} stock="em estoque" ok />
          <Part name="Anel O-ring kit" qty={1} stock="pedir fornecedor" />
        </div>

        <button style={{
          background:NSA_GREEN, color:NSA_CREAM, border:'none',
          padding:'14px 16px', borderRadius:10, fontSize:15, fontWeight:600,
          letterSpacing:'-0.01em', margin:'4px 0',
        }}>
          Iniciar serviço
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor, last }) {
  return (
    <div style={{
      padding:'12px 16px', display:'flex', justifyContent:'space-between',
      borderBottom: last ? 'none' : '1px solid #efefec', fontSize:15,
    }}>
      <span style={{color:'#54544f'}}>{label}</span>
      <span style={{color: valueColor || '#1f1f1c', fontWeight:500}}>{value}</span>
    </div>
  );
}

function Part({ name, qty, stock, ok }) {
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #efefec'}}>
      <div>
        <div style={{fontSize:14, color:'#1f1f1c', fontWeight:500}}>{name}</div>
        <div style={{fontSize:12, color: ok ? '#1f5d36' : '#7a550f', marginTop:2}}>{stock}</div>
      </div>
      <div style={{fontSize:13, color:'#787873', fontVariantNumeric:'tabular-nums'}}>×{qty}</div>
    </div>
  );
}

Object.assign(window, { OSListScreen, OSDetailScreen });
