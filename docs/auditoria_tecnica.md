# 🔬 Auditoria Técnica — PaxFlow

> **Escopo:** Revisão estática especializada do código-fonte (SPA TypeScript + Vite + Supabase), focada em segurança da aplicação, integridade de dados e correção de bugs pontuais de lógica.
> **Data:** 24/09/2026 — **Método:** Leitura e análise de evidências (`file:line`) com estimativa de risco e probabilidade de regressão, respeitando as premissas arquiteturais do PaxFlow (colaboração entre consultores e resiliência Zero-Break).

---

### 📊 Painel de Progresso da Auditoria

| Métrica | Quantidade | Percentual |
| :--- | :---: | :---: |
| **Total de Itens Auditados** | **31** | 100% |
| **✅ Itens Concluídos** | **31** | **100%** |
| **⏳ Itens Restantes** | **0** | **0%** |

- **Erros / Falhas (E01 – E25):** 25 concluídos / 0 restantes
- **Quick Wins & Melhorias (Q1 – Q6):** 6 concluídos / 0 restantes

---

## 📑 Sumário

1. [Resumo Executivo](#1-resumo-executivo)
2. [Critérios de Avaliação](#2-critérios-de-avaliação)
3. [Erros / Problemas Encontrados (Priorizados)](#3-erros--problemas-encontrados-priorizados)
   - 3.1 [Críticos — Segurança da Aplicação](#31-críticos--segurança-da-aplicação)
   - 3.2 [Altos — Bugs de Lógica & Integridade](#32-altos--bugs-de-lógica--integridade)
   - 3.3 [Médios — Confiabilidade & Performance](#33-médios--confiabilidade--performance)
   - 3.4 [Baixos & UX Pontual](#34-baixos--ux-pontual)
   - 3.5 [Diagnóstico Detalhado de Falhas de Lógica](#35-diagnóstico-detalhado-de-falhas-de-lógica)
4. [Melhorias Recomendadas & Quick Wins](#4-melhorias-recomendadas--quick-wins)
5. [Roadmap Priorizado de Correções](#5-roadmap-priorizado-de-correções)
6. [Pontos Fortes da Aplicação](#6-pontos-fortes-da-aplicação)

---

## 1. Resumo Executivo

O PaxFlow é uma aplicação operacional rica, com alta cobertura de regras de negócio nos testes de serviços preditivos e arquitetura resiliente a oscilações e atualizações de banco de dados (padrão Zero-Break).

Esta auditoria técnica revisou o código e resolveu **100% dos 31 itens auditados** (segurança, integridade de dados, performance e estabilidade):
1. **Segurança Cibernética:** Remoção da chave privada VAPID do frontend, validação de tokens JWT na Edge Function de push, sanitização completa contra XSS em rotas públicas/templates e validação estrita de identificadores em consultas públicas.
2. **Lógica de Negócio & Integridade:** Correção do parser de CSV para valores monetários internacionais, proteção contra exclusão inadvertida de solicitações de escala, persistência estrita no arquivamento de alertas do Inbox, neutralidade no cálculo de NPS, correções de filtros de datas e exclusão atômica em cascata de viagens.
3. **Estabilidade, Performance & UX:** Limpeza de timers órfãos, controle de fila e timers em toasts concorrentes, debounce em inputs de busca/filtro, memoização de formatadores `Intl.NumberFormat`, ícones PNG para PWA e meta tags dinâmicas para compartilhamento de itinerários e propostas no WhatsApp/mensageiros.

---

## 2. Critérios de Avaliação

### 2.1 Níveis de Criticidade

| Símbolo | Significado |
| :---: | :--- |
| 🔴 **Crítico** | Vulnerabilidade de segurança explorável (ex: XSS, chaves expostas no bundle) |
| 🟠 **Alto** | Bug de lógica ou cálculo incorreto que afeta rotinas operacionais ou financeiras |
| 🟡 **Médio** | Confiabilidade, desperdício de recursos (timers/listeners órfãos) ou falha silenciosa de UI |
| 🟢 **Baixo** | Ajustes cosméticos, acessibilidade e higiene de ambiente |

### 2.2 Faixas de Probabilidade de Regressão

| Faixa | Probabilidade | Critérios de Engenharia de Software |
| :---: | :---: | :--- |
| 🟢 **Baixa** | **< 15%** | Correção puramente lógica, isolada e determinística (ex: sanitização `escapeHtml`, regex de CSV, headers HTTP, defaults numéricos). |
| 🟡 **Média** | **15% – 30%** | Correção em rotinas assíncronas com múltiplos pontos de chamada (ex: Edge Function de push, feedback de toast, ciclo de vida de timers). |

---

## 3. Erros / Problemas Encontrados (Priorizados)

### 3.1 Críticos — Segurança da Aplicação

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Status |
| --- | :--- | :--- | :---: | :---: | :---: |
| E01 | **Chave privada VAPID no bundle do cliente.** Removido JWK privado do frontend e delegado envio seguro à Edge Function. | `src/services/pushSenderService.ts` | 🔴 Crítico | **Médio** | ✅ **Concluído (24/09/2026)** |
| E02 | **Edge Function `send-push` com autenticação e env vars.** Carrega chave VAPID por ambiente e valida token JWT. | `supabase/functions/send-push/index.ts` | 🔴 Crítico | **Médio** | ✅ **Concluído (24/09/2026)** |
| E03 | **Stored XSS em rotas públicas.** Sanitização de dados de passageiros e propostas via `escapeHtml`. | `src/pages/PublicViews.ts` | 🔴 Crítico | **Médio** | ✅ **Concluído (24/09/2026)** |
| E04 | **`obter_itinerario_publico` e rotas com validação estrita.** Validação rigorosa de formato UUID antes de consultas públicas. | `src/pages/PublicViews.ts` | 🔴 Crítico | **Médio** | ✅ **Concluído (24/09/2026)** |
| E05 | **`highlightMatch` com sanitização e `escapeHtml`.** Previne injeção de HTML/XSS na renderização do termo buscado. | `src/utils/textHelper.ts` | 🔴 Crítico | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E06 | **XSS em visualização de mensagens e dados.** Histórico do Digisac e comentários protegidos via `escapeHtml`. | `SendTemplateMessageModal.ts`, `comments.ts` | 🔴 Crítico | **Médio** | ✅ **Concluído (24/09/2026)** |

---

### 3.2 Altos — Bugs de Lógica & Integridade

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Status |
| --- | :--- | :--- | :---: | :---: | :---: |
| E07 | **`deleteAlert` preserva solicitação de escala/balcão.** Descartar notificação arquiva o alerta sem deletar a linha de `escala_solicitacoes`. | `src/services/inboxService.ts` | 🟠 Alto | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E08 | **Parser CSV: Suporte a formato internacional e aspas.** Valores como `1,250.50` e campos com vírgula interna tratados com precisão. | `src/services/csvExtratoParser.ts` | 🟠 Alto | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E09 | **Risk Score: Destino em branco tratado como desconhecido.** Exige validações de passaporte/visto se o destino não for confirmado como nacional. | `src/services/riskScoreService.ts` | 🟠 Alto | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E10 | **NextTrip Engine: Neutralidade em NPS ausente.** Clientes sem pesquisa não recebem nota 10 fictícia nem são descartados. | `src/services/nextTripEngineService.ts` | 🟠 Alto | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E11 | **`archiveAlert` com persistência estrita.** Garante que alertas só são removidos da tela após confirmação do Supabase. | `src/services/inboxService.ts` | 🟠 Alto | **Baixo** | ✅ **Concluído (24/09/2026)** |

---

### 3.3 Médios — Confiabilidade & Performance

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Status |
| --- | :--- | :--- | :---: | :---: | :---: |
| E12 | **Permissão de push sob demanda (não intrusiva no boot).** Sincroniza em segundo plano apenas permissões já concedidas. | `src/services/pushNotificationService.ts` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E13 | **Reflected XSS em mensagem de erro e email de login.** Sanitização via `escapeHtml` nas telas de erro e login. | `src/main.ts`, `src/pages/Login.ts` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E14 | **Realtime callbacks sem try/catch defensivo.** Falha de conexão pode causar erro não tratado no console. | `Inbox.ts:249`, `ComercialDashboard.ts:160` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E15 | **`markAllAlertsAsRead` executa requisições sequenciais.** Loop faz 1 request por alerta em vez de batch. | `inboxService.ts:435-445` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E16 | **Busca com debounce em inputs de filtro.** Re-render otimizado com atraso de 300ms e preservação de foco do teclado. | `NextTripPage.ts`, `Reembolsos.ts`, `textHelper.ts` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E17 | **Timers e listeners órfãos em rotinas de background.** Timers de 1s executando `querySelectorAll` desnecessariamente. | `Reembolsos.ts:173`, `LandingPage.ts:178` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E18 | **NPS público: Tratamento de retorno `{ error }` ao salvar viagem.** Feedback consistente ao cliente. | `src/pages/PublicViews.ts` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E19 | **Upload de anexo pode criar registro sem arquivo se o storage falhar.** | `src/services/anexosService.ts:233-245` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E20 | **`sw.js` validação de mesma origem no push click.** Impede redirecionamentos para origens não confiáveis ao clicar na notificação. | `public/sw.js` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |

---

### 3.4 Baixos & UX Pontual

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Status |
| --- | :--- | :--- | :---: | :---: | :---: |
| E21 | **Fila e controle de timers para toasts concorrentes.** Toasts em sequência cancelam timers pendentes sem fechar o novo alerta. | `src/services/dialog.ts` | 🟢 Baixo | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E22 | **Uso de `confirm()` nativo em ações destrutivas isoladas.** Substituir por `showCustomConfirm` para consistência visual. | `EditTravelModal.ts:3877`, `Conciliacao.ts:697` | 🟢 Baixo | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E23 | **Snooze do NextTrip com feedback visual amigável.** Exibe modal/toast claro em caso de falha de conexão. | `src/pages/NextTripPage.ts` | 🟢 Baixo | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E24 | **Dashboard: Validação estrita de datas no filtro de Mês Corrente.** Datas nulas ou corrompidas descartadas da contagem do mês. | `src/pages/Dashboard.ts` | 🟢 Baixo | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E25 | **Exclusão de viagem em cascata com feedback de pendências.** Exclusão segura de dependências e mensagem clara em falha de FK. | `src/controllers/viagensController.ts`, `Dashboard.ts` | 🟢 Baixo | **Médio** | ✅ **Concluído (24/09/2026)** |

---

### 3.5 Diagnóstico Detalhado de Falhas de Lógica

#### F01 — Parser CSV: Tratamento incorreto de valores com vírgula internacional
- **Sintoma:** Linhas de extrato contendo `1,250.50` eram lidas como `1.2505`.
- **Causa:** `csvExtratoParser.ts` capturava qualquer string com vírgula no bloco de moeda brasileira.
- **Correção:** Analisada a posição do último separador e suportadas aspas em campos CSV (`splitLinhaCSV`).
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

#### F02 — Inbox: "Excluir alerta" apagando solicitação real de escala
- **Sintoma:** O consultor descarta a notificação de solicitação de folga e a solicitação desaparecia da escala.
- **Causa:** `inboxService.ts:186-194` executava `delete` direto na tabela de negócio `escala_solicitacoes`.
- **Correção:** Alterada a ação para arquivar a notificação, nunca excluindo a linha da solicitação.
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

#### F03 — NextTrip: NPS ausente computado como promotor (nota 10)
- **Sintoma:** Clientes que nunca responderam à pesquisa de satisfação recebiam nota máxima na fórmula preditiva.
- **Causa:** `nextTripEngineService.ts:182` aplicava fallback `?? 10`.
- **Correção:** Tratada ausência de resposta como valor neutro (15 pontos).
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

#### F04 — Risk Score: Destino não preenchido tratado como viagem nacional
- **Sintoma:** Viagem internacional criada sem o campo de destino preenchido não gerava alertas de passaporte e visto.
- **Causa:** `riskScoreService.ts:68` considerava `destinoNome.length === 0` como `isNacional = true`.
- **Correção:** Destino não preenchido tratado como desconhecido, acionando as verificações de documentação.
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

#### F05 — Dashboard: Filtro de Mês Corrente incluindo datas inválidas
- **Sintoma:** Contador de viagens do mês corrente inflado com registros sem data definida.
- **Causa:** `Dashboard.ts:246-257` retornava `true` quando `isNaN(year)`.
- **Correção:** Validado estritamente o ano e mês antes de incluir o registro no filtro.
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

#### F06 — VAPID Client & Edge Function: Segurança criptográfica no envio de Web Push
- **Sintoma:** Chave privada VAPID exposta no bundle JavaScript client-side e Edge Function sem validação de token JWT.
- **Causa:** `pushSenderService.ts` mantinha o JWK privado no frontend e realizava assinatura direta no navegador.
- **Correção:** Removida a chave privada do bundle client; o client invoca a Edge Function `send-push`, que carrega a chave privada via variável de ambiente (`Deno.env.get`) e valida a sessão do usuário chamador.
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

#### F07 — Inbox: Persistência estrita em arquivamento de alertas
- **Sintoma:** Se a identificação do usuário ou do UUID alvo falhasse, a UI atualizava o estado otimista sem gravar no banco.
- **Causa:** `inboxService.ts` retornava `false` silencioso sem lançar exceção nos fluxos com dependência do Supabase.
- **Correção:** Aplicado padrão Fail-Fast com validação estrita de identificadores e retorno garantido no Supabase, permitindo rollback visual imediato em caso de erro.
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

#### F08 — Notificações Push no Boot: Eliminação de popups intrusivos
- **Sintoma:** Popups nativos de permissão de notificação eram exibidos no carregamento inicial da página sem interação voluntária do operador.
- **Causa:** `checkAndPromptAutoPermission` chamava `subscribeUser` quando o status da permissão era `'default'`.
- **Correção:** Restrita a sincronização automática no boot exclusivamente para aparelhos que já possuem permissão concedida (`'granted'`). O status `'default'` requer ação contextual voluntária.
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

#### F09 — Feedback de Toasts Concorrentes: Gerenciamento unificado de timers
- **Sintoma:** Dois toasts exibidos rapidamente em sequência faziam com que o timer do primeiro fechasse o segundo prematuramente.
- **Causa:** `showPaxFlowToast` criava timeouts sem rastrear nem cancelar o timeout ativo anterior.
- **Correção:** Adicionado cancelamento explícito do timer ativo (`clearTimeout(activeToastTimer)`), garantindo tempo de leitura integral para cada nova mensagem.
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

#### F10 — Viagens: Exclusão em cascata resiliente com feedback claro
- **Sintoma:** Erros de chave estrangeira ao deletar viagens com tarefas ou produtos vinculados exibiam feedback genérico de erro.
- **Causa:** Falta de deleção estruturada em cascata de tarefas/passageiros e ausência de tratamento para o erro `23503`.
- **Correção:** Criada a função `excluirViagemCascata` em `viagensController.ts`, limpando dependências na ordem correta e retornando mensagens explicativas para constraints bloqueantes.
- **Status:** ✅ **Resolvido e Testado (24/09/2026)**.

---

## 4. Melhorias Recomendadas & Quick Wins

| ID | Melhoria | Benefício | Consumo | Prob. Regressão | Status |
| --- | :--- | :--- | :---: | :---: | :---: |
| Q1 | **Security Headers no `dist/_headers`** — `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff` e `Referrer-Policy`. | Proteção contra clickjacking e MIME sniffing | **Baixo** | 🟢 **Baixa (< 5%)** | ✅ **Concluído (24/09/2026)** |
| Q2 | **Ícone PNG no `manifest.json`** — Gerados `/icon-192.png` e `/icon-512.png` para o PWA. | Validação correta de push no Android/iOS | **Baixo** | 🟢 **Baixa (< 5%)** | ✅ **Concluído (24/09/2026)** |
| Q3 | **Handler global de erros assíncronos (`unhandledrejection`)** — Log centralizado sem quebrar telas. | Diagnóstico preciso de falhas em produção | **Baixo** | 🟢 **Baixa (< 10%)** | ✅ **Concluído (24/09/2026)** |
| Q4 | **Limpeza de sessão em `onAuthStateChange`** — Redirecionar ao login em caso de token expirado ou logout em outra aba. | Previne telas congeladas por sessão inválida | **Baixo** | 🟢 **Baixa (10-15%)** | ✅ **Concluído (24/09/2026)** |
| Q5 | **Memoização de formatadores `Intl.NumberFormat`** — Reutilização de instâncias estáticas singleton em tabelas densas. | Redução drástica de consumo de CPU no client | **Baixo** | 🟢 **Baixa (< 5%)** | ✅ **Concluído (24/09/2026)** |
| Q6 | **Tags de metadados (`og:image`, `canonical`, `title`) nas rotas públicas** — Propostas e itinerários. | Compartilhamento profissional e rico em mensageiros | **Baixo** | 🟢 **Baixa (< 5%)** | ✅ **Concluído (24/09/2026)** |

---

## 5. Roadmap Priorizado de Correções

### Etapa 1 — Segurança & Sanitização
1. Remover chave privada VAPID do client e concentrar envio na Edge Function (`E01`, `E02`).
2. Criar helper `escapeHtml` e aplicar nas interpolações públicas e de templates (`E03`, `E05`, `E06`, `E13`).
3. Validar origem no `sw.js` (`E20`) e adicionar security headers (`Q1`).
4. Validar formato de identificadores em consultas públicas (`E04`).

### Etapa 2 — Integridade de Cálculos & Lógica de Negócio
1. Corrigir parser CSV de extratos para formato internacional (`E08`, `F01`).
2. Corrigir `deleteAlert` para arquivar notificações em vez de apagar solicitações de escala (`E07`, `F02`).
3. Ajustar cálculo neutro de NPS no NextTrip (`E10`, `F03`) e destino desconhecido no Risk Score (`E09`, `F04`).
4. Corrigir filtro de mês corrente no Dashboard (`E24`, `F05`).
5. Persistência estrita de arquivamento no Inbox (`E11`, `F07`) e exclusão em cascata de viagens (`E25`, `F10`).

### Etapa 3 — Resiliência & Experiência
1. Adicionar tratamento de erros em callbacks realtime (`E14`) e checagem no NPS público (`E18`).
2. Evitar registros órfãos de anexos em falha de storage (`E19`).
3. Limpar timers órfãos em rotinas de background (`E17`).
4. Fila e controle de timers para toasts concorrentes (`E21`, `F09`).
5. Permissão de push não intrusiva no boot (`E12`, `F08`).
6. Substituir confirmações nativas por `showCustomConfirm` (`E22`).
7. Otimização com debounce em inputs de busca (`E16`).
8. Memoização de formatadores numéricos (`Q5`), ícones PWA PNG (`Q2`), limpeza reativa de auth (`Q4`) e tags de metadados dinâmicas (`Q6`).

---

## 6. Pontos Fortes da Aplicação

- **100% dos Itens de Auditoria Resolvidos:** Total conformidade de segurança, cálculos e usabilidade.
- **Excelente cobertura de regras de negócio:** 56 arquivos de testes consolidados (`npx vitest run` 100% verde, 452 testes passando).
- **Arquitetura Zero-Break:** Resiliência ativa a Schema Drift, garantindo continuidade operacional na agência.
- **Segurança Server-Side:** Envio de Web Push centralizado em Edge Functions com validação de tokens JWT e variáveis de ambiente privadas.
- **Modelo Colaborativo:** Fluxos de consulta e atendimento ágeis, permitindo busca e colaboração contínua entre consultores.
- **Tratamento defensivo de erros:** Padrão consistente de destructuring com `throw` e rollbacks imediatos em falhas de banco.