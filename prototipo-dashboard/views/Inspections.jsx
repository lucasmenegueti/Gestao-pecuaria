// Inspeções — solicitações abertas (pendentes) e concluídas. Admin solicita, peão resolve.

function InspectionsView({ period, navigate }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;
  const [tab, setTab] = React.useState('pending');

  const pending = M.INSPECTIONS.filter(i => i.status === 'pending');
  const completed = M.INSPECTIONS.filter(i => i.status === 'completed');

  const list = tab === 'pending' ? pending : completed;

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:16}}>
        <div>
          <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:6}}>
            Operação · {M.INSPECTIONS.length} solicitações no período
          </div>
          <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:NSA.inkPrimary}}>
            Inspeções
          </h1>
        </div>
        <Btn icon="plus" variant="primary">Nova inspeção</Btn>
      </div>

      <div style={{
        background: NSA.green100, padding:'12px 14px', borderRadius:6, marginBottom:18,
        display:'flex', alignItems:'flex-start', gap:10,
        borderLeft: `3px solid ${NSA.green500}`,
      }}>
        <i data-lucide="info" style={{width:16, height:16, strokeWidth:1.75, color:NSA.green800, flexShrink:0, marginTop:2}}></i>
        <div style={{fontSize:12, color:NSA.green800, lineHeight:1.5}}>
          Use <strong>inspeções sob demanda</strong> pra pedir ao peão que avalie um aspecto específico (forragem, sanidade, peso, lavagem, bombona, biológico) num talhão. A solicitação aparece no app dele e auto-completa quando ele preenche aquela seção da ronda.
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:6, marginBottom:14, padding:3, background:NSA.bgSubtle, borderRadius:8, width:'fit-content'}}>
        <FilterTab2 active={tab === 'pending'}   onClick={() => setTab('pending')}   label="Pendentes"  count={pending.length} />
        <FilterTab2 active={tab === 'completed'} onClick={() => setTab('completed')} label="Concluídas" count={completed.length} />
      </div>

      {/* Cards */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(360px, 1fr))', gap:12}}>
        {list.map(i => <InspectionCard key={i.id} inspection={i} navigate={navigate} />)}
      </div>
      {list.length === 0 && (
        <Card padding={48}>
          <EmptyState icon="clipboard-check" title={tab === 'pending' ? 'Sem solicitações pendentes' : 'Sem inspeções concluídas'} body="Use o botão acima pra criar uma nova solicitação." />
        </Card>
      )}
    </div>
  );
}

function InspectionCard({ inspection, navigate }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;
  const isPending = inspection.status === 'pending';
  const kindIcons = {
    sanidade: 'stethoscope', forragem: 'sprout', peso: 'scale',
    bombona: 'box', biologico: 'flask-conical', lavagem: 'shower-head',
  };

  return (
    <div style={{
      background:'#fff', border:`1px solid ${NSA.border}`,
      borderLeft: `4px solid ${isPending ? NSA.warn : NSA.ok}`,
      borderRadius:8, padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:10,
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{
            width:36, height:36, borderRadius:8,
            background: isPending ? NSA.warnBg : NSA.okBg,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>
            <i data-lucide={kindIcons[inspection.kind] || 'clipboard'} style={{width:18, height:18, strokeWidth:1.75, color: isPending ? NSA.warn : NSA.ok}}></i>
          </div>
          <div>
            <div style={{fontSize:14, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.005em', textTransform:'capitalize'}}>{inspection.kind}</div>
            <div style={{fontSize:12, color:NSA.inkMuted, marginTop:2}}>
              {inspection.paddock}
            </div>
          </div>
        </div>
        <StatusPill kind={isPending ? 'warn' : 'ok'} label={isPending ? 'Pendente' : 'Concluída'} dot={false} size="sm" />
      </div>

      {inspection.notes && (
        <div style={{
          padding:'8px 10px', background:NSA.bgSubtle, borderRadius:6, fontSize:12, color:NSA.inkPrimary, lineHeight:1.5,
        }}>
          "{inspection.notes}"
        </div>
      )}

      <div style={{
        paddingTop:8, borderTop:`1px solid ${NSA.borderSubtle}`,
        fontSize:11, color:NSA.inkMuted, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:6,
      }}>
        <span>Solicitada por <span style={{color:NSA.inkPrimary, fontWeight:500}}>{inspection.requestedBy}</span> · {inspection.created}</span>
      </div>

      {!isPending && (
        <div style={{
          fontSize:11, color:NSA.inkMuted,
          display:'flex', alignItems:'center', gap:5,
        }}>
          <i data-lucide="check" style={{width:11, height:11, strokeWidth:2.5, color:NSA.ok}}></i>
          Concluída por <span style={{color:NSA.inkPrimary, fontWeight:500}}>{inspection.completedBy}</span> · {inspection.completedAt}
        </div>
      )}

      {isPending && (
        <div style={{display:'flex', gap:6, marginTop:2}}>
          <Btn icon="map" size="sm" onClick={() => navigate('paddocks')}>Ver talhão</Btn>
          <Btn icon="x" size="sm">Cancelar</Btn>
        </div>
      )}
    </div>
  );
}

window.InspectionsView = InspectionsView;
