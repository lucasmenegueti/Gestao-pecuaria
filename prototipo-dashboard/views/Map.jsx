// Mapa — piquetes coloridos por status no período + toggle por seção + popup ao clicar.

function MapView({ period, navigate }) {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  const M = window.MOCK;

  const [sectionFilter, setSectionFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(null);

  const rondaByPaddock = {};
  M.RONDAS_TODAY.forEach(r => { rondaByPaddock[r.paddockId] = r; });

  // Status por piquete dependendo do filtro de seção:
  //  - all: verde se cobriu obrigatórias, amarelo se parcial, vermelho se nada
  //  - <section>: verde se essa seção foi feita, vermelho se não
  function statusFor(p) {
    const ronda = rondaByPaddock[p.id];
    if (sectionFilter === 'all') {
      if (!ronda) return 'red';
      return M.REQUIRED.every(s => ronda.sections.includes(s)) ? 'green' : 'yellow';
    }
    if (!ronda) return 'red';
    return ronda.sections.includes(sectionFilter) ? 'green' : 'red';
  }

  const sectionOpts = [
    { id: 'all', label: 'Cobertura geral' },
    ...Object.entries(M.SECTION_LABELS).map(([id, label]) => ({ id, label })),
  ];

  const counts = {
    green: M.PADDOCKS.filter(p => statusFor(p) === 'green').length,
    yellow: M.PADDOCKS.filter(p => statusFor(p) === 'yellow').length,
    red: M.PADDOCKS.filter(p => statusFor(p) === 'red').length,
  };

  const selectedPaddock = selected != null ? M.PADDOCKS.find(p => p.id === selected) : null;
  const selectedRonda = selected != null ? rondaByPaddock[selected] : null;
  const selectedUser = selectedRonda ? M.USERS.find(u => u.id === selectedRonda.userId) : null;

  return (
    <div style={{padding:'24px 28px', overflow:'auto', height:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:16}}>
        <div>
          <div style={{fontSize:12, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:NSA.inkMuted, marginBottom:6}}>
            Pecuária · 18.400 hectares · {M.KPIS.totalPaddocks} talhões
          </div>
          <h1 style={{fontSize:28, fontWeight:600, letterSpacing:'-0.02em', margin:0, color:NSA.inkPrimary}}>
            Mapa da fazenda
          </h1>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <span style={{fontSize:12, color:NSA.inkMuted, fontWeight:500}}>Mostrar:</span>
          <select
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
            style={{
              padding:'6px 11px', fontSize:13, fontFamily:'inherit',
              background:'#fff', color:NSA.inkPrimary, border:`1px solid ${NSA.borderStrong}`,
              borderRadius:6, cursor:'pointer', outline:'none',
            }}>
            {sectionOpts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{display:'flex', gap:12, marginBottom:14}}>
        <LegendItem color={NSA.ok}     label={sectionFilter === 'all' ? 'Cobertura completa' : 'Feito'}     count={counts.green} />
        {sectionFilter === 'all' && <LegendItem color={NSA.warn}   label="Ronda parcial" count={counts.yellow} />}
        <LegendItem color={NSA.danger} label={sectionFilter === 'all' ? 'Sem ronda' : 'Não feito'}           count={counts.red} />
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16}}>
        {/* Map */}
        <FarmMap
          paddocks={M.PADDOCKS}
          statusFor={statusFor}
          selected={selected}
          onSelect={setSelected}
          height={580}
        />

        {/* Right column — selected detail or summary */}
        <div>
          {selectedPaddock ? (
            <Card title={selectedPaddock.name} subtitle={`${selectedPaddock.area} ha · ${selectedPaddock.heads} cab`} padding={16}
              action={<button onClick={() => setSelected(null)} style={{background:'transparent', border:'none', cursor:'pointer', color:NSA.inkMuted}}><i data-lucide="x" style={{width:14, height:14}}></i></button>}>
              {selectedRonda ? (
                <>
                  <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
                    <Avatar initials={selectedUser?.initials} color={selectedUser?.color} size={28} />
                    <div>
                      <div style={{fontSize:13, fontWeight:500, color:NSA.inkPrimary}}>{selectedUser?.name}</div>
                      <div style={{fontSize:11, color:NSA.inkMuted}}>{selectedRonda.startTime} – {selectedRonda.endTime}</div>
                    </div>
                  </div>
                  <div style={{fontSize:11, fontWeight:500, color:NSA.inkMuted, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:6}}>
                    Seções avaliadas
                  </div>
                  <div style={{display:'flex', flexWrap:'wrap', gap:4, marginBottom:14}}>
                    {selectedRonda.sections.map(sec => (
                      <SectionPill key={sec} section={sec} label={M.SECTION_LABELS[sec]} color={M.SECTION_COLORS[sec]} />
                    ))}
                  </div>
                </>
              ) : (
                <div style={{
                  padding:'10px 12px', borderRadius:6, background:NSA.dangerBg, color:'#7d2519', fontSize:12,
                  marginBottom:14, display:'flex', alignItems:'center', gap:6,
                }}>
                  <i data-lucide="x-circle" style={{width:14, height:14, strokeWidth:2}}></i>
                  Sem ronda registrada hoje
                </div>
              )}
              <Btn icon="arrow-right" onClick={() => navigate('paddocks')}>Ver detalhes</Btn>
            </Card>
          ) : (
            <Card title="Selecione um talhão" padding={20}>
              <div style={{fontSize:13, color:NSA.inkMuted, lineHeight:1.5}}>
                Clique em um polígono no mapa para ver quem fez a ronda, quais seções foram avaliadas e os alertas ativos.
              </div>
              <div style={{
                marginTop:18, padding:'12px 14px', background:NSA.bgSubtle, borderRadius:6,
                fontSize:12, color:NSA.inkMuted,
              }}>
                <div style={{fontWeight:600, color:NSA.inkPrimary, marginBottom:4}}>💡 Dica</div>
                Use o seletor "Mostrar:" no topo pra filtrar por seção específica — útil pra ver onde a Sanidade ainda não foi rodada hoje, por exemplo.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, count }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color:NSA.inkMuted}}>
      <span style={{width:10, height:10, borderRadius:'50%', background:color, opacity:0.55}}></span>
      <span>{label}</span>
      <span style={{fontWeight:600, color:NSA.inkPrimary, fontVariantNumeric:'tabular-nums'}}>{count}</span>
    </div>
  );
}

window.MapView = MapView;
