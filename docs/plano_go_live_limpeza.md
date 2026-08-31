# Plano de Preparação para Go-Live (Limpeza de Dados Transacionais) - PaxFlow

Este documento contém o plano de limpeza oficial e o script SQL validado para zerar dados transacionais e de teste acumulados durante o desenvolvimento e homologação do PaxFlow, preservando 100% intactos as entidades fundamentais (**Usuários, Escalas, Configurações, Cadastros de Clientes e Quadro Todo/Kanban**).

---

## Tabela Completa do Go-Live (O que Fica vs O que será Apagado)

| Categoria | Tabela / Módulo | Status | Ação / Detalhes |
| :--- | :--- | :---: | :--- |
| **Usuários** | `public.profiles` | 🟢 **FICA** | Mantém todos os cadastros de consultores, admins e perfis. |
| **Usuários** | `auth.users` | 🟢 **FICA** | Mantém todas as contas e senhas de login dos usuários. |
| **Usuários** | `public.push_subscriptions` | 🟢 **FICA** | Mantém os registros de notificações push nos celulares. |
| **Escala** | `public.escala_diaria` | 🟢 **FICA** | Mantém a grade de turnos, plantões e horários cadastrados. |
| **Escala** | `public.escala_solicitacoes` | 🟢 **FICA** | Mantém as solicitações de trocas de turno e folgas da equipe. |
| **Escala** | `public.escala_banco_folgas` | 🟢 **FICA** | Mantém o saldo de banco de folgas acumulado. |
| **Escala** | `public.escala_eventos` | 🟢 **FICA** | Mantém o calendário de feriados e plantões especiais. |
| **Configurações** | `public.global_settings_table` | 🟢 **FICA** | Mantém nome da agência, taxas, SLAs e pasta do Google Drive. |
| **Configurações** | `public.tipos_produto` | 🟢 **FICA** | Mantém a lista de tipos de produtos (Aéreo, Hotel, etc.). |
| **Configurações** | `public.formas_recebimento` | 🟢 **FICA** | Mantém as formas de recebimento homologadas. |
| **Configurações** | `public.templates_mensagem` | 🟢 **FICA** | Mantém os modelos de mensagens de WhatsApp e e-mail. |
| **Cadastros** | `public.clientes` | 🟢 **FICA** | **Preservado**: Mantém a base atual de clientes cadastrados. |
| **Tarefas / Kanban** | `public.todo_columns` & `todo_cards` | 🟢 **FICA** | **Preservado**: Mantém todas as colunas e cartões do Todo/Kanban. |
| **Arquivos** | Supabase Storage (`documentos`, `avatars`) | 🟢 **FICA** | Mantém arquivos salvos no storage sem alteração. |
| **Transacional** | `public.viagens` | 🔴 **APAGAR** | Zera todas as vendas e viagens de teste. |
| **Transacional** | `public.produtos_viagem` | 🔴 **APAGAR** | Zera os produtos e itens vinculados a viagens de teste. |
| **Transacional** | `public.orcamentos` | 🔴 **APAGAR** | Zera todas as cotações e propostas criadas na homologação. |
| **Transacional** | `public.reembolsos` | 🔴 **APAGAR** | Zera solicitações de reembolso de teste. |
| **Transacional** | `public.lembretes` | 🔴 **APAGAR** | Zera lembretes e tarefas operacionais de teste. |
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

## 1. Passo Pré-Execução (Segurança)

Antes de rodar o script no editor do Supabase:
1. Acesse o **Supabase Dashboard** > **Database** > **Backups**.
2. Clique em **Take Backup** (ou exporte uma cópia de segurança em formato `.sql`).

---

## 2. Script SQL Oficial de Limpeza Go-Live

Abra o **Supabase > SQL Editor** e execute o bloco SQL abaixo:

```sql
-- ============================================================================
-- SCRIPT DE LIMPEZA GO-LIVE — PAXFLOW (PIXEL-PERFECT)
-- ============================================================================

BEGIN;

-- 1. Zera dados transacionais, comunicações, metas e auditoria de testes
TRUNCATE TABLE 
    public.produtos_viagem,
    public.viagens,
    public.orcamentos,
    public.reembolsos,
    public.lembretes,
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

-- 2. Reseta as sequências autônomas dos códigos de referência para recomeçarem em 0001
-- (Garante que a primeira viagem comercial seja VIA-0001, ORC-0001 e RBS-0001)
ALTER SEQUENCE IF EXISTS public.viagens_seq_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.orcamentos_seq_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.reembolsos_seq_id_seq RESTART WITH 1;

-- 3. Reseta a pontuação de Gamificação de todos os consultores para Nível 1 (0 XP)
UPDATE public.profiles 
SET xp = 0, 
    nivel = 1, 
    updated_at = NOW();

COMMIT;
```

---

## 3. Script SQL de Verificação Pós-Execução

Após rodar o script de limpeza, execute este bloco no **SQL Editor** para confirmar se todas as tabelas zeraram corretamente e as entidades vitais foram preservadas:

```sql
-- VERIFICAÇÃO DE REGISTROS PÓS GO-LIVE
SELECT 'viagens' AS tabela, COUNT(*) AS total FROM public.viagens
UNION ALL
SELECT 'orcamentos', COUNT(*) FROM public.orcamentos
UNION ALL
SELECT 'reembolsos', COUNT(*) FROM public.reembolsos
UNION ALL
SELECT 'lembretes', COUNT(*) FROM public.lembretes
UNION ALL
SELECT 'notificacoes', COUNT(*) FROM public.notificacoes
UNION ALL
SELECT 'clientes (DEVE CONTER REGISTROS)', COUNT(*) FROM public.clientes
UNION ALL
SELECT 'profiles (DEVE CONTER REGISTROS)', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'escala_diaria (DEVE CONTER REGISTROS)', COUNT(*) FROM public.escala_diaria
UNION ALL
SELECT 'todo_cards (DEVE CONTER REGISTROS)', COUNT(*) FROM public.todo_cards;
```

### Resultado Esperado da Verificação:
- `viagens`, `orcamentos`, `reembolsos`, `lembretes`, `notificacoes`: **0**
- `clientes`, `profiles`, `escala_diaria`, `todo_cards`: **Maior que 0 (Preservados)**
