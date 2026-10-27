// Mounts a representative set of NSA board-deck slides.
const TOTAL = 7;

const slides = [
  <TitleSlide
    meeting="Reunião de Conselho"
    title={<>Resultado da Safra <br/>2024/5 e próximos passos</>}
    subtitle="Análise financeira e estratégias para 2025/6"
    date="18 de abril de 2026"
    slideNum={1} total={TOTAL}
  />,

  <SectionSlide
    number={1}
    title={<>Resultado <br/>financeiro</>}
    blurb="Fechamento do período 2024/5, fluxo de caixa e indicadores por atividade."
    slideNum={2} total={TOTAL}
  />,

  <KPISlide
    eyebrow="Resumo financeiro · Safra 2024/5"
    title="Caixa gerado e estoque de dívida"
    hero={{
      label: 'Caixa final do período',
      value: 'R$ 12,23',
      unit: 'M',
      delta: '+ R$ 8,15 M vs início',
      deltaDir: 'up',
      note: 'Antes das vendas de capim e gado',
    }}
    stats={[
      { label:'Entradas líquidas', value:'R$ 20,96', unit:'M', note:'Lucros + endividamentos' },
      { label:'Abatimento de dívida', value:'R$ 10,99', unit:'M', delta:'−29%', deltaDir:'down', note:'Estoque reduzido' },
      { label:'Distribuição aos sócios', value:'R$ 788', unit:'k' },
      { label:'Investimentos', value:'R$ 1,03', unit:'M' },
    ]}
    slideNum={3} total={TOTAL}
  />,

  <TableSlide
    eyebrow="Agricultura · Safra 2024/25"
    title="Resultado operacional — agricultura"
    subtitle="Valores em R$, por hectare e por saco de soja. Inclui depreciação e juros."
    columns={[
      { key:'label', label:'Indicador' },
      { key:'total', label:'Total (R$)', align:'right' },
      { key:'ha',    label:'Por ha',      align:'right' },
      { key:'sc',    label:'Por sc soja', align:'right' },
    ]}
    rows={[
      { label:'Receita total',       total:'22.709.656', ha:'7.570', sc:'65,8' },
      { label:'Custos totais',       total:'9.502.324',  ha:'3.649', sc:'31,7' },
      { label:'Despesas totais',     total:'4.755.834',  ha:'1.104', sc:'9,6' },
      { label:'EBITDA',              total:'8.451.497',  ha:'2.817', sc:'24,5', highlight:true },
      { label:'Depreciação + juros', total:'3.300.000',  ha:'1.100', sc:'9,6' },
      { label:'Resultado líquido',   total:'5.151.497',  ha:'1.717', sc:'14,9', highlight:true },
    ]}
    footnote="Soja 65 sc/ha · Capim braquiária 44M pts (46k/ha) · Mavuno 5M pts (25k/ha). Resultado 3 sc acima do arrendamento após depreciação e juros."
    slideNum={4} total={TOTAL}
  />,

  <StrategySlide
    eyebrow="Estratégia 2025/6"
    title="Prioridades por atividade"
    left={{
      title:'Agricultura', icon:'sprout',
      items:[
        { title:'Plantio 100% na palha', desc:'Aproveitar a janela de plantio para melhorar qualidade do solo.' },
        { title:'Compra assertiva de insumos', desc:'Adiantar compras, preferencialmente à vista, para melhores preços.' },
        { title:'Gestão de manutenção', desc:'Checklists e contratação de um gestor dedicado.' },
        { title:'Redução de custos', desc:'Cortar horas extras e otimizar equipe.' },
      ],
    }}
    right={{
      title:'Pecuária', icon:'beef',
      items:[
        { title:'Sistema ILP', desc:'Executar plano de integração lavoura-pecuária (mínimo 2 UAs/ha).' },
        { title:'Processos operacionais', desc:'Garantir água limpa e sal em abundância para o rebanho.' },
        { title:'Compras estratégicas', desc:'Comprar gado na região para evitar comissão e fretes altos.' },
        { title:'Manejo em seca', desc:'Sequestro com silagem para aumentar ganho de peso.' },
      ],
    }}
    slideNum={5} total={TOTAL}
  />,

  <PhotoSlide
    image="../../assets/photo-cornfield.jpg"
    eyebrow="Safra 2025/6"
    quote="Plantar 100% na palha e aproveitar ao máximo a janela de plantio."
    attribution="Prioridade de agricultura"
    slideNum={6} total={TOTAL}
  />,

  <TableSlide
    eyebrow="Caixa projetado"
    title="Situação de caixa atual e projetado"
    subtitle="Premissas para dez/2026: soja 50 sc/ha, capim 35 kg/ha, venda de 1.700 cabeças."
    columns={[
      { key:'label', label:'Indicador (R$)' },
      { key:'a', label:'Out/24 real.', align:'right' },
      { key:'b', label:'Set/25 real.', align:'right' },
      { key:'c', label:'Jan/26 prev.', align:'right' },
      { key:'d', label:'Dez/26 prev.', align:'right' },
    ]}
    rows={[
      { label:'Estoque de dívida',     a:'24.666.522', b:'25.670.493', c:'19.948.661', d:'12.756.946' },
      { label:'Caixa final',           a:'4.076.268',  b:'1.739.703',  c:'6.774.573',  d:'4.772.262' },
      { label:'Endividamento líquido', a:'20.590.254', b:'23.930.790', c:'13.174.089', d:'7.984.684', highlight:true },
    ]}
    footnote="Sem novos investimentos ou compras de gado contemplados nas projeções."
    slideNum={7} total={TOTAL}
  />,
];

ReactDOM.createRoot(document.getElementById('slides')).render(
  <React.Fragment>
    {slides.map((s, i) => <React.Fragment key={i}>{s}</React.Fragment>)}
  </React.Fragment>
);

// Lazy-load lucide for the StrategySlide
const lucideScript = document.createElement('script');
lucideScript.src = 'https://unpkg.com/lucide@latest';
lucideScript.onload = () => window.lucide && window.lucide.createIcons();
document.head.appendChild(lucideScript);
