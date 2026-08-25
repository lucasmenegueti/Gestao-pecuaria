import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  PanResponder,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Check,
  X,
  Minus,
  Plus,
  Pencil,
  AlertTriangle,
} from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { useAuthStore } from '@/stores/authStore';
import { BrandHeader, Card, Button, Badge, KeyboardAvoider } from '@/components/ui';
import { NSA, Fonts, Radius, Spacing } from '@/theme/nsa';
import { confirm } from '@/lib/confirm';

// ---------------------------------------------------------------------
// Dimensões da grade
// ---------------------------------------------------------------------
const LEFT_W = 150;      // coluna fixa (nome do projeto / da tarefa)
const DAY_W = 26;        // largura de cada dia
const HEADER_H = 48;
const PROJ_H = 34;       // altura da linha de cabeçalho do projeto
const TASK_H = 30;       // altura da linha de uma tarefa
// Zona de redimensionamento nas bordas da barra. No dedo, 11px (o valor da
// agricultura, pensado pro mouse) é alvo pequeno demais — quem tenta esticar a
// tarefa acaba movendo ela inteira.
const HANDLE = Platform.OS === 'web' ? 11 : 18;
// Linha do tempo longa: ~6 meses atrás → ~2 anos pra frente.
const RANGE_DIAS = 7 * 130; // 910 dias
const GRID_W = RANGE_DIAS * DAY_W;
const LONG_PRESS_MS = 220; // segurar pra "pegar" (no touch: mover barra / criar tarefa)

const STATUS_OPACITY: Record<string, number> = {
  planejado: 0.55, em_andamento: 0.8, feito: 1, cancelado: 0.3,
};
const STATUS_LABEL: Record<string, string> = {
  planejado: 'Planejado', em_andamento: 'Em andamento', feito: 'Feito', cancelado: 'Cancelado',
};
const STATUS_OPCOES = ['planejado', 'em_andamento', 'feito', 'cancelado'] as const;
const PROJ_STATUS_OPCOES = ['ativo', 'concluido', 'cancelado'] as const;
const PROJ_STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo', concluido: 'Concluído', cancelado: 'Cancelado',
};
// Paleta de projeto: os "dots" de domínio do tema (nenhuma cor inventada).
const CORES = ['#3b7a3b', '#2b6a93', '#8a6515', '#b43a2c', '#6e3b8a', '#2b7a8c', '#8a7c2b', '#2f7a4d'];
const WD = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ---------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------
function isoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function parseISO(iso: string): Date { return new Date(iso + 'T00:00:00'); }
function dayNum(iso: string): number { return Math.floor(parseISO(iso).getTime() / 86400000); }
function addDays(iso: string, n: number): string {
  const d = parseISO(iso); d.setDate(d.getDate() + n); return isoDate(d);
}
function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}
function fmtDia(iso: string): string {
  return parseISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
// Um dia "conta" na duração se é dia útil (seg–sex), ou é fim de semana marcado
// como incluído. Sábado e domingo são controlados separadamente.
function isCountedDay(iso: string, incluiSab: boolean, incluiDom: boolean): boolean {
  const wd = (parseISO(iso).getDay() + 6) % 7; // 0=seg … 4=sex, 5=sáb, 6=dom
  if (wd === 5) return incluiSab;
  if (wd === 6) return incluiDom;
  return true;
}
function countedDaysInSpan(ini: string, fim: string, incluiSab: boolean, incluiDom: boolean): number {
  let c = 0, cur = ini, guard = 0;
  while (dayNum(cur) <= dayNum(fim) && guard < 4000) { if (isCountedDay(cur, incluiSab, incluiDom)) c++; cur = addDays(cur, 1); guard++; }
  return Math.max(1, c);
}
// Data final a partir do início + duração (em dias que contam). Com sábado E
// domingo incluídos, equivale a dias corridos.
function computeFim(ini: string, dur: number, incluiSab: boolean, incluiDom: boolean): string {
  const d = Math.max(1, dur);
  let count = 0, cur = ini, last = ini, guard = 0;
  while (count < d && guard < 4000) {
    if (isCountedDay(cur, incluiSab, incluiDom)) { count++; last = cur; }
    if (count < d) cur = addDays(cur, 1);
    guard++;
  }
  return last;
}
function clampIdx(i: number): number { return Math.max(0, Math.min(RANGE_DIAS - 1, i)); }

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------
interface Projeto {
  id: number; name: string; color: string | null; location: string | null;
  status: string; order_index: number; notes: string | null;
}
interface Tarefa {
  id: number; project_id: number; name: string;
  start_date: string; end_date: string; status: string;
  assignee: string | null; order_index: number;
  include_saturday: number; include_sunday: number; notes: string | null;
}
// Linha do board: cabeçalho de projeto ou uma tarefa.
type Row =
  | { kind: 'projeto'; key: string; top: number; height: number; projeto: Projeto; span: { ini: string; fim: string } | null; feitas: number; total: number }
  | { kind: 'tarefa'; key: string; top: number; height: number; projeto: Projeto; tarefa: Tarefa };

interface EditTarefa {
  id: number | null; project_id: number; name: string;
  start_date: string; duracao: number; inclui_sabado: boolean; inclui_domingo: boolean;
  status: string; assignee: string; notes: string;
}
interface Renaming { kind: 'projeto' | 'tarefa'; id: number; value: string; isNew?: boolean }
interface EditProjeto {
  id: number | null; name: string; color: string; location: string; status: string; notes: string;
}

export default function CronogramaScreen() {
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  // A aba está escondida pra não-admin (href:null), mas a rota continua alcançável
  // por URL/deep link. Sem guarda aqui, um INSERT de peão passa local e o RLS
  // (is_admin) rejeita no push — a row fica presa em pending_sync até o breaker.
  const isAdmin = user?.role === 'admin';

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [colapsados, setColapsados] = useState<Set<number>>(new Set());
  const [soAtivos, setSoAtivos] = useState(true);
  const [modo, setModo] = useState<'grade' | 'lista'>('grade');
  const [editT, setEditT] = useState<EditTarefa | null>(null);
  const [editP, setEditP] = useState<EditProjeto | null>(null);
  // Renomear direto na coluna esquerda (sem abrir tela). `isNew` marca a tarefa
  // que acabou de nascer do "+": se o nome sair vazio, ela é descartada em vez
  // de virar uma linha sem nome no board.
  const [renaming, setRenaming] = useState<Renaming | null>(null);

  // Início fixo da linha do tempo (segunda ~6 meses atrás), estável entre renders.
  const [rangeIni] = useState<string>(() => addDays(isoDate(mondayOf(new Date())), -182));

  const carregar = useCallback(async () => {
    setProjetos(await db.getAllAsync<Projeto>(
      `SELECT id, name, color, location, status, order_index, notes
         FROM schedule_projects WHERE deleted_at IS NULL
        ORDER BY order_index, id`,
    ));
    // Tarefas são os PASSOS do projeto: a ordem natural é cronológica.
    // order_index só desempata quando duas começam no mesmo dia.
    setTarefas(await db.getAllAsync<Tarefa>(
      `SELECT id, project_id, name, start_date, end_date, status, assignee,
              order_index, include_saturday, include_sunday, notes
         FROM schedule_tasks WHERE deleted_at IS NULL
        ORDER BY start_date, order_index, id`,
    ));
  }, [db]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const projetosVisiveis = useMemo(
    () => (soAtivos ? projetos.filter((p) => p.status === 'ativo') : projetos),
    [projetos, soAtivos],
  );
  const tarefasVisiveis = useMemo(() => {
    const ids = new Set(projetosVisiveis.map((p) => p.id));
    return tarefas.filter((t) => ids.has(t.project_id));
  }, [tarefas, projetosVisiveis]);

  // Linhas do board: cabeçalho de cada projeto + suas tarefas (se expandido).
  const { rows, totalH } = useMemo(() => {
    const rows: Row[] = [];
    let y = 0;
    for (const p of projetosVisiveis) {
      const suas = tarefasVisiveis.filter((t) => t.project_id === p.id);
      const span = suas.length
        ? {
            ini: suas.reduce((a, t) => (t.start_date < a ? t.start_date : a), suas[0].start_date),
            fim: suas.reduce((a, t) => (t.end_date > a ? t.end_date : a), suas[0].end_date),
          }
        : null;
      const feitas = suas.filter((t) => t.status === 'feito').length;
      rows.push({ kind: 'projeto', key: `p${p.id}`, top: y, height: PROJ_H, projeto: p, span, feitas, total: suas.length });
      y += PROJ_H;
      if (!colapsados.has(p.id)) {
        for (const t of suas) {
          rows.push({ kind: 'tarefa', key: `t${t.id}`, top: y, height: TASK_H, projeto: p, tarefa: t });
          y += TASK_H;
        }
      }
    }
    return { rows, totalH: y };
  }, [projetosVisiveis, tarefasVisiveis, colapsados]);

  const toggleColapso = useCallback((id: number) => {
    setColapsados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  // --- tarefas ---------------------------------------------------------
  const abrirNovaTarefa = useCallback((projeto: Projeto, ini: string, fim: string) => {
    if (!isAdmin) return;
    const dur = Math.max(1, dayNum(fim) - dayNum(ini) + 1);
    setEditT({
      id: null, project_id: projeto.id, name: '',
      start_date: ini, duracao: dur, inclui_sabado: true, inclui_domingo: true,
      status: 'planejado', assignee: '', notes: '',
    });
  }, [isAdmin]);

  const abrirEdicaoTarefa = useCallback((t: Tarefa) => {
    if (!isAdmin) return;
    const incluiSab = t.include_saturday === 1;
    const incluiDom = t.include_sunday === 1;
    setEditT({
      id: t.id, project_id: t.project_id, name: t.name,
      start_date: t.start_date,
      duracao: countedDaysInSpan(t.start_date, t.end_date, incluiSab, incluiDom),
      inclui_sabado: incluiSab, inclui_domingo: incluiDom,
      status: t.status, assignee: t.assignee ?? '', notes: t.notes ?? '',
    });
  }, [isAdmin]);

  // "+" no cabeçalho do projeto: cria a tarefa na hora (hoje, 1 dia) e já abre o
  // nome pra digitar. Sem passar por modal — o editor completo continua no toque
  // da barra.
  const adicionarTarefa = useCallback(async (p: Projeto) => {
    if (!isAdmin) return;
    const hoje = isoDate(new Date());
    const max = await db.getFirstAsync<{ n: number | null }>(
      `SELECT MAX(order_index) AS n FROM schedule_tasks WHERE project_id = ? AND deleted_at IS NULL`,
      [p.id],
    );
    const res = await db.runAsync(
      `INSERT INTO schedule_tasks
         (project_id, name, start_date, end_date, status, order_index,
          include_saturday, include_sunday, author_id)
       VALUES (?, '', ?, ?, 'planejado', ?, 1, 1, ?)`,
      [p.id, hoje, hoje, (max?.n ?? -1) + 1, user?.id ?? null],
    );
    setColapsados((prev) => { const n = new Set(prev); n.delete(p.id); return n; }); // tarefa nova precisa estar visível
    await carregar();
    setRenaming({ kind: 'tarefa', id: res.lastInsertRowId, value: '', isNew: true });
  }, [db, carregar, isAdmin, user?.id]);

  // Grava o nome editado inline. Nome vazio: descarta a tarefa recém-criada,
  // ou mantém o nome anterior quando era só uma renomeação.
  const confirmarRename = useCallback(async () => {
    if (!renaming) return;
    const { kind, id, value, isNew } = renaming;
    const nome = value.trim();
    setRenaming(null);
    if (!nome) {
      if (kind === 'tarefa' && isNew) {
        // Nunca sincronizou (nasceu há segundos): sai do banco de vez, sem deixar
        // soft-delete pra trás.
        await db.runAsync(`DELETE FROM schedule_tasks WHERE id = ? AND supabase_id IS NULL`, [id]);
        await db.runAsync(`UPDATE schedule_tasks SET deleted_at = datetime('now') WHERE id = ? AND supabase_id IS NOT NULL`, [id]);
        carregar();
      }
      return;
    }
    const tabela = kind === 'projeto' ? 'schedule_projects' : 'schedule_tasks';
    await db.runAsync(`UPDATE ${tabela} SET name = ? WHERE id = ?`, [nome, id]);
    carregar();
  }, [db, carregar, renaming]);

  const abrirRename = useCallback((kind: 'projeto' | 'tarefa', id: number, atual: string) => {
    if (!isAdmin) return;
    setRenaming({ kind, id, value: atual });
  }, [isAdmin]);

  // Drag da barra: persiste o novo período direto (sem abrir o editor).
  const onCommitDrag = useCallback(async (taskId: number, ini: string, fim: string) => {
    if (!isAdmin) return;
    await db.runAsync(`UPDATE schedule_tasks SET start_date = ?, end_date = ? WHERE id = ?`, [ini, fim, taskId]);
    carregar();
  }, [db, carregar, isAdmin]);

  const salvarTarefa = async () => {
    if (!editT || !editT.name.trim()) return;
    const fim = computeFim(editT.start_date, editT.duracao, editT.inclui_sabado, editT.inclui_domingo);
    const assignee = editT.assignee.trim() || null;
    const notes = editT.notes.trim() || null;
    if (editT.id == null) {
      const max = await db.getFirstAsync<{ n: number | null }>(
        `SELECT MAX(order_index) AS n FROM schedule_tasks WHERE project_id = ? AND deleted_at IS NULL`,
        [editT.project_id],
      );
      await db.runAsync(
        `INSERT INTO schedule_tasks
           (project_id, name, start_date, end_date, status, assignee, order_index,
            include_saturday, include_sunday, notes, author_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [editT.project_id, editT.name.trim(), editT.start_date, fim, editT.status, assignee,
         (max?.n ?? -1) + 1, editT.inclui_sabado ? 1 : 0, editT.inclui_domingo ? 1 : 0, notes, user?.id ?? null],
      );
    } else {
      await db.runAsync(
        `UPDATE schedule_tasks
            SET project_id = ?, name = ?, start_date = ?, end_date = ?, status = ?,
                assignee = ?, include_saturday = ?, include_sunday = ?, notes = ?
          WHERE id = ?`,
        [editT.project_id, editT.name.trim(), editT.start_date, fim, editT.status, assignee,
         editT.inclui_sabado ? 1 : 0, editT.inclui_domingo ? 1 : 0, notes, editT.id],
      );
    }
    setEditT(null);
    carregar();
  };

  const excluirTarefa = async () => {
    if (!editT?.id) return;
    const ok = await confirm({
      title: 'Excluir tarefa?', message: 'A tarefa some do cronograma.',
      confirmLabel: 'Excluir', destructive: true,
    });
    if (!ok) return;
    await db.runAsync(`UPDATE schedule_tasks SET deleted_at = datetime('now') WHERE id = ?`, [editT.id]);
    setEditT(null);
    carregar();
  };

  // --- projetos --------------------------------------------------------
  const abrirNovoProjeto = useCallback(() => {
    if (!isAdmin) return;
    setEditP({ id: null, name: '', color: CORES[projetos.length % CORES.length], location: '', status: 'ativo', notes: '' });
  }, [projetos.length, isAdmin]);

  const abrirEdicaoProjeto = useCallback((p: Projeto) => {
    if (!isAdmin) return;
    setEditP({
      id: p.id, name: p.name, color: p.color ?? CORES[0],
      location: p.location ?? '', status: p.status, notes: p.notes ?? '',
    });
  }, [isAdmin]);

  const salvarProjeto = async () => {
    if (!editP || !editP.name.trim()) return;
    const location = editP.location.trim() || null;
    const notes = editP.notes.trim() || null;
    if (editP.id == null) {
      const max = await db.getFirstAsync<{ n: number | null }>(
        `SELECT MAX(order_index) AS n FROM schedule_projects WHERE deleted_at IS NULL`,
      );
      await db.runAsync(
        `INSERT INTO schedule_projects (name, color, location, status, order_index, notes, author_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [editP.name.trim(), editP.color, location, editP.status, (max?.n ?? -1) + 1, notes, user?.id ?? null],
      );
    } else {
      await db.runAsync(
        `UPDATE schedule_projects SET name = ?, color = ?, location = ?, status = ?, notes = ? WHERE id = ?`,
        [editP.name.trim(), editP.color, location, editP.status, notes, editP.id],
      );
    }
    setEditP(null);
    carregar();
  };

  const excluirProjeto = async () => {
    if (!editP?.id) return;
    const n = tarefas.filter((t) => t.project_id === editP.id).length;
    const ok = await confirm({
      title: 'Excluir projeto?',
      message: n > 0 ? `As ${n} tarefas dele também saem do cronograma.` : 'O projeto some do cronograma.',
      confirmLabel: 'Excluir', destructive: true,
    });
    if (!ok) return;
    // Tarefa e projeto saem juntos: soft-delete nos dois (o trigger de dirty
    // marca pending_sync e o push leva o deleted_at pro servidor).
    await db.runAsync(`UPDATE schedule_tasks SET deleted_at = datetime('now') WHERE project_id = ? AND deleted_at IS NULL`, [editP.id]);
    await db.runAsync(`UPDATE schedule_projects SET deleted_at = datetime('now') WHERE id = ?`, [editP.id]);
    setEditP(null);
    carregar();
  };

  return (
    <View style={styles.screen}>
      <BrandHeader title="Cronograma" context="Atividades e tarefas" />
      <Kpis tarefas={tarefasVisiveis} />

      <View style={styles.controls}>
        <View style={styles.chipRow}>
          <Chip label="Ativos" active={soAtivos} onPress={() => setSoAtivos(true)} />
          <Chip label="Todos" active={!soAtivos} onPress={() => setSoAtivos(false)} />
        </View>
        <View style={styles.modoToggle}>
          <TouchableOpacity style={[styles.modoItem, modo === 'grade' && styles.modoActive]} onPress={() => setModo('grade')}>
            <Text style={[styles.modoText, modo === 'grade' && styles.modoTextActive]}>Grade</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modoItem, modo === 'lista' && styles.modoActive]} onPress={() => setModo('lista')}>
            <Text style={[styles.modoText, modo === 'lista' && styles.modoTextActive]}>Lista</Text>
          </TouchableOpacity>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.novoBtn} onPress={abrirNovoProjeto} activeOpacity={0.85}>
            <Plus size={15} color={NSA.cream} strokeWidth={2.5} />
            <Text style={styles.novoBtnText}>Projeto</Text>
          </TouchableOpacity>
        )}
      </View>

      {projetosVisiveis.length === 0 ? (
        <View style={styles.vazioBox}>
          <Text style={styles.vazio}>
            Nenhum projeto ainda. Toque em “Projeto” pra criar a primeira macro-atividade
            (ex.: “Montar ILP no T33”) e depois arraste na linha dela pra criar as tarefas.
          </Text>
        </View>
      ) : modo === 'grade' ? (
        <Grade
          rows={rows} totalH={totalH} rangeIni={rangeIni}
          onToggle={toggleColapso} colapsados={colapsados}
          onNovaTarefa={abrirNovaTarefa} onTarefa={abrirEdicaoTarefa}
          onCommit={onCommitDrag} onEditProjeto={abrirEdicaoProjeto}
          onAddTarefa={adicionarTarefa}
          renaming={renaming} onRenameChange={(v) => setRenaming((r) => (r ? { ...r, value: v } : r))}
          onRenameStart={abrirRename} onRenameEnd={confirmarRename}
        />
      ) : (
        <Lista projetos={projetosVisiveis} tarefas={tarefasVisiveis} onTarefa={abrirEdicaoTarefa} onProjeto={abrirEdicaoProjeto} />
      )}

      <TarefaModal
        edit={editT} projetos={projetosVisiveis}
        onChange={setEditT} onClose={() => setEditT(null)} onSave={salvarTarefa} onDelete={excluirTarefa}
      />
      <ProjetoModal
        edit={editP}
        onChange={setEditP} onClose={() => setEditP(null)} onSave={salvarProjeto} onDelete={excluirProjeto}
      />
    </View>
  );
}

// ---------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------
function Kpis({ tarefas }: { tarefas: Tarefa[] }) {
  const hoje = isoDate(new Date());
  const ini = isoDate(mondayOf(new Date()));
  const fim = addDays(ini, 6);
  const naSemana = tarefas.filter((t) => t.start_date <= fim && t.end_date >= ini).length;
  const total = tarefas.length;
  const feitas = tarefas.filter((t) => t.status === 'feito').length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  const atrasadas = tarefas.filter((t) => t.status !== 'feito' && t.status !== 'cancelado' && t.end_date < hoje).length;
  return (
    <View style={styles.kpiRow}>
      <KpiCell valor={String(naSemana)} label="Nesta semana" />
      <KpiCell valor={`${pct}%`} label="Concluído" tone={pct >= 80 ? 'ok' : undefined} />
      <KpiCell valor={String(atrasadas)} label="Atrasadas" tone={atrasadas > 0 ? 'danger' : undefined} />
      <KpiCell valor={String(total)} label="Tarefas" />
    </View>
  );
}
function KpiCell({ valor, label, tone }: { valor: string; label: string; tone?: 'ok' | 'danger' | 'warn' }) {
  const cor = tone === 'ok' ? NSA.okFg : tone === 'danger' ? NSA.dangerFg : tone === 'warn' ? NSA.warnFg : NSA.inkPrimary;
  return (
    <View style={styles.kpiCell}>
      <Text style={[styles.kpiValor, { color: cor }]}>{valor}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------
// Grade (linha do tempo longa, com drag de barras)
// ---------------------------------------------------------------------
function Grade({
  rows, totalH, rangeIni, colapsados, onToggle, onNovaTarefa, onTarefa, onCommit, onEditProjeto,
  onAddTarefa, renaming, onRenameChange, onRenameStart, onRenameEnd,
}: {
  rows: Row[]; totalH: number; rangeIni: string;
  colapsados: Set<number>;
  onToggle: (id: number) => void;
  onNovaTarefa: (p: Projeto, ini: string, fim: string) => void;
  onTarefa: (t: Tarefa) => void;
  onCommit: (taskId: number, ini: string, fim: string) => void;
  onEditProjeto: (p: Projeto) => void;
  onAddTarefa: (p: Projeto) => void;
  renaming: Renaming | null;
  onRenameChange: (v: string) => void;
  onRenameStart: (kind: 'projeto' | 'tarefa', id: number, atual: string) => void;
  onRenameEnd: () => void;
}) {
  const headerRef = useRef<ScrollView>(null);
  const bodyHRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  // Carimbo de "acabei de mexer numa barra": a linha não redefine período se a
  // barra foi tocada agora há pouco. Blindagem extra do original — a captura do
  // gesto da barra já cobre o caso normal.
  const lastBarTouch = useRef(0);
  const markBarTouch = useCallback(() => { lastBarTouch.current = Date.now(); }, []);
  const barTouchRecent = useCallback(() => Date.now() - lastBarTouch.current < 350, []);
  // Long-press "armado" (mover barra / criar tarefa) trava o scroll dos dois
  // ScrollViews: com scrollEnabled=false o nativo não intercepta (ACTION_CANCEL)
  // e o arraste chega inteiro no PanResponder. Solto → destrava.
  const [scrollLock, setScrollLock] = useState(false);

  const iniNum = dayNum(rangeIni);
  const hojeNum = dayNum(isoDate(new Date()));
  const hojeIdx = Math.max(0, hojeNum - iniNum);

  const dias = useMemo(
    () => Array.from({ length: RANGE_DIAS }, (_, i) => ({ i, iso: addDays(rangeIni, i) })),
    [rangeIni],
  );

  const onScrollX = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
    headerRef.current?.scrollTo({ x: scrollX.current, animated: false });
  };
  const scrollTo = (x: number) => {
    const nx = Math.max(0, Math.min(GRID_W, x));
    bodyHRef.current?.scrollTo({ x: nx, animated: true });
    headerRef.current?.scrollTo({ x: nx, animated: true });
  };

  // Abre na data de hoje no primeiro render.
  useEffect(() => {
    const x = Math.max(0, (hojeNum - iniNum) * DAY_W - 90);
    const id = setTimeout(() => {
      bodyHRef.current?.scrollTo({ x, animated: false });
      headerRef.current?.scrollTo({ x, animated: false });
      scrollX.current = x;
    }, 60);
    return () => clearTimeout(id);
  }, [hojeNum, iniNum]);

  // Posição horizontal de um período [ini, fim] na grade.
  const place = useCallback((ini: string, fim: string) => {
    const s = dayNum(ini), e = dayNum(fim);
    if (e < iniNum || s > iniNum + RANGE_DIAS - 1) return null;
    const visS = Math.max(s, iniNum), visE = Math.min(e, iniNum + RANGE_DIAS - 1);
    return { left: (visS - iniNum) * DAY_W, width: Math.max(DAY_W - 2, (visE - visS + 1) * DAY_W - 2) };
  }, [iniNum]);

  const hoje = isoDate(new Date());

  return (
    <View style={styles.gradeWrap}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => scrollTo(scrollX.current - 84 * DAY_W)} hitSlop={8}><ChevronsLeft size={20} color={NSA.inkSecondary} /></TouchableOpacity>
        <TouchableOpacity onPress={() => scrollTo(scrollX.current - 28 * DAY_W)} hitSlop={8}><ChevronLeft size={20} color={NSA.inkSecondary} /></TouchableOpacity>
        <TouchableOpacity onPress={() => scrollTo((hojeNum - iniNum) * DAY_W - 90)} style={styles.hojeBtn}><Text style={styles.hojeText}>Hoje</Text></TouchableOpacity>
        <Text style={styles.navHint} numberOfLines={1}>+ no projeto cria tarefa · arraste na linha pra dar o período · toque no nome pra renomear</Text>
        <TouchableOpacity onPress={() => scrollTo(scrollX.current + 28 * DAY_W)} hitSlop={8}><ChevronRight size={20} color={NSA.inkSecondary} /></TouchableOpacity>
        <TouchableOpacity onPress={() => scrollTo(scrollX.current + 84 * DAY_W)} hitSlop={8}><ChevronsRight size={20} color={NSA.inkSecondary} /></TouchableOpacity>
      </View>

      <View style={styles.gradeRow}>
        {/* Cabeçalho fixo */}
        <View style={styles.headerBar}>
          <View style={[styles.corner, { width: LEFT_W, height: HEADER_H }]}><Text style={styles.cornerText}>Projeto · tarefa</Text></View>
          <ScrollView ref={headerRef} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
            <View style={{ width: GRID_W, height: HEADER_H }}>
              {dias.map(({ i, iso }) => {
                const d = parseISO(iso);
                if (!(d.getDate() === 1 || i === 0)) return null;
                return <Text key={`m${i}`} style={[styles.mesLabel, { left: i * DAY_W + 2 }]}>{MESES_ABREV[d.getMonth()]} {String(d.getFullYear()).slice(2)}</Text>;
              })}
              <View style={styles.diasRow}>
                {dias.map(({ i, iso }) => {
                  const d = parseISO(iso); const wd = (d.getDay() + 6) % 7; const ehHoje = dayNum(iso) === hojeNum;
                  return (
                    <View key={i} style={[styles.diaHead, { width: DAY_W }, wd >= 5 && styles.fimDeSemana, ehHoje && styles.hojeCol]}>
                      <Text style={[styles.diaWd, ehHoje && styles.hojeText]}>{WD[wd]}</Text>
                      <Text style={[styles.diaNum, ehHoje && styles.hojeText]}>{d.getDate()}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Corpo: vertical move coluna + grade juntos; horizontal sincroniza o header. */}
        <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator scrollEnabled={!scrollLock}>
          <View style={styles.bodyInner}>
            {/* coluna fixa: cabeçalho do projeto e nome das tarefas */}
            <View style={{ width: LEFT_W }}>
              {rows.map((r) => r.kind === 'projeto' ? (
                <View key={r.key} style={[styles.projCell, { height: r.height }]}>
                  <TouchableOpacity onPress={() => onToggle(r.projeto.id)} hitSlop={6} style={styles.projChevron}>
                    {colapsados.has(r.projeto.id)
                      ? <ChevronRight size={14} color={NSA.inkSecondary} strokeWidth={2} />
                      : <ChevronDown size={14} color={NSA.inkSecondary} strokeWidth={2} />}
                  </TouchableOpacity>
                  <View style={[styles.dot, { backgroundColor: r.projeto.color ?? NSA.inkMuted }]} />
                  <View style={{ flex: 1 }}>
                    <NomeEditavel
                      editando={renaming?.kind === 'projeto' && renaming.id === r.projeto.id}
                      valor={renaming?.value ?? ''} texto={r.projeto.name} estilo={styles.projNome}
                      placeholder="Nome do projeto"
                      onStart={() => onRenameStart('projeto', r.projeto.id, r.projeto.name)}
                      onChange={onRenameChange} onEnd={onRenameEnd}
                    />
                    <Text style={styles.projMeta} numberOfLines={1}>
                      {r.feitas}/{r.total}{r.projeto.location ? ` · ${r.projeto.location}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onAddTarefa(r.projeto)} hitSlop={8} style={styles.projAdd}>
                    <Plus size={15} color={NSA.green800} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onEditProjeto(r.projeto)} hitSlop={8} style={styles.projEdit}>
                    <Pencil size={13} color={NSA.inkMuted} strokeWidth={1.75} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View key={r.key} style={[styles.taskCell, { height: r.height }]}>
                  <NomeEditavel
                    editando={renaming?.kind === 'tarefa' && renaming.id === r.tarefa.id}
                    valor={renaming?.value ?? ''} texto={r.tarefa.name} estilo={styles.taskNome}
                    placeholder="Nome da tarefa"
                    onStart={() => onRenameStart('tarefa', r.tarefa.id, r.tarefa.name)}
                    onChange={onRenameChange} onEnd={onRenameEnd}
                  />
                  {r.tarefa.assignee ? <Text style={styles.taskMeta} numberOfLines={1}>{r.tarefa.assignee}</Text> : null}
                </View>
              ))}
            </View>

            {/* grade com rolagem horizontal */}
            <ScrollView ref={bodyHRef} horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator onScroll={onScrollX} scrollEventThrottle={16} scrollEnabled={!scrollLock}>
              <View style={{ width: GRID_W, height: totalH }}>
                {/* fundo: colunas de dias (camada única) */}
                {dias.map(({ i, iso }) => {
                  const wd = (parseISO(iso).getDay() + 6) % 7; const ehHoje = dayNum(iso) === hojeNum;
                  return <View key={i} style={[styles.bgCol, { left: i * DAY_W, width: DAY_W }, wd >= 5 && styles.fimDeSemana, ehHoje && styles.hojeColBg]} />;
                })}
                {rows.map((r) => r.kind === 'projeto' ? (
                  <LinhaArrastavel
                    key={r.key} top={r.top} height={r.height} estilo={styles.projRow}
                    rangeIni={rangeIni} hojeIdx={hojeIdx} onLock={setScrollLock} barTouchRecent={barTouchRecent}
                    onRange={(ini, fim) => onNovaTarefa(r.projeto, ini, fim)}
                  >
                    {r.span && (() => {
                      const pos = place(r.span.ini, r.span.fim);
                      if (!pos) return null;
                      return (
                        <View pointerEvents="none" style={[styles.spanBar, {
                          left: pos.left, width: pos.width,
                          backgroundColor: r.projeto.color ?? NSA.inkMuted,
                        }]} />
                      );
                    })()}
                  </LinhaArrastavel>
                ) : (() => {
                  const pos = place(r.tarefa.start_date, r.tarefa.end_date);
                  const atrasada = r.tarefa.status !== 'feito' && r.tarefa.status !== 'cancelado' && r.tarefa.end_date < hoje;
                  return (
                    // Arrastar no vazio da linha REDEFINE o período da tarefa —
                    // é a forma de dar duração com o dedo sem mirar na borda da barra.
                    <LinhaArrastavel
                      key={r.key} top={r.top} height={r.height} estilo={styles.bodyRow}
                      rangeIni={rangeIni} hojeIdx={hojeIdx} onLock={setScrollLock} barTouchRecent={barTouchRecent}
                      onRange={(ini, fim) => onCommit(r.tarefa.id, ini, fim)}
                    >
                      {pos && (
                        <DraggableBar
                          tarefa={r.tarefa} left={pos.left} width={pos.width}
                          cor={r.projeto.color ?? NSA.green700} atrasada={atrasada}
                          onTap={onTarefa} onCommit={onCommit} onLock={setScrollLock} onInteract={markBarTouch}
                        />
                      )}
                    </LinhaArrastavel>
                  );
                })())}
              </View>
            </ScrollView>
          </View>
          <View style={{ height: 28 }} />
        </ScrollView>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------
// Barra arrastável (mover + redimensionar)
// ---------------------------------------------------------------------
function DraggableBar({
  tarefa, left, width, cor, atrasada, onTap, onCommit, onLock, onInteract,
}: {
  tarefa: Tarefa; left: number; width: number; cor: string; atrasada: boolean;
  onTap: (t: Tarefa) => void;
  onCommit: (taskId: number, ini: string, fim: string) => void;
  onLock: (v: boolean) => void;
  onInteract: () => void;
}) {
  const [drag, setDrag] = useState<{ mode: string; dxDays: number } | null>(null);
  const modeRef = useRef<string>('move');
  const didMove = useRef(false);
  // Touch: só arrasta depois do long-press ("pegar"); antes disso o gesto é
  // scroll e o ScrollView pode roubar. Web (mouse): armado desde o início.
  const armed = useRef(Platform.OS === 'web');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const latest = useRef({ tarefa, width, onTap, onCommit, onLock, onInteract });
  latest.current = { tarefa, width, onTap, onCommit, onLock, onInteract };

  const pan = useRef(PanResponder.create({
    // Carimba "mexi numa barra" já no pointer-down, antes de a linha poder
    // reagir no pointer-up.
    onStartShouldSetPanResponder: () => { latest.current.onInteract(); return true; },
    onStartShouldSetPanResponderCapture: () => { latest.current.onInteract(); return true; },
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    // NUNCA entregar o gesto pra outro responder JS: sem isso um container pai
    // rouba o responder no 1º micro-move de um tap de dedo real → o RELEASE da
    // barra nunca dispara → "clicar na barra não faz nada". O scroll NATIVO não
    // consulta isso (manda ACTION_CANCEL direto), então arraste solto ainda rola.
    onPanResponderTerminationRequest: () => false,
    // Android: NÃO bloquear o ScrollView nativo (default é true) — senão o dedo
    // fica preso neste responder e o board não rola.
    onShouldBlockNativeResponder: () => false,
    onPanResponderGrant: (e) => {
      latest.current.onInteract();
      didMove.current = false;
      const x = e.nativeEvent.locationX; const w = latest.current.width;
      modeRef.current = x >= w - HANDLE ? 'resize-r' : x <= HANDLE ? 'resize-l' : 'move';
      if (Platform.OS !== 'web') {
        armed.current = false;
        clearTimer();
        timer.current = setTimeout(() => {
          armed.current = true;
          latest.current.onLock(true); // trava o scroll → o nativo não cancela o drag armado
          setDrag({ mode: modeRef.current, dxDays: 0 }); // feedback: barra "pega" (eleva)
        }, LONG_PRESS_MS);
      }
    },
    onPanResponderMove: (_e, g) => {
      latest.current.onInteract();                 // mantém o carimbo fresco durante o arraste
      if (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8) didMove.current = true;
      if (!armed.current) { if (didMove.current) clearTimer(); return; } // mexeu antes do hold = scroll
      setDrag({ mode: modeRef.current, dxDays: Math.round(g.dx / DAY_W) });
    },
    onPanResponderRelease: (_e, g) => {
      clearTimer();
      latest.current.onLock(false);
      const wasArmed = armed.current;
      if (Platform.OS !== 'web') armed.current = false;
      setDrag(null);
      latest.current.onInteract();
      const { tarefa: t, onTap: tap, onCommit: commit } = latest.current;
      // Tap = soltou perto de onde encostou. No TOUCH a folga é maior (12px):
      // dedo desliza alguns px num toque normal — com 5px a maioria dos toques
      // caía numa ZONA MORTA (demais pra tap, de menos pro scroll nativo roubar).
      const drift = Math.max(Math.abs(g.dx), Math.abs(g.dy));
      const isTap = Platform.OS === 'web' ? !didMove.current && drift < 5 : drift < 12;
      if (isTap) { tap(t); return; }
      if (!wasArmed) return;                       // touch: arrastou sem segurar = era scroll
      const delta = Math.round(g.dx / DAY_W);
      if (delta === 0) return;                     // arrastou < meio dia = nada
      let ni = t.start_date, nf = t.end_date;
      if (modeRef.current === 'move') { ni = addDays(ni, delta); nf = addDays(nf, delta); }
      else if (modeRef.current === 'resize-r') { nf = addDays(nf, delta); if (dayNum(nf) < dayNum(ni)) nf = ni; }
      else { ni = addDays(ni, delta); if (dayNum(ni) > dayNum(nf)) ni = nf; }
      commit(t.id, ni, nf);                        // ajuste direto, sem abrir editor
    },
    onPanResponderTerminate: () => {
      clearTimer();
      latest.current.onLock(false);
      if (Platform.OS !== 'web') armed.current = false;
      setDrag(null);
    },
  })).current;

  let pl = left, pw = width;
  if (drag) {
    const off = drag.dxDays * DAY_W;
    if (drag.mode === 'move') pl = left + off;
    else if (drag.mode === 'resize-r') pw = Math.max(DAY_W - 2, width + off);
    else { pl = left + off; pw = Math.max(DAY_W - 2, width - off); }
  }
  const cursorStyle = Platform.OS === 'web' ? { cursor: drag ? 'grabbing' : 'grab' } : null;

  return (
    <View
      {...pan.panHandlers}
      style={[styles.bar, cursorStyle as any, {
        left: pl, width: pw,
        backgroundColor: cor, opacity: STATUS_OPACITY[tarefa.status] ?? 1,
        borderColor: atrasada ? NSA.danger : 'transparent',
      }, drag ? styles.barLift : null]}
    >
      <View style={[styles.handle, { left: 0 }, Platform.OS === 'web' ? ({ cursor: 'ew-resize' } as any) : null]} />
      {atrasada && <AlertTriangle size={11} color="#fff" strokeWidth={2.5} />}
      <Text style={styles.barText} numberOfLines={1}>{tarefa.name}</Text>
      {tarefa.status === 'feito' && <Check size={12} color="#fff" strokeWidth={3} />}
      <View style={[styles.handle, { right: 0 }, Platform.OS === 'web' ? ({ cursor: 'ew-resize' } as any) : null]} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Linha arrastável: arrastar de um dia ao outro devolve o período [ini, fim].
// Na linha do PROJETO isso cria uma tarefa; na linha da TAREFA, redefine a dela.
// ---------------------------------------------------------------------
function LinhaArrastavel({
  top, height, estilo, rangeIni, hojeIdx, onRange, onLock, barTouchRecent, children,
}: {
  top: number; height: number; estilo: any; rangeIni: string; hojeIdx: number;
  onRange: (ini: string, fim: string) => void;
  onLock: (v: boolean) => void;
  barTouchRecent: () => boolean;
  children?: React.ReactNode;
}) {
  const [sel, setSel] = useState<{ a: number; b: number } | null>(null);
  const startIdx = useRef(0);
  const ignore = useRef(false);
  const moved = useRef(false);
  // Touch: criar exige long-press (segurar e arrastar); arraste solto = scroll.
  // Web (mouse): clique/arraste direto cria.
  const armed = useRef(Platform.OS === 'web');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const latest = useRef({ rangeIni, hojeIdx, onRange });
  latest.current = { rangeIni, hojeIdx, onRange };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    // NÃO pedir o gesto no MOVE: pedir aqui rouba o tap de qualquer filho no 1º
    // micro-move do dedo (todo toque real tem um).
    onMoveShouldSetPanResponder: () => false,
    onPanResponderTerminationRequest: () => !armed.current,
    // Android: não bloquear o ScrollView nativo (default true) — senão trava o scroll.
    onShouldBlockNativeResponder: () => false,
    onPanResponderGrant: (e) => {
      if (barTouchRecent()) { ignore.current = true; return; } // tocou uma barra agora há pouco
      ignore.current = false;
      moved.current = false;
      const lx = e.nativeEvent.locationX;
      startIdx.current = Number.isFinite(lx) ? clampIdx(Math.floor((lx as number) / DAY_W)) : latest.current.hojeIdx;
      if (Platform.OS === 'web') {
        setSel({ a: startIdx.current, b: startIdx.current });
      } else {
        armed.current = false;
        clearTimer();
        timer.current = setTimeout(() => {
          armed.current = true;
          onLock(true); // trava o scroll → o nativo não cancela o arraste de criar
          setSel({ a: startIdx.current, b: startIdx.current }); // feedback: preview aparece
        }, LONG_PRESS_MS);
      }
    },
    onPanResponderMove: (_e, g) => {
      if (ignore.current) return;
      if (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8) moved.current = true;
      if (!armed.current) { if (moved.current) clearTimer(); return; } // mexeu antes do hold = scroll
      const cur = clampIdx(startIdx.current + Math.round(g.dx / DAY_W));
      setSel({ a: Math.min(startIdx.current, cur), b: Math.max(startIdx.current, cur) });
    },
    onPanResponderRelease: (_e, g) => {
      clearTimer();
      onLock(false);
      const wasArmed = armed.current;
      if (Platform.OS !== 'web') armed.current = false;
      setSel(null);
      if (ignore.current) { ignore.current = false; return; }
      if (!wasArmed) return;                       // touch: soltou sem segurar = era scroll
      const cur = clampIdx(startIdx.current + Math.round(g.dx / DAY_W));
      const a = Math.min(startIdx.current, cur), b = Math.max(startIdx.current, cur);
      const { rangeIni: ri, onRange: range } = latest.current;
      range(addDays(ri, a), addDays(ri, b));
    },
    onPanResponderTerminate: () => {
      clearTimer();
      onLock(false);
      if (Platform.OS !== 'web') armed.current = false;
      ignore.current = false;
      setSel(null);
    },
  })).current;

  return (
    <View {...pan.panHandlers} style={[estilo, { top, height, width: GRID_W }]}>
      {children}
      {sel && <View pointerEvents="none" style={[styles.selPreview, { left: sel.a * DAY_W, width: (sel.b - sel.a + 1) * DAY_W - 2 }]} />}
    </View>
  );
}

// ---------------------------------------------------------------------
// Lista (reflow para celular)
// ---------------------------------------------------------------------
function Lista({
  projetos, tarefas, onTarefa, onProjeto,
}: {
  projetos: Projeto[]; tarefas: Tarefa[];
  onTarefa: (t: Tarefa) => void; onProjeto: (p: Projeto) => void;
}) {
  const hoje = isoDate(new Date());
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listaContent} showsVerticalScrollIndicator={false}>
      {projetos.map((p) => {
        const suas = tarefas.filter((t) => t.project_id === p.id);
        const feitas = suas.filter((t) => t.status === 'feito').length;
        return (
          <View key={p.id}>
            <TouchableOpacity style={styles.listaProjHead} onPress={() => onProjeto(p)} activeOpacity={0.7}>
              <View style={[styles.dot, { backgroundColor: p.color ?? NSA.inkMuted }]} />
              <Text style={styles.listaProj} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.listaProjMeta}>{feitas}/{suas.length}</Text>
            </TouchableOpacity>
            {suas.length === 0 ? (
              <Text style={styles.listaSemTarefa}>Sem tarefas ainda.</Text>
            ) : suas.map((t) => {
              const atrasada = t.status !== 'feito' && t.status !== 'cancelado' && t.end_date < hoje;
              const periodo = t.start_date === t.end_date ? fmtDia(t.start_date) : `${fmtDia(t.start_date)}–${fmtDia(t.end_date)}`;
              const badge = t.status === 'feito' ? 'ok' : t.status === 'cancelado' ? 'muted' : t.status === 'em_andamento' ? 'info' : 'warning';
              return (
                <Card key={t.id} borderColor={p.color ?? NSA.green700} onPress={() => onTarefa(t)}>
                  <View style={styles.listaHead}>
                    <Text style={styles.listaTarefa} numberOfLines={2}>{t.name}</Text>
                    <Badge label={STATUS_LABEL[t.status] ?? t.status} variant={badge} />
                  </View>
                  <Text style={styles.listaSub}>
                    {periodo}{t.assignee ? ` · ${t.assignee}` : ''}{atrasada ? ' · atrasada' : ''}
                  </Text>
                  {t.notes ? <Text style={styles.listaNotes}>{t.notes}</Text> : null}
                </Card>
              );
            })}
          </View>
        );
      })}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------
// Editor de tarefa (bottom-sheet)
// ---------------------------------------------------------------------
function TarefaModal({
  edit, projetos, onChange, onClose, onSave, onDelete,
}: {
  edit: EditTarefa | null; projetos: Projeto[];
  onChange: (e: EditTarefa) => void; onClose: () => void; onSave: () => void; onDelete: () => void;
}) {
  if (!edit) return null;
  const canSave = edit.name.trim().length > 0;
  const dataFim = computeFim(edit.start_date, edit.duracao, edit.inclui_sabado, edit.inclui_domingo);
  const durLabel = edit.inclui_sabado && edit.inclui_domingo ? 'Duração'
    : !edit.inclui_sabado && !edit.inclui_domingo ? 'Dias úteis' : 'Dias';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoider style={styles.modalRoot}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{edit.id == null ? 'Nova tarefa' : 'Editar tarefa'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}><X size={22} color={NSA.inkSecondary} /></TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>O que é</Text>
            <TextInput style={styles.input} value={edit.name} onChangeText={(t) => onChange({ ...edit, name: t })}
              placeholder="Ex.: comprar vergalhões" placeholderTextColor={NSA.inkDisabled} />

            <Text style={styles.label}>Projeto</Text>
            <View style={styles.chipWrap}>
              {projetos.map((p) => {
                const active = edit.project_id === p.id;
                return (
                  <TouchableOpacity key={p.id} style={[styles.opChip, active && { backgroundColor: p.color ?? NSA.green700, borderColor: p.color ?? NSA.green700 }]}
                    onPress={() => onChange({ ...edit, project_id: p.id })} activeOpacity={0.85}>
                    <View style={[styles.dot, { backgroundColor: active ? '#fff' : p.color ?? NSA.inkMuted }]} />
                    <Text style={[styles.opChipText, active && { color: '#fff' }]} numberOfLines={1}>{p.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Período</Text>
            <View style={styles.periodoRow}>
              <Stepper label="Início" valor={fmtDia(edit.start_date)}
                onMinus={() => onChange({ ...edit, start_date: addDays(edit.start_date, -1) })}
                onPlus={() => onChange({ ...edit, start_date: addDays(edit.start_date, 1) })} />
              <Stepper label={durLabel} valor={`${edit.duracao} dia${edit.duracao > 1 ? 's' : ''}`}
                onMinus={() => onChange({ ...edit, duracao: Math.max(1, edit.duracao - 1) })}
                onPlus={() => onChange({ ...edit, duracao: edit.duracao + 1 })} />
            </View>
            <Text style={styles.hint}>Termina em {fmtDia(dataFim)}</Text>
            <View style={styles.switchRow}>
              <Text style={styles.labelInline}>Incluir sábados</Text>
              <Switch value={edit.inclui_sabado} onValueChange={(v) => onChange({ ...edit, inclui_sabado: v })} trackColor={{ true: NSA.green800, false: NSA.border }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.labelInline}>Incluir domingos</Text>
              <Switch value={edit.inclui_domingo} onValueChange={(v) => onChange({ ...edit, inclui_domingo: v })} trackColor={{ true: NSA.green800, false: NSA.border }} />
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.segRow}>
              {STATUS_OPCOES.map((s) => (
                <TouchableOpacity key={s} style={[styles.seg, edit.status === s && styles.segActive]} onPress={() => onChange({ ...edit, status: s })}>
                  <Text style={[styles.segText, edit.status === s && styles.segTextActive]}>{STATUS_LABEL[s]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Responsável</Text>
            <TextInput style={styles.input} value={edit.assignee} onChangeText={(t) => onChange({ ...edit, assignee: t })}
              placeholder="Quem executa (opcional)" placeholderTextColor={NSA.inkDisabled} />

            <Text style={styles.label}>Observação</Text>
            <TextInput style={[styles.input, styles.textarea]} value={edit.notes} onChangeText={(t) => onChange({ ...edit, notes: t })}
              placeholder="Detalhes, pendências…" placeholderTextColor={NSA.inkDisabled} multiline />

            {edit.id != null && <Button title="Excluir tarefa" variant="danger" onPress={onDelete} style={{ marginTop: 18 }} />}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button title="Cancelar" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Salvar" onPress={onSave} disabled={!canSave} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Editor de projeto (macro-atividade)
// ---------------------------------------------------------------------
function ProjetoModal({
  edit, onChange, onClose, onSave, onDelete,
}: {
  edit: EditProjeto | null;
  onChange: (e: EditProjeto) => void; onClose: () => void; onSave: () => void; onDelete: () => void;
}) {
  if (!edit) return null;
  const canSave = edit.name.trim().length > 0;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoider style={styles.modalRoot}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{edit.id == null ? 'Novo projeto' : 'Editar projeto'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}><X size={22} color={NSA.inkSecondary} /></TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Macro-atividade</Text>
            <TextInput style={styles.input} value={edit.name} onChangeText={(t) => onChange({ ...edit, name: t })}
              placeholder="Ex.: Montar ILP no T33" placeholderTextColor={NSA.inkDisabled} />

            <Text style={styles.label}>Local</Text>
            <TextInput style={styles.input} value={edit.location} onChangeText={(t) => onChange({ ...edit, location: t })}
              placeholder="T33, sede, P47… (opcional)" placeholderTextColor={NSA.inkDisabled} />

            <Text style={styles.label}>Cor</Text>
            <View style={styles.chipWrap}>
              {CORES.map((c) => (
                <TouchableOpacity key={c} onPress={() => onChange({ ...edit, color: c })} activeOpacity={0.8}
                  style={[styles.corSwatch, { backgroundColor: c }, edit.color === c && styles.corSwatchActive]}>
                  {edit.color === c && <Check size={15} color="#fff" strokeWidth={3} />}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.segRow}>
              {PROJ_STATUS_OPCOES.map((s) => (
                <TouchableOpacity key={s} style={[styles.seg, edit.status === s && styles.segActive]} onPress={() => onChange({ ...edit, status: s })}>
                  <Text style={[styles.segText, edit.status === s && styles.segTextActive]}>{PROJ_STATUS_LABEL[s]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Observação</Text>
            <TextInput style={[styles.input, styles.textarea]} value={edit.notes} onChangeText={(t) => onChange({ ...edit, notes: t })}
              placeholder="Contexto, orçamento, pendências…" placeholderTextColor={NSA.inkDisabled} multiline />

            {edit.id != null && <Button title="Excluir projeto" variant="danger" onPress={onDelete} style={{ marginTop: 18 }} />}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button title="Cancelar" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Salvar" onPress={onSave} disabled={!canSave} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

// Nome que vira campo de texto no toque — renomear projeto/tarefa sem abrir tela.
function NomeEditavel({
  editando, valor, texto, estilo, placeholder, onStart, onChange, onEnd,
}: {
  editando: boolean; valor: string; texto: string; estilo: any; placeholder: string;
  onStart: () => void; onChange: (v: string) => void; onEnd: () => void;
}) {
  if (editando) {
    return (
      <TextInput
        style={[estilo, styles.nomeInput]}
        value={valor} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={NSA.inkDisabled}
        autoFocus selectTextOnFocus returnKeyType="done"
        onSubmitEditing={onEnd} onBlur={onEnd}
      />
    );
  }
  return (
    <TouchableOpacity onPress={onStart} activeOpacity={0.6}>
      <Text style={estilo} numberOfLines={1}>{texto || placeholder}</Text>
    </TouchableOpacity>
  );
}

function Stepper({ label, valor, onMinus, onPlus }: { label: string; valor: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepperCol}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity onPress={onMinus} style={styles.stepperBtn} hitSlop={6}><Minus size={16} color={NSA.inkPrimary} /></TouchableOpacity>
        <Text style={styles.stepperVal}>{valor}</Text>
        <TouchableOpacity onPress={onPlus} style={styles.stepperBtn} hitSlop={6}><Plus size={16} color={NSA.inkPrimary} /></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NSA.bg },

  kpiRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.sp4, paddingTop: Spacing.sp3 },
  kpiCell: { flex: 1, backgroundColor: NSA.bgElevated, borderWidth: 1, borderColor: NSA.border, borderRadius: Radius.lg, paddingVertical: 10, alignItems: 'center' },
  kpiValor: { fontFamily: Fonts.bold, fontSize: 20, color: NSA.inkPrimary },
  kpiLabel: { fontFamily: Fonts.medium, fontSize: 10, color: NSA.inkMuted, marginTop: 2 },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.sp4, paddingTop: Spacing.sp3 },
  chipRow: { flexDirection: 'row', gap: 6, flex: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: NSA.bgMuted, borderWidth: 1, borderColor: NSA.border },
  chipActive: { backgroundColor: NSA.green800, borderColor: NSA.green800 },
  chipText: { fontFamily: Fonts.medium, fontSize: 12, color: NSA.inkSecondary },
  chipTextActive: { color: NSA.cream, fontFamily: Fonts.semibold },
  modoToggle: { flexDirection: 'row', backgroundColor: NSA.bgMuted, borderRadius: Radius.lg, padding: 3 },
  modoItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md },
  modoActive: { backgroundColor: NSA.bgElevated },
  modoText: { fontFamily: Fonts.medium, fontSize: 12, color: NSA.inkMuted },
  modoTextActive: { color: NSA.inkPrimary, fontFamily: Fonts.semibold },
  novoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: NSA.green800, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.lg },
  novoBtnText: { fontFamily: Fonts.semibold, fontSize: 12, color: NSA.cream },

  gradeWrap: { flex: 1, paddingHorizontal: Spacing.sp4, paddingBottom: Spacing.sp2 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: Spacing.sp2 },
  hojeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md, backgroundColor: NSA.green50 },
  hojeText: { fontFamily: Fonts.semibold, fontSize: 12, color: NSA.green800 },
  navHint: { flex: 1, textAlign: 'center', fontFamily: Fonts.regular, fontSize: 11, color: NSA.inkMuted },

  gradeRow: { flex: 1, flexDirection: 'column', borderWidth: 1, borderColor: NSA.border, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: NSA.bgElevated },
  headerBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: NSA.border },
  bodyInner: { flexDirection: 'row' },
  corner: { justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 6, borderRightWidth: 1, borderColor: NSA.border, backgroundColor: NSA.bgMuted },
  cornerText: { fontFamily: Fonts.semibold, fontSize: 11, color: NSA.inkMuted },

  projCell: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: NSA.border, backgroundColor: NSA.bgMuted },
  projChevron: { paddingLeft: 5, paddingRight: 3, paddingVertical: 6 },
  projAdd: { padding: 3 },
  projEdit: { padding: 3 },
  nomeInput: { padding: 0, margin: 0, borderBottomWidth: 1, borderColor: NSA.green800 },
  projNome: { fontFamily: Fonts.semibold, fontSize: 12, color: NSA.inkPrimary },
  projMeta: { fontFamily: Fonts.regular, fontSize: 10, color: NSA.inkMuted },
  taskCell: { justifyContent: 'center', paddingLeft: 24, paddingRight: 6, borderRightWidth: 1, borderBottomWidth: 1, borderColor: NSA.borderSubtle, backgroundColor: NSA.bgElevated },
  taskNome: { fontFamily: Fonts.medium, fontSize: 12, color: NSA.inkPrimary },
  taskMeta: { fontFamily: Fonts.regular, fontSize: 10, color: NSA.inkMuted },
  dot: { width: 10, height: 10, borderRadius: 3 },

  diasRow: { flexDirection: 'row', position: 'absolute', bottom: 0, left: 0, right: 0 },
  diaHead: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3, borderRightWidth: 1, borderColor: NSA.borderSubtle, height: HEADER_H - 16 },
  diaWd: { fontFamily: Fonts.medium, fontSize: 8, color: NSA.inkMuted },
  diaNum: { fontFamily: Fonts.semibold, fontSize: 11, color: NSA.inkSecondary },
  mesLabel: { position: 'absolute', top: 3, fontFamily: Fonts.semibold, fontSize: 10, color: NSA.green800 },
  fimDeSemana: { backgroundColor: NSA.bgMuted },
  hojeCol: { backgroundColor: NSA.green50 },
  hojeColBg: { backgroundColor: NSA.green50, opacity: 0.6 },

  projRow: { position: 'absolute', left: 0, justifyContent: 'center', borderBottomWidth: 1, borderColor: NSA.border, backgroundColor: 'rgba(246,246,242,0.5)' },
  bodyRow: { position: 'absolute', left: 0, justifyContent: 'center', borderBottomWidth: 1, borderColor: NSA.borderSubtle },
  bgCol: { position: 'absolute', top: 0, bottom: 0, borderRightWidth: 1, borderColor: NSA.borderSubtle },
  // Barra-resumo do projeto: span do primeiro início ao último fim das tarefas.
  spanBar: { position: 'absolute', height: 6, borderRadius: 3, opacity: 0.45, top: PROJ_H / 2 - 3 },
  selPreview: { position: 'absolute', top: 3, bottom: 3, backgroundColor: 'rgba(23,37,20,0.15)', borderWidth: 1.5, borderColor: NSA.green800, borderStyle: 'dashed', borderRadius: 5 },
  bar: { position: 'absolute', height: TASK_H - 8, top: 4, borderRadius: 5, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1.5, overflow: 'hidden' },
  // Barra "pega" (long-press no touch / arraste): eleva pra sinalizar que vai mover.
  barLift: { zIndex: 50, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 5 },
  barText: { flex: 1, fontFamily: Fonts.semibold, fontSize: 10, color: '#fff' },
  handle: { position: 'absolute', top: 0, bottom: 0, width: HANDLE },

  listaContent: { paddingHorizontal: Spacing.sp4, paddingTop: Spacing.sp2 },
  listaProjHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sp4, marginBottom: Spacing.sp2 },
  listaProj: { flex: 1, fontFamily: Fonts.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: NSA.inkSecondary },
  listaProjMeta: { fontFamily: Fonts.medium, fontSize: 12, color: NSA.inkMuted },
  listaSemTarefa: { fontFamily: Fonts.regular, fontSize: 13, color: NSA.inkMuted, marginBottom: 6 },
  listaHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listaTarefa: { flex: 1, fontFamily: Fonts.semibold, fontSize: 15, color: NSA.inkPrimary },
  listaSub: { fontFamily: Fonts.regular, fontSize: 13, color: NSA.inkSecondary, marginTop: 6 },
  listaNotes: { fontFamily: Fonts.regular, fontSize: 13, color: NSA.inkMuted, marginTop: 4, fontStyle: 'italic' },

  vazioBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.sp6 },
  vazio: { fontFamily: Fonts.regular, fontSize: 14, color: NSA.inkMuted, textAlign: 'center', lineHeight: 21 },

  modalRoot: { flex: 1, backgroundColor: 'rgba(15,15,13,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: NSA.bg, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: NSA.border },
  modalTitle: { flex: 1, fontSize: 17, fontFamily: Fonts.loraSemibold, color: NSA.inkPrimary, marginRight: 8 },
  modalScroll: { paddingHorizontal: 20 },
  modalScrollContent: { paddingVertical: 18 },
  label: { fontSize: 13, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginTop: 16, marginBottom: 8 },
  labelInline: { fontSize: 13, fontFamily: Fonts.semibold, color: NSA.inkPrimary },
  hint: { fontSize: 12, fontFamily: Fonts.regular, color: NSA.inkMuted, marginTop: 6 },
  input: { backgroundColor: NSA.bgElevated, borderWidth: 1, borderColor: NSA.borderStrong, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.regular, color: NSA.inkPrimary },
  textarea: { minHeight: 72, textAlignVertical: 'top' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.lg, backgroundColor: NSA.bgMuted, borderWidth: 1, borderColor: NSA.border, maxWidth: '100%' },
  opChipText: { fontFamily: Fonts.medium, fontSize: 13, color: NSA.inkSecondary, flexShrink: 1 },
  corSwatch: { width: 40, height: 40, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  corSwatchActive: { borderColor: NSA.inkPrimary },

  periodoRow: { flexDirection: 'row', gap: 12 },
  stepperCol: { flex: 1 },
  stepperLabel: { fontFamily: Fonts.medium, fontSize: 12, color: NSA.inkMuted, marginBottom: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: NSA.bgElevated, borderWidth: 1, borderColor: NSA.borderStrong, borderRadius: Radius.lg, paddingHorizontal: 6, paddingVertical: 6 },
  stepperBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: NSA.bgMuted },
  stepperVal: { fontFamily: Fonts.semibold, fontSize: 14, color: NSA.inkPrimary },

  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.lg, backgroundColor: NSA.bgMuted, borderWidth: 1, borderColor: NSA.border },
  segActive: { backgroundColor: NSA.green800, borderColor: NSA.green800 },
  segText: { fontFamily: Fonts.medium, fontSize: 12, color: NSA.inkSecondary },
  segTextActive: { color: NSA.cream, fontFamily: Fonts.semibold },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },

  modalFooter: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: NSA.border },
});
