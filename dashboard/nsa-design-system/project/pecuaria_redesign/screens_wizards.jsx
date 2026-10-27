// Wizard screens — representative samples: Suplementação (Q, slider, summary),
// Forragem, Aguada, Sanidade, Cerca, Peso, Lavagem (one key step each)

function SupCochoScreen() {
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', position:'relative', paddingBottom:100}}>
      <WizardHeader domain="suplementacao" context="Suplementação · Pasto 14"
        title="Como está o cocho?" step={1} total={8}/>
      <div style={{padding:'20px 16px', display:'flex', flexDirection:'column', gap:10}}>
        <ChoiceCard tone="ok" icon="check-circle-2" label="Cheio"
          desc="Cocho com bastante suplemento, consumo abaixo do esperado"/>
        <ChoiceCard tone="warn" icon="circle-dot" label="Adequada" selected
          desc="Consumo normal, quantidade apropriada"/>
        <ChoiceCard tone="danger" icon="alert-circle" label="Vazio"
          desc="Cocho sem suplemento — repor imediatamente"/>
      </div>
      <WizardFooter/>
    </div>
  );
}

function SupSacosScreen() {
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', position:'relative', paddingBottom:100}}>
      <WizardHeader domain="suplementacao" context="Suplementação · Pasto 14"
        title="Quantos sacos colocou no cocho?" step={4} total={8}/>
      <div style={{padding:'20px 16px'}}>
        {/* Big number display */}
        <div style={{background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:14, padding:'24px 16px', textAlign:'center', marginBottom:16}}>
          <div style={{display:'flex', alignItems:'baseline', justifyContent:'center', gap:8}}>
            <span style={{fontFamily:'Lora, serif', fontSize:56, fontWeight:600, color:NSA.green, letterSpacing:'-0.03em', fontVariantNumeric:'tabular-nums'}}>5,0</span>
            <span style={{fontSize:15, color:NSA.inkSecondary, fontWeight:500}}>sacos</span>
          </div>
          <div style={{fontSize:12, color:NSA.inkMuted, marginTop:4, fontVariantNumeric:'tabular-nums'}}>= 125 kg</div>
        </div>

        {/* Stepper */}
        <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:12}}>
          <button style={{width:44, height:44, borderRadius:12, border:`1px solid ${NSA.borderStrong}`, background:'#fff', fontSize:22, color:NSA.inkPrimary, fontWeight:300}}>−</button>
          <div style={{flex:1, height:6, background:NSA.bgMuted, borderRadius:999, overflow:'hidden', position:'relative'}}>
            <div style={{position:'absolute', left:0, top:0, bottom:0, width:'2.5%', background:NSA.green, borderRadius:999}}></div>
            <div style={{position:'absolute', left:'2.5%', top:-5, width:16, height:16, background:NSA.green, borderRadius:'50%', border:`3px solid #fff`, boxShadow:'0 1px 3px rgba(0,0,0,0.15)'}}></div>
          </div>
          <button style={{width:44, height:44, borderRadius:12, border:'none', background:NSA.green, color:NSA.cream, fontSize:22, fontWeight:300}}>+</button>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:NSA.inkMuted, fontVariantNumeric:'tabular-nums', marginBottom:16}}>
          <span>0,5</span><span>200</span>
        </div>

        <div style={{padding:'12px 14px', background:DOMAIN.suplementacao.tint, borderRadius:12, display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:34, height:34, borderRadius:10, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <i data-lucide="wheat" style={{width:18, height:18, color:DOMAIN.suplementacao.dot, strokeWidth:1.75}}></i>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11, color:NSA.inkMuted, letterSpacing:'0.08em', textTransform:'uppercase'}}>Formulação</div>
            <div style={{fontSize:13, fontWeight:600, color:NSA.inkPrimary}}>Probeef Reprodução</div>
          </div>
          <span style={{fontSize:11, fontWeight:500, color:DOMAIN.suplementacao.dot}}>Trocar</span>
        </div>
      </div>
      <WizardFooter/>
    </div>
  );
}

function SupResumoScreen() {
  const rows = [
    ['Escore do cocho', 'Adequada',            'warn'],
    ['Abasteceu',       'Sim',                 'ok'],
    ['Formulação',      'Probeef Reprodução',  null],
    ['No cocho',        '5,0 sacos · 125 kg',  null],
    ['Acesso ao cocho', 'Bom',                 'ok'],
  ];
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', position:'relative', paddingBottom:100}}>
      <WizardHeader domain="suplementacao" context="Suplementação · Pasto 14" title="Resumo" step={8} total={8}/>
      <div style={{padding:'18px 16px'}}>
        {/* summary */}
        <div style={{background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:14, padding:'8px 14px', marginBottom:12}}>
          {rows.map(([k,v,tone],i) => (
            <div key={k} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 0', borderTop: i===0 ? 'none' : `1px solid ${NSA.border}`,
            }}>
              <span style={{fontSize:12, color:NSA.inkSecondary}}>{k}</span>
              {tone
                ? <StatusPill kind={tone}>{v}</StatusPill>
                : <span style={{fontSize:13, fontWeight:500, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums'}}>{v}</span>}
            </div>
          ))}
        </div>

        {/* bombona */}
        <div style={{background:'#fff', border:`1px solid ${NSA.border}`, borderLeft:`3px solid ${DOMAIN.suplementacao.dot}`, borderRadius:12, padding:'12px 14px', marginBottom:12}}>
          <div style={{fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:NSA.inkMuted, fontWeight:500, marginBottom:6}}>Bombona</div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
            <span style={{fontSize:13, color:NSA.inkSecondary}}>Quantidade atual</span>
            <span style={{fontSize:15, fontWeight:600, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums'}}>8 sacos · 200 kg</span>
          </div>
        </div>

        {/* forecast hero */}
        <div style={{background:NSA.green, color:NSA.cream, borderRadius:14, padding:'18px 16px', marginBottom:12}}>
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.7, fontWeight:500, marginBottom:10}}>
            <i data-lucide="clock-4" style={{width:12, height:12, strokeWidth:1.75}}></i>
            Previsão de suprimento
          </div>
          <div style={{display:'flex', gap:12, alignItems:'baseline'}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:'Lora, serif', fontSize:36, fontWeight:600, letterSpacing:'-0.03em', fontVariantNumeric:'tabular-nums'}}>~15</div>
              <div style={{fontSize:11, opacity:0.7}}>dias cocho</div>
            </div>
            <div style={{width:1, alignSelf:'stretch', background:'rgba(255,255,227,0.15)'}}></div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'Lora, serif', fontSize:36, fontWeight:600, letterSpacing:'-0.03em', fontVariantNumeric:'tabular-nums'}}>~24</div>
              <div style={{fontSize:11, opacity:0.7}}>dias bombona</div>
            </div>
          </div>
          <div style={{marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,227,0.12)', display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
            <span style={{fontSize:12, opacity:0.7, letterSpacing:'0.08em', textTransform:'uppercase'}}>Total</span>
            <span style={{fontFamily:'Lora, serif', fontSize:24, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>~39 dias</span>
          </div>
        </div>

        <button style={{
          width:'100%', padding:'12px', background:'#fff',
          border:`1px dashed ${NSA.borderStrong}`, borderRadius:12,
          fontSize:13, color:NSA.inkSecondary, display:'flex',
          alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <i data-lucide="camera" style={{width:14, height:14, strokeWidth:1.75}}></i>
          Adicionar foto (opcional)
        </button>
      </div>
      <WizardFooter next="Finalizar" variant="success"/>
    </div>
  );
}

function ForragemScreen() {
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', position:'relative', paddingBottom:100}}>
      <WizardHeader domain="forragem" context="Forragem · Pasto 14" title="Altura do capim" step={2} total={6}/>
      <div style={{padding:'20px 16px', display:'flex', flexDirection:'column', gap:10}}>
        <div style={{background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:14, padding:'18px 16px', textAlign:'center', marginBottom:6}}>
          <div style={{display:'flex', alignItems:'baseline', justifyContent:'center', gap:6}}>
            <span style={{fontFamily:'Lora, serif', fontSize:48, fontWeight:600, color:DOMAIN.forragem.dot, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums'}}>45</span>
            <span style={{fontSize:14, color:NSA.inkSecondary}}>cm</span>
          </div>
          <div style={{fontSize:11, color:NSA.inkMuted, marginTop:4, letterSpacing:'0.08em', textTransform:'uppercase'}}>Altura média</div>
        </div>
        <ChoiceCard tone="ok" icon="trending-up" label="Acima do ideal" desc="Mais de 40 cm · considerar entrada do lote"/>
        <ChoiceCard tone="default" icon="check" label="No ponto" selected desc="30–40 cm · altura ótima p/ entrada"/>
        <ChoiceCard tone="warn" icon="trending-down" label="Baixa" desc="15–30 cm · rebrote em andamento"/>
        <ChoiceCard tone="danger" icon="alert-circle" label="Pastejo excessivo" desc="Menos de 15 cm · retirar animais"/>
      </div>
      <WizardFooter/>
    </div>
  );
}

function AguadaScreen() {
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', position:'relative', paddingBottom:100}}>
      <WizardHeader domain="aguada" context="Aguada · Pasto 14" title="Nível e limpeza" step={1} total={3}/>
      <div style={{padding:'20px 16px'}}>
        <div style={{fontSize:12, color:NSA.inkMuted, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, marginBottom:10}}>Nível do bebedouro</div>
        <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:20}}>
          <ChoiceCard tone="ok"     icon="droplets"     label="Cheio"  desc="Acima de 80%"/>
          <ChoiceCard tone="default" icon="droplet"     label="Médio" selected desc="Entre 30 e 80%"/>
          <ChoiceCard tone="danger" icon="droplet-off"  label="Baixo/seco" desc="Abaixo de 30% · risco"/>
        </div>
        <div style={{fontSize:12, color:NSA.inkMuted, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, marginBottom:10}}>Qualidade da água</div>
        <div style={{display:'flex', gap:8}}>
          <div style={{flex:1, padding:'12px', border:`1.5px solid ${NSA.green}`, borderRadius:10, background:'#f0f1ee', textAlign:'center', fontSize:13, fontWeight:500, color:NSA.green}}>Limpa</div>
          <div style={{flex:1, padding:'12px', border:`1px solid ${NSA.border}`, borderRadius:10, textAlign:'center', fontSize:13, color:NSA.inkSecondary}}>Suja</div>
          <div style={{flex:1, padding:'12px', border:`1px solid ${NSA.border}`, borderRadius:10, textAlign:'center', fontSize:13, color:NSA.inkSecondary}}>Barrenta</div>
        </div>
      </div>
      <WizardFooter/>
    </div>
  );
}

function SanidadeScreen() {
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', position:'relative', paddingBottom:100}}>
      <WizardHeader domain="sanidade" context="Sanidade · Pasto 14" title="Observações no rebanho" step={2} total={4}/>
      <div style={{padding:'20px 16px'}}>
        <div style={{fontSize:13, color:NSA.inkSecondary, marginBottom:14}}>Marque o que foi observado na ronda — pode escolher mais de um.</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16}}>
          {[
            { lb:'Carrapato',       ic:'bug',           on:true },
            { lb:'Berne',           ic:'bug' },
            { lb:'Bicheira',        ic:'circle-slash',  on:true },
            { lb:'Tosse',           ic:'wind' },
            { lb:'Diarreia',        ic:'droplet' },
            { lb:'Apatia',          ic:'moon' },
            { lb:'Mosca do estábulo',ic:'bug-off' },
            { lb:'Mosca do chifre', ic:'bug-off' },
            { lb:'Sodomia',         ic:'users' },
          ].map(o => (
            <div key={o.lb} style={{
              padding:'12px', borderRadius:12,
              border: o.on ? `1.5px solid ${DOMAIN.sanidade.dot}` : `1px solid ${NSA.border}`,
              background: o.on ? DOMAIN.sanidade.tint : '#fff',
              display:'flex', flexDirection:'column', alignItems:'flex-start', gap:10,
            }}>
              <div style={{width:32, height:32, borderRadius:9, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${NSA.border}`}}>
                <i data-lucide={o.ic} style={{width:16, height:16, color:o.on ? DOMAIN.sanidade.dot : NSA.inkSecondary, strokeWidth:1.75}}></i>
              </div>
              <div style={{fontSize:13, fontWeight: o.on ? 600 : 500, color: o.on ? DOMAIN.sanidade.dot : NSA.inkPrimary}}>{o.lb}</div>
            </div>
          ))}
        </div>
        <div style={{padding:'12px 14px', background:NSA.warnBg, border:`1px solid ${NSA.warnFg}33`, borderRadius:10, fontSize:12, color:NSA.warnFg, display:'flex', alignItems:'flex-start', gap:8}}>
          <i data-lucide="alert-triangle" style={{width:14, height:14, strokeWidth:1.75, marginTop:2}}></i>
          Se houver caso crítico, abra ocorrência para o veterinário após esta ronda.
        </div>
      </div>
      <WizardFooter/>
    </div>
  );
}

function CercaScreen() {
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', position:'relative', paddingBottom:100}}>
      <WizardHeader domain="cerca" context="Cerca · Pasto 14" title="Como está o choque?" step={1} total={3}/>
      <div style={{padding:'20px 16px'}}>
        <div style={{background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:14, padding:'20px 16px', marginBottom:14}}>
          <div style={{fontSize:11, color:NSA.inkMuted, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, marginBottom:8}}>Leitura atual</div>
          <div style={{display:'flex', alignItems:'baseline', gap:6, marginBottom:10}}>
            <span style={{fontFamily:'Lora, serif', fontSize:44, fontWeight:600, color:NSA.warn, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums'}}>3,8</span>
            <span style={{fontSize:14, color:NSA.inkSecondary}}>kV</span>
            <span style={{marginLeft:'auto'}}><StatusPill kind="warn">Abaixo do mínimo</StatusPill></span>
          </div>
          <div style={{height:8, background:NSA.bgMuted, borderRadius:999, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', left:0, top:0, bottom:0, width:'47%', background:NSA.warn, borderRadius:999}}></div>
            <div style={{position:'absolute', left:'50%', top:-2, bottom:-2, width:2, background:NSA.green}}></div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:NSA.inkMuted, marginTop:6, fontVariantNumeric:'tabular-nums'}}>
            <span>0 kV</span><span>Ideal: 4,0 kV</span><span>8 kV</span>
          </div>
        </div>
        <div style={{fontSize:12, color:NSA.inkMuted, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500, marginBottom:10}}>Condição da cerca</div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          <ChoiceCard tone="ok"     icon="check-circle-2" label="Intacta"  desc="Arame, postes e isoladores OK"/>
          <ChoiceCard tone="warn"   icon="alert-triangle" label="Precisa manutenção" selected desc="Pontos fracos isolados · agendar reparo"/>
          <ChoiceCard tone="danger" icon="zap-off"        label="Quebrada" desc="Cerca caída · gado em risco de sair"/>
        </div>
      </div>
      <WizardFooter/>
    </div>
  );
}

function PesoScreen() {
  const lots = [
    { cat:'Garrote',  est:350, n:45 },
    { cat:'Novilha',  est:280, n:20 },
    { cat:'Vaca',     est:450, n:15 },
    { cat:'Bez. mamando', est:80, n:5 },
  ];
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', position:'relative', paddingBottom:100}}>
      <WizardHeader domain="peso" context="Peso visual · Pasto 14" title="Estimativa por categoria" step={2} total={3}/>
      <div style={{padding:'18px 16px'}}>
        <div style={{fontSize:13, color:NSA.inkSecondary, marginBottom:14}}>Informe o peso médio estimado para cada categoria do piquete.</div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {lots.map(l => (
            <div key={l.cat} style={{background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:12, padding:'12px 14px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8}}>
                <span style={{fontSize:13, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.01em'}}>{l.cat}</span>
                <span style={{fontSize:11, color:NSA.inkMuted, fontVariantNumeric:'tabular-nums'}}>{l.n} cab.</span>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <button style={{width:36, height:36, borderRadius:9, border:`1px solid ${NSA.borderStrong}`, background:'#fff', fontSize:18, color:NSA.inkPrimary, fontWeight:300}}>−</button>
                <div style={{flex:1, textAlign:'center'}}>
                  <span style={{fontFamily:'Lora, serif', fontSize:22, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums'}}>{l.est}</span>
                  <span style={{fontSize:12, color:NSA.inkSecondary, marginLeft:4}}>kg</span>
                </div>
                <button style={{width:36, height:36, borderRadius:9, border:'none', background:NSA.green, color:NSA.cream, fontSize:18, fontWeight:300}}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <WizardFooter/>
    </div>
  );
}

Object.assign(window, {
  SupCochoScreen, SupSacosScreen, SupResumoScreen,
  ForragemScreen, AguadaScreen, SanidadeScreen, CercaScreen, PesoScreen,
});
