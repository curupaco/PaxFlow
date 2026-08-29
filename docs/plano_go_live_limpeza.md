# Plano de Preparação para Go-Live (Limpeza de Dados Transacionais) - PaxFlow

Este documento contém o plano de limpeza e o script SQL oficial para zerar dados transacionais e de teste acumulados durante o desenvolvimento e homologação do PaxFlow, preservando intactas as entidades fundamentais (**Usuários, Escalas, Configurações e Cadastros de Clientes**).

---

## Tabela Completa do Go-Live (O que Fica vs O que será Apagado)

| Categoria | Tabela / Módulo | Status | Ação / Detalhes |
| :--- | :--- | :---: | :--- |
| **Usuários** | `public.profiles` | 🟢 **FICA** | Mantém todos os cadastros de consultores, admins e perfis. |
| **Usuários** | `auth.users` | 🟢 **FICA** | Mantém todas as contas e senhas de login dos usuários. |
| **Usuários** | `public.push_subscriptions` | 🟢 **FICA** | Mantém os registros de notificações push dos celulares. |
| **Escala** | `public.escala_diaria` | 🟢 **FICA** | Mantém a grade de turnos, plantões e horários cadastrados. |
| **Escala** | `public.escala_solicitacoes` | 🟢 **FICA** | Mantém as solicitações de trocas de turno e folgas da equipe. |
| **Escala** | `public.escala_banco_folgas` | 🟢 **FICA** | Mantém o saldo de banco de folgas acumulado. |
| **Escala** | `public.escala_eventos` | 🟢 **FICA** | Mantém o calendário de feriados e plantões especiais. |
| **Configurações** | `public.global_settings_table` | 🟢 **FICA** | Mantém nome da agência, taxas, SLAs e pasta do Google Drive. |
| **Configurações** | `public.tipos_produto` | 🟢 **FICA** | Mantém a lista de tipos de produtos (Aéreo, Hotel, etc.). |
| **Configurações** | `public.formas_recebimento` | 🟢 **FICA** | Mantém as formas de recebimento homologadas. |
| **Configurações** | `public.templates_mensagem` | 🟢 **FICA** | Mantém os modelos de mensagens de WhatsApp e e-mail. |
| **Cadastros** | `public.clientes` | 🟢 **FICA** | **Preservado**: Mantém a base atual de clientes cadastrados. |
| **Transacional** | `public.viagens` | 🔴 **APAGAR** | Zera todas as vendas e viagens de teste. |
| **Transacional** | `public.produtos_viagem` | 🔴 **APAGAR** | Zera os produtos e itens vinculados a viagens de teste. |
| **Transacional** | `public.orcamentos` | 🔴 **APAGAR** | Zera todas as cotações e propostas criadas na homologação. |
| **Transacional** | `public.reembolsos` | 🔴 **APAGAR** | Zera solicitações de reembolso de teste. |
| **Transacional** | `public.lembretes` | 🔴 **APAGAR** | Zera lembretes e tarefas operacionais vinculadas. |
| **Transacional** | `public.todo_cards` & `todo_columns` | 🔴 **APAGAR** | Zera quadros Kanban e cartões de tarefas de teste. |
| **Comunicação** | `public.mensagens_diretas` | 🔴 **APAGAR** | Zera todas as mensagens e e-mails da Inbox. |
| **Comunicação** | `public.mensagem_destinatarios` | 🔴 **APAGAR** | Zera relacionamentos de destinatários da Inbox. |
| **Comunicação** | `public.comentarios` | 🔴 **APAGAR** | Zera anotações e comentários de testes. |
| **Comunicação** | `public.notificacoes` | 🔴 **APAGAR** | Zera notificações internas da Inbox dos consultores. |
| **Financeiro / Audit**| `public.loc_conferencias` & `loc_pagamentos` | 🔴 **APAGAR** | Zera conferências financeiras e logs de pagamento. |
| **Auditoria** | `public.audit_logs` | 🔴 **APAGAR** | Zera o histórico de logs de auditoria da fase de testes. |
| **Pesquisa** | `public.feedbacks_nps` | 🔴 **APAGAR** | Zera avaliações de NPS fictícias. |
| **Gamificação** | `public.profiles` (`xp`, `nivel`) | 🔄 **RESETAR** | **Reset**: Define `xp = 0` e `nivel = 1` para reinício competitivo. |
| **Gamificação** | `public.profiles_xp_logs` | 🔴 **APAGAR** | Zera o histórico de XP acumulado nos testes. |
| **Gamificação** | `public.profiles_badges` | 🔴 **APAGAR** | Zera as medalhas conquistadas durante a homologação. |
| **Gamificação** | `public.campaigns` & `meta_periodos` | 🔴 **APAGAR** | Zera campanhas e faixas de metas financeiras fictícias. |

---

## Script SQL Oficial de Limpeza para o Go-Live

Para executar a limpeza quando for o momento do lançamento oficial, abra o **Supabase > SQL Editor** e rode o script abaixo:

```sql
-- ============================================================================
-- SCRIPT DE LIMPEZA GO-LIVE — PAXFLOW
-- ============================================================================

BEGIN;

-- 1. Zera dados transacionais, comunicações e auditoria de testes
TRUNCATE TABLE 
    public.produtos_viagem,
    public.viagens,
    public.orcamentos,
    public.reembolsos,
    public.lembretes,
    public.todo_cards,
    public.comentarios,
    public.notificacoes,
    public.mensagem_destinatarios,
    public.mensagens_diretas,
    public.loc_conferencias,
    public.loc_pagamentos,
    public.feedbacks_nps,
    public.audit_logs,
    public.campaigns,
    public.meta_periodos,
    public.meta_faixas,
    public.profiles_xp_logs,
    public.profiles_badges
RESTART IDENTITY CASCADE;

-- 2. Reseta a pontuação de Gamificação para Nível 1 (0 XP) para o lançamento oficial
UPDATE public.profiles 
SET xp = 0, 
    nivel = 1, 
    updated_at = NOW();

COMMIT;
```

---

## Verificação Pós-Execução
Após rodar o script SQL no Supabase:
1. **Perfis & Autenticação**: Todos os logins permanecem intactos.
2. **Escalas**: Toda a escala de trabalho, eventos e banco de folgas permanecem salvos.
3. **Cadastros**: Todos os clientes e tipos de produtos permanecem salvos.
4. **Dashboard / Inbox / Vendas**: Todas as abas transacionais iniciam zeradas e prontas para o uso oficial no Go-Live.
