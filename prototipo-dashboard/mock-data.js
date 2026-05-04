// Mock data para o dashboard de pecuária NSA.
// Espelha a forma das tabelas reais do app (paddocks, rondas, *_evals, herd, inventory, etc.)
// pra que o protótipo "pareça" produção. Quando codarmos, troca-se isso por queries Supabase.

(function () {
  const today = '2026-04-30';

  // ---------- USERS (peões + admin) ----------
  const USERS = [
    { id: 'u1', name: 'Lucas Menegueti', role: 'admin', initials: 'LM', color: '#172514' },
    { id: 'u2', name: 'João da Silva',   role: 'peao',  initials: 'JS', color: '#3f6340' },
    { id: 'u3', name: 'Maria Oliveira',  role: 'peao',  initials: 'MO', color: '#7a4d3b' },
    { id: 'u4', name: 'Pedro Santos',    role: 'peao',  initials: 'PS', color: '#264868' },
    { id: 'u5', name: 'Antônio Lima',    role: 'peao',  initials: 'AL', color: '#7a550f' },
    { id: 'u6', name: 'Rafael Costa',    role: 'peao',  initials: 'RC', color: '#6e3b8a' },
  ];

  // ---------- FORMULAS ----------
  const FORMULAS = [
    { id: 1, name: 'Probeef Reprodução',     kg_per_sack: 30, target_g_per_kg_body_day: 0.25 },
    { id: 2, name: 'Probeef Topmost Golden', kg_per_sack: 30, target_g_per_kg_body_day: 0.5 },
    { id: 3, name: 'Engorda 3 KG',           kg_per_sack: 25, target_g_per_kg_body_day: 7.5 },
    { id: 4, name: 'Sal Mineral',            kg_per_sack: 30, target_g_per_kg_body_day: 0.2 },
    { id: 5, name: 'Proteinado Seco',        kg_per_sack: 25, target_g_per_kg_body_day: 0.375 },
  ];

  // ---------- GRASS TYPES ----------
  const GRASS = [
    { id: 1, name: 'Braquiarão', entry_cm: 40, exit_cm: 20 },
    { id: 2, name: 'Mombaça',    entry_cm: 80, exit_cm: 40 },
    { id: 3, name: 'Tifton',     entry_cm: 25, exit_cm: 10 },
  ];

  // ---------- PADDOCKS (subset realista, geometria simplificada via center+radius) ----------
  // Dados extraídos do KML real do app. Centro lat/lng + raio em km pra renderizar polígono fake no mapa.
  const PADDOCKS = [
    { id:  5, name: 'T12 - P05', area: 10.01, grass: 1, center: [-15.2484, -45.3553], heads: 61,  cat: 'NOVILHA',     bodyKg: 12078, formula: 1 },
    { id: 11, name: 'T12 - P11', area:  8.55, grass: 1, center: [-15.2456, -45.3607], heads: 110, cat: 'GARROTE',     bodyKg: 41250, formula: 2 },
    { id: 15, name: 'T12 - P15', area:  8.31, grass: 1, center: [-15.2444, -45.3521], heads: 61,  cat: 'GARROTE',     bodyKg: 20130, formula: 2 },
    { id: 19, name: 'T12 - P19', area:  9.77, grass: 1, center: [-15.2429, -45.3430], heads: 77,  cat: 'GARROTE',     bodyKg: 15862, formula: 2 },
    { id: 21, name: 'P08',       area: 13.81, grass: 1, center: [-15.2341, -45.4262], heads: 137, cat: 'PARES',       bodyKg: 38895, formula: 1 },
    { id: 24, name: 'P12',       area: 40.00, grass: 1, center: [-15.2204, -45.4481], heads: 10,  cat: 'PARES',       bodyKg:  2700, formula: 1 },
    { id: 25, name: 'P12A',      area: 27.50, grass: 1, center: [-15.2223, -45.4434], heads: 28,  cat: 'PARES',       bodyKg:  6520, formula: 1 },
    { id: 29, name: 'P15',       area: 29.30, grass: 1, center: [-15.2244, -45.4412], heads: 90,  cat: 'GARROTE',     bodyKg: 25920, formula: 2 },
    { id: 32, name: 'P17',       area: 45.00, grass: 1, center: [-15.2399, -45.4383], heads: 71,  cat: 'GARROTE',     bodyKg: 21300, formula: 2 },
    { id: 33, name: 'P18',       area: 23.50, grass: 1, center: [-15.2353, -45.4353], heads: 74,  cat: 'GARROTE',     bodyKg: 13320, formula: 2 },
    { id: 35, name: 'P19',       area: 25.00, grass: 1, center: [-15.2277, -45.4358], heads: 102, cat: 'GARROTE',     bodyKg: 25908, formula: 2 },
    { id: 37, name: 'P20',       area: 25.00, grass: 1, center: [-15.2310, -45.4286], heads: 107, cat: 'GARROTE',     bodyKg: 36166, formula: 3 },
    { id: 40, name: 'P22',       area: 48.50, grass: 1, center: [-15.2432, -45.4350], heads: 89,  cat: 'NOVILHA',     bodyKg: 28391, formula: 1 },
    { id: 43, name: 'P46',       area: 50.00, grass: 1, center: [-15.2481, -45.3960], heads: 84,  cat: 'NOVILHA',     bodyKg: 21336, formula: 1 },
    { id: 45, name: 'P50',       area: 98.70, grass: 1, center: [-15.2757, -45.4061], heads: 23,  cat: 'VACA SOLTEIRA',bodyKg: 10350, formula: 1 },
    { id: 65, name: 'P51',       area: 144.10,grass: 2, center: [-15.2797, -45.4151], heads: 103, cat: 'GARROTE',     bodyKg: 36050, formula: 3 },
    { id: 70, name: 'P55',       area: 55.10, grass: 2, center: [-15.2732, -45.3876], heads: 108, cat: 'GARROTE',     bodyKg: 40500, formula: 3 },
    { id: 75, name: 'P58',       area: 36.10, grass: 1, center: [-15.2592, -45.3823], heads: 87,  cat: 'GARROTE',     bodyKg: 29319, formula: 2 },
    { id: 78, name: 'P63',       area: 28.50, grass: 1, center: [-15.2508, -45.3712], heads: 14,  cat: 'PARES',       bodyKg:  3275, formula: 1 },
    { id: 82, name: 'P67',       area: 64.20, grass: 2, center: [-15.2661, -45.3824], heads: 161, cat: 'PARES',       bodyKg: 47800, formula: 1 },
    { id: 87, name: 'P72',       area: 72.40, grass: 2, center: [-15.2718, -45.3650], heads: 185, cat: 'PARES',       bodyKg: 55800, formula: 1 },
    { id: 90, name: 'P75',       area: 88.30, grass: 2, center: [-15.2553, -45.3725], heads: 160, cat: 'PARES',       bodyKg: 49100, formula: 1 },
    { id: 93, name: 'P78',       area: 95.10, grass: 2, center: [-15.2480, -45.3611], heads: 256, cat: 'PARES',       bodyKg: 71880, formula: 1 },
    { id: 98, name: 'P83',       area: 110.20,grass: 1, center: [-15.2628, -45.3567], heads: 300, cat: 'PARES',       bodyKg: 88200, formula: 1 },
    { id: 103,name: 'P88',       area: 65.40, grass: 1, center: [-15.2380, -45.3792], heads: 136, cat: 'NOVILHA',     bodyKg: 37944, formula: 1 },
    { id: 108,name: 'P93',       area: 80.50, grass: 1, center: [-15.2430, -45.3938], heads: 303, cat: 'PARES',       bodyKg: 88800, formula: 1 },
    { id: 115,name: 'P100',      area: 42.10, grass: 1, center: [-15.2520, -45.4120], heads: 110, cat: 'GARROTE',     bodyKg: 38390, formula: 2 },
    { id: 125,name: 'P110',      area: 38.70, grass: 1, center: [-15.2310, -45.3650], heads: 71,  cat: 'GARROTE',     bodyKg: 26625, formula: 2 },
  ];

  // ---------- HOJE: rondas + evals (derivados) ----------
  // Status do dia por piquete:
  //  green   = cobriu Suplementação + Aguada + Cerca (3 obrigatórias)
  //  yellow  = começou ronda (≥1 eval) mas faltou alguma obrigatória
  //  red     = nenhuma interação no período
  //
  // Sections feitas hoje (subset das 9: supplement, bombona, forage, water, biological, health, fence, weight, washing).
  const RONDAS_TODAY = [
    { paddockId: 11, userId: 'u2', startTime: '06:42', endTime: '07:18', sections: ['supplement','water','fence','forage'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 8.5, formula: 'Probeef Topmost Golden' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4200, classification: 'FORTE', prevents_mixing: 1 },
      forage:     { avg_cm: 28, quality: 'IDEAL' },
    }},
    { paddockId: 15, userId: 'u2', startTime: '07:32', endTime: '08:01', sections: ['supplement','water','fence'], details: {
      supplement: { trough: 'CHEIO', sacks: 11, formula: 'Probeef Topmost Golden' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 5100, classification: 'FORTE', prevents_mixing: 1 },
    }},
    { paddockId: 19, userId: 'u2', startTime: '08:18', endTime: '08:42', sections: ['supplement','water','fence','health'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 6, formula: 'Probeef Topmost Golden' },
      water:      { available: true, quality: 'EXCELENTE' },
      fence:      { voltage: 4800, classification: 'FORTE', prevents_mixing: 1 },
      health:     { parasite_free: 0, affected_pct: 8, observations: 'Mosca-do-chifre nos garrotes' },
    }},
    { paddockId: 21, userId: 'u3', startTime: '06:50', endTime: '07:35', sections: ['supplement','water','fence','health','biological'], details: {
      supplement: { trough: 'CHEIO', sacks: 14, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 3800, classification: 'ADEQUADO', prevents_mixing: 1 },
      health:     { parasite_free: 1, affected_pct: 0 },
      biological: { applied: 1, quantity_g: 350 },
    }},
    { paddockId: 24, userId: 'u3', startTime: '07:48', endTime: '08:10', sections: ['water','fence'], details: {
      water:      { available: true, quality: 'MEDIANA' },
      fence:      { voltage: 1800, classification: 'FRACO', prevents_mixing: 1 },
    }},
    { paddockId: 25, userId: 'u3', startTime: '08:25', endTime: '08:52', sections: ['supplement','water','fence'], details: {
      supplement: { trough: 'VAZIO', sacks: 0, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 0, classification: 'SEM CHOQUE', prevents_mixing: 0 },
    }},
    { paddockId: 32, userId: 'u4', startTime: '06:40', endTime: '07:22', sections: ['supplement','water','fence','forage'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 9, formula: 'Probeef Topmost Golden' },
      water:      { available: true, quality: 'EXCELENTE' },
      fence:      { voltage: 4500, classification: 'FORTE', prevents_mixing: 1 },
      forage:     { avg_cm: 35, quality: 'IDEAL' },
    }},
    { paddockId: 33, userId: 'u4', startTime: '07:38', endTime: '08:05', sections: ['supplement','water','fence'], details: {
      supplement: { trough: 'CHEIO', sacks: 12, formula: 'Probeef Topmost Golden' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4100, classification: 'FORTE', prevents_mixing: 1 },
    }},
    { paddockId: 35, userId: 'u4', startTime: '08:20', endTime: '08:48', sections: ['supplement','water','fence','weight'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 7.5, formula: 'Probeef Topmost Golden' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4300, classification: 'FORTE', prevents_mixing: 1 },
      weight:     { category: 'GARROTE', estimated_kg: 285, prev_kg: 254, prev_date: '2026-04-15' },
    }},
    { paddockId: 37, userId: 'u4', startTime: '09:10', endTime: '09:42', sections: ['supplement','water','fence'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 6, formula: 'Engorda 3 KG' },
      water:      { available: false, quality: null },
      fence:      { voltage: 4400, classification: 'FORTE', prevents_mixing: 1 },
    }},
    { paddockId: 40, userId: 'u5', startTime: '06:55', endTime: '07:28', sections: ['supplement','water','fence'], details: {
      supplement: { trough: 'CHEIO', sacks: 10, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 3500, classification: 'ADEQUADO', prevents_mixing: 1 },
    }},
    { paddockId: 43, userId: 'u5', startTime: '07:45', endTime: '08:12', sections: ['supplement','water','fence','forage'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 8, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4200, classification: 'FORTE', prevents_mixing: 1 },
      forage:     { avg_cm: 22, quality: 'BAIXO' },
    }},
    { paddockId: 65, userId: 'u5', startTime: '08:35', endTime: '09:18', sections: ['supplement'], details: {
      supplement: { trough: 'VAZIO', sacks: 0, formula: 'Engorda 3 KG' },
    }},
    { paddockId: 78, userId: 'u3', startTime: '09:15', endTime: '09:38', sections: ['supplement','water','fence','biological'], details: {
      supplement: { trough: 'CHEIO', sacks: 5, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4600, classification: 'FORTE', prevents_mixing: 1 },
      biological: { applied: 1, quantity_g: 200 },
    }},
    { paddockId: 82, userId: 'u6', startTime: '06:48', endTime: '07:42', sections: ['supplement','water','fence','health','forage'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 13, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4100, classification: 'FORTE', prevents_mixing: 1 },
      health:     { parasite_free: 1, affected_pct: 0 },
      forage:     { avg_cm: 45, quality: 'IDEAL' },
    }},
    { paddockId: 87, userId: 'u6', startTime: '07:58', endTime: '08:35', sections: ['supplement','water','fence'], details: {
      supplement: { trough: 'CHEIO', sacks: 16, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'EXCELENTE' },
      fence:      { voltage: 4700, classification: 'FORTE', prevents_mixing: 1 },
    }},
    { paddockId: 90, userId: 'u6', startTime: '08:48', endTime: '09:18', sections: ['supplement','water','fence','health'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 11, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4400, classification: 'FORTE', prevents_mixing: 1 },
      health:     { parasite_free: 0, affected_pct: 22, observations: 'Bicheira em 3 vacas' },
    }},
    { paddockId: 93, userId: 'u6', startTime: '09:32', endTime: '10:18', sections: ['supplement','water','fence','forage','weight'], details: {
      supplement: { trough: 'CHEIO', sacks: 18, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4500, classification: 'FORTE', prevents_mixing: 1 },
      forage:     { avg_cm: 38, quality: 'IDEAL' },
      weight:     { category: 'VACA PRENHA', estimated_kg: 470, prev_kg: 450, prev_date: '2026-04-10' },
    }},
    { paddockId: 98, userId: 'u2', startTime: '09:55', endTime: '10:48', sections: ['supplement','water','fence','biological','washing'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 22, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'EXCELENTE' },
      fence:      { voltage: 4200, classification: 'FORTE', prevents_mixing: 1 },
      biological: { applied: 1, quantity_g: 800 },
      washing:    { was_washed: 1 },
    }},
    { paddockId: 103, userId: 'u5', startTime: '10:05', endTime: '10:38', sections: ['supplement','water','fence'], details: {
      supplement: { trough: 'CHEIO', sacks: 14, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4000, classification: 'FORTE', prevents_mixing: 1 },
    }},
    { paddockId: 108, userId: 'u6', startTime: '11:05', endTime: '11:52', sections: ['supplement','water','fence','health'], details: {
      supplement: { trough: 'ADEQUADA', sacks: 24, formula: 'Probeef Reprodução' },
      water:      { available: true, quality: 'BOA' },
      fence:      { voltage: 4350, classification: 'FORTE', prevents_mixing: 1 },
      health:     { parasite_free: 1, affected_pct: 0 },
    }},
  ];

  // Piquetes que aparecem em RONDAS_TODAY são green/yellow.
  // Piquetes ausentes são red (sem ronda hoje).
  const REQUIRED = ['supplement', 'water', 'fence'];
  function statusOf(rondaSections) {
    if (!rondaSections) return 'red';
    const hasAll = REQUIRED.every(s => rondaSections.includes(s));
    return hasAll ? 'green' : 'yellow';
  }

  // ---------- ALERTS (derivados, simulando alerts.ts) ----------
  const ALERTS = [
    { id: 'a1', severity: 'danger',  kind: 'cerca',     paddockId: 25, paddock: 'P12A',      detail: 'Cerca sem choque · não evita mistura', time: 'há 4h' },
    { id: 'a2', severity: 'danger',  kind: 'agua',      paddockId: 37, paddock: 'P20',       detail: 'Sem água no bebedouro',                  time: 'há 3h' },
    { id: 'a3', severity: 'danger',  kind: 'sanidade',  paddockId: 90, paddock: 'P75',       detail: '22% do gado afetado · bicheira',         time: 'há 1h' },
    { id: 'a4', severity: 'danger',  kind: 'bombona',   paddockId: 25, paddock: 'P12A',      detail: 'Bombona vazia · Probeef Reprodução',     time: 'agora' },
    { id: 'a5', severity: 'warning', kind: 'cerca',     paddockId: 24, paddock: 'P12',       detail: 'Cerca fraca (1.800V)',                   time: 'há 4h' },
    { id: 'a6', severity: 'warning', kind: 'sanidade',  paddockId: 19, paddock: 'T12 - P19', detail: '8% do gado afetado · mosca-do-chifre',   time: 'há 2h' },
    { id: 'a7', severity: 'warning', kind: 'bombona',   paddockId: 65, paddock: 'P51',       detail: 'Bombona zera em 2 dias · Engorda 3 KG',  time: 'agora' },
    { id: 'a8', severity: 'warning', kind: 'agua',      paddockId: 24, paddock: 'P12',       detail: 'Água mediana',                           time: 'há 4h' },
    { id: 'a9', severity: 'warning', kind: 'biologico', paddockId: 45, paddock: 'P50',       detail: 'Biológico pendente desde quinta',        time: '—' },
    { id: 'a10',severity: 'warning', kind: 'biologico', paddockId: 75, paddock: 'P58',       detail: 'Biológico pendente desde quinta',        time: '—' },
    { id: 'a11',severity: 'warning', kind: 'central',   paddockId: null, paddock: 'Central', detail: 'Sal Mineral · 0 sacos no estoque',       time: '—' },
    { id: 'a12',severity: 'warning', kind: 'desalocados', paddockId: null, paddock: '—',     detail: '12 cabeças desalocadas · GARROTE',       time: '—' },
  ];

  // ---------- INSPECTIONS ----------
  const INSPECTIONS = [
    { id: 'i1', paddockId: 21,  paddock: 'P08',  kind: 'sanidade',  requestedBy: 'Lucas Menegueti', notes: 'Vi mosca da família ontem na vigília', status: 'pending',   created: 'ontem 17:30' },
    { id: 'i2', paddockId: 65,  paddock: 'P51',  kind: 'forragem',  requestedBy: 'Lucas Menegueti', notes: 'Quero saber se já dá pra rodar',       status: 'pending',   created: 'hoje 06:15' },
    { id: 'i3', paddockId: 93,  paddock: 'P78',  kind: 'peso',      requestedBy: 'Lucas Menegueti', notes: 'Confirmar peso médio antes da venda',  status: 'pending',   created: 'há 2 dias' },
    { id: 'i4', paddockId: 25,  paddock: 'P12A', kind: 'bombona',   requestedBy: 'Lucas Menegueti', notes: '',                                     status: 'pending',   created: 'hoje 09:00' },
    { id: 'i5', paddockId: 11,  paddock: 'T12 - P11', kind: 'lavagem', requestedBy: 'Lucas Menegueti', notes: 'Cocho cheio de barro',           status: 'completed', created: 'ontem 14:00', completedBy: 'João da Silva', completedAt: 'hoje 06:48' },
    { id: 'i6', paddockId: 82,  paddock: 'P67',  kind: 'forragem',  requestedBy: 'Lucas Menegueti', notes: 'Queria saber altura média',            status: 'completed', created: 'há 3 dias', completedBy: 'Rafael Costa', completedAt: 'hoje 06:48' },
  ];

  // ---------- INVENTORY ----------
  const INV_CENTRAL = [
    { formulaId: 1, formula: 'Probeef Reprodução',     sacks: 384,  min: 50, daysLeft: 18, severity: 'warning' },
    { formulaId: 2, formula: 'Probeef Topmost Golden', sacks: 612,  min: 50, daysLeft: 32, severity: null },
    { formulaId: 3, formula: 'Engorda 3 KG',           sacks: 38,   min: 30, daysLeft: 6,  severity: 'danger' },
    { formulaId: 4, formula: 'Sal Mineral',            sacks: 0,    min: 20, daysLeft: 0,  severity: 'danger' },
    { formulaId: 5, formula: 'Proteinado Seco',        sacks: 142,  min: 30, daysLeft: 24, severity: null },
  ];

  // Bombonas por talhão (fallback usa formula default do paddock).
  const INV_BOMBONA = [
    { paddockId: 11, paddock: 'T12 - P11', formula: 'Probeef Topmost Golden', sacks: 8.5, daysLeft: 22, severity: null },
    { paddockId: 15, paddock: 'T12 - P15', formula: 'Probeef Topmost Golden', sacks: 11,  daysLeft: 28, severity: null },
    { paddockId: 19, paddock: 'T12 - P19', formula: 'Probeef Topmost Golden', sacks: 6,   daysLeft: 12, severity: null },
    { paddockId: 21, paddock: 'P08',       formula: 'Probeef Reprodução',     sacks: 14,  daysLeft: 35, severity: null },
    { paddockId: 24, paddock: 'P12',       formula: 'Probeef Reprodução',     sacks: 3,   daysLeft: 8,  severity: 'warning' },
    { paddockId: 25, paddock: 'P12A',      formula: 'Probeef Reprodução',     sacks: 0,   daysLeft: 0,  severity: 'danger' },
    { paddockId: 32, paddock: 'P17',       formula: 'Probeef Topmost Golden', sacks: 9,   daysLeft: 18, severity: null },
    { paddockId: 33, paddock: 'P18',       formula: 'Probeef Topmost Golden', sacks: 12,  daysLeft: 24, severity: null },
    { paddockId: 35, paddock: 'P19',       formula: 'Probeef Topmost Golden', sacks: 7.5, daysLeft: 14, severity: null },
    { paddockId: 37, paddock: 'P20',       formula: 'Engorda 3 KG',           sacks: 6,   daysLeft: 4,  severity: 'warning' },
    { paddockId: 40, paddock: 'P22',       formula: 'Probeef Reprodução',     sacks: 10,  daysLeft: 26, severity: null },
    { paddockId: 43, paddock: 'P46',       formula: 'Probeef Reprodução',     sacks: 8,   daysLeft: 19, severity: null },
    { paddockId: 65, paddock: 'P51',       formula: 'Engorda 3 KG',           sacks: 1.5, daysLeft: 2,  severity: 'danger' },
    { paddockId: 82, paddock: 'P67',       formula: 'Probeef Reprodução',     sacks: 13,  daysLeft: 31, severity: null },
    { paddockId: 87, paddock: 'P72',       formula: 'Probeef Reprodução',     sacks: 16,  daysLeft: 38, severity: null },
    { paddockId: 90, paddock: 'P75',       formula: 'Probeef Reprodução',     sacks: 11,  daysLeft: 25, severity: null },
    { paddockId: 93, paddock: 'P78',       formula: 'Probeef Reprodução',     sacks: 18,  daysLeft: 36, severity: null },
    { paddockId: 98, paddock: 'P83',       formula: 'Probeef Reprodução',     sacks: 22,  daysLeft: 38, severity: null },
    { paddockId: 108,paddock: 'P93',       formula: 'Probeef Reprodução',     sacks: 24,  daysLeft: 42, severity: null },
  ];

  // ---------- RESUPPLY ROUTES ----------
  const RESUPPLY = [
    { id: 'rt1', userId: 'u4', user: 'Pedro Santos', start: 'hoje 14:20', end: null, status: 'distributing',
      loaded: [{ formula: 'Probeef Reprodução', sacks: 25 }, { formula: 'Probeef Topmost Golden', sacks: 18 }],
      deliveries: [{ paddock: 'P12A', formula: 'Probeef Reprodução', sacks: 12 }] },
    { id: 'rt2', userId: 'u5', user: 'Antônio Lima', start: 'ontem 13:00', end: 'ontem 16:42', status: 'completed',
      loaded: [{ formula: 'Probeef Topmost Golden', sacks: 30 }],
      deliveries: [
        { paddock: 'T12 - P11', formula: 'Probeef Topmost Golden', sacks: 8 },
        { paddock: 'T12 - P15', formula: 'Probeef Topmost Golden', sacks: 12 },
        { paddock: 'T12 - P19', formula: 'Probeef Topmost Golden', sacks: 10 },
      ] },
    { id: 'rt3', userId: 'u2', user: 'João da Silva', start: '24/abr 14:30', end: '24/abr 17:18', status: 'completed',
      loaded: [{ formula: 'Probeef Reprodução', sacks: 40 }],
      deliveries: [
        { paddock: 'P75', formula: 'Probeef Reprodução', sacks: 15 },
        { paddock: 'P78', formula: 'Probeef Reprodução', sacks: 25 },
      ] },
  ];

  // ---------- HERD EVENTS (últimos 30 dias) ----------
  const HERD_EVENTS = [
    { id: 'h1', date: 'hoje 09:15',     userId: 'u4', user: 'Pedro Santos',  type: 'TRANSFERENCIA', from: 'P12',  to: 'P12A', heads: 12, category: 'GARROTE', notes: '' },
    { id: 'h2', date: 'hoje 07:32',     userId: 'u3', user: 'Maria Oliveira',type: 'EVOLUCAO',      from: '—',    to: '—',    heads: 4,  category: 'BEZERRO MAMANDO → BEZERRO', notes: '' },
    { id: 'h3', date: 'ontem 16:48',    userId: 'u1', user: 'Lucas Menegueti',type:'MORTE',         from: 'P75',  to: '—',    heads: 1,  category: 'BEZERRO MAMANDO', notes: 'Bicheira não tratada a tempo', weight_kg: 95 },
    { id: 'h4', date: 'ontem 14:20',    userId: 'u4', user: 'Pedro Santos',  type: 'VENDA',         from: 'P51',  to: '—',    heads: 28, category: 'GARROTE', notes: 'Frigorífico Marfrig', weight_kg: 380 },
    { id: 'h5', date: '28/abr 11:30',   userId: 'u1', user: 'Lucas Menegueti',type:'ENTRADA',        from: '—',    to: 'P88',  heads: 80, category: 'NOVILHA', notes: 'Compra Fazenda Veneza' },
    { id: 'h6', date: '27/abr 09:15',   userId: 'u3', user: 'Maria Oliveira',type: 'TRANSFERENCIA', from: 'P83',  to: 'P78',  heads: 35, category: 'PARES', notes: 'Liberar P83 pra rotação' },
    { id: 'h7', date: '25/abr 16:20',   userId: 'u1', user: 'Lucas Menegueti',type:'MORTE',         from: 'P22',  to: '—',    heads: 1,  category: 'NOVILHA', notes: 'Cobra', weight_kg: 290 },
  ];

  // ---------- HEATMAP DE COBERTURA (últimos 14 dias) ----------
  // Matriz [paddockId][dayIdx] → 0 (sem ronda) | 1 (parcial) | 2 (completa)
  // Geramos pseudo-aleatório determinístico baseado no id pra parecer realista.
  function genHeatmap() {
    const days = 14;
    const result = {};
    PADDOCKS.forEach(p => {
      result[p.id] = [];
      let prev = 2;
      for (let d = 0; d < days; d++) {
        const seed = (p.id * 31 + d * 17) % 100;
        const decay = (d === days - 1) ? 0 : Math.floor(seed / 30);
        // Bias: mais novos talhões com mais cobertura
        let v;
        if (seed < 60) v = 2;
        else if (seed < 85) v = 1;
        else v = 0;
        // Dia atual reflete RONDAS_TODAY
        if (d === days - 1) {
          const today = RONDAS_TODAY.find(r => r.paddockId === p.id);
          v = today ? statusOfHeatmap(today.sections) : 0;
        }
        result[p.id].push(v);
        prev = v;
      }
    });
    return result;
  }
  function statusOfHeatmap(sections) {
    if (!sections) return 0;
    const hasAll = REQUIRED.every(s => sections.includes(s));
    return hasAll ? 2 : 1;
  }

  // ---------- KPIS (Visão Geral) ----------
  const totalHeads = PADDOCKS.reduce((s, p) => s + p.heads, 0);
  const totalArea  = PADDOCKS.reduce((s, p) => s + p.area, 0);
  const totalPaddocks = PADDOCKS.length;
  const paddocksWithRonda = RONDAS_TODAY.length;
  const paddocksGreen = RONDAS_TODAY.filter(r => statusOf(r.sections) === 'green').length;
  const paddocksYellow = paddocksWithRonda - paddocksGreen;
  const paddocksRed = totalPaddocks - paddocksWithRonda;
  const coveragePct = Math.round((paddocksWithRonda / totalPaddocks) * 100);

  const KPIS = {
    totalHeads,
    totalArea: totalArea.toFixed(0),
    totalPaddocks,
    paddocksGreen,
    paddocksYellow,
    paddocksRed,
    coveragePct,
    stockingRate: (totalHeads / totalArea).toFixed(2),
    activeAlerts: ALERTS.length,
    criticalAlerts: ALERTS.filter(a => a.severity === 'danger').length,
    pendingInspections: INSPECTIONS.filter(i => i.status === 'pending').length,
  };

  // ---------- FEED (cronológico do dia) ----------
  // Achata RONDAS_TODAY em eventos individuais por seção.
  const SECTION_LABELS = {
    supplement: 'Suplementação',
    bombona:    'Bombona',
    forage:     'Forragem',
    water:      'Aguada',
    biological: 'Biológico',
    health:     'Sanidade',
    fence:      'Cerca',
    weight:     'Peso visual',
    washing:    'Lavagem',
  };
  const SECTION_COLORS = {
    supplement: '#8a7c2b', bombona: '#8a7c2b', forage: '#3b7a3b',
    water: '#2b6a93', biological: '#2f7a4d', health: '#6e3b8a',
    fence: '#b43a2c', weight: '#8a6515', washing: '#2b7a8c',
  };
  const SECTION_ICONS = {
    supplement: 'utensils', bombona: 'box', forage: 'sprout',
    water: 'droplets', biological: 'flask-conical', health: 'stethoscope',
    fence: 'zap', weight: 'scale', washing: 'shower-head',
  };

  const FEED = [];
  RONDAS_TODAY.forEach(r => {
    const user = USERS.find(u => u.id === r.userId);
    const paddock = PADDOCKS.find(p => p.id === r.paddockId);
    r.sections.forEach((sec, i) => {
      // Distribui timestamps entre start e end pra parecer real
      const [sh, sm] = r.startTime.split(':').map(Number);
      const [eh, em] = r.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const t = startMin + Math.round(((endMin - startMin) * (i + 1)) / r.sections.length);
      const time = `${String(Math.floor(t / 60)).padStart(2,'0')}:${String(t % 60).padStart(2,'0')}`;
      const det = r.details[sec] || {};
      let summary = '';
      if (sec === 'supplement') summary = `Cocho ${(det.trough || '').toLowerCase()} · ${det.sacks ?? '—'} sacos`;
      else if (sec === 'water') summary = det.available ? `Água ${(det.quality || '').toLowerCase()}` : 'Sem água';
      else if (sec === 'fence') summary = `${det.classification} · ${det.voltage}V`;
      else if (sec === 'health') summary = det.parasite_free ? 'Sem parasitas' : `${det.affected_pct}% afetado`;
      else if (sec === 'forage') summary = `${det.avg_cm} cm · ${(det.quality || '').toLowerCase()}`;
      else if (sec === 'biological') summary = det.applied ? `${det.quantity_g}g aplicados` : 'Não aplicou';
      else if (sec === 'weight') summary = `${det.estimated_kg} kg · ${det.category}`;
      else if (sec === 'washing') summary = det.was_washed ? 'Cocho lavado' : '';
      FEED.push({
        id: `${r.paddockId}-${sec}`,
        time, timeMin: t,
        userId: r.userId, user: user?.name || '—', initials: user?.initials || '—', userColor: user?.color,
        paddockId: r.paddockId, paddock: paddock?.name || '—',
        section: sec, sectionLabel: SECTION_LABELS[sec], sectionColor: SECTION_COLORS[sec], sectionIcon: SECTION_ICONS[sec],
        summary,
      });
    });
  });
  FEED.sort((a, b) => b.timeMin - a.timeMin);

  // ---------- EXPORT ----------
  window.MOCK = {
    today,
    USERS, FORMULAS, GRASS, PADDOCKS,
    RONDAS_TODAY, ALERTS, INSPECTIONS,
    INV_CENTRAL, INV_BOMBONA, RESUPPLY, HERD_EVENTS,
    KPIS, FEED,
    SECTION_LABELS, SECTION_COLORS, SECTION_ICONS, REQUIRED,
    statusOf,
    HEATMAP: genHeatmap(),
  };
})();
