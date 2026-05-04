// Login mockado — qualquer botão entra.

function LoginView({ onLogin }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  return (
    <div style={{
      height: '100vh', width: '100%', display:'flex',
      background: NSA.green800,
    }}>
      {/* Left panel — brand */}
      <div style={{
        flex: 1.2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '64px 56px', color: NSA.cream, position:'relative', overflow:'hidden',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:14}}>
          <div style={{
            width: 44, height: 44, borderRadius: 8,
            background: NSA.cream, color: NSA.green800,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Lora, Georgia, serif', fontWeight:600, fontSize:18, letterSpacing:'0.04em',
          }}>NSA</div>
          <div>
            <div style={{fontFamily:'Lora, Georgia, serif', letterSpacing:'0.18em', fontSize:18}}>N.S.A</div>
            <div style={{fontSize:11, letterSpacing:'0.18em', textTransform:'uppercase', opacity:0.6, marginTop:2}}>fazenda · pecuária</div>
          </div>
        </div>

        <div style={{maxWidth:480}}>
          <div style={{fontSize:13, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.6, marginBottom:14}}>
            Painel de Gestão
          </div>
          <h1 style={{fontFamily:'Lora, Georgia, serif', fontSize:42, fontWeight:600, lineHeight:1.15, letterSpacing:'-0.01em', margin:0, color:NSA.cream}}>
            O que está acontecendo na fazenda, em tempo real.
          </h1>
          <p style={{fontSize:15, opacity:0.7, marginTop:18, lineHeight:1.55}}>
            Rondas, alertas, estoque e equipe — sincronizados com o app dos peões.
            Visão consolidada do dia, da semana, ou do período que você definir.
          </p>
        </div>

        <div style={{fontSize:11, opacity:0.4, letterSpacing:'0.08em', textTransform:'uppercase'}}>
          Chapada Gaúcha · Januária / MG · v0.1
        </div>

        {/* decorative */}
        <div style={{
          position:'absolute', right:-100, top:-100, width:400, height:400,
          background: 'radial-gradient(circle, rgba(255,255,227,0.04) 0%, transparent 70%)', borderRadius:'50%',
        }}></div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, background: NSA.bg, display:'flex', alignItems:'center', justifyContent:'center',
        padding: 40,
      }}>
        <div style={{width:'100%', maxWidth:380}}>
          <h2 style={{fontSize:24, fontWeight:600, color:NSA.inkPrimary, margin:0, marginBottom:6, letterSpacing:'-0.01em'}}>
            Bem-vindo
          </h2>
          <p style={{fontSize:14, color:NSA.inkMuted, marginTop:0, marginBottom:28}}>
            Entre com sua conta de administrador.
          </p>

          <div style={{display:'flex', flexDirection:'column', gap:14}}>
            <div>
              <label style={{fontSize:11, fontWeight:500, color:NSA.inkMuted, letterSpacing:'0.04em', textTransform:'uppercase', display:'block', marginBottom:6}}>E-mail</label>
              <div style={{position:'relative'}}>
                <i data-lucide="mail" style={{width:14, height:14, strokeWidth:1.75, position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:NSA.inkSubtle}}></i>
                <input
                  defaultValue="lucas.rossi.lr@gmail.com"
                  style={{
                    width:'100%', padding:'10px 12px 10px 36px',
                    border:`1px solid ${NSA.borderStrong}`, borderRadius:6,
                    fontSize:14, color:NSA.inkPrimary, background:'#fff', outline:'none',
                    fontFamily:'inherit',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{fontSize:11, fontWeight:500, color:NSA.inkMuted, letterSpacing:'0.04em', textTransform:'uppercase', display:'block', marginBottom:6}}>Senha</label>
              <div style={{position:'relative'}}>
                <i data-lucide="lock" style={{width:14, height:14, strokeWidth:1.75, position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:NSA.inkSubtle}}></i>
                <input
                  type="password"
                  defaultValue="123456"
                  style={{
                    width:'100%', padding:'10px 12px 10px 36px',
                    border:`1px solid ${NSA.borderStrong}`, borderRadius:6,
                    fontSize:14, color:NSA.inkPrimary, background:'#fff', outline:'none',
                    fontFamily:'inherit',
                  }}
                />
              </div>
            </div>

            <button onClick={onLogin} style={{
              padding:'12px 16px', fontSize:14, fontWeight:600,
              background: NSA.green800, color: NSA.cream,
              border:`1px solid ${NSA.green800}`, borderRadius:6, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              marginTop: 6,
            }}>
              Entrar
              <i data-lucide="arrow-right" style={{width:14, height:14, strokeWidth:2}}></i>
            </button>

            <div style={{fontSize:12, color:NSA.inkMuted, textAlign:'center', marginTop:4}}>
              Acesso restrito a administradores. Peões usam o app no celular.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.LoginView = LoginView;
