# 🔬 Auditoria Técnica — PaxFlow

> **Escopo:** Revisão estática especializada do código-fonte (SPA TypeScript + Vite + Supabase), focada em segurança da aplicação, integridade de dados e correção de bugs pontuais de lógica.
> **Data:** 23/09/2026 — **Método:** Leitura e análise de evidências (`file:line`) com estimativa de risco e probabilidade de regressão, respeitando as premissas arquiteturais do PaxFlow (colaboração entre consultores e resiliência Zero-Break).

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

Esta auditoria técnica revisou o código para identificar pontos reais de vulnerabilidade e falhas de lógica em cenários de borda:
1. **Segurança:** Remoção da chave privada VAPID exposta no bundle do cliente, restrição de acesso na Edge Function de push, sanitização contra XSS em rotas públicas/templates e proteção de endpoints públicos.
2. **Lógica de Negócio:** Correção do parser de CSV para valores monetários com separador internacional, proteção contra exclusão inadvertida de solicitações de escala ao descartar notificações do Inbox, neutralidade no cálculo de NPS e correções de filtros de datas.
3. **Estabilidade:** Limpeza de timers órfãos, adição de debounces em inputs de busca para economia de recursos e tratamento de exceções em callbacks de tempo real.

Todas as propostas foram calibradas para **probabilidade mínima de regressão**, preservando os fluxos consolidados da agência.

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
| E01 | **Chave privada VAPID no bundle do cliente.** O JWK privado (`d`) usado para assinar push está no frontend. | `src/services/pushSenderService.ts:4-11` | 🔴 Crítico | **Médio** | Pendente |
| E02 | **Edge Function `send-push` sem verificação de autenticação.** Aceita qualquer requisição com `SERVICE_ROLE_KEY`. | `supabase/functions/send-push/index.ts:19-90` | 🔴 Crítico | **Médio** | Pendente |
| E03 | **Stored XSS em rotas públicas.** Sanitização de dados de passageiros e propostas via `escapeHtml`. | `src/pages/PublicViews.ts` | 🔴 Crítico | **Médio** | ✅ **Concluído (24/09/2026)** |
| E04 | **`obter_itinerario_publico` sem token de acesso.** RPC retorna itinerário para qualquer UUID enumerado. | `supabase/migrations/20260906000000_paxflow_schema_completo.sql` | 🔴 Crítico | **Médio** | Pendente |
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
| E11 | **`archiveAlert` pode retornar sucesso sem persistir.** Se `targetUUID` ou usuário não forem resolvidos, a UI remove o alerta sem gravar no banco. | `src/services/inboxService.ts:134` | 🟠 Alto | **Baixo** | Pendente |

---

### 3.3 Médios — Confiabilidade & Performance

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Status |
| --- | :--- | :--- | :---: | :---: | :---: |
| E12 | **Pedido de permissão de push no boot da aplicação.** Solicita permissão ao carregar sem interação do usuário. | `src/main.ts:260` | 🟡 Médio | **Baixo** | Pendente |
| E13 | **Reflected XSS em mensagem de erro e email de login.** Sanitização via `escapeHtml` nas telas de erro e login. | `src/main.ts`, `src/pages/Login.ts` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E14 | **Realtime callbacks sem try/catch defensivo.** Falha de conexão pode causar erro não tratado no console. | `Inbox.ts:249`, `ComercialDashboard.ts:160` | 🟡 Médio | **Baixo** | Pendente |
| E15 | **`markAllAlertsAsRead` executa requisições sequenciais.** Loop faz 1 request por alerta em vez de batch. | `inboxService.ts:435-445` | 🟡 Médio | **Baixo** | Pendente |
| E16 | **Busca sem debounce em inputs de filtro.** Re-render acionado a cada tecla digitada sem intervalo mínimo. | `NextTripPage.ts:359`, `Reembolsos.ts:292` | 🟡 Médio | **Baixo** | Pendente |
| E17 | **Timers e listeners órfãos em rotinas de background.** Timers de 1s executando `querySelectorAll` desnecessariamente. | `Reembolsos.ts:173`, `LandingPage.ts:178` | 🟡 Médio | **Baixo** | Pendente |
| E18 | **NPS público: Tratamento de retorno `{ error }` ao salvar viagem.** Feedback consistente ao cliente. | `src/pages/PublicViews.ts` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E19 | **Upload de anexo pode criar registro sem arquivo se o storage falhar.** | `src/services/anexosService.ts:233-245` | 🟡 Médio | **Baixo** | Pendente |
| E20 | **`sw.js` validação de mesma origem no push click.** Impede redirecionamentos para origens não confiáveis ao clicar na notificação. | `public/sw.js` | 🟡 Médio | **Baixo** | ✅ **Concluído (24/09/2026)** |

---

### 3.4 Baixos & UX Pontual

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Status |
| --- | :--- | :--- | :---: | :---: | :---: |
| E21 | **Toasts concorrentes sobrescrevem o anterior sem fila.** Dois toasts rápidos resultam no fechamento prematuro do segundo. | `src/services/dialog.ts` | 🟢 Baixo | **Baixo** | Pendente |
| E22 | **Uso de `confirm()` nativo em ações destrutivas isoladas.** Substituir por `showCustomConfirm` para consistência visual. | `EditTravelModal.ts:3877`, `Conciliacao.ts:697` | 🟢 Baixo | **Baixo** | Pendente |
| E23 | **Snooze do NextTrip com feedback visual amigável.** Exibe modal/toast claro em caso de falha de conexão. | `src/pages/NextTripPage.ts` | 🟢 Baixo | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E24 | **Dashboard: Validação estrita de datas no filtro de Mês Corrente.** Datas nulas ou corrompidas descartadas da contagem do mês. | `src/pages/Dashboard.ts` | 🟢 Baixo | **Baixo** | ✅ **Concluído (24/09/2026)** |
| E25 | **Exclusão de viagem em cascata com feedback de pendências.** Exibir aviso claro caso alguma entidade filha não possa ser excluída. | `src/pages/Dashboard.ts:940-986` | 🟢 Baixo | **Baixo** | Pendente |

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

---

## 4. Melhorias Recomendadas & Quick Wins

| ID | Melhoria | Benefício | Consumo | Prob. Regressão |
| --- | :--- | :--- | :---: | :---: |
| Q1 | **Security Headers no `dist/_headers`** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` e `Referrer-Policy`. | Proteção contra clickjacking e MIME sniffing | **Baixo** | 🟢 **Baixa (< 5%)** |
| Q2 | **Ícone PNG no `manifest.json`** — Gerar `/icon-192.png` para o Service Worker do PWA. | Validação correta de push no Android/iOS | **Baixo** | 🟢 **Baixa (< 5%)** |
| Q3 | **Handler global de erros assíncronos (`unhandledrejection`)** — Log centralizado sem quebrar telas. | Diagnóstico preciso de falhas em produção | **Baixo** | 🟢 **Baixa (< 10%)** |
| Q4 | **Limpeza de sessão em `onAuthStateChange`** — Redirecionar ao login em caso de token expirado. | Previne telas congeladas por sessão inválida | **Baixo** | 🟢 **Baixa (10-15%)** |
| Q5 | **Memoização de formatadores `Intl.NumberFormat`** — Reutilizar instâncias estáticas em tabelas densas. | Redução de consumo de CPU no client | **Baixo** | 🟢 **Baixa (< 5%)** |
| Q6 | **Tags de metadados (`og:image`, `canonical`) nas rotas públicas** — Propostas e itinerários. | Compartilhamento profissional em mensageiros | **Baixo** | 🟢 **Baixa (< 5%)** |

---

## 5. Roadmap Priorizado de Correções

### Etapa 1 — Segurança & Sanitização
1. Remover chave privada VAPID do client e concentrar envio na Edge Function (`E01`, `E02`).
2. Criar helper `escapeHtml` e aplicar nas interpolações públicas e de templates (`E03`, `E05`, `E06`, `E13`).
3. Validar origem no `sw.js` (`E20`) e adicionar security headers (`Q1`).

### Etapa 2 — Integridade de Cálculos & Lógica de Negócio
1. Corrigir parser CSV de extratos para formato internacional (`E08`, `F01`).
2. Corrigir `deleteAlert` para arquivar notificações em vez de apagar solicitações de escala (`E07`, `F02`).
3. Ajustar cálculo neutro de NPS no NextTrip (`E10`, `F03`) e destino desconhecido no Risk Score (`E09`, `F04`).
4. Corrigir filtro de mês corrente no Dashboard (`E24`, `F05`).

### Etapa 3 — Resiliência & Experiência
1. Adicionar tratamento de erros em callbacks realtime (`E14`) e checagem no NPS público (`E18`).
2. Evitar registros órfãos de anexos em falha de storage (`E19`).
3. Limpar timers órfãos em rotinas de background (`E17`).
4. Substituir confirmações nativas por `showCustomConfirm` (`E22`).

---

## 6. Pontos Fortes da Aplicação

- **Excelente cobertura de regras de negócio:** Testes consolidados nos serviços preditivos (`upsellEngineService` 97%, `nextTripEngineService` 89%, `riskScoreService` 84%).
- **Arquitetura Zero-Break:** Resiliência ativa a Schema Drift, garantindo continuidade operacional na agência.
- **Modelo Colaborativo:** Fluxos de consulta e atendimento ágeis, permitindo busca e colaboração contínua entre consultores.
- **Tratamento defensivo de erros:** Padrão consistente de destructuring com `throw` nas mutações principais.