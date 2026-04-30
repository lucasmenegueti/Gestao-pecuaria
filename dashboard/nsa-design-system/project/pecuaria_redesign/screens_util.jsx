// Utilitárias: Mapa, Rebanho, Estoque, Lotação, Reabastecimento (rota)

function MapaScreen() {
  const paddocks = [
    { id:'14',  x: 18, y: 14, w:36, h:20, status:'ok',     cab:85 },
    { id:'14A', x: 56, y: 16, w:34, h:22, status:'ok',     cab:72 },
    { id:'15',  x: 14, y: 38, w:28, h:18, status:'danger', cab:65 },
    { id:'16',  x: 44, y: 40, w:40, h:20, status:'warn',   cab:110 },
    { id:'17',  x: 16, y: 62, w:26, h:22, status:'ok',     cab:55 },
    { id:'18',  x: 44, y: 62, w:40, h:18, status:'ok',     cab:95 },
  ];
  const col = (s) => ({ ok:{st:NSA.ok, bg:'rgba(46,140,79,0.35)'}, warn:{st:NSA.warn, bg:'rgba(184,130,23,0.35)'}, danger:{st:NSA.danger, bg:'rgba(192,57,43,0.35)'}}[s]);
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:72, position:'relative'}}>
      <div style={{padding:'56px 20px 18px', background: NSA.green, color: NSA.cream}}>
        <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6, marginBottom:4}}>Mapa · Fazenda N.S.A</div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em', fontFamily:'Lora, serif'}}>14 piquetes</div>
          <div style={{display:'flex', gap:6}}>
            <span style={{padding:'4px 9px', background:'rgba(255,255,227,0.12)', borderRadius:999, fontSize:11, fontWeight:500}}>Satélite</span>
            <span style={{padding:'4px 9px', background:'rgba(255,255,227,0.06)', borderRadius:999, fontSize:11, opacity:0.7}}>Talhões</span>
          </div>
        </div>
      </div>

      {/* Map canvas */}
      <div style={{margin:'12px 16px', position:'relative', borderRadius:14, overflow:'hidden', height:380, border:`1px solid ${NSA.border}`}}>
        {/* ground */}
        <div style={{position:'absolute', inset:0, backgroundImage:'url(public/photo-pasture.jpg)', backgroundSize:'cover', backgroundPosition:'center', filter:'brightness(0.75) saturate(0.9)'}}></div>
        <div style={{position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(23,37,20,0.55), rgba(23,37,20,0.25))'}}></div>

        {/* polygons */}
        {paddocks.map(p => {
          const c = col(p.status);
          return (
            <div key={p.id} style={{
              position:'absolute',
              left:`${p.x}%`, top:`${p.y}%`, width:`${p.w}%`, height:`${p.h}%`,
              background:c.bg, border:`1.5px solid ${c.st}`, borderRadius:8,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              color:'#fff', textShadow:'0 1px 3px rgba(0,0,0,0.5)',
            }}>
              <div style={{fontFamily:'Lora, serif', fontSize:14, fontWeight:600, letterSpacing:'-0.02em'}}>{p.id}</div>
              <div style={{fontSize:10, opacity:0.95, fontVariantNumeric:'tabular-nums'}}>{p.cab} cab</div>
            </div>
          );
        })}
        {/* GPS */}
        <div style={{position:'absolute', left:'38%', top:'52%', width:14, height:14, borderRadius:'50%', background:NSA.cream, border:`3px solid ${NSA.green}`, boxShadow:'0 0 0 6px rgba(255,255,227,0.35)'}}></div>
      </div>

      {/* legend */}
      <div style={{margin:'0 16px 12px', padding:'12px 14px', background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex', gap:14}}>
          {[['OK',NSA.ok],['Atenção',NSA.warn],['Alerta',NSA.danger]].map(([l,c]) => (
            <div key={l} style={{display:'flex', alignItems:'center', gap:5, fontSize:12, color:NSA.inkSecondary}}>
              <span style={{width:10, height:10, borderRadius:3, background:c}}></span>{l}
            </div>
          ))}
        </div>
        <i data-lucide="locate-fixed" style={{width:16, height:16, color:NSA.green, strokeWidth:1.75}}></i>
      </div>
      <TabBar active="mapa"/>
    </div>
  );
}

function RebanhoScreen() {
  const lots = [
    { code:'P14',  ha:45, total:85,  cats:[['Garrote',45,350],['Novilha',20,280],['Vaca',15,450],['Bez. mamando',5,80]] },
    { code:'P15',  ha:38, total:65,  cats:[['Garrote',40,310],['Bezerro',25,150]] },
    { code:'P16',  ha:60, total:110, cats:[['Vaca',60,460],['Bezerra mam.',30,70],['Bezerro mam.',20,75]] },
  ];
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:72, position:'relative'}}>
      <div style={{padding:'56px 20px 18px', background: NSA.green, color: NSA.cream}}>
        <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6, marginBottom:6}}>Rebanho</div>
        <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:'Lora, serif', fontSize:44, fontWeight:600, letterSpacing:'-0.03em', fontVariantNumeric:'tabular-nums'}}>865</div>
            <div style={{fontSize:12, opacity:0.75}}>cabeças · 14 piquetes</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'Lora, serif', fontSize:20, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>0,047</div>
            <div style={{fontSize:11, opacity:0.7}}>cab/ha</div>
          </div>
        </div>
      </div>

      {/* Category summary */}
      <div style={{padding:'14px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
        <KPI label="Vacas"    value="135"/>
        <KPI label="Garrotes" value="180"/>
        <KPI label="Bezerros" value="105"/>
      </div>

      <SectionCaption right={<span style={{textTransform:'none', letterSpacing:0, color:NSA.green, fontWeight:600}}>Filtrar</span>}>Por piquete</SectionCaption>
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:10}}>
        {lots.map(lot => (
          <div key={lot.code} style={{background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:12, padding:'12px 14px'}}>
            <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:8}}>
              <div style={{display:'flex', alignItems:'baseline', gap:8}}>
                <span style={{fontFamily:'ui-monospace, Menlo, monospace', fontSize:14, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'0.02em'}}>{lot.code}</span>
              </div>
              <span style={{fontSize:13, fontWeight:600, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums'}}>{lot.total} <span style={{color:NSA.inkMuted, fontWeight:400, fontSize:11}}>cab</span></span>
            </div>
            <div style={{fontSize:11, color:NSA.inkMuted, marginBottom:8, fontVariantNumeric:'tabular-nums'}}>{lot.ha} ha · {(lot.total/lot.ha).toFixed(2)} cab/ha</div>
            <div style={{display:'flex', flexDirection:'column', gap:4}}>
              {lot.cats.map(([cat,n,kg]) => (
                <div key={cat} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderTop:`1px dashed ${NSA.border}`}}>
                  <span style={{fontSize:12, color:NSA.inkSecondary}}>{cat}</span>
                  <span style={{fontSize:12, fontVariantNumeric:'tabular-nums', color:NSA.inkPrimary, fontWeight:500}}>
                    {n} cab · {kg} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <TabBar active="rebanho"/>
    </div>
  );
}

function EstoqueScreen() {
  const items = [
    { name:'Probeef Reprodução', unit:'sacos', qty:200, min:10, days:25, status:'ok',     pct:100 },
    { name:'Engorda 3 kg',        unit:'sacos', qty:15,  min:8,  days:8,  status:'warn',   pct:40 },
    { name:'Sal mineral',         unit:'sacos', qty:3,   min:15, days:2,  status:'danger', pct:10 },
    { name:'Proteinado seco',     unit:'sacos', qty:50,  min:5,  days:30, status:'ok',     pct:100 },
    { name:'Ivermectina',         unit:'frascos', qty:12, min:3, days:null, status:'ok',   pct:100 },
  ];
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:72, position:'relative'}}>
      <div style={{padding:'56px 20px 14px', background: NSA.green, color: NSA.cream}}>
        <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6, marginBottom:4}}>Estoque</div>
        <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em', fontFamily:'Lora, serif'}}>Central · Sede</div>
      </div>

      {/* Tab switch */}
      <div style={{margin:'14px 16px 0', padding:4, background:NSA.bgMuted, borderRadius:10, display:'flex', gap:4}}>
        <div style={{flex:1, textAlign:'center', padding:'8px', borderRadius:7, background:'#fff', fontSize:13, fontWeight:600, color:NSA.green, boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>Central</div>
        <div style={{flex:1, textAlign:'center', padding:'8px', borderRadius:7, fontSize:13, color:NSA.inkSecondary}}>Bombonas</div>
      </div>

      <SectionCaption right={<span style={{textTransform:'none', letterSpacing:0, color:NSA.danger, fontWeight:600}}>1 crítico</span>}>Insumos (5)</SectionCaption>
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:8}}>
        {items.map(it => (
          <div key={it.name} style={{
            background:'#fff', border:`1px solid ${NSA.border}`,
            borderLeft:`3px solid ${it.status==='danger'?NSA.danger:it.status==='warn'?NSA.warn:NSA.ok}`,
            borderRadius:12, padding:'12px 14px',
          }}>
            <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:6}}>
              <span style={{fontSize:14, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'-0.01em'}}>{it.name}</span>
              <StatusPill kind={it.status}>{it.status==='ok'?'OK':it.status==='warn'?'Baixo':'Crítico'}</StatusPill>
            </div>
            <div style={{display:'flex', alignItems:'baseline', gap:4, marginBottom:8}}>
              <span style={{fontFamily:'Lora, serif', fontSize:22, fontWeight:600, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em'}}>{it.qty}</span>
              <span style={{fontSize:12, color:NSA.inkSecondary}}>{it.unit}</span>
              <span style={{marginLeft:'auto', fontSize:11, color:NSA.inkMuted, fontVariantNumeric:'tabular-nums'}}>
                mín {it.min} {it.days!=null && `· ~${it.days} dias`}
              </span>
            </div>
            <ProgressBar pct={it.pct} tone={it.status}/>
          </div>
        ))}
      </div>

      <div style={{padding:'20px 16px 0', display:'flex', gap:10}}>
        <button style={{flex:1, padding:'12px', border:`1px solid ${NSA.borderStrong}`, background:'#fff', borderRadius:10, fontSize:13, fontWeight:500, color:NSA.inkPrimary, display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
          <i data-lucide="plus" style={{width:14, height:14, strokeWidth:2}}></i> Entrada
        </button>
        <button style={{flex:1, padding:'12px', border:`1px solid ${NSA.borderStrong}`, background:'#fff', borderRadius:10, fontSize:13, fontWeight:500, color:NSA.inkPrimary, display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
          <i data-lucide="minus" style={{width:14, height:14, strokeWidth:2}}></i> Saída
        </button>
      </div>
      <div style={{padding:'10px 16px 0'}}>
        <PrimaryButton icon="truck">Reabastecer bombonas</PrimaryButton>
      </div>

      <TabBar active="estoque"/>
    </div>
  );
}

function LotacaoScreen() {
  const rows = [
    { code:'P14',  ha:45, n:85,  cat:'Garrote, Novilha, Vaca', status:'ok' },
    { code:'P14A', ha:52, n:72,  cat:'Boi', status:'ok' },
    { code:'P15',  ha:38, n:65,  cat:'Garrote, Bezerro', status:'warn' },
    { code:'P16',  ha:60, n:110, cat:'Vaca, Bez. mamando', status:'danger' },
    { code:'P17',  ha:35, n:55,  cat:'Garrote', status:'ok' },
    { code:'P18',  ha:70, n:95,  cat:'Novilha', status:'ok' },
    { code:'P19',  ha:30, n:30,  cat:'Touro', status:'ok' },
    { code:'P20',  ha:55, n:80,  cat:'Boi', status:'ok' },
  ];
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:24}}>
      <div style={{padding:'56px 20px 18px', background: NSA.green, color: NSA.cream}}>
        <div style={{display:'flex', alignItems:'center', gap:4, fontSize:13, opacity:0.7, marginBottom:10}}>
          <i data-lucide="chevron-left" style={{width:14, height:14, strokeWidth:2}}></i> Painel
        </div>
        <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6, marginBottom:4}}>Lotação geral</div>
        <div style={{display:'flex', gap:20, alignItems:'flex-end', marginTop:6}}>
          <div>
            <div style={{fontFamily:'Lora, serif', fontSize:40, fontWeight:600, letterSpacing:'-0.03em', fontVariantNumeric:'tabular-nums'}}>865</div>
            <div style={{fontSize:11, opacity:0.7}}>cabeças</div>
          </div>
          <div style={{width:1, alignSelf:'stretch', background:'rgba(255,255,227,0.18)'}}></div>
          <div>
            <div style={{fontFamily:'Lora, serif', fontSize:40, fontWeight:600, letterSpacing:'-0.03em', fontVariantNumeric:'tabular-nums'}}>18.400</div>
            <div style={{fontSize:11, opacity:0.7}}>hectares</div>
          </div>
        </div>
        <div style={{marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,227,0.15)', display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          <span style={{fontSize:12, opacity:0.75, letterSpacing:'0.08em', textTransform:'uppercase'}}>Lotação global</span>
          <span style={{fontFamily:'Lora, serif', fontSize:22, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>0,047 cab/ha</span>
        </div>
      </div>

      <SectionCaption>Por piquete</SectionCaption>
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:8}}>
        {rows.map(r => {
          const ratio = (r.n/r.ha).toFixed(2).replace('.',',');
          return (
            <div key={r.code} style={{
              background:'#fff', border:`1px solid ${NSA.border}`,
              borderLeft:`3px solid ${r.status==='danger'?NSA.danger:r.status==='warn'?NSA.warn:NSA.ok}`,
              borderRadius:12, padding:'10px 14px',
              display:'flex', alignItems:'center', gap:10,
            }}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'baseline', gap:8, marginBottom:2}}>
                  <span style={{fontFamily:'ui-monospace, Menlo, monospace', fontSize:13, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'0.02em'}}>{r.code}</span>
                </div>
                <div style={{fontSize:11, color:NSA.inkMuted, fontVariantNumeric:'tabular-nums'}}>{r.n} cab · {r.ha} ha · {r.cat}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'Lora, serif', fontSize:18, fontWeight:600, color: r.status==='danger'?NSA.danger:r.status==='warn'?NSA.warnFg:NSA.inkPrimary, fontVariantNumeric:'tabular-nums'}}>{ratio}</div>
                <div style={{fontSize:10, color:NSA.inkMuted, letterSpacing:'0.06em'}}>cab/ha</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReabRotaScreen() {
  const todo = [
    { code:'P15',  status:'danger', label:'Vazia', bomb:'0 sacos PROBEEF',  last:'12 dias' },
    { code:'P14A', status:'danger', label:'Crítico', bomb:'1 saco PROBEEF', last:'8 dias' },
    { code:'P16',  status:'warn',   label:'Baixo',  bomb:'3 sacos Sal min.', last:'5 dias' },
  ];
  const done = [
    { code:'P14', left:'8 sacos PROBEEF',  bomb:'8 sacos' },
    { code:'P17', left:'3 sacos Sal min.', bomb:'9 sacos' },
  ];
  return (
    <div style={{background: NSA.bgCanvas, minHeight:'100%', paddingBottom:100, position:'relative'}}>
      {/* header — usa warn tone para diferenciar o fluxo */}
      <div style={{padding:'56px 20px 16px', background: NSA.green, color: NSA.cream}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
          <div style={{display:'flex', alignItems:'center', gap:4, fontSize:13, opacity:0.7}}>
            <i data-lucide="chevron-left" style={{width:14, height:14, strokeWidth:2}}></i> Painel
          </div>
          <span style={{padding:'3px 9px', background:NSA.warn, color:'#fff', borderRadius:999, fontSize:10, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase'}}>Em rota</span>
        </div>
        <div style={{fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6, marginBottom:4}}>Reabastecimento · 09/abr · início 07:30</div>
        <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em', fontFamily:'Lora, serif'}}>Rota de bombonas</div>
      </div>

      {/* trator bar */}
      <div style={{margin:'12px 16px 0', padding:'12px 14px', background:NSA.warnBg, border:`1px solid ${NSA.warnFg}22`, borderRadius:12}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
          <i data-lucide="truck" style={{width:16, height:16, color:NSA.warnFg, strokeWidth:1.75}}></i>
          <span style={{fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600, color:NSA.warnFg}}>No trator</span>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <div>
            <div style={{fontSize:11, color:NSA.inkSecondary}}>Probeef</div>
            <div style={{display:'flex', alignItems:'baseline', gap:4, fontVariantNumeric:'tabular-nums'}}>
              <span style={{fontSize:18, fontWeight:600, color:NSA.inkPrimary}}>22</span>
              <span style={{fontSize:11, color:NSA.inkMuted}}>/ 30</span>
              <span style={{fontSize:11, color:NSA.danger, fontWeight:500}}>−8</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:11, color:NSA.inkSecondary}}>Sal min.</div>
            <div style={{display:'flex', alignItems:'baseline', gap:4, fontVariantNumeric:'tabular-nums'}}>
              <span style={{fontSize:18, fontWeight:600, color:NSA.inkPrimary}}>12</span>
              <span style={{fontSize:11, color:NSA.inkMuted}}>/ 15</span>
              <span style={{fontSize:11, color:NSA.danger, fontWeight:500}}>−3</span>
            </div>
          </div>
        </div>
      </div>

      {/* progress */}
      <div style={{margin:'10px 16px 0', padding:'10px 14px', background:'#fff', border:`1px solid ${NSA.border}`, borderRadius:12, display:'flex', alignItems:'center', gap:10}}>
        <span style={{fontSize:12, color:NSA.inkSecondary}}>Progresso</span>
        <div style={{flex:1}}><ProgressBar pct={29}/></div>
        <span style={{fontSize:12, fontWeight:600, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums'}}>2 / 7</span>
      </div>

      <SectionCaption right={<span style={{color:NSA.danger, textTransform:'none', letterSpacing:0, fontWeight:600}}>2 urgentes</span>}>A abastecer</SectionCaption>
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:8}}>
        {todo.map(t => {
          const c = t.status === 'danger' ? NSA.danger : NSA.warn;
          return (
            <div key={t.code} style={{background:'#fff', border:`1px solid ${NSA.border}`, borderLeft:`3px solid ${c}`, borderRadius:12, padding:'12px 14px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4}}>
                <div style={{display:'flex', alignItems:'baseline', gap:8}}>
                  <span style={{fontFamily:'ui-monospace, Menlo, monospace', fontSize:14, fontWeight:600, color:NSA.inkPrimary, letterSpacing:'0.02em'}}>{t.code}</span>
                </div>
                <StatusPill kind={t.status}>{t.label}</StatusPill>
              </div>
              <div style={{fontSize:12, color:NSA.inkSecondary, marginBottom:8}}>{t.bomb} · últ. reab {t.last}</div>
              <button style={{width:'100%', padding:'10px', background:NSA.green, color:NSA.cream, border:'none', borderRadius:10, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                Abastecer <i data-lucide="arrow-right" style={{width:14, height:14, strokeWidth:2}}></i>
              </button>
            </div>
          );
        })}
      </div>

      <SectionCaption>Feitos hoje (2)</SectionCaption>
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:8, opacity:0.78}}>
        {done.map(d => (
          <div key={d.code} style={{background:'#fff', border:`1px solid ${NSA.border}`, borderLeft:`3px solid ${NSA.ok}`, borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:10}}>
            <i data-lucide="check-circle-2" style={{width:18, height:18, color:NSA.ok, strokeWidth:1.75}}></i>
            <div style={{flex:1}}>
              <div style={{fontSize:13, color:NSA.inkPrimary, fontWeight:500}}><span style={{fontFamily:'ui-monospace, Menlo, monospace', fontWeight:600}}>{d.code}</span> · deixou {d.left}</div>
              <div style={{fontSize:11, color:NSA.inkMuted}}>Bombona agora: {d.bomb}</div>
            </div>
          </div>
        ))}
      </div>

      {/* sticky encerrar */}
      <div style={{position:'absolute', left:0, right:0, bottom:0, padding:'14px 16px 24px', background:'#fff', borderTop:`1px solid ${NSA.border}`}}>
        <SecondaryButton>Encerrar rota →</SecondaryButton>
      </div>
    </div>
  );
}

Object.assign(window, { MapaScreen, RebanhoScreen, EstoqueScreen, LotacaoScreen, ReabRotaScreen });
