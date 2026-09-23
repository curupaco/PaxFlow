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

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Prob. Regressão |
| --- | :--- | :--- | :---: | :---: | :---: |
| E01 | **Chave privada VAPID no bundle do cliente.** O JWK privado (`d`) usado para assinar push está no frontend. | `src/services/pushSenderService.ts:4-11` | 🔴 Crítico | **Médio** | 🟢 **Baixa (5-10%)** — Mover o disparo para a Edge Function sem alterar a interface do serviço. |
| E02 | **Edge Function `send-push` sem verificação de autenticação.** Aceita qualquer requisição com `SERVICE_ROLE_KEY`. | `supabase/functions/send-push/index.ts:19-90` | 🔴 Crítico | **Médio** | 🟡 **Média (15-25%)** — Exigir token de autenticação e validar o usuário remetente. |
| E03 | **Stored XSS em rotas públicas.** Interpolação direta de campos textuais do banco em `innerHTML` sem escape. | `src/pages/PublicViews.ts:337, 419, 867` | 🔴 Crítico | **Médio** | 🟢 **Baixa (5-10%)** — Uso de utilitário `escapeHtml` nas strings interpoladas. |
| E04 | **`obter_itinerario_publico` sem token de acesso.** RPC retorna itinerário para qualquer UUID enumerado. | `supabase/migrations/20260906000000_paxflow_schema_completo.sql` | 🔴 Crítico | **Médio** | 🟡 **Média (15-25%)** — Implementar hash/token de segurança nos links públicos. |
| E05 | **`highlightMatch` sem escape de HTML.** Envolve texto da busca em `<mark>` sem escapar tags prévias. | `src/utils/textHelper.ts:14` | 🔴 Crítico | **Baixo** | 🟢 **Baixa (5-10%)** — Sanitizar a entrada antes do destaque visual. |
| E06 | **XSS em visualização de mensagens e dados.** Histórico do Digisac e comentários inseridos via `innerHTML`. | `SendTemplateMessageModal.ts:317`, `comments.ts` | 🔴 Crítico | **Médio** | 🟢 **Baixa (5-10%)** — Sanitização preventiva na renderização. |

---

### 3.2 Altos — Bugs de Lógica & Integridade

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Prob. Regressão |
| --- | :--- | :--- | :---: | :---: | :---: |
| E07 | **`deleteAlert` apaga solicitação de escala/balcão do banco.** Excluir a notificação no Inbox apaga a linha de `escala_solicitacoes`. | `src/services/inboxService.ts:186-194` | 🟠 Alto | **Baixo** | 🟢 **Baixa (5-10%)** — Apenas arquivar a notificação, mantendo a solicitação original intacta. |
| E08 | **Parser CSV corrompe valores em formato internacional.** Formatos como `1,250.50` são tratados erroneamente como formato brasileiro. | `src/services/csvExtratoParser.ts:12-23` | 🟠 Alto | **Baixo** | 🟢 **Baixa (5-10%)** — Detectar ordem dos separadores (`,` e `.`) com testes unitários. |
| E09 | **Risk Score assume destino vazio como viagem nacional.** Ignora checagens de visto/passaporte para viagens internacionais sem destino cadastrado. | `src/services/riskScoreService.ts:68` | 🟠 Alto | **Baixo** | 🟢 **Baixa (5-10%)** — Tratar destino vazio como desconhecido. |
| E10 | **NextTrip assume NPS ausente como nota 10.** Cliente sem avaliação recebe pontuação máxima de promotor no score de recompra. | `src/services/nextTripEngineService.ts:182` | 🟠 Alto | **Baixo** | 🟢 **Baixa (5-10%)** — Tratar NPS nulo com neutralidade (pontuação neutra/0). |
| E11 | **`archiveAlert` pode retornar sucesso sem persistir.** Se `targetUUID` ou usuário não forem resolvidos, a UI remove o alerta sem gravar no banco. | `src/services/inboxService.ts:134` | 🟠 Alto | **Baixo** | 🟢 **Baixa (5-10%)** — Retornar falha e exibir toast se o alerta não for persistido. |

---

### 3.3 Médios — Confiabilidade & Performance

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Prob. Regressão |
| --- | :--- | :--- | :---: | :---: | :---: |
| E12 | **Pedido de permissão de push no boot da aplicação.** Solicita permissão ao carregar sem interação do usuário. | `src/main.ts:260` | 🟡 Médio | **Baixo** | 🟢 **Baixa (5-10%)** — Solicitar permissão apenas quando o usuário ativar a opção no painel. |
| E13 | **Reflected XSS em mensagem de erro e email de login.** Interpolação direta de `err.message` e string de e-mail. | `src/main.ts:171`, `src/pages/Login.ts:247` | 🟡 Médio | **Baixo** | 🟢 **Baixa (5-10%)** — Renderizar via `textContent` ou `escapeHtml`. |
| E14 | **Realtime callbacks sem try/catch defensivo.** Falha de conexão pode causar erro não tratado no console. | `Inbox.ts:249`, `ComercialDashboard.ts:160` | 🟡 Médio | **Baixo** | 🟢 **Baixa (5-10%)** — Envolver callbacks assíncronos em bloco de proteção `try/catch`. |
| E15 | **`markAllAlertsAsRead` executa requisições sequenciais.** Loop faz 1 request por alerta em vez de batch. | `inboxService.ts:435-445` | 🟡 Médio | **Baixo** | 🟢 **Baixa (10-15%)** — Atualizar em lote com `.in('id', ids)`. |
| E16 | **Busca sem debounce em inputs de filtro.** Re-render acionado a cada tecla digitada sem intervalo mínimo. | `NextTripPage.ts:359`, `Reembolsos.ts:292` | 🟡 Médio | **Baixo** | 🟡 **Média (15-20%)** — Adicionar debounce de 250ms preservando o foco do campo. |
| E17 | **Timers e listeners órfãos em rotinas de background.** Timers de 1s executando `querySelectorAll` desnecessariamente. | `Reembolsos.ts:173`, `LandingPage.ts:178` | 🟡 Médio | **Baixo** | 🟢 **Baixa (10-15%)** — Limpar timers no ciclo `destroy()` dos componentes. |
| E18 | **NPS público não trata retorno de `{ error }` ao salvar viagem.** Possibilidade de falha silenciosa no status final. | `src/pages/PublicViews.ts:781-795` | 🟡 Médio | **Baixo** | 🟢 **Baixa (5-10%)** — Checar erro e reportar feedback adequado ao usuário. |
| E19 | **Upload de anexo pode criar registro sem arquivo se o storage falhar.** | `src/services/anexosService.ts:233-245` | 🟡 Médio | **Baixo** | 🟢 **Baixa (10-15%)** — Abortar a inclusão do registro se o envio ao storage falhar. |
| E20 | **`sw.js` navega para URL do payload de push sem validar origem.** | `public/sw.js:48-67` | 🟡 Médio | **Baixo** | 🟢 **Baixa (5-10%)** — Checar se a URL pertence ao mesmo domínio da aplicação. |

---

### 3.4 Baixos & UX Pontual

| ID | Item (descrição) | Evidência | Criticidade | Consumo | Prob. Regressão |
| --- | :--- | :--- | :---: | :---: | :---: |
| E21 | **Toasts concorrentes sobrescrevem o anterior sem fila.** Dois toasts rápidos resultam no fechamento prematuro do segundo. | `src/services/dialog.ts` | 🟢 Baixo | **Baixo** | 🟡 **Média (15-20%)** — Implementar temporizador cancelável / fila simples. |
| E22 | **Uso de `confirm()` nativo em ações destrutivas isoladas.** Substituir por `showCustomConfirm` para consistência visual. | `EditTravelModal.ts:3877`, `Conciliacao.ts:697` | 🟢 Baixo | **Baixo** | 🟢 **Baixa (10-15%)** — Conversão para confirmação customizada assíncrona. |
| E23 | **Snooze do NextTrip não exibe feedback em caso de falha.** Erro de rede fica restrito ao `console.error`. | `src/pages/NextTripPage.ts:398-402` | 🟢 Baixo | **Baixo** | 🟢 **Baixa (5-10%)** — Exibir toast de erro amigável ao consultor. |
| E24 | **Filtro "Mês Corrente" inclui viagens com datas inválidas.** Datas nulas ou corrompidas eram computadas no mês atual. | `src/pages/Dashboard.ts:246-257` | 🟢 Baixo | **Baixo** | 🟢 **Baixa (5-10%)** — Tratar datas inválidas excluindo-as da contagem do mês. |
| E25 | **Exclusão de viagem em cascata com feedback de pendências.** Exibir aviso claro caso alguma entidade filha não possa ser excluída. | `src/pages/Dashboard.ts:940-986` | 🟢 Baixo | **Baixo** | 🟢 **Baixa (10-15%)** — Relatar pendências de exclusão de forma transparente. |

---

### 3.5 Diagnóstico Detalhado de Falhas de Lógica

#### F01 — Parser CSV: Tratamento incorreto de valores com vírgula internacional
- **Sintoma:** Linhas de extrato contendo `1,250.50` são lidas como `1.2505`.
- **Causa:** `csvExtratoParser.ts:12` captura qualquer string com vírgula no bloco de moeda brasileira.
- **Correção:** Analisar a posição do último separador (se a vírgula vier antes do ponto, remover a vírgula; caso contrário, remover o ponto).
- **Probabilidade de Regressão:** 🟢 **Baixa (< 10%)**.

#### F02 — Inbox: "Excluir alerta" apagando solicitação real de escala
- **Sintoma:** O consultor descarta a notificação de solicitação de folga e a solicitação desaparece da escala.
- **Causa:** `inboxService.ts:186-194` executa `delete` direto na tabela de negócio `escala_solicitacoes`.
- **Correção:** Alterar a ação para arquivar a notificação, nunca excluindo a linha da solicitação.
- **Probabilidade de Regressão:** 🟢 **Baixa (< 5%)**.

#### F03 — NextTrip: NPS ausente computado como promotor (nota 10)
- **Sintoma:** Clientes que nunca responderam à pesquisa de satisfação recebem nota máxima na fórmula preditiva.
- **Causa:** `nextTripEngineService.ts:182` aplica fallback `?? 10`.
- **Correção:** Tratar ausência de resposta como valor neutro (0 pontos ou exclusão do peso no vetor).
- **Probabilidade de Regressão:** 🟢 **Baixa (< 5%)**.

#### F04 — Risk Score: Destino não preenchido tratado como viagem nacional
- **Sintoma:** Viagem internacional criada sem o campo de destino preenchido não gera alertas de passaporte e visto.
- **Causa:** `riskScoreService.ts:68` considera `destinoNome.length === 0` como `isNacional = true`.
- **Correção:** Considerar destino vazio como desconhecido, acionando as verificações de documentação.
- **Probabilidade de Regressão:** 🟢 **Baixa (< 10%)**.

#### F05 — Dashboard: Filtro de Mês Corrente incluindo datas inválidas
- **Sintoma:** Contador de viagens do mês corrente inflado com registros sem data definida.
- **Causa:** `Dashboard.ts:246-257` retorna `true` quando `isNaN(year)`.
- **Correção:** Validar estritamente o ano e mês antes de incluir o registro no filtro.
- **Probabilidade de Regressão:** 🟢 **Baixa (< 5%)**.

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