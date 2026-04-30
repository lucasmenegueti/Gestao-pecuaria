// Visão geral — landing do painel com KPIs + últimas atividades.
function DashboardView() {
  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%', boxSizing:'border-box'}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'#787873', marginBottom:6}}>
          Safra 2024/5 · Atualizado há 4 min
        </div>
        <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:'#1f1f1c'}}>
          Visão geral da fazenda
        </h1>
      </div>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:24}}>
        <KPICard
          label="Rebanho total"
          value="3.675"
          unit="cab."
          delta="24,9%"
          deltaDir="down"
          note="vs safra anterior"
          spark={{ data:[4898, 4500, 4200, 3980, 3800, 3700, 3675], color:'#c0392b' }}
        />
        <KPICard
          label="Produtividade soja"
          value="65,8"
          unit="sc/ha"
          delta="2,1 sc/ha"
          deltaDir="up"
          note="vs meta"
          spark={{ data:[58, 61, 60, 63, 62, 65, 65.8], color:'#2e8c4f' }}
        />
        <KPICard
          label="Caixa final"
          value="R$ 1,74"
          unit="M · set/25"
          note="Antes das vendas"
          spark={{ data:[4.1, 3.8, 3.2, 2.6, 2.1, 1.8, 1.74], color:'#b88217' }}
        />
        <KPICard
          label="Estoque de dívida"
          value="R$ 25,67"
          unit="M"
          delta="4,1%"
          deltaDir="up"
          note="projeção −22% em dez"
          spark={{ data:[24.6, 24.8, 25.1, 25.4, 25.5, 25.6, 25.67], color:'#54544f' }}
        />
      </div>

      {/* Two-col: activity + alerts */}
      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16, marginBottom:24}}>
        <DataTable
          title="Últimos relatórios do robô"
          subtitle="Gerados a partir das mensagens de WhatsApp da equipe"
          action={<button style={{fontSize:12, fontWeight:500, color:'#172514', background:'transparent', border:'none', cursor:'pointer'}}>Ver todos →</button>}
          columns={[
            { key:'date', label:'Data' },
            { key:'who', label:'Responsável' },
            { key:'summary', label:'Resumo' },
            { key:'status', label:'Status', render: r => (
              <span style={{
                display:'inline-flex', alignItems:'center', gap:5,
                background: r.status==='ok' ? '#eaf4ec' : '#faf1dc',
                color: r.status==='ok' ? '#1f5d36' : '#7a550f',
                padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:500,
              }}>
                <span style={{width:5, height:5, borderRadius:'50%', background: r.status==='ok' ? '#2e8c4f' : '#b88217'}}></span>
                {r.status==='ok' ? 'Concluído' : 'Pendência'}
              </span>
            )},
          ]}
          rows={[
            { date:'18/abr 07:30', who:'Valdir · campo', summary:'Manejo piquetes 12 e 14, sal reposto.', status:'ok' },
            { date:'18/abr 06:45', who:'Edmilson · mecânica', summary:'Trator JD 7210 — troca de filtro concluída.', status:'ok' },
            { date:'17/abr 18:12', who:'Luize · carretas', summary:'Carga 32t capim despachada para Três Lagoas.', status:'ok' },
            { date:'17/abr 15:04', who:'Darlan · agricultura', summary:'Aplicação pendente — falta calcário no talhão 7.', status:'alert' },
            { date:'17/abr 09:20', who:'Karina · operação', summary:'Folha de abril fechada, sem HE.', status:'ok' },
          ]}
        />

        <div>
          <div style={{fontSize:13, fontWeight:600, color:'#1f1f1c', marginBottom:10}}>Alertas ativos</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <AlertCard kind="danger" title="Talhão 7 — insumo ausente"
              body="Aplicação agendada para hoje sem calcário disponível." time="há 2h" />
            <AlertCard kind="warning" title="Piquete 8 — consumo de água baixo"
              body="20% abaixo da média de 7 dias. Verificar bebedouro." time="há 6h" />
            <AlertCard kind="info" title="Safra 2025/6 — compra de sementes"
              body="Adubo R$ 3,3M + sementes R$ 814k já adquiridos." time="set/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ kind, title, body, time }) {
  const palette = {
    danger: { bg:'#faeae7', bd:'#f2c9c2', fg:'#7d2519', ic:'alert-triangle' },
    warning:{ bg:'#faf1dc', bd:'#eedbb0', fg:'#7a550f', ic:'alert-circle' },
    info:   { bg:'#eaf0f6', bd:'#cedde9', fg:'#264868', ic:'info' },
  }[kind];
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div style={{
      padding:'12px 14px', background:palette.bg, border:`1px solid ${palette.bd}`,
      borderRadius:8, display:'flex', gap:10,
    }}>
      <i data-lucide={palette.ic} style={{width:16, height:16, color:palette.fg, strokeWidth:1.75, flexShrink:0, marginTop:2}}></i>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8}}>
          <div style={{fontSize:13, fontWeight:600, color:palette.fg}}>{title}</div>
          <div style={{fontSize:11, color:palette.fg, opacity:0.7, whiteSpace:'nowrap'}}>{time}</div>
        </div>
        <div style={{fontSize:12, color:palette.fg, opacity:0.85, marginTop:2, lineHeight:1.45}}>{body}</div>
      </div>
    </div>
  );
}

window.DashboardView = DashboardView;
