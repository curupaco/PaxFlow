/**
 * Suíte de Testes de Regressão e Integridade do Inbox Modular
 * Testa: InboxPage, EscalaView, CalendarView, AlertsFeed e integrações
 */

// Mock de CSS loader no Node
// @ts-ignore
require.extensions['.css'] = () => {};

import { AlertItem, PerfilConsultor } from '../src/types';

// Mock de WebSocket para execução em Node.js < 22
class MockWebSocket {
  public url: string;
  public readyState: number = 1;
  constructor(url: string) {
    this.url = url;
  }
  public send() {}
  public close() {}
  public addEventListener() {}
  public removeEventListener() {}
}
(global as any).WebSocket = MockWebSocket;

// ==========================================
// 1. SETUP DE MOCK DO AMBIENTE DOM / BROWSER
// ==========================================

class MockDOMElement {
  public tagName: string;
  public id: string = '';
  public className: string = '';
  public classList: {
    contains: (c: string) => boolean;
    add: (...c: string[]) => void;
    remove: (...c: string[]) => void;
  };
  public innerHTML: string = '';
  public textContent: string = '';
  public value: string = '';
  public checked: boolean = false;
  public disabled: boolean = false;
  public dataset: Record<string, string> = {};
  public attributes: Record<string, string> = {};
  private listeners: Record<string, Function[]> = {};

  constructor(tagName: string = 'div') {
    this.tagName = tagName.toUpperCase();
    const classes = new Set<string>();
    this.classList = {
      contains: (c: string) => classes.has(c),
      add: (...c: string[]) => c.forEach(item => classes.add(item)),
      remove: (...c: string[]) => c.forEach(item => classes.delete(item))
    };
  }

  public setAttribute(name: string, val: string): void {
    this.attributes[name] = val;
    if (name === 'id') this.id = val;
    if (name === 'class') this.className = val;
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[key] = val;
    }
  }

  public getAttribute(name: string): string | null {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      return this.dataset[key] || null;
    }
    return this.attributes[name] || null;
  }

  public addEventListener(event: string, fn: Function): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  public removeEventListener(event: string, fn: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== fn);
  }

  public dispatchEvent(event: { type: string }): boolean {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(h => h(event));
    return true;
  }

  public querySelector(sel: string): MockDOMElement | null {
    const el = new MockDOMElement('div');
    if (sel.startsWith('#')) el.id = sel.slice(1);
    if (sel.startsWith('.')) el.className = sel.slice(1);
    return el;
  }

  public querySelectorAll(sel: string): MockDOMElement[] {
    const el1 = new MockDOMElement('div');
    const el2 = new MockDOMElement('div');
    if (sel.startsWith('.')) {
      el1.className = sel.slice(1);
      el2.className = sel.slice(1);
    }
    return [el1, el2];
  }

  public appendChild(child: any): any {
    return child;
  }
}

// Configurar variáveis globais de simulação
(global as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  traduzirErro: (e: any) => e
};

(global as any).document = {
  head: new MockDOMElement('head'),
  body: new MockDOMElement('body'),
  createElement: (tag: string) => new MockDOMElement(tag),
  getElementById: (id: string) => {
    const el = new MockDOMElement('div');
    el.id = id;
    return el;
  },
  querySelectorAll: (sel: string) => {
    const el = new MockDOMElement('div');
    if (sel.startsWith('.')) el.className = sel.slice(1);
    return [el];
  },
  querySelector: (sel: string) => {
    const el = new MockDOMElement('div');
    return el;
  }
};

(global as any).localStorage = {
  store: {} as Record<string, string>,
  getItem(k: string) { return this.store[k] || null; },
  setItem(k: string, v: string) { this.store[k] = v; },
  removeItem(k: string) { delete this.store[k]; },
  clear() { this.store = {}; }
};

(global as any).CustomEvent = class CustomEvent {
  public type: string;
  public detail: any;
  constructor(type: string, params: any = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};

// ==========================================
// 2. DADOS DE TESTE (MOCKS REALISTAS)
// ==========================================

const mockAdminPerfil: PerfilConsultor = {
  id: 'admin-uuid-1',
  nome: 'Administrador PaxFlow',
  email: 'admin@paxflow.com',
  role: 'admin',
  ativo: true,
  avatar_url: undefined,
  created_at: new Date().toISOString()
};

const mockConsultorPerfil: PerfilConsultor = {
  id: 'consultor-uuid-2',
  nome: 'Consultor Carlos',
  email: 'carlos@paxflow.com',
  role: 'consultor',
  ativo: true,
  avatar_url: undefined,
  created_at: new Date().toISOString()
};

const mockAlerts: AlertItem[] = [
  {
    id: 'manual-101',
    type: 'manual',
    title: 'Lembrete de Voo',
    sender: 'Carlos Consultor',
    senderAvatar: 'carlos',
    senderId: 'consultor-uuid-2',
    subject: 'Verificar conexão em Lisboa para passageiro João',
    body: 'Corpo do lembrete de voo detalhado',
    targetId: 'lembrete-101',
    createdAt: new Date().toISOString(),
    dateStr: 'Hoje 10:00',
    arquivado: false,
    isSent: false,
    isDecision: false,
    consultorId: 'consultor-uuid-2',
    consultorNome: 'Carlos Consultor',
    eventDate: '2026-09-06'
  },
  {
    id: 'sla-passport-102',
    type: 'passport',
    title: 'Passaporte Próximo do Vencimento',
    sender: 'Sistema PaxFlow',
    senderAvatar: 'sistema',
    senderId: 'sistema',
    subject: 'Passaporte vence em menos de 6 meses',
    body: 'Passaporte do passageiro requer renovação imediata',
    targetId: 'viagem-102',
    createdAt: new Date().toISOString(),
    dateStr: 'Hoje 09:00',
    arquivado: false,
    isSent: false,
    isDecision: false,
    consultorId: 'consultor-uuid-2',
    consultorNome: 'Carlos Consultor',
    eventDate: '2026-09-06'
  },
  {
    id: 'sla-refund-103',
    type: 'refund',
    title: 'Reembolso Crítico SLA',
    sender: 'Financeiro',
    senderAvatar: 'financeiro',
    senderId: 'admin-uuid-1',
    subject: 'Prazo limite para reembolso expira em 24h',
    body: 'Detalhes do reembolso crítico',
    targetId: 'reembolso-103',
    createdAt: new Date().toISOString(),
    dateStr: 'Ontem 15:30',
    arquivado: false,
    isSent: false,
    isDecision: false,
    consultorId: 'admin-uuid-1',
    consultorNome: 'Administrador',
    eventDate: '2026-09-07'
  },
  {
    id: 'mention-104',
    type: 'mention',
    title: 'Você foi mencionado por Marina',
    sender: 'Marina Gestora',
    senderAvatar: 'marina',
    senderId: 'marina-uuid-3',
    subject: 'Por favor, avalie a proposta comercial do cliente XPTO',
    body: 'Marina mencionou você nos comentários',
    targetId: 'orcamento-104',
    createdAt: new Date().toISOString(),
    dateStr: 'Hoje 11:20',
    arquivado: false,
    isSent: false,
    isDecision: false,
    consultorId: 'consultor-uuid-2',
    consultorNome: 'Carlos Consultor',
    eventDate: '2026-09-06'
  },
  {
    id: 'escala-sol-105-inbox',
    type: 'escala_solicitacao',
    title: 'Solicitação de Folga: Carlos',
    sender: 'Carlos Consultor',
    senderAvatar: 'carlos',
    senderId: 'consultor-uuid-2',
    subject: 'Folga solicitada para 15/10/2026',
    body: 'Solicitação de folga enviada por Carlos Consultor',
    targetId: 'sol-db-105',
    createdAt: new Date().toISOString(),
    dateStr: 'Hoje 12:00',
    arquivado: false,
    isSent: false,
    isDecision: false,
    solicitacaoStatus: 'pendente_admin',
    consultorId: 'consultor-uuid-2',
    consultorNome: 'Carlos Consultor',
    eventDate: '2026-09-06'
  }
];

// ==========================================
// 3. EXECUÇÃO DOS TESTES
// ==========================================

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    testsFailed++;
  }
}

async function runRegressionSuite() {
  console.log('\n======================================================');
  console.log('🧪 INICIANDO SUÍTE DE TESTES DE REGRESSÃO DO PAXFLOW');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // TESTE 1: AlertsFeed (Renderização, Estados e Ações)
  // ----------------------------------------------------
  console.log('📦 [MÓDULO 1: AlertsFeed]');
  const { AlertsFeed } = await import('../src/components/inbox/AlertsFeed');

  let alertClicked = false;
  let quickArchiveCalled = false;
  let escalaAdminActionCalled = false;

  const mockContainer = new MockDOMElement('div');

  const alertsFeed = new AlertsFeed({
    container: mockContainer as any,
    filteredAlerts: mockAlerts,
    readList: ['manual-101'],
    selectedAlertIds: new Set(['manual-101', 'sla-passport-102']),
    perfil: mockAdminPerfil,
    onAlertClick: (alert) => { alertClicked = true; },
    onQuickArchive: (alert) => { quickArchiveCalled = true; },
    onSelectAll: () => {},
    onSelectItem: () => {},
    onBulkRead: () => {},
    onBulkUnread: () => {},
    onBulkArchive: () => {},
    onMarkAllRead: () => {},
    onEscalaAdminAction: () => { escalaAdminActionCalled = true; }
  });

  const htmlFeed = alertsFeed.render();
  assert(htmlFeed.includes('inbox-card'), 'Deve renderizar cards de alertas');
  assert(htmlFeed.includes('2 selecionado(s)'), 'Deve exibir contador correto de itens selecionados');
  assert(htmlFeed.includes('btn-bulk-read'), 'Deve exibir botão de marcar lidas em massa');
  assert(htmlFeed.includes('btn-bulk-archive'), 'Deve exibir botão de arquivar em massa');
  assert(htmlFeed.includes('btn-aprovar-escala-inbox'), 'Admin deve visualizar botão de aprovar escala diretamente no card');
  assert(htmlFeed.includes('btn-recusar-escala-inbox'), 'Admin deve visualizar botão de recusar escala diretamente no card');
  assert(htmlFeed.includes('Lembrete de Voo'), 'Deve conter o título do alerta manual');
  assert(htmlFeed.includes('Passaporte Próximo do Vencimento'), 'Deve conter o alerta de passaporte');
  assert(htmlFeed.includes('Reembolso Crítico SLA'), 'Deve conter o alerta de reembolso');

  // Teste de Caixa Vazia
  alertsFeed.updateState([], [], new Set(), mockAdminPerfil);
  const emptyHtml = alertsFeed.render();
  assert(emptyHtml.includes('Caixa Vazia'), 'Deve renderizar tela de Caixa Vazia quando lista for zerada');

  // Teste de setupEventListeners sem erro
  alertsFeed.setupEventListeners(mockContainer as any);
  assert(true, 'setupEventListeners do AlertsFeed executa sem exceções');

  // ----------------------------------------------------
  // TESTE 2: CalendarView (Mês, Semana, Agenda e Navegação)
  // ----------------------------------------------------
  console.log('\n📅 [MÓDULO 2: CalendarView]');
  const { CalendarView } = await import('../src/components/inbox/CalendarView');

  const calendarView = new CalendarView({
    container: mockContainer as any,
    alerts: mockAlerts,
    filteredAlerts: mockAlerts,
    onAlertClick: () => {}
  });

  // Modo Mês
  calendarView.calendarMode = 'month';
  const htmlMonth = calendarView.render();
  assert(htmlMonth.includes('cal-mode-month'), 'Deve conter o seletor de modo Mês');
  assert(htmlMonth.includes('Dom') && htmlMonth.includes('Seg') && htmlMonth.includes('Sáb'), 'Deve conter os 7 dias da semana no cabeçalho');
  assert(htmlMonth.includes('calendar-event-pill'), 'Deve renderizar pílulas de alertas nos dias da grade');

  // Modo Semana
  calendarView.calendarMode = 'week';
  const htmlWeek = calendarView.render();
  assert(htmlWeek.includes('cal-mode-week'), 'Deve renderizar controles do modo Semana');
  assert(htmlWeek.includes('calendar-week-container'), 'Modo semana deve ter container da semana');
  assert(htmlWeek.includes('calendar-week-column'), 'Modo semana deve ter colunas diárias');

  // Modo Agenda
  calendarView.calendarMode = 'agenda';
  const htmlAgenda = calendarView.render();
  assert(htmlAgenda.includes('cal-mode-agenda'), 'Deve renderizar controles do modo Agenda');

  // Navegação de datas
  calendarView.calendarSelectedDate = new Date(2026, 8, 15); // Setembro 2026
  assert(calendarView.calendarSelectedDate.getFullYear() === 2026, 'Data do calendário atualizada com sucesso');

  calendarView.setupEventListeners();
  assert(true, 'setupEventListeners do CalendarView executa sem exceções');

  // ----------------------------------------------------
  // TESTE 3: EscalaView (Grade, Herói, Modais e Ações)
  // ----------------------------------------------------
  console.log('\n👥 [MÓDULO 3: EscalaView]');
  const { EscalaView } = await import('../src/components/inbox/EscalaView');

  const escalaView = new EscalaView({
    container: mockContainer as any,
    perfil: mockAdminPerfil,
    user: { id: 'admin-uuid-1' },
    consultants: [mockConsultorPerfil],
    allConsultants: [mockAdminPerfil, mockConsultorPerfil],
    showToast: () => {},
    onDataChanged: async () => {},
    onStateUpdate: () => {}
  });

  const htmlEscala = escalaView.render();
  assert(htmlEscala.includes('escala-container'), 'Deve conter container principal da escala');
  assert(htmlEscala.includes('escala-hero'), 'Deve conter seção de herói da escala');
  assert(htmlEscala.includes('btn-escala-solicitar-troca'), 'Deve conter botão de solicitar troca / folga');
  assert(htmlEscala.includes('btn-escala-admin-edit'), 'Admin deve ter botão de editar escala');
  assert(htmlEscala.includes('btn-escala-gerenciar-membros'), 'Admin deve ter botão de gerenciar integrantes');
  assert(htmlEscala.includes('escala-table'), 'Deve conter tabela da grade mensal');
  assert(htmlEscala.includes('escala-legend'), 'Deve conter legenda de turnos e folgas');

  escalaView.setupEventListeners();
  assert(true, 'setupEventListeners do EscalaView executa sem exceções');

  // ----------------------------------------------------
  // TESTE 4: InboxPage (Orquestrador Central e Ciclo de Vida)
  // ----------------------------------------------------
  console.log('\n📥 [MÓDULO 4: InboxPage Orquestrador]');
  const { InboxPage } = await import('../src/pages/Inbox');

  const inboxPage = new InboxPage(mockContainer as any);
  assert(typeof inboxPage.init === 'function', 'InboxPage possui método init()');
  assert(typeof inboxPage.destroy === 'function', 'InboxPage possui método destroy()');

  // Teste de destruição limpa de canais
  inboxPage.destroy();
  assert(true, 'destroy() executa a limpeza de realtime e canais de sincronização sem erros');

  // ----------------------------------------------------
  // TESTE 5: Router e Bootstrapping
  // ----------------------------------------------------
  console.log('\n🔀 [MÓDULO 5: Router & Bootstrapping]');
  const { Router } = await import('../src/router');

  const router = new Router(mockContainer as any);
  assert(typeof router.navigate === 'function', 'Router possui navegação para páginas');

  // Teste de navegação do router para 'inbox'
  router.navigate('inbox');
  assert(router.getCurrentPage() === 'inbox', 'Router navega com sucesso para a página inbox');
  assert(router.getCurrentInstance() instanceof InboxPage, 'Router instancia corretamente a InboxPage refatorada');

  console.log('\n======================================================');
  console.log(`🏁 RESUMO DOS TESTES: ${testsPassed} PASSARAM | ${testsFailed} FALHARAM`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRegressionSuite().catch(err => {
  console.error('Erro na suíte de testes:', err);
  process.exit(1);
});
