// Login · Menu · Dashboard · Ronda (piquetes) · Menu de avaliação

function LoginScreen() {
  return (
    <div style={{background: NSA.cream, minHeight:'100%', display:'flex', flexDirection:'column', padding:'72px 28px 40px', position:'relative'}}>
      <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:28}}>
        <img src="public/logo-nsa-green-transparent.png" style={{height:204}} alt="NSA"/>
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:'Lora, serif', fontSize:13, letterSpacing:'0.22em', color:NSA.inkSecondary, fontWeight:500, textTransform:'uppercase'}}>Gestão de Pecuária</div>
          <div style={{fontSize:11, letterSpacing:'0.22em', textTransform:'uppercase', color:NSA.inkMuted, marginTop:6, fontWeight:500}}>Fazenda N.S.A</div>
        </div>
        <div style={{width:'100%', display:'flex', flexDirection:'column', gap:14, marginTop:8}}>
          <div>
            <Label>Usuário</Label>
            <Input placeholder="seu.nome" value="joao.peao" onChange={()=>{}}/>
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" value="••••••" onChange={()=>{}}/>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8, fontSize:13, color:NSA.inkSecondary, margin:'4px 0 8px'}}>
            <span style={{width:18, height:18, borderRadius:4, background:NSA.green, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <i data-lucide="check" style={{width:12, height:12, color:NSA.cream, strokeWidth:2.5}}></i>
            </span>
            Lembrar-me neste aparelho
          </div>
          <PrimaryButton icon="log-in">Entrar</PrimaryButton>
        </div>
      </div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:11, color:NSA.inkMuted, fontFamily:'ui-monospace, Menlo, monospace'}}>
        <i data-lucide="wifi" style={{width:12, height:12, strokeWidth:1.75}}></i>
        Primeiro acesso requer internet · v0.4.2
      </div>
    </div>
  );
}

function DashboardScreen() {
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:72, position:'relative'}}>
      {/* Brand header */}
      <div style={{padding:'56px 20px 20px', background: NSA.green, color: NSA.cream}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <img src="public/logo-nsa-cream-transparent.png" style={{height:44}} alt="NSA"/>
            <div style={{fontFamily:'Lora, serif', fontSize:13, letterSpacing:'0.16em', fontWeight:600}}>N.S.A</div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10, fontSize:12, opacity:0.85}}>
            <i data-lucide="bell" style={{width:16, height:16, strokeWidth:1.75}}></i>
            <div style={{width:28, height:28, borderRadius:'50%', background:'rgba(255,255,227,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:NSA.cream}}>J</div>
          </div>
        </div>
        <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6, marginBottom:4}}>
          Qua · 09/abr
        </div>
        <div style={{fontSize:24, fontWeight:600, letterSpacing:'-0.02em', fontFamily:'Lora, serif'}}>Bom dia, João.</div>
        <div style={{fontSize:13, opacity:0.75, marginTop:4, fontVariantNumeric:'tabular-nums'}}>4 de 21 rondas · 5 registros p/ sincronizar</div>
      </div>

      {/* Sync pill */}
      <div style={{margin:'12px 16px 0', display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:NSA.infoBg, color:NSA.infoFg, borderRadius:10, fontSize:12}}>
        <i data-lucide="refresh-cw" style={{width:14, height:14, strokeWidth:1.75}}></i>
        <span style={{flex:1}}>5 registros aguardando sinc.</span>
        <span style={{fontWeight:600}}>Sincronizar</span>
      </div>

      {/* KPIs */}
      <div style={{padding:'14px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
        <KPI label="Rebanho" value="865" unit="cab" hint="0,047 cab/ha"/>
        <KPI label="Piquetes" value="9 / 14" hint="com lote ativo"/>
      </div>

      {/* Alerts */}
      <SectionCaption right={<span style={{color:NSA.danger, textTransform:'none', letterSpacing:0, fontWeight:600}}>3 abertos</span>}>Alertas</SectionCaption>
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:8}}>
        <AlertRow kind="danger" title="Pasto 15 · cocho vazio" body="Há 2 dias sem reabastecimento · PROBEEF" icon="alert-circle"/>
        <AlertRow kind="warn"   title="Pasto 16 · cerca fraca" body="Choque abaixo de 4kV · última ronda 07/04" icon="zap-off"/>
        <AlertRow kind="warn"   title="Sal mineral abaixo do mínimo" body="3 sacos · ~2 dias para acabar" icon="package-open"/>
      </div>

      {/* Rondas do dia */}
      <SectionCaption>Rondas de hoje</SectionCaption>
      <div style={{margin:'0 16px', padding:'14px', background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10}}>
          <span style={{fontSize:13, color:NSA.inkSecondary}}>Piquetes visitados</span>
          <span style={{fontSize:16, fontWeight:600, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums'}}>4 <span style={{color:NSA.inkMuted, fontWeight:400}}>/ 21</span></span>
        </div>
        <ProgressBar pct={19}/>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:NSA.inkMuted, marginTop:6, fontVariantNumeric:'tabular-nums'}}>
          <span>3 piquetes hoje</span><span>19% concluído</span>
        </div>
      </div>

      <TabBar active="painel"/>
    </div>
  );
}

function RondaScreen() {
  const piquetes = [
    { code:'P14',  area:45, grass:'Braquiarão', head:85,  last:'08/abr', status:'ok',     extra:'Cocho: 3 dias',  extraKind:'ok' },
    { code:'P14A', area:52, grass:'Braquiarão', head:72,  last:'06/abr', status:'warn',   extra:'Cocho: 1 dia',   extraKind:'warn' },
    { code:'P15',  area:38, grass:'Braquiarão', head:65,  last:'05/abr', status:'danger', extra:'Cocho vazio',    extraKind:'danger' },
    { code:'P15A', area:41, grass:'Braquiarão', head:90,  last:'08/abr', status:'ok',     extra:'Cocho: 5 dias',  extraKind:'ok' },
    { code:'P16',  area:60, grass:'Braquiarão', head:110, last:'07/abr', status:'warn',   extra:'Cerca fraca',    extraKind:'warn' },
    { code:'P17',  area:35, grass:'Mombaça',    head:55,  last:'08/abr', status:'ok',     extra:'Cocho: 7 dias',  extraKind:'ok' },
  ];
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:72, position:'relative'}}>
      <div style={{padding:'56px 20px 18px', background: NSA.green, color: NSA.cream}}>
        <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6, marginBottom:4}}>Ronda · 09/abr</div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em', fontFamily:'Lora, serif'}}>Piquetes</div>
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:11, opacity:0.8}}>
            <i data-lucide="wifi-off" style={{width:12, height:12, strokeWidth:1.75}}></i> Offline · 5 p/ sinc
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{padding:'12px 16px 0', display:'flex', gap:8}}>
        <div style={{flex:1, display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#fff', border:`1px solid ${NSA.borderStrong}`, borderRadius:10}}>
          <i data-lucide="search" style={{width:16, height:16, color:NSA.inkMuted, strokeWidth:1.75}}></i>
          <span style={{fontSize:13, color:NSA.inkMuted}}>Buscar piquete…</span>
        </div>
        <button style={{padding:'0 14px', background:'#fff', border:`1px solid ${NSA.borderStrong}`, borderRadius:10, display:'flex', alignItems:'center', gap:6, fontSize:13, color:NSA.inkPrimary}}>
          <i data-lucide="sliders-horizontal" style={{width:14, height:14, strokeWidth:1.75}}></i>
        </button>
      </div>

      {/* Filter chips */}
      <div style={{padding:'12px 16px 0', display:'flex', gap:6, overflowX:'auto'}}>
        {['Todos · 14','Alerta · 1','Atenção · 2','OK · 3','Sem ronda'].map((l,i) => (
          <span key={l} style={{
            padding:'6px 12px', fontSize:12, fontWeight:500,
            borderRadius:999, whiteSpace:'nowrap',
            background: i===0 ? NSA.green : '#fff',
            color: i===0 ? NSA.cream : NSA.inkSecondary,
            border: i===0 ? 'none' : `1px solid ${NSA.border}`,
          }}>{l}</span>
        ))}
      </div>

      <SectionCaption>Prioritários (3)</SectionCaption>
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:8}}>
        {piquetes.slice(0,6).map(p => <PiqueteCard key={p.code} {...p}/>)}
      </div>

      <TabBar active="ronda"/>
    </div>
  );
}

function MenuAvaliacaoScreen() {
  const tiles = [
    { domain:'suplementacao', label:'Suplementação', icon:'wheat',       last:'08/abr' },
    { domain:'forragem',      label:'Forragem',      icon:'sprout',      last:'07/abr' },
    { domain:'aguada',        label:'Aguada',        icon:'droplets',    last:'08/abr' },
    { domain:'sanidade',      label:'Sanidade',      icon:'stethoscope', last:'06/abr' },
    { domain:'cerca',         label:'Cerca',         icon:'zap',         last:'05/abr' },
    { domain:'peso',          label:'Peso visual',   icon:'scale',       last:'01/abr' },
    { domain:'lavagem',       label:'Lavagem bebedouro', icon:'droplet', last:'06/abr' },
  ];
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%'}}>
      {/* Context header */}
      <div style={{padding:'56px 20px 18px', background: NSA.green, color: NSA.cream}}>
        <div style={{display:'flex', alignItems:'center', gap:4, fontSize:13, opacity:0.7, marginBottom:10}}>
          <i data-lucide="chevron-left" style={{width:14, height:14, strokeWidth:2}}></i> Ronda
        </div>
        <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom:4}}>
          <span style={{fontFamily:'ui-monospace, Menlo, monospace', fontSize:12, opacity:0.6, letterSpacing:'0.04em'}}>P14</span>
          <span style={{fontSize:24, fontWeight:600, letterSpacing:'-0.02em', fontFamily:'Lora, serif'}}>Pasto 14</span>
        </div>
        <div style={{fontSize:13, opacity:0.8, fontVariantNumeric:'tabular-nums'}}>85 cab · 45 ha · Braquiarão · 1,89 cab/ha</div>
      </div>

      <SectionCaption>O que avaliar?</SectionCaption>
      <div style={{padding:'0 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        {tiles.map(t => <DomainTile key={t.label} {...t}/>)}
      </div>

      <SectionCaption>Rebanho</SectionCaption>
      <div style={{margin:'0 16px 24px', padding:'12px 14px', background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:12, display:'flex', alignItems:'center', gap:12}}>
        <div style={{width:40, height:40, borderRadius:10, background:NSA.bgMuted, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <i data-lucide="beef" style={{width:20, height:20, color:NSA.green, strokeWidth:1.75}}></i>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:600, color:NSA.inkPrimary}}>Ver rebanho deste piquete</div>
          <div style={{fontSize:12, color:NSA.inkMuted, marginTop:2}}>Garrote · Novilha · Vaca · Bez. mamando</div>
        </div>
        <i data-lucide="chevron-right" style={{width:18, height:18, color:NSA.inkMuted}}></i>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, DashboardScreen, RondaScreen, MenuAvaliacaoScreen });
