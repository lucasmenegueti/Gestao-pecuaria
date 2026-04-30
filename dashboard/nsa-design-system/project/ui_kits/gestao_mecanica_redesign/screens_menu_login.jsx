// Login + Menu screens — entrada do app.

function LoginScreen() {
  return (
    <div style={{background: NSA.cream, minHeight:'100%', display:'flex', flexDirection:'column', padding:'72px 28px 40px'}}>
      <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:32}}>
        <img src="/logo-nsa-green-transparent.png" style={{height:72}} alt="NSA" onError={(e)=>{e.currentTarget.src='./public/logo-nsa-green-transparent.png'}}/>
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:'Lora, serif', fontSize:22, letterSpacing:'0.18em', color:NSA.green, fontWeight:600}}>N.S.A</div>
          <div style={{fontSize:11, letterSpacing:'0.24em', textTransform:'uppercase', color:NSA.inkMuted, marginTop:6, fontWeight:500}}>fazenda</div>
        </div>
        <div style={{width:'100%', display:'flex', flexDirection:'column', gap:14, marginTop:8}}>
          <div>
            <Label>Usuário</Label>
            <Input placeholder="seu.nome" value="edmilson" onChange={()=>{}}/>
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" value="••••••" onChange={()=>{}}/>
          </div>
          <div style={{marginTop:8}}>
            <PrimaryButton>Entrar</PrimaryButton>
          </div>
        </div>
      </div>
      <div style={{fontSize:11, color:NSA.inkMuted, textAlign:'center', fontFamily:'ui-monospace, Menlo, monospace'}}>Gestão Mecânica · v1.0.18</div>
    </div>
  );
}

function MenuScreen() {
  const items = [
    { n:1, label:'OS abertas',     icon:'clipboard-list', badge:3 },
    { n:2, label:'OS finalizadas', icon:'check-circle-2' },
    { n:3, label:'Nova OS',        icon:'plus-circle',    primary:true },
    { n:4, label:'Peças pendentes',icon:'package',       badge:5, badgeKind:'warn' },
    { n:5, label:'Máquinas',       icon:'tractor' },
    { n:6, label:'Histórico peças',icon:'history' },
    { n:7, label:'Relatório diário',icon:'file-text' },
    { n:8, label:'Cadastro pessoas',icon:'users',        admin:true },
  ];
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%'}}>
      {/* Header custom — sem back, com wordmark */}
      <div style={{padding:'56px 20px 20px', background: NSA.green, color: NSA.cream}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <img src="/logo-nsa-cream-transparent.png" style={{height:24}} alt="NSA" onError={(e)=>{e.currentTarget.src='./public/logo-nsa-cream-transparent.png'}}/>
            <div style={{fontFamily:'Lora, serif', fontSize:14, letterSpacing:'0.16em', fontWeight:600}}>N.S.A</div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:12, opacity:0.8}}>
            <div style={{width:28, height:28, borderRadius:'50%', background:'rgba(255,255,227,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:NSA.cream}}>E</div>
            Edmilson
          </div>
        </div>
        <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6, marginBottom:4}}>
          Mecânica · 18/abr
        </div>
        <div style={{fontSize:24, fontWeight:600, letterSpacing:'-0.02em', fontFamily:'Lora, serif'}}>Bom dia, Edmilson.</div>
        <div style={{fontSize:13, opacity:0.75, marginTop:4}}>3 OS abertas · 5 peças pendentes</div>
      </div>

      {/* Grid */}
      <div style={{padding:'16px'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10}}>
          {items.map(it => (
            <div key={it.n} style={{
              padding:'16px 14px',
              background: it.primary ? NSA.green : '#fff',
              color: it.primary ? NSA.cream : 'inherit',
              borderRadius:14,
              border: it.admin ? `1px dashed ${NSA.borderStrong}` : it.primary ? 'none' : `1px solid ${NSA.border}`,
              boxShadow: it.admin || it.primary ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
              position:'relative', minHeight:92,
            }}>
              <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
                <div style={{
                  width:34, height:34, borderRadius:9,
                  background: it.primary ? 'rgba(255,255,227,0.14)' : NSA.bgMuted,
                  display:'flex',
                  alignItems:'center', justifyContent:'center',
                }}>
                  <i data-lucide={it.icon} style={{width:18, height:18, color: it.primary ? NSA.cream : NSA.green, strokeWidth:1.75}}></i>
                </div>
                {it.badge && (
                  <span style={{
                    fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:999,
                    background: it.badgeKind === 'warn' ? NSA.warnBg : NSA.dangerBg,
                    color: it.badgeKind === 'warn' ? NSA.warnFg : NSA.dangerFg,
                  }}>{it.badge}</span>
                )}
              </div>
              <div style={{
                fontSize:13,
                fontWeight: it.primary ? 600 : 500,
                color: it.primary ? NSA.cream : NSA.inkPrimary,
                marginTop:14, letterSpacing:'-0.01em', lineHeight:1.3,
              }}>
                {it.label}
              </div>
              {it.admin && <div style={{fontSize:10, color:NSA.warnFg, marginTop:3, fontWeight:500}}>Admin</div>}
              {it.primary && <div style={{fontSize:11, color:'rgba(255,255,227,0.7)', marginTop:3, fontWeight:500}}>Abrir nova</div>}
            </div>
          ))}
        </div>

        {/* Dashboard card — full width, destacado */}
        <div style={{
          padding:'14px 16px', background: NSA.green, color: NSA.cream,
          borderRadius:14, display:'flex', alignItems:'center', gap:14, marginBottom:16,
        }}>
          <div style={{
            width:40, height:40, borderRadius:10, background:'rgba(255,255,227,0.12)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <i data-lucide="line-chart" style={{width:20, height:20, color:NSA.cream, strokeWidth:1.75}}></i>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14, fontWeight:600, letterSpacing:'-0.01em'}}>Dashboard</div>
            <div style={{fontSize:12, opacity:0.7, marginTop:1}}>KPIs · OS por mecânico · máquinas paradas</div>
          </div>
          <i data-lucide="chevron-right" style={{width:18, height:18, color:NSA.cream, opacity:0.6}}></i>
        </div>

        <button style={{
          width:'100%', padding:'12px', background:'transparent',
          border:`1px solid ${NSA.borderStrong}`,
          color: NSA.danger, fontSize:14, fontWeight:500, borderRadius:10,
          cursor:'pointer',
        }}>Sair</button>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, MenuScreen });
