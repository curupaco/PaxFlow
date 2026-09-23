# 🔬 Auditoria Técnica — PaxFlow

> **Escopo:** Revisão estática completa do código-fonte (SPA TypeScript + Vite + Supabase), camadas de serviço, páginas/componentes, segurança, testes e dependências.
> **Data:** 22/09/2026 — **Método:** leitura e análise de evidências (`file:line`) sem alteração de nenhum arquivo.

---

## 📑 Sumário

1. [Resumo Executivo](#1-resumo-executivo)
2. [Critérios de Avaliação](#2-critérios-de-avaliação)
3. [Erros / Problemas Encontrados (Priorizados)](#3-erros--problemas-encontrados-priorizados)
   - 3.1 [Críticos — Segurança & Integridade](#31-críticos--segurança--integridade)
   - 3.2 [Altos — Bugs de Negócio & Vazamento de Dados](#32-altos--bugs-de-negócio--vazamento-de-dados)
   - 3.3 [Médios — Confiabilidade, Performance & Manutenção](#33-médios--confiabilidade-performance--manutenção)
   - 3.4 [Baixos — Qualidade & Higiene de Código](#34-baixos--qualidade--higiene-de-código)
   - 3.5 [UX & Usabilidade](#35-ux--usabilidade)
   - 3.6 [Falhas Ocultas — Diagnóstico Detalhado](#36-falhas-ocultas--diagnóstico-detalhado)
4. [Melhorias Recomendadas](#4-melhorias-recomendadas)
   - 4.1 [Quick Wins — Alto Ganho / Baixo Consumo](#41-quick-wins--alto-ganho--baixo-consumo)
5. [Roadmap Semanal (7 Dias)](#5-roadmap-semanal-7-dias)
6. [Pontos Fortes (para balanço)](#6-pontos-fortes-para-balanço)

---

## 1. Resumo Executivo

O PaxFlow é uma aplicação funcionalmente rica e com testes de regras de negócio bem distribuídos. Porém, a revisão identificou **4 problemas de segurança críticos** (chave privada VAPID no bundle, Edge Function de push sem autorização, Stored XSS em rotas públicas e exposição de PII sem autenticação), uma família de bugs de integridade financeira (conciliação, parsing de valores internacionais, escopo de busca de clientes) e **lacunas expressivas de UX**: sistema de feedback (toast) duplicado e conflitante, confirmações destrutivas fora do padrão do app, modais com colisão de ids globais e sem scroll lock, carregamento inconsistente e telas analíticas sem experiência mobile.

**Eixo central do problema:** o código desvia-se do próprio padrão que documenta — `.cursorrules` proíbe `any` (há 1.054 ocorrências), exige tipos gerados do banco (não existem) e define o contrato como "Zero-Break a Schema Drift", o que resultou em dezenas de fallbacks (42P01/42703) que **mascaram falhas reais** em vez de resolvê-las.

---

## 2. Critérios de Avaliação

| Símbolo | Significado |
| :---: | :--- |
| 🔴 **Crítico** | Vulnerabilidade explorável / perda irreversível de dados / integridade financeira |
| 🟠 **Alto** | Bug de negócio relevante / exposição indevida de dados / degradação severa |
| 🟡 **Médio** | Confiabilidade, performance ou manutenibilidade impactantes |
| 🟢 **Baixo** | Higiene de código, documentação, configuração |

**Estimativa de consumo de token para desenvolvimento** (esforço de correção via IA/assistente de codificação):

| Nível | Faixa estimada | Descrição |
| :---: | :---: | :--- |
| **Baixo** | ~≤ 5 mil tokens | Correção localizada (1-2 arquivos, mudança pontual) |
| **Médio** | ~5–20 mil tokens | Correção em vários pontos ou com refatoração leve |
| **Alto** | ~> 20 mil tokens | Refatoração sistêmica, mudança de arquitetura ou muitas dezenas de pontos |

---

## 3. Erros / Problemas Encontrados (Priorizados)

### 3.1 Críticos — Segurança & Integridade

| ID | Item (descrição breve) | Criticidade | Consumo (tokens) |
| --- | :--- | :---: | :---: |
| E01 | **Chave privada VAPID embutida no bundle do cliente.** O JWK privado (`d`) usado para assinar push está hardcoded em `src/services/pushSenderService.ts:4-11` e liberado para qualquer um que abrir o bundle. Permite forjar envios de push como a aplicação. | 🔴 Crítico | **Médio** (remover assinatura do cliente; manter apenas via Edge Function autenticada) |
| E02 | **Edge Function `send-push` sem autenticação/autorização.** `supabase/functions/send-push/index.ts:19-90` aceita `{userId, payload}` de qualquer chamador, com CORS `*` e `SERVICE_ROLE_KEY`. Permite push arbitrário (spam/phishing) para qualquer usuário da base. | 🔴 Crítico | **Médio** (exigir `auth.uid() === userId` / role check + CORS restrito) |
| E03 | **Stored XSS em páginas públicas.** `src/pages/PublicViews.ts:337-338, 350-353, 419-423, 867-870, 894` interpola dados do banco (descrição, fornecedor, destino, documento) em `innerHTML` sem escape. Página itinerário/proposta é anônima → script executado no browser de qualquer cliente. | 🔴 Crítico | **Alto** (helper `escapeHtml` compartilhado + aplicar em ~15 pontos de rotas públicas e painel; sanitizar `documento` de aceite) |
| E04 | **`obter_itinerario_publico` expõe PII e LOCs sem autenticação/token.** `supabase/migrations/20260906000000_paxflow_schema_completo.sql:914-951` é `SECURITY DEFINER` sem checar `auth.uid()`: retorna nome do cliente, ids e `codigo_reserva` para qualquer anônimo que enumerar UUIDs (LGPD). | 🔴 Crítico | **Médio** (adicionar token/secreto de acesso na query e políticas) |
| E05 | **`highlightMatch` sem escape → vetor global de XSS.** `src/utils/textHelper.ts:14` envolve texto do banco em `<mark>` sem escapar; usado em ~20 chamadas (`Dashboard.ts:3408`, `Orcamentos.ts:1101`, `Reembolsos.ts:628`). Cliente cadastrado como `<img onerror=...>` executa ao renderizar busca. | 🔴 Crítico | **Médio** (escapar em `textHelper` + garantir chamadas já sanitizadas) |
| E06 | **XSS em dados de cliente cridos (listagem, Digisac, NextTrip, Cadastros).** `Clientes.ts:282-285`, `SendTemplateMessageModal.ts:317/412` (histórico Digisac — conteúdo controlado pelo cliente final), `NextTripPage.ts:277-327`, `Cadastros.ts:1404-1411`, `services/comments.ts`. Não existe util compartilhado de escape (só o privado em `RiskDiagnosisDrawer.ts:10`). | 🔴 Crítico | **Médio** (criar util + aplicar nos call sites; mesmo esforço do E05) |
| E07 | **`conciliacaoService` marca LOC como conciliado mesmo sem registro bancário.** `src/services/conciliacaoService.ts:470-503`: se o update da transação falhar com `42P01`, o código ignora e ainda assim grava `loc_pagamentos.conciliado = true` — recebimento aparece quitado sem contrapartida. | 🔴 Crítico | **Baixo** (não engolir `42P01`; dar `throw` antes do update) |

### 3.2 Altos — Bugs de Negócio & Vazamento de Dados

| ID | Item (descrição breve) | Criticidade | Consumo (tokens) |
| --- | :--- | :---: | :---: |
| E08 | **Busca de clientes ignora escopo por consultor (vazamento de carteira).** `src/services/clienteSearchService.ts:133-135` só aplica `consultor_responsavel_id` quando **não há termo de busca**; consultor não-admin pesquisa a tabela inteira. | 🟠 Alto | **Baixo** (aplicar escopo também com busca / validar via RLS) |
| E09 | **`deleteAlert` apaga registro de negócio real de escala/balcão.** `src/services/inboxService.ts:186-194` — o botão "excluir alerta" executa `delete` em `escala_solicitacoes`, destruindo solicitação de folga/troca ou atendimento de balcão pendente. | 🟠 Alto | **Baixo** (excluir só a notificação; nunca o item) |
| E10 | **Parser CSV de extrato com ramo "internacional" inalcançável.** `src/services/csvExtratoParser.ts:12-23` — qualquer valor com vírgula cai no 1º `if`; `1,250.50` vira `1.2505` em vez de `1250.50`. Valores financeiros corrompidos na conciliação. | 🟠 Alto | **Baixo** (ordenar checagem: `,`+`.` → internacional; só `,` → brasileiro) |
| E11 | **RLS permissivas lendo/alterando a base toda.** `supabase/schema.sql:660-806` — políticas `USING (true)` / `WITH CHECK (true)` para clientes, viagens, orçamentos, notificações e comentários. Nenhum isolamento por consultor/agência na camada de linha. | 🟠 Alto | **Alto** (redesenho de políticas por agência/consultor + testes) |
| E12 | **Inbox montado com full-table loads sequenciais.** `src/services/inboxService.ts:450-1598` — ~10 queries sem filtro (clientes, reembolsos, viagens+produtos, profiles, mensagens, notificações) e sem `Promise.all`; agravado por fallback que relê orçamentos/viagens/clientes inteiros. Degrada conforme a base cresce. | 🟠 Alto | **Alto** (reestruturar queries com filtros, joins e paralelismo) |
| E13 | **Studio: fallback catch-all grava propostas num blob JSON de `global_settings`.** `src/services/studioPropostasService.ts:127-149, 248-294` trata **qualquer** erro como schema drift e move a lista para uma única row (bloat TOAST, sem paginação/relações). Mascara erros reais de rede/permissão. | 🟠 Alto | **Alto** (tratar erros específicos; manter dados relacionais) |
| E14 | **Risk Score trata destino vazio como viagem nacional.** `src/services/riskScoreService.ts:68` — `isNacional = ... || destinoNome.length === 0` pula checagens de passaporte/visto/seguro, subnotificando risco de viagens internacionais sem destino preenchido. | 🟠 Alto | **Baixo** (exigir destino ou tratar como desconhecido) |
| E15 | **NextTrip assume NPS ausente como nota 10 (promotor).** `src/services/nextTripEngineService.ts:182` — falta de NPS vira nota máxima → score de recompra inflado e falsos positivos. | 🟠 Alto | **Baixo** (neutralidade: média/nulo em vez de 10) |

### 3.3 Médios — Confiabilidade, Performance & Manutenção

| ID | Item (descrição breve) | Criticidade | Consumo (tokens) |
| --- | :--- | :---: | :---: |
| E16 | **Monkey-patch global do `localStorage`. `src/services/supabase.ts:667-695`** sobrescreve `getItem/setItem/removeItem` prefixando todas as chaves com `sandbox-` quando ativo. Altera API nativa globalmente; afeta libs e esconde estado de outras abas. | 🟡 Médio | **Médio** (isolar sandbox em módulo/branch de build, fora do bundle de produção) |
| E17 | **Sandbox/mock de ~600 linhas embarcado no bundle de produção.** `src/services/supabase.ts:319-665` + `mockData.ts` importado eager (linha 28). Código de demonstração trafega em produção. | 🟡 Médio | **Médio** (extrair via `import.meta.env.DEV`/flag de build) |
| E18 | **Pedido de permissão de push automático no boot.** `src/main.ts:260` → `pushNotificationService.ts:179-202` solicita `Notification.requestPermission()` sem gesto do usuário (anti-padrão de UX/privacidade). | 🟡 Médio | **Baixo** (pedir após ação/intenção) |
| E19 | **Fallback de envio de push direto do cliente (frágil e expõe chave).** `pushSenderService.ts:106-137` lê `push_subscriptions` de terceiros e tenta `fetch` no endpoint assinando com a chave local (falha por CORS; duplicado e desnecessário). | 🟡 Médio | **Médio** (remover em conjunto com E01/E02) |
| E20 | **Reflected XSS via `err.message` no router e email no login.** `src/main.ts:171` injeta `err.message` em `innerHTML`; `src/pages/Login.ts:247` injeta `<strong>${email}</strong>` sem escape. | 🟡 Médio | **Baixo** (escape/textContent) |
| E21 | **Router sem controle de acesso por papel.** `src/router.ts:52-91` instancia páginas admin (`cadastros`, `configuracoes`, `conciliacao`) para qualquer usuário logado; proteção só dentro das páginas (defense-in-depth ausente). | 🟡 Médio | **Baixo** (gate por `perfil.role` no router) |
| E22 | **Realtime callbacks sem try/catch (unhandled rejections).** `Inbox.ts:249-302`, `ComercialDashboard.ts:160-185`, `Orcamentos.ts:3116` — falha silenciosa de atualização e UI dessincronizada. | 🟡 Médio | **Baixo** (wrapping de erro + `render()` robusto) |
| E23 | **`markAllAlertsAsRead` executa N round-trips sequenciais.** `inboxService.ts:435-445` — 1 requisição por alerta (`maybeSingle`+`update`/`insert`). | 🟡 Médio | **Baixo** (batch em 1 a 2 queries) |
| E24 | **Regras de observação de toasts e duplicação: `showToast` idêntico em 10 páginas (~300 linhas).** `Orcamentos.ts:3065-3096`, `Dashboard.ts:1720-1751`, `Clientes.ts:1698`, `Relatorios.ts:3532`, `Configuracoes.ts:1608`, `Inbox.ts:1383`, `Reembolsos.ts:364`, `Cadastros.ts:1933`, `StudioPage.ts:2272`, `ComercialDashboard.ts:1655`. | 🟡 Médio | **Médio** (extrair util compartilhado) |
| E25 | **Re-render de página inteira por keystroke sem debounce.** `Inbox.ts:1211-1223`, `Orcamentos.ts:352-362`, `NextTripPage.ts:359-363`, `Reembolsos.ts:292-303`, `Conciliacao.ts:606-613` — rebuild total a cada tecla. | 🟡 Médio | **Baixo** (debounce + render seletivo) |
| E26 | **Orcamentos acumula listeners no `document` a cada render/modal.** `Orcamentos.ts:734-739` e `1629-1636` (`setupColumnButtons`/`openNovoOrcamentoModal`) — listeners anônimos nunca removidos. | 🟡 Médio | **Médio** (listeners nomeados + cleanup no `destroy`) |
| E27 | **Timers/listeners órfãos nas landing pages.** `LandingPage.ts:178-277,1359-1413` e `LandingPageNova.ts` — listeners anônimos de scroll/mousemove e timers recursivos infinitos sem `destroy` (rodam mesmo com a página oculta). | 🟡 Médio | **Médio** (clear no hide/unload; refatorar em um componente) |
| E28 | **Studio: rebuild completo do Live Preview a cada keystroke.** `StudioPage.ts:1551-1601` — sem debounce/`requestAnimationFrame`. | 🟡 Médio | **Médio** (debounce + render incremental) |
| E29 | **`buildOrFilter` com 7 `ilike %...%` (wildcard à esquerda).** `clienteSearchService.ts:24-60` — impede uso de índice B-tree; sequential scan na tabela. | 🟡 Médio | **Médio** (pg_trgm/`fuzzystrmatch` ou colunas geradas) |
| E30 | **NPS público: update crítico sem verificar `{ error }`.** `PublicViews.ts:781-795` — status da viagem / `pos_contato_concluido` podem falhar silenciosamente. | 🟡 Médio | **Baixo** (checar erro e tratar) |
| E31 | **Escala alterada antes do status da solicitação.** `escalaService.ts:750-801` — células gravadas antes do `update` do status; se o update falhar, retorna `success:false` mas o calendário já foi mutado; retorno de `salvarCelulaEscala` não é checado. | 🟡 Médio | **Baixo** (reordenar operações + checar erros) |
| E32 | **Casamento de nome de consultor frouxo em escala/balcão.** `escalaService.ts:6-15` (`isSameConsultantName`) compara só primeiro nome/`includes` → alerta entregue à pessoa errada. | 🟡 Médio | **Baixo** (usar `id` em vez de nome) |
| E33 | **Anexos: upload silenciosamente pulado cria registro órfão.** `anexosService.ts:181-232` — storage indisponível não aborta o insert; `cliente_id` não sanitizado no sync final (~:333). | 🟡 Médio | **Baixo** (abortar insert se upload falhar; sanitizar) |
| E34 | **`animate` resolução do fallback de conciliação devolve conciliados como pendentes.** `conciliacaoService.ts:261-291` — fallback `42703` não filtra `conciliado`; risco de re-conciliar item já conciliado. | 🟡 Médio | **Baixo** (manter filtro no fallback) |
| E35 | **Uso da senha de superusuário do banco em texto puro no `.env`.** `/.env:8` (`SUPABASE_PASSWORD`) — não versionado (ok), mas frágil para compartilhamento/backup. | 🟡 Médio | **Baixo** (mover para secrets do provider; nunca em arquivo de dev) |
| E36 | **`canvas-confetti` carregado via CDN de terceiros em runtime.** `src/utils/celebrations.ts:8` injeta `<script src="https://cdn.jsdelivr.net/...">`. Quebra offline/sem CDN e viola CSP; não está em `package.json`. | 🟡 Médio | **Baixo** (instalar via npm/bundler) |
| E37 | **`sw.js` navega para URL arbitrária do payload push sem validar origem.** `public/sw.js:48-67` usa `clients.openWindow(targetUrl)` com URL controlada por quem dispara o push (agravado por E02). | 🟡 Médio | **Baixo** (validar `origin === self.location.origin` + protocolo) |

### 3.4 Baixos — Qualidade & Higiene de Código

| ID | Item (descrição breve) | Criticidade | Consumo (tokens) |
| --- | :--- | :---: | :---: |
| E38 | **1.054 usos de `any`** (`: any` ×897, `as any` ×144) em 73 arquivos — viola `.cursorrules` ("proibido `any`") apesar de `strict: true`. Top: `Relatorios.ts` (152), `Dashboard.ts` (108), `EditTravelModal.ts` (85), `supabase.ts` (66), `inboxService.ts` (51). | 🟡 Médio | **Alto** (gradual; ganho real depende de tipagem gerada — ver M05) |
| E39 | **Tipos monolíticos com duplicação camelCase ⇄ snake_case.** `src/types/index.ts` (885 linhas, 642 campos, 408 opcionais) — duas fontes de verdade por campo; reconciliadas em runtime por `normalizeMockItem` (supabase.ts:41-109). | 🟡 Médio | **Alto** (adotar tipos gerados + um único padrão) |
| E40 | **Sem eslint/prettier no projeto** (nem scripts `lint`/`format`; formatação depende de extensão do VS Code). | 🟢 Baixo | **Baixo** |
| E41 | **Testes com cobertura real limitada da persistência.** `src/services/supabase.ts` a **0% de linhas**; maioria dos testes faz `vi.mock('../../src/services/supabase')` com fixtures `as any`. Cobertura dos services: 52,92% linhas / 61,46% branches. | 🟢 Baixo | **Alto** (mocks integrativos/contrato do banco) |
| E42 | **Schema contract test festeja colunas copiadas à mão, sem base gerada.** `tests/contracts/schemaContract.test.ts` e `.cursorrules` exigem `import type { Database } from '@/types/supabase'` — arquivo inexistente. | 🟢 Baixo | **Médio** (gerar types com `supabase gen types`) |
| E43 | **README/docs desatualizados citam arquivos inexistentes** (`src/todo.ts`, `src/services/viagensService.ts`, `todo.html` citados em README.md:148/184 e docs/documentation.md:315). | 🟢 Baixo | **Baixo** |
| E44 | **Dependências sem uso real: `msw` e `pg`.** `msw` não é importado em lugar nenhum; `pg` só em `scripts/rollback_migracao_malta.ts`. | 🟢 Baixo | **Baixo** |
| E45 | **Versão duplicada/divergente:** `package.json "version": "1.0.2"` vs `public/version.json` ("1.0.0-<timestamp>" gerado pelo plugin) e `"main": "index.js"` inexistente. | 🟢 Baixo | **Baixo** |
| E46 | **Tratamento triplo do mesmo `vite:preloadError`** (scripts inline do `index.html` líneas 22-25 e 305-309 + `main.ts:38-42`) — risco de reload duplo/competição. | 🟢 Baixo | **Baixo** |
| E47 | **Objetos globais expostos no `window`** (`main.ts:32`, `versionChecker.ts:153-155`, `PublicViews.ts:280-281`). | 🟢 Baixo | **Baixo** |
| E48 | **`versionChecker` registra listeners `visibilitychange`/`focus` sem remoção.** `versionChecker.ts:56-67` — duplicação de checagens com SPA. | 🟢 Baixo | **Baixo** |
| E49 | **Timers de 1s varrendo o DOM globalmente.** `Reembolsos.ts:173-182`, `ComercialDashboard.ts:1178-1194` (`querySelectorAll('.sla-active-timer')` a cada segundo) — desperdício contínuo de CPU. | 🟢 Baixo | **Baixo** |
| E50 | **Acessibilidade: modais sem `role="dialog"`/`aria-modal`/focus trap/ESC/foco restaurado** e apenas 1 `aria-label` no projeto (`dialog.ts:15-140`, `PublicViews.ts:1130-1170`, `EmailReaderModal.ts:71`). | 🟢 Baixo | **Médio** (padrão de modal compartilhado) |

### 3.5 UX & Usabilidade

| ID | Item (descrição breve) | Criticidade | Consumo (tokens) |
| --- | :--- | :---: | :---: |
| UX01 | **Sistema de toast duplicado em 10 arquivos, singleton sem fila → toasts se sobrescrevem.** Todos gravam em `#paxflow-toast` com `setTimeout` sem cancelar o anterior; 2ª ação substitui a 1ª e o timeout antigo esconde o novo. Estilos divergem (z-index `z-50` no `Inbox.ts:1394` vs `z-[99999]` nas demais; sucesso `bg-indigo-600` vs `bg-emerald-600`; posições `bottom-20 right-6` no Studio vs `bottom-5 right-5`). | 🟠 Alto | **Médio** (extrair para `services/dialog.ts` com fila e timeout cancelável) |
| UX02 | **Ações destrutivas ainda usam `confirm()`/`alert()` nativos do navegador**, quebrando o padrão visual do app (`showCustomConfirm` já existe). Casos: anexo em `EditTravelModal.ts:3877`, excluir Dia/Efetivar em `StudioPage.ts:1675/1815`, desfazer conciliação em `Conciliacao.ts:697`, escala em `EscalaView.ts:844/1757`, e **`alert()` de sucesso** no aceite público em `PublicViews.ts:1210`. | 🟠 Alto | **Baixo** (substituir por `showCustomConfirm`/toast) |
| UX03 | **Exclusão de viagem em cascata engole falhas parciais silenciosamente.** `Dashboard.ts:940-986` — cada DELETE de tabela filha (pagamentos, conferências, lembretes, reembolsos, produtos) é `console.warn`/`catch{}`; usuário recebe "Viagem excluída com sucesso!" mesmo com órfãos restantes. | 🟠 Alto | **Médio** (abortar com mensagem ou reportar falha parcial) |
| UX04 | **Colisão do id global `#modal-overlay` entre páginas** (`Dashboard.ts:1660-1692` nunca remove do body; `Orcamentos.ts:3019-3042` recria o MESMO id no portal). Navegar Dashboard→Orçamentos pode injetar modal no overlay errado. Além disso: **nenhum modal fecha no backdrop nem em ESC** e **não há scroll lock** (0 ocorrências de `body.style.overflow` no projeto). | 🟠 Alto | **Médio** (portal com id único por página; backdrop+ESC+scroll lock num componente modal) |
| UX05 | **Estado de carregamento inconsistente.** Skeleton real só em Dashboard/Clientes/Orçamentos; `NextTripPage.init()` (`:40`), `StudioPage.init()` (`:66-88`) e `Cadastros.init()` (`:53-89`) aguardam `loadData()` sem skeleton, contando apenas com o overlay opaco do router. `skeletonHelper.ts` (3 funções reutilizáveis) está subutilizado. | 🟡 Médio | **Baixo** (adotar `skeletonHelper` nas telas restantes) |
| UX06 | **Snooze do NextTrip falha silenciosamente.** `NextTripPage.ts:398-402` loga `console.error` e não mostra feedback; o usuário acredita que o contato foi reagendado e perde a oportunidade. | 🟡 Médio | **Baixo** (toast de erro + refresh do estado) |
| UX07 | **Validação de formulário heterogênea (3 padrões conflitantes):** inline por campo (Relatorios), toast genérico pós-submit (Dashboard:1299/1560, Clientes:641, Orcamentos:2086/2421) e "só o 1º erro". Não há padrão único de mensagem ao lado do campo. | 🟡 Médio | **Médio** (padronizar validação inline) |
| UX08 | **Formatação de datas/moeda duplicada localmente** (`formatarData` redefinido em Reembolsos/Dashboard/Conciliacao) e inconsistências: `Dashboard.ts:699` usa `toFixed(2).replace('.',',')`; `ComercialDashboard.ts:659` corta centavos (`maximumFractionDigits:0`); não há `formatBRL` compartilhado. | 🟡 Médio | **Baixo** (util `formatBRL`/`formatarData` único) |
| UX09 | **Mobile: Relatórios, Conciliação e Comercial usam só scroll horizontal.** `Relatorios.ts:762-4074` tem 16 wrappers `overflow-x-auto` e nenhum card dedicado; tabelas de 10+ colunas ficam quase inutilizáveis em telas estreitas (Dashboard/Reembolsos já têm cards — mostrar que é possível). | 🟡 Médio | **Alto** (cards responsivos nas 3 telas) |
| UX10 | **Balcão Co-Piloto some sem mensagem quando não há resultados.** `Dashboard.ts:1756/1786` retorna `''` quando a busca multicritério não encontra clientes de outros consultores — a seção desaparece sem nenhum empty state como "Nenhum cliente encontrado". | 🟡 Médio | **Baixo** (empty state explícito) |
| UX11 | **Ações em massa irreversíveis sem confirmação/undo:** "Marcar TODAS como lidas" (`AlertsFeed.ts:107-110`), tags em lote em clientes (`Clientes.ts:379-383`) e "Limpar Todos" pagamentos (`EditTravelModal.ts:3426`). | 🟡 Médio | **Baixo** (confirm/undo antes da ação) |
| UX12 | **Botões emoji-only (`🗑️`) sem `aria-label`/`sr-only`** em `Cadastros.ts:389/607/1417`, `Reembolsos.ts:697/827` e `StudioPage.ts:677` — dependem só de `title` (vago: "Excluir"). | 🟢 Baixo | **Baixo** (aria-label + tooltip) |
| UX13 | **Navegação renderiza página 2× por clique.** `main.ts:263` e `main.ts:1259` registram `hashchange` (a guarda `isInternalNavigating` só protege um deles); e a sidebar (`main.ts:1243-1247`) chama `navigate()` **sem atualizar `window.location.hash`** → URL dessincronizada da tela (refresh/voltar vão para a página errada). | 🟢 Baixo | **Médio** (unificar navegação num handler) |
| UX14 | **Overlay de loading global nunca é removido explicitamente.** `router.ts:39-48` cria `#paxflow-loading-overlay` mas nenhum código o remove; roda blur sobre conteúdo antigo por tempo indeterminado (com `pointer-events-none`, conteúdo continua clicável). | 🟢 Baixo | **Baixo** (remover no `navigate()` ao renderizar) |
| UX15 | **Filtro "Mês Corrente" trata datas inválidas como mês atual.** `Dashboard.ts:246-257` — `isNaN(year)/month===0` retorna `true`, então viagem sem `data_financeiro` de outro mês aparece como do mês corrente, distorcendo o contador das pills. | 🟢 Baixo | **Baixo** (datas inválidas → não pertencer ao mês) |

### 3.6 Falhas Ocultas — Diagnóstico Detalhado

> Fluxos que **aparentam funcionar** no caminho feliz, mas degradam ou corrompem dados em condições reais, com o erro sendo **engolido silenciosamente**. Para cada um: sintoma percebido, causa raiz, evidência, correção e esforço.

---

#### F01 — Conciliação Bancária (FinRecon™) pode "quitar" sem registro bancário

- **Sintoma:** Recebimento aparece como ✅ conciliado na tela, mas não existe contrapartida no extrato.
- **Causa raiz:** `conciliacaoService.ts:470-503` ignora erro `42P01` no update de `extratos_bancarios_transacoes`; o insert de vínculos só loga e **continua** (`:482-488`); e cada `loc_pagamentos` é marcado conciliado em `try/catch` individual (`:491-503`). Nenhuma etapa aborta as demais.
- **Evidência:** `src/services/conciliacaoService.ts:470-503`.
- **Correção:**
  1. Em `conciliacaoService.ts:470`, **lançar** erro em qualquer falha (`42P01` inclusive) antes de prosseguir.
  2. Fazer o insert de vínculos abortar a conciliação em caso de erro (remover `catch` que engole).
  3. Checar `error` e retorno de cada `update` de `loc_pagamentos`; só considerar sucesso se todas as linhas foram atualizadas.
  4. Ideal: envolver as 3 etapas numa **RPC/transação única no PostgreSQL** (fail atômico).
- **Esforço:** Baixo-Médio.
- **Nota:** usar `pg` (já em devDependencies) num script que verifique a existência real das tabelas/colunas antes de qualquer fallback (ver M05).

---

#### F02 — Importação de extrato CSV corrompe valores internacionais

- **Sintoma:** Arquivo com `1,250.50` (milhar com vírgula) é importado como `1.2505`.
- **Causa raiz:** Ramo "internacional" é inalcançável: `csvExtratoParser.ts:12` já cativa qualquer string com vírgula no ramo brasileiro.
- **Evidência:** `src/services/csvExtratoParser.ts:12-23`.
- **Correção:** Detectar formato pela posição dos separadores (se o último `,` vem **antes** do último `.` → internacional: remover vírgulas; senão → brasileiro: remover pontos). Adicionar testes de unidade com casos `1,250.50` / `3.500,00` / `5200.00`.
- **Esforço:** Baixo.

---

#### F03 — Busca de clientes vaza a carteira inteira para consultores não-admin

- **Sintoma:** Consultor digita um termo de busca e vê clientes de colegas (o filtro por responsável simplesmente deixa de valer).
- **Causa raiz:** `clienteSearchService.ts:133-135` só aplica `consultor_responsavel_id` quando **não há termo**.
- **Evidência:** `src/services/clienteSearchService.ts:126-137`.
- **Correção:**
  1. Aplicar o escopo por consultor **sempre** que `!isAdmin && consultorId`, inclusive com busca (encadear `.eq` após `.or`).
  2. Reforçar a mesma regra via **RLS** (a autorização não deve depender só da camada de app).
  3. Teste de regressão: consultor não-admin não recebe cliente de outro em nenhuma busca.
- **Esforço:** Baixo (código) — Médio (RLS).

---

#### F04 — Inbox: "Excluir alerta" apaga a solicitação de escala/balcão real

- **Sintoma:** Notificação de solicitação de folga é descartada → a solicitação desaparece do fluxo de aprovação.
- **Causa raiz:** `inboxService.ts:186-194` faz `delete` em `escala_solicitacoes` (não na notificação) para os tipos `escala_solicitacao` e `atendimento_balcao`.
- **Evidência:** `src/services/inboxService.ts:186-194`.
- **Correção:** Para esses tipos, **arquivar** a notificação (reutilizar `archiveAlert`) em vez de excluir o registro de negócio; ou, se a exclusão for intencional, exigir confirmação explícita e separar "excluir notificação" de "excluir solicitação". Nunca deletar a linha da `escala_solicitacoes` a partir da UI de inbox.
- **Esforço:** Baixo.

---

#### F05 — Inbox: "Arquivar alerta" retorna sucesso sem persistir

- **Sintoma:** Alerta é arquivado, mas reaparece após o reload.
- **Causa raiz:** `inboxService.ts:90-134` retorna `true` na linha 134 quando `targetUUID`/`resolvedUserId` não existem — sem gravar nada.
- **Evidência:** `src/services/inboxService.ts:134`.
- **Correção:** Retornar `false` (ou lançar) quando nada foi persistido; na camada de UI (`Inbox.ts:1302`), mostrar toast de falha em vez de remover o item da lista.
- **Esforço:** Baixo.

---

#### F06 — Push Notification: chave privada no cliente + Edge Function aberta

- **Sintoma:** Envio pode falhar silenciosamente (fallback cliente não funciona por CORS) **e** qualquer pessoa pode disparar push arbitrário para qualquer usuário.
- **Causa raiz:**
  1. Chave privada VAPID hardcoded em `pushSenderService.ts:4-11` (vai no bundle).
  2. `send-push` (`supabase/functions/send-push/index.ts:19-90`) usa `SERVICE_ROLE_KEY` e não verifica `auth.uid()`.
  3. Fallback `pushSenderService.ts:106-137` lê `push_subscriptions` e tenta `fetch` no endpoint assinando com a chave local (CORS bloqueia em navegadores modernos).
- **Evidência:** `src/services/pushSenderService.ts:4-11, 106-137`; `supabase/functions/send-push/index.ts`.
- **Correção (sequência):**
  1. Remover `VAPID_PRIVATE_JWK` do código (e da `supabase/functions/send-push/index.ts` — guardar como Secret da função).
  2. Na Edge Function: criar cliente anônimo com `auth.getUser()`, exigir `auth.uid() === userId` e restringir CORS à origem da app.
  3. Remover o fallback de envio direto do cliente (E19); manter só o caminho via Edge Function.
  4. `sw.js`: validar `origin === self.location.origin` antes de `openWindow` (E37).
- **Esforço:** Médio.

---

#### F07 — NextTrip: "Snooze" falha em silêncio

- **Sintoma:** Consultor clica em reagendar; nada acontece, mas nada é reportado — oportunidade perdida.
- **Causa raiz:** `NextTripPage.ts:398-402` captura erro e só faz `console.error`, sem toast nem atualização de estado.
- **Evidência:** `src/pages/NextTripPage.ts:398-402`.
- **Correção:** No `catch`: exibir toast de erro (via M13), não alterar o card, e permitir nova tentativa; no sucesso: atualizar a lista reativa ao banco.
- **Esforço:** Baixo.

---

#### F08 — NPS público pode salvar a nota sem atualizar a viagem

- **Sintoma:** Nota NPS registrada, mas status/`pos_contato_concluido` da viagem não mudam (sem feedback, sem retentativa).
- **Causa raiz:** `PublicViews.ts:781-795` — o update de `viagens` não destrutura `{ error }`; só um `catch` que loga `console.warn` e **continua**.
- **Evidência:** `src/pages/PublicViews.ts:781-795`.
- **Correção:** Destruturar `{ error }` do update; se falhar, reintentar e, se persistir, exibir alerta amigável ao passageiro (o NPS não deve "passar em branco").
- **Esforço:** Baixo.

---

#### F09 — Studio: qualquer erro vira fallback em blob JSON (`global_settings`)

- **Sintoma:** Propostas somem da listagem relacional e passam a viver num blob; erros de rede/permissão somem.
- **Causa raiz:** `listarPropostas` (`studioPropostasService.ts:147-149`) cai em `listarFallbackDrift` para **qualquer** exceção; o mesmo padrão em `buscar`/`salvar` move a lista inteira para uma única row.
- **Evidência:** `src/services/studioPropostasService.ts:127-150` (e 248-294).
- **Correção:** Restringir fallback apenas aos códigos reais de drift (`42703`/`42P01`/`PGRST204`); **re-lançar** demais erros para a UI tratar; remover o "catch-all" da linha 147. Ideal: criar a tabela/colunas de verdade (M05) e apagar o caminho de fallback.
- **Esforço:** Alto.

---

#### F10 — Upload de anexos pode gravar registro sem arquivo (órfão)

- **Sintoma:** Documento aparece na ficha, mas o arquivo não existe no storage.
- **Causa raiz:** `anexosService.ts:233` só faz upload se `supabase.storage` existir (senão pula); além disso, **qualquer** erro de insert cai em `salvarFallbackDrift` (`:320-329`).
- **Evidência:** `src/services/anexosService.ts:233-245, 313-330`.
- **Correção:**
  1. Se `storage` não existir ou o upload não ocorrer, **lançar antes do insert** (nunca criar registro sem arquivo).
  2. Restringir o fallback de schema aos códigos reais; erros de rede/permissão devem abortar com mensagem.
  3. Na sincronização com a ficha (`:332+`), tratar falha como erro, não como silêncio.
- **Esforço:** Médio.

---

#### F11 — Excluir viagem reporta sucesso mesmo com falha parcial na cascata

- **Sintoma:** "Viagem excluída!" mas sobram LOCs/reembolsos órfãos vínculados.
- **Causa raiz:** `Dashboard.ts:940-986` — cada DELETE de tabela filha (comentários, notificações, pagamentos, conferências, lembretes, reembolsos, produtos) usa `console.warn`/`catch{}` e o fluxo prossegue.
- **Evidência:** `src/pages/Dashboard.ts:925-970`.
- **Correção:** Acumular erros; se **qualquer** filho falhar, exibir "exclusão parcial" com a lista de pendências (não exibir sucesso). O ideal é uma **RPC de exclusão transacional** no banco que apague tudo em uma transação (usar `pg`/SQL migration).
- **Esforço:** Médio.

---

#### F12 — Escalas: calendário alterado mesmo sem a aprovação ser salva

- **Sintoma:** Solicitação reprovada/erro de rede, mas a célula de escala já foi modificada.
- **Causa raiz:** `escalaService.ts:750-782` grava células da escala **antes** do `update` de status (`:788-801`) e ignora o retorno de `salvarCelulaEscala`.
- **Evidência:** `src/services/escalaService.ts:750-801`.
- **Correção:** Inverter a ordem: primeiro persistir o status; **só então**, se `success`, gravar as células. Verificar cada `salvarCelulaEscala`. Para férias (loop de ~30 upserts), agrupar em 1-2 updates por mês.
- **Esforço:** Baixo-Médio.

---

#### F13 — Attr "Risk Score" trata destino vazio como viagem nacional

- **Sintoma:** Viagem internacional sem destino preenchido não emite alertas de passaporte/visto/seguro.
- **Causa raiz:** `riskScoreService.ts:68` — `destinoNome.length === 0` força `isNacional = true`.
- **Evidência:** `src/services/riskScoreService.ts:51-68`.
- **Correção:** Destino vazio → tratar como **desconhecido** (rodar as checagens internacionais) ou exigir preenchimento na criação da viagem; nunca assumir nacional por ausência de dado.
- **Esforço:** Baixo.

---

#### F14 — NextTrip: ausência de NPS infla o score de recompra

- **Sintoma:** Cliente sem avaliação entra na lista de "alto potencial" indevidamente.
- **Causa raiz:** `nextTripEngineService.ts:182` — `?? 10` assume nota máxima quando não há NPS.
- **Evidência:** `src/services/nextTripEngineService.ts:182`.
- **Correção:** Neutralidade: NPS ausente não concede pontos (score 0 naquele vetor) ou usa a média do vetor; adicionar teste de caso nulo.
- **Esforço:** Baixo.

---

#### F15 — Realtime: callbacks sem try/catch dessincronizam a UI

- **Sintoma:** Em falha de rede, uma tela fica com dados antigos sem o usuário perceber (e sem log útil).
- **Causa raiz:** `Inbox.ts:249-302`, `ComercialDashboard.ts:160-185`, `Orcamentos.ts:3116` — callbacks `async` sem `try/catch` (unhandled rejections).
- **Evidência:** `src/pages/Inbox.ts:249-302`, `src/pages/ComercialDashboard.ts:160-185`, `src/pages/Orcamentos.ts:3116-3118`.
- **Correção:** Envolver cada callback em `try/catch`, exibir toast de falha pontual e manter o último estado válido; centralizar num helper `safeRealtime(cb)`.
- **Esforço:** Baixo.

---

#### F16 — Navegação: página renderizada 2× por clique + URL dessincronizada

- **Sintoma:** Dupla carga de dados a cada navegação; reload/voltar abrem a tela errada.
- **Causa raiz:** Dois listeners de `hashchange` em `main.ts:263` e `:1259` (guard só protege um); cliques na sidebar (`main.ts:1243-1247`) chamam `navigate()` sem atualizar `location.hash`.
- **Evidência:** `src/main.ts:263, 1243-1259, 1277-1284`.
- **Correção:** Um único handler de navegação; sidebar sempre `location.hash = rota`; `navigate()` não deve ser chamado manualmente além do hashchange; overlay de loading removido ao final do render (UX14).
- **Esforço:** Médio.

---

#### F17 — Dashboard: "Mês Corrente" conta datas inválidas como do mês atual

- **Sintoma:** Contadores das pills (Mês Corrente / Ver Tudo) distorcidos por viagens sem data financeiro.
- **Causa raiz:** `Dashboard.ts:246-257` retorna `true` quando `isNaN(year)||month===0`.
- **Evidência:** `src/pages/Dashboard.ts:237-257`.
- **Correção:** Datas vazias/inválidas → não pertencem a nenhum mês (avaliar agrupamento separado "sem data financeiro"); adicionar teste unitário.
- **Esforço:** Baixo.

---

## 4. Melhorias Recomendadas

| ID | Melhoria | Benefício | Consumo (tokens) |
| --- | :--- | :--- | :---: |
| M01 | **Criar utilitário compartilhado `escapeHtml`/renderização por `textContent`** e exigir seu uso em toda interpolação de dados (hoje só existe o privado em `RiskDiagnosisDrawer.ts`). | Elimina a família de XSS E03/E05/E06 de uma vez | **Médio** |
| M02 | **Extrair `showToast`, `renderAuthError`, `renderLoading`, formato de data/moeda e skeletons** para módulos em `src/utils/` (10 páginas duplicam hoje). | Manutenção e correções em 1 ponto | **Médio** |
| M03 | **Remover código sandbox/mock do bundle de produção** (`supabase.ts:319-695` + `mockData.ts`) via build flag/`import.meta.env.DEV`. | Reduz bundle, remove monkey-patch e riscos | **Médio** |
| M04 | **Centralizar autorização:** gate de role no router (E21) + políticas RLS por agência/consultor (E11) + escopo na busca (E08). | Defesa em profundidade e privacidade | **Alto** |
| M05 | **Gerar tipos do banco** (`supabase gen types typescript`) e migrar de `any`/campos duplicados para um único contrato. | Elimina schema drift, fallbacks 42P01/42703 e 1.054 `any` | **Alto** |
| M06 | **Adicionar lint/format com `eslint` + `prettier`** e hooks/CI (hoje nada é forçável). | Qualidade reproduzível entre máquinas | **Baixo** |
| M07 | **Adicionar paginação real e `Promise.all` no Inbox** (E12) e eliminar full-table scans (E23, E29, escala). | Escala com o crescimento da base | **Alto** |
| M08 | **Padronizar modales (acessibilidade)** com `role="dialog"`, focus trap, ESC e restauração de foco num único componente (E50). | Usabilidade e conformidade | **Médio** |
| M09 | **Testes de contrato contra banco real/local** (deixe de festejar colunas manuais) + cobrir `supabase.ts` e fluxos de escrita. | Confiança em integração (maior risco hoje) | **Alto** |
| M10 | **Fundir/unificar as duas landing pages** (`LandingPage.ts` vs `LandingPageNova.ts`, ~51% de similaridade) com listeners e timers com cleanup. | Menos duplicação e bugs (E27) | **Alto** |
| M11 | **Empacotar `canvas-confetti` via npm** (eliminar CDN em runtime) e unificar o handler `vite:preloadError` (E36/E46). | Resiliência offline e CSP | **Baixo** |
| M12 | **Instrumentar observabilidade:** logs estruturados dos catches silenciosos (E09, E12, E33), em vez de engolir erro. | Diagnóstico real de falhas | **Baixo** |
| M13 | **Unificar o sistema de toast/feedback** em `services/dialog.ts` com fila, timeout cancelável e estilos padrão (aplica-se a UX01 e às 10 cópias de `showToast`). | Feedback consistente; elimina sobrescrita de notificações | **Médio** |
| M14 | **Criar componente modal único** com portais por página, fechamento por backdrop/ESC, scroll lock (`body overflow`) e acessibilidade (resolve E50 + UX04). Mescla a colisão do id `#modal-overlay`. | Modais robustos e acessíveis em todas as telas | **Médio** |
| M15 | **Padronizar confirmações irreversíveis** — substituir `confirm()`/`alert()` nativos (UX02) e exigir confirmação/undo em ações em massa (UX11). | Consistência visual e prevenção de erro do usuário | **Baixo** |
| M16 | **Criar utils `formatBRL`, `formatarData` e tratamento de datas inválidas** (UX08, UX15), substituindo as definições locais e os formatos divergentes. | Consistência de valores e filtros corretos | **Baixo** |
| M17 | **Unificar a navegação** em um único handler de `hashchange`/menu e sincronizar `location.hash` nos cliques da sidebar (UX13). | 1 render por navegação; URL fiel ao estado | **Médio** |

### 4.1 Quick Wins — Alto Ganho / Baixo Consumo

> Pacote de melhorias de custo mínimo e impacto imediato. Todas verificadas no código (Q1–Q10). Alto retorno percebido antes/durante a semana de correções.

**Segurança em camada:**

| ID | Melhoria | Benefício | Consumo (tokens) |
| --- | :--- | :--- | :---: |
| Q1 | **Security headers no `dist/_headers`** — adicionar `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy` (hoje o arquivo só tem Cache-Control). | Bloqueia clickjacking, sniffing de MIME e vazamento de referrer — 10 linhas que complementam a Fase de Segurança | **Baixo** |
| Q2 | **Gerar `/icon-192.png` + PNGs reais no `manifest.json`** — o `public/sw.js:31-32` referencia um ícone que **não existe** (`/icon-192.png`); o manifest usa apenas SVG. | Push com ícone correto no Android/iOS; install prompt do PWA validado em browsers que exigem PNG | **Baixo** |

**Confiabilidade sistêmica (rede de segurança p/ falhas silenciosas):**

| ID | Melhoria | Benefício | Consumo (tokens) |
| --- | :--- | :--- | :---: |
| Q3 | **Handler global `unhandledrejection`/`error`** — log estruturado + aviso discreto ("houve um erro ao atualizar os dados"). | Torna visível o erro que hoje morre em `catch{}`/realtime; diagnóstico de produção sem instrumentação pesada | **Baixo** |
| Q4 | **`supabase.auth.onAuthStateChange`** — em `SIGNED_OUT`/falha de refresh, limpar `cachedSessionResult` e voltar ao login. | Usuário não fica com tela presa após expiração de sessão | **Baixo** |
| Q5 | **Refresh ao voltar para a aba** — no `visibilitychange`→`visible`, rodar `checkForUpdates` (reutilizando o handler do `versionChecker`) + re-sync de dados realtime. | Dados sempre atuais ao retornar de outra aba/background | **Baixo** |

**Performance de rotinas quentes:**

| ID | Melhoria | Benefício | Consumo (tokens) |
| --- | :--- | :--- | :---: |
| Q6 | **Memoizar `Intl.DateTimeFormat`/`NumberFormat`** e usar 1 formatter único nos hot paths (timer de SLA de **1s** em `Reembolsos`/`ComercialDashboard`, tabelas do `Dashboard`). | Elimina criação de formatters a cada tick/linha — CPU real em low-end | **Baixo** |
| Q7 | **`manualChunks` no `vite.config.ts`** — extrair `@supabase/supabase-js` e `sortablejs` do bundle `main` (2,4MB). | Primeira carga menor; melhor aproveitamento de cache do CDN | **Baixo** |

**Comercial/SEO e PWA:**

| ID | Melhoria | Benefício | Consumo (tokens) |
| --- | :--- | :--- | :---: |
| Q8 | **Tags `og:image` + `canonical` + título dinâmico nas rotas públicas** (proposta, itinerário, feedback) — `public/og-image.png` já existe. | Links de proposta/itinerário exibem card rico no WhatsApp/redes — ativação comercial direta | **Baixo** |
| Q9 | **App-shell offline no `sw.js`** — `fetch` handler: cache-first p/ assets com hash, network-first p/ HTML. | App abre mesmo sem rede em vez de tela branca (PWA de fato) | **Baixo-Médio** |

**Dados (elimina fallbacks de uma vez):**

| ID | Melhoria | Benefício | Consumo (tokens) |
| --- | :--- | :--- | :---: |
| Q10 | **Migration das colunas geradas `documento_limpo`/`telefone_limpo` + índice** (verificar se já existem em prod) — fecha o caminho `42703` do `clienteSearchService`. | Elimina o fallback inteiro de busca e acelera as queries (remove código + erro de uma vez) | **Baixo** |

---

## 5. Roadmap Semanal (7 Dias)

> Plano priorizado para a próxima semana, dividido por dia, com itens, critérios de aceite e esforço estimado (baseado nas tabelas das seções 3 e 4). **Regra da semana:** nenhum `catch{}` / fallback novo — todo erro engolido vira falha tratada ou exceção re-lançada.

### Dia 1 (Segunda) — Segurança: Push & Acesso Público
| Item | Detalhe | Esforço |
| :--- | :--- | :---: |
| F06 (E01/E02/E19) | Remover chave VAPID privada do cliente; autenticar Edge Function `send-push` (`auth.uid() === userId`, CORS restrito, key em Secret); remover fallback de envio direto. | Médio |
| F-correlato E04 | Proteger `obter_itinerario_publico` com token/segredo e reduzir campos retornados (dar/descartar `consultor_id`). | Médio |
| E37 / sw.js | Validar `origin` em `notificationclick` antes de `openWindow`. | Baixo |
| E35 | Remover senha de superusuário do `.env` local (mover para secrets). | Baixo |
| Q1 | Security headers no `dist/_headers` (frame/`nosniff`/referrer/permissions). | Baixo |
| Q2 | Gerar `/icon-192.png` + PNGs reais no `manifest.json` (icon do push inexistente). | Baixo |

**Aceite:** (1) `dist/` não contém `d` da chave VAPID; (2) push de outro usuário é rejeitado (401); (3) itinerário sem token retorna 404/403; (4) sw.js só navega para a própria origem; (5) headers de segurança presentes na resposta (`curl -I`); (6) notificação push exibe ícone PNG.

### Dia 2 (Terça) — XSS: arsenal `escapeHtml` em todo o app
| Item | Detalhe | Esforço |
| :--- | :--- | :---: |
| M01 | Criar `src/utils/escapeHtml.ts`; aplicar em `textHelper.highlightMatch` (E05) e nos call sites. | Médio |
| E03/E06 | Sanear `PublicViews.ts` (todas as interpolações de rotas públicas), `Clientes.ts`, `SendTemplateMessageModal.ts`, `NextTripPage.ts`, `Cadastros.ts`, `comments.ts`. | Médio |
| E20 | Escapar `err.message` (`main.ts:171`) e `<strong>${email}</strong>` (`Login.ts:247`). | Baixo |
| E04 (continuação) | Se dados vierem do banco, acrescentar trigger/check de higienização na inserção (defesa em profundidade). | Baixo |
| Q10 | Migration de `documento_limpo`/`telefone_limpo` + índice (fecha o fallback `42703` da busca de clientes). | Baixo |

**Aceite:** (1) Teste manual: cliente nomeado `<img src=x onerror=alert(1)>` não executa em nenhuma tela pesquisada; (2) página pública de proposta/id gerada com `'`/`"` no payload não quebra e não executa script.

### Dia 3 (Quarta) — Integridade Financeira & Autorização
| Item | Detalhe | Esforço |
| :--- | :--- | :---: |
| F01 (E07) | Conciliação atômica: nunca marcar `conciliado` sem transação/vínculos gravados. | Baixo-Médio |
| F02 (E10) | Corrigir parser CSV (formato internacional) + testes de unidade. | Baixo |
| F03 (E08) | Aplicar escopo por consultor também com termo de busca; reforçar RLS. | Baixo-Médio |
| E11 (início) | Mapear as políticas RLS atuais e escrever as políticas por agência/consultor para `clientes`/`viagens`/`orcamentos`. | Alto (parcial) |
| F14 | NPS ausente neutro no NextTrip (score não vira 10). | Baixo |

**Aceite:** (1) Consultor não-admin não lê cliente de colega em **nenhuma** busca; (2) conciliar com tabela de transações indisponível **falha** (não "quita"); (3) `1,250.50` → `1250.50`.

### Dia 4 (Quinta) — Fluxos Operacionais (Inbox, Escalas, Anexos, Studio)
| Item | Detalhe | Esforço |
| :--- | :--- | :---: |
| F04 (E09) | `deleteAlert` arquiva em vez de apagar `escala_solicitacoes`. | Baixo |
| F05 | `archiveAlert` retorna `false` sem persistir; UI mostra falha. | Baixo |
| F12 (E31) | Escala: status primeiro, células só após sucesso; verificar retornos. | Baixo-Médio |
| F10 (E33) | Anexos: abortar se upload falhar; restringir fallback de schema. | Médio |
| F09 (E13) | Studio: fallback só para códigos reais de drift; re-lançar demais. | Alto |
| F11 (UX03) | Exclusão de viagem: falha parcial reportada (ou RPC transacional). | Médio |

**Aceite:** (1) Excluir alerta de escala não remove a solicitação; (2) aprovar escala com falha de rede não muta o calendário; (3) upload com storage indisponível não cria anexo órfão; (4) erro real no Studio não some em blob.

### Dia 5 (Sexta) — Confiabilidade & Correções de Cálculo
| Item | Detalhe | Esforço |
| :--- | :--- | :---: |
| F13 (E14) | Risk Score: destino vazio não é "nacional". | Baixo |
| F15 (E22) | Wrapper `safeRealtime` com try/catch nos callbacks (Inbox/Comercial/Orçamentos). | Baixo |
| F08 | NPS público: tratar `{ error }` do update de viagem. | Baixo |
| F17 (UX15) | "Mês Corrente": datas inválidas não pertencem ao mês. | Baixo |
| E23/E12 (perf) | Inbox: `Promise.all` nas chamadas independentes + `markAllAsRead` em lote. | Médio |
| Q3 | Handler global `unhandledrejection`/`error` (log + aviso discreto). | Baixo |
| Q4 | `supabase.auth.onAuthStateChange` (logout/refresh → volta ao login sem tela presa). | Baixo |
| Q5 | Refresh ao voltar para a aba (`visibilitychange` → `checkForUpdates` + re-sync). | Baixo |

**Aceite:** (1) Testes unitários novos para F13/F14/F17; (2) simular falha de rede → UI mantém estado e mostra toast, sem unhandled rejection no console; (3) expirar a sessão → volta ao login; (4) voltar da aba → dados re-sincronizados.

### Dia 6 (Sábado) — UX Core (maior impacto percebido)
| Item | Detalhe | Esforço |
| :--- | :--- | :---: |
| M13 (UX01) | Toast único com fila e timeout cancelável; substituir as 10 cópias. | Médio |
| M14 (UX04) | Modal único: portais por página, backdrop/ESC, scroll lock, acessibilidade (E50). | Médio |
| M15 (UX02/UX11) | Substituir `confirm()` nativos; confirmação em ações em massa. | Baixo |
| M16 (UX08/UX15) | Utils `formatBRL`/`formatarData` únicos. | Baixo |
| UX05 | Skeletons nas telas sem loading (NextTrip, Studio, Cadastros). | Baixo |
| Q6 | Memoizar `Intl.NumberFormat`/`DateTimeFormat` nos hot paths (timer 1s, tabelas). | Baixo |
| Q8 | Tags `og:image` + `canonical` + título dinâmico nas rotas públicas (proposta/itinerário/feedback). | Baixo |

**Aceite:** (1) Dois toasts rápidos seguidos se empilham (o 2º não derruba o 1º); (2) abrir modal impede scroll do fundo e fecha no ESC/backdrop; (3) nenhum `confirm()`/`alert()` nativo restante.

### Dia 7 (Domingo) — Estabilização & Verificação
| Item | Detalhe | Esforço |
| :--- | :--- | :---: |
| M17 (UX13) | Unificar navegação (1 render por clique) + sidebar sincroniza `hash`. | Médio |
| M06 | Adicionar `eslint` + `prettier` + script `lint` no `package.json`. | Baixo |
| Suíte | Rodar `npm run check` e corrigir regressões; atualizar `tests/` para F01/F02/F03/F05/F14/F17. | Médio |
| M03 (se sobrar) | Isolar sandbox do bundle de produção via flag de build. | Médio |
| Q7 | `manualChunks` no `vite.config.ts` (extrair `@supabase/supabase-js`/`sortablejs` do `main` 2,4MB). | Baixo |
| Q9 | App-shell offline no `sw.js` (cache-first p/ assets com hash, network-first p/ HTML). | Baixo-Médio |

**Aceite:** (1) `npm run check` verde; (2) navegação com 1 única chamada de carga por clique; (3) backup do checklist semanal registrado.

> **Priorização geral (se faltar tempo):** Dia 1 > Dia 2 > Dia 3 > Dia 4 > Dia 5 > Dia 6 > Dia 7. O Dia 1 e o Dia 2 respondem por ~80% do risco atual do produto.

> **Recomendação transversal:** antes de escrever mais fallbacks de "Schema Drift" (42P01/42703), executar uma migração que **crie de fato** as colunas geradas (`documento_limpo`, `telefone_limpo`, `conciliado` etc.) e gerar os tipos do banco — isso elimina dezenas de caminhos de erro silencioso em um único esforço (M05).

---

## 6. Pontos Fortes (para balanço)

- Boa cobertura de regras de negócio nos testes de serviços preditivos: `upsellEngineService` 97%, `nextTripEngineService` 89%, `riskScoreService` 84%.
- Operações críticas de escrita na maioria das páginas usam `await` + destructuring de `{ error }` com `throw`.
- Várias páginas implementam `destroy()` correto (limpeza de canais realtime, listeners e timers).
- Debounce já existe em busca de clientes (300ms), balcão (300ms), pesquisa global (250ms) e Unsplash.
- Empty states com boa cobertura nas telas principais (Orcamentos, Reembolsos, Inbox, Cadastros, Relatorios, Clientes) e experiência mobile com cards dedicados em Dashboard e Reembolsos.
- Ponto positivo de infraestrutura: `.env` devidamente ignorado pelo git, `console.*` silenciado em produção, cache desabilitado para HTML/SW, bucket de documentos privado e RPCs administrativas com checagem de role no banco.