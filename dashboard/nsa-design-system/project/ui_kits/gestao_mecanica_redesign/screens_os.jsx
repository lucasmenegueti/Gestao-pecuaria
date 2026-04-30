// Screens: OS list, OS detail, Nova OS.

function OSListScreen() {
  const urgentes = [
    { id:'recX1', os:'0042', maq:'Trator JD 7210',       mec:'Edmilson', dias:9, dt:'10/abr · 08:15', origem:'Corretiva' },
    { id:'recX2', os:'0041', maq:'Colheitadeira Case 2388', mec:'Edmilson', dias:7, dt:'12/abr · 14:20', origem:'Corretiva' },
  ];
  const normais = [
    { id:'recX3', os:'0039', maq:'Pulverizador Jacto', mec:'Valdir',   dias:4, dt:'15/abr · 09:00', origem:'Preventiva' },
    { id:'recX4', os:'0037', maq:'Caminhão pipa',      mec:'Edmilson', dias:4, dt:'15/abr · 11:40', origem:'Corretiva' },
  ];
  const baixas = [
    { id:'recX5', os:'0034', maq:'Trator Valtra BH180', mec:'Valdir',  dias:2, dt:'17/abr · 16:30', origem:'Preventiva' },
  ];

  const Card = ({ os, alerta, prio }) => (
    <div style={{
      background:'#fff', borderRadius:14,
      border:`1px solid ${NSA.border}`,
      borderLeft: alerta || prio === 'danger' ? `3px solid ${NSA.danger}` : `1px solid ${NSA.border}`,
      padding:'12px 14px', marginBottom:8,
      boxShadow:'0 1px 2px rgba(0,0,0,0.03)',
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
        <span style={{fontSize:11, color:NSA.inkMuted, fontFamily:'ui-monospace, Menlo, monospace', fontWeight:500}}>OS #{os.os}</span>
        <StatusPill kind={prio}>{prio === 'danger' ? 'Urgente' : prio === 'info' ? 'Normal' : 'Baixa'}</StatusPill>
      </div>
      <div style={{fontSize:15, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.01em', marginBottom:2}}>{os.maq}</div>
      <div style={{fontSize:12, color:NSA.inkSecondary}}>{os.mec} · {os.dt} · {os.origem}</div>
      <div style={{
        fontSize:12, marginTop:6,
        color: alerta ? NSA.danger : NSA.inkMuted,
        fontWeight: alerta ? 600 : 400,
        fontVariantNumeric:'tabular-nums',
        display:'flex', alignItems:'center', gap:5,
      }}>
        {alerta && <i data-lucide="alert-triangle" style={{width:13, height:13, strokeWidth:2}}></i>}
        {os.dias} {os.dias === 1 ? 'dia parado' : 'dias parados'}{alerta ? ' · alerta' : ''}
      </div>
    </div>
  );

  const GroupHead = ({ label, n }) => (
    <div style={{
      fontSize:11, fontWeight:500, letterSpacing:'0.1em',
      textTransform:'uppercase', color:NSA.inkMuted,
      padding:'14px 0 8px',
    }}>{label} · {n}</div>
  );

  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:100, position:'relative'}}>
      <BrandHeader title="Ordens de serviço" context="abertas · 5" back="Menu" compact/>

      <div style={{padding:'14px 16px 0'}}>
        {/* Search */}
        <div style={{position:'relative', marginBottom:4}}>
          <i data-lucide="search" style={{position:'absolute', left:12, top:12, width:16, height:16, color:NSA.inkMuted, strokeWidth:1.75}}></i>
          <input placeholder="Buscar por máquina, mecânico, OS…" style={{
            width:'100%', padding:'10px 12px 10px 36px',
            border:`1px solid ${NSA.border}`, borderRadius:10,
            fontSize:13, background:'#fff', color:NSA.inkPrimary,
            fontFamily:'Inter', boxSizing:'border-box',
          }}/>
        </div>

        <GroupHead label="Urgente" n={urgentes.length}/>
        {urgentes.map(o => <Card key={o.id} os={o} prio="danger" alerta={o.dias >= 7}/>)}

        <GroupHead label="Normal" n={normais.length}/>
        {normais.map(o => <Card key={o.id} os={o} prio="info"/>)}

        <GroupHead label="Baixa" n={baixas.length}/>
        {baixas.map(o => <Card key={o.id} os={o} prio="neutral"/>)}
      </div>

      {/* FAB */}
      <div style={{
        position:'absolute', bottom:28, right:20,
        width:56, height:56, borderRadius:28,
        background: NSA.green, color: NSA.cream,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 6px 16px rgba(23,37,20,0.3), 0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <i data-lucide="plus" style={{width:24, height:24, strokeWidth:2}}></i>
      </div>
    </div>
  );
}

function OSDetailScreen() {
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:90}}>
      <BrandHeader title="Troca de óleo hidráulico + filtros" context="OS #0042 · Trator JD 7210" back="OS abertas" compact/>

      <div style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:12}}>
        {/* Status strip */}
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          <StatusPill kind="warn">Aberta</StatusPill>
          <StatusPill kind="danger">Urgente</StatusPill>
          <StatusPill kind="neutral">Corretiva</StatusPill>
        </div>

        {/* Diagnóstico */}
        <div style={{background:'#fff', borderRadius:14, padding:16, border:`1px solid ${NSA.border}`}}>
          <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:8}}>
            Diagnóstico inicial
          </div>
          <div style={{fontSize:14, color:NSA.inkPrimary, lineHeight:1.5}}>
            Vazamento pequeno na linha hidráulica lado direito. Óleo com 420h de uso. Filtros ressecados. Necessário desmontar para avaliação completa.
          </div>
        </div>

        {/* Meta */}
        <div style={{background:'#fff', borderRadius:14, border:`1px solid ${NSA.border}`, overflow:'hidden'}}>
          {[
            ['Mecânico responsável', 'Edmilson'],
            ['Operador que entregou', 'Valdir'],
            ['Abertura', '10/abr · 08:15'],
            ['Previsão', '18/abr · 18:00'],
            ['Horímetro entrada', '3.420 h'],
          ].map(([k,v], i, arr) => (
            <div key={k} style={{
              padding:'11px 16px', display:'flex', justifyContent:'space-between',
              borderBottom: i < arr.length - 1 ? `1px solid ${NSA.border}` : 'none',
              fontSize:14,
            }}>
              <span style={{color:NSA.inkSecondary}}>{k}</span>
              <span style={{color:NSA.inkPrimary, fontWeight:500, fontVariantNumeric:'tabular-nums'}}>{v}</span>
            </div>
          ))}
        </div>

        {/* Peças */}
        <div style={{background:'#fff', borderRadius:14, padding:16, border:`1px solid ${NSA.border}`}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted}}>
              Peças (3)
            </div>
            <span style={{fontSize:12, color:NSA.green, fontWeight:500}}>+ adicionar</span>
          </div>
          {[
            { n:'Filtro hidráulico AT308594', qty:2, stock:'em estoque', ok:true },
            { n:'Óleo hidráulico 15W40 · 15L', qty:1, stock:'em estoque', ok:true },
            { n:'Kit O-ring',                 qty:1, stock:'pedir fornecedor', ok:false },
          ].map((p, i, arr) => (
            <div key={p.n} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'10px 0',
              borderBottom: i < arr.length - 1 ? `1px solid ${NSA.border}` : 'none',
            }}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:14, color:NSA.inkPrimary, fontWeight:500}}>{p.n}</div>
                <div style={{fontSize:12, marginTop:2, color: p.ok ? NSA.okFg : NSA.warnFg, fontWeight:500, display:'flex', alignItems:'center', gap:4}}>
                  <i data-lucide={p.ok ? 'check' : 'clock'} style={{width:12, height:12, strokeWidth:2}}></i>
                  {p.stock}
                </div>
              </div>
              <div style={{fontSize:13, color:NSA.inkSecondary, fontVariantNumeric:'tabular-nums', marginLeft:10}}>×{p.qty}</div>
            </div>
          ))}
        </div>

        {/* Atualizações */}
        <div style={{background:'#fff', borderRadius:14, padding:16, border:`1px solid ${NSA.border}`}}>
          <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:12}}>
            Atualizações (2)
          </div>
          {[
            { who:'Edmilson', when:'12/abr · 09:20', text:'Peças pedidas ao fornecedor Agrícola SP.' },
            { who:'Edmilson', when:'10/abr · 08:45', text:'OS aberta, diagnóstico inicial registrado.' },
          ].map((u, i, arr) => (
            <div key={i} style={{
              display:'flex', gap:10, paddingBottom: i < arr.length - 1 ? 12 : 0,
              marginBottom: i < arr.length - 1 ? 12 : 0,
              borderBottom: i < arr.length - 1 ? `1px solid ${NSA.border}` : 'none',
            }}>
              <div style={{width:28, height:28, borderRadius:'50%', background:NSA.green, color:NSA.cream, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0}}>
                {u.who[0]}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                  <div style={{fontSize:13, fontWeight:600, color:NSA.inkPrimary}}>{u.who}</div>
                  <div style={{fontSize:11, color:NSA.inkMuted}}>{u.when}</div>
                </div>
                <div style={{fontSize:13, color:NSA.inkSecondary, marginTop:2, lineHeight:1.45}}>{u.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky primary */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        background:'rgba(252,252,251,0.95)',
        backdropFilter:'blur(16px)',
        borderTop:`1px solid ${NSA.border}`,
        padding:'12px 16px 30px', display:'flex', gap:8,
      }}>
        <SecondaryButton>Atualizar</SecondaryButton>
        <PrimaryButton icon="check">Concluir</PrimaryButton>
      </div>
    </div>
  );
}

function NovaOSScreen() {
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:90}}>
      <BrandHeader title="Nova ordem de serviço" context="Abertura" back="Voltar" compact/>

      <div style={{padding:'14px 16px', display:'flex', flexDirection:'column', gap:14}}>
        <div>
          <Label required>Máquina</Label>
          <Select placeholder="— Selecionar máquina —" options={['Trator JD 7210','Colheitadeira Case 2388','Pulverizador Jacto']}/>
        </div>

        <div>
          <Label required>Operador que entregou</Label>
          <Select value="Valdir" options={['Valdir','Karina','Darlan']}/>
        </div>

        <div>
          <Label required>Mecânico responsável</Label>
          <Select value="Edmilson" options={['Edmilson','Marcos']}/>
        </div>

        <div>
          <Label required>Diagnóstico inicial</Label>
          <Textarea rows={4} placeholder="Descreva o problema observado…" value="Vazamento na linha hidráulica lado direito. Óleo escuro."/>
        </div>

        <div style={{display:'flex', gap:8}}>
          <div style={{flex:1}}>
            <Label>Horímetro / KM</Label>
            <Input type="number" value="3420" onChange={()=>{}}/>
          </div>
          <div style={{width:120}}>
            <Label>Unidade</Label>
            <Select value="Horímetro" options={['Horímetro','KM']}/>
          </div>
        </div>

        <div>
          <Label>Prioridade</Label>
          <Segmented options={['Urgente','Normal','Baixa']} value="Urgente" danger/>
        </div>

        <div>
          <Label>Origem</Label>
          <Segmented options={['Corretiva','Preventiva']} value="Corretiva"/>
        </div>

        <div style={{display:'flex', gap:8}}>
          <div style={{flex:1}}>
            <Label>Abertura</Label>
            <Input disabled value="18/abr · 09:42"/>
          </div>
          <div style={{flex:1}}>
            <Label>Previsão</Label>
            <Input type="date" value="2026-04-25" onChange={()=>{}}/>
          </div>
        </div>
      </div>

      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        background:'rgba(252,252,251,0.95)',
        backdropFilter:'blur(16px)',
        borderTop:`1px solid ${NSA.border}`,
        padding:'12px 16px 30px',
      }}>
        <PrimaryButton icon="check">Abrir OS</PrimaryButton>
      </div>
    </div>
  );
}

Object.assign(window, { OSListScreen, OSDetailScreen, NovaOSScreen });
