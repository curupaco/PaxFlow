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
| **Transacional** | `public.orcamentos` | 🟡 **PARCIAL** | **Preservado Parcial**: Mantém orçamentos em aberto (`SOLICITADO`, `EM_ANDAMENTO`, `AGUARDANDO`) e apaga os concluídos (`ACEITO` / `DESISTENCIA`). |
| **Transacional** | `public.reembolsos` | 🔴 **APAGAR** | Zera solicitações de reembolso de teste. |
| **Transacional** | `public.lembretes` | 🟡 **PARCIAL** | Apaga lembretes vinculados a viagens e orçamentos concluídos; mantém os lembretes dos orçamentos em aberto. |
| **Comunicação** | `public.mensagens_diretas` | 🔴 **APAGAR** | Zera todas as mensagens e e-mails da Inbox. |
| **Comunicação** | `public.mensagem_destinatarios` | 🔴 **APAGAR** | Zera relacionamentos de destinatários da Inbox. |
| **Comunicação** | `public.comentarios` | 🟡 **PARCIAL** | Apaga comentários de viagens e orçamentos concluídos; mantém comentários dos orçamentos em aberto. |
| **Comunicação** | `public.notificacoes` | 🔴 **APAGAR** | Zera notificações internas da Inbox dos consultores. |
| **Financeiro / Audit** | `public.loc_conferencias` & `loc_pagamentos` | 🔴 **APAGAR** | Zera conferências financeiras e logs de pagamento. |
| **Auditoria** | `public.audit_logs` | 🔴 **APAGAR** | Zera o histórico de logs de auditoria da fase de testes. |
| **Pesquisa** | `public.feedbacks_nps` | 🔴 **APAGAR** | Zera avaliações de NPS fictícias. |
| **Gamificação** | `public.profiles` (`xp`, `nivel`) | 🔄 **RESETAR** | **Reset**: Define `xp = 0` e `nivel = 1` para reinício competitivo. |
| **Gamificação** | `public.profiles_xp_logs` | 🔴 **APAGAR** | Zera o histórico de XP acumulado nos testes. |
| **Gamificação** | `public.profiles_badges` | 🔴 **APAGAR** | Zera as medalhas conquistadas durante a homologação. |
| **Gamificação** | `public.campaigns` & `meta_periodos` | 🔴 **APAGAR** | Zera campanhas e faixas de metas financeiras fictícias. |

---

## 1. Passo Pré-Execução (Segurança — Opcional)

> [!NOTE]
> No plano **Free Tier** do Supabase, os snapshots automáticos no painel não estão disponíveis. Caso deseje uma cópia simples de segurança das tabelas vitais antes da limpeza, exporte os CSVs via **Supabase Dashboard > Table Editor > Export > Export to CSV**. Caso contrário, pode prosseguir direto para o script de limpeza abaixo.

---

## 2. Script SQL Oficial de Limpeza Go-Live (Resiliente)

Abra o **Supabase > SQL Editor** e execute o bloco SQL abaixo (ele verifica a existência de cada tabela antes de limpar, evitando erros como `relation does not exist` se alguma tabela opcional não tiver sido criada):

```sql
-- ============================================================================
-- SCRIPT DE LIMPEZA GO-LIVE — PAXFLOW (RESILIENTE A TABELAS AUSENTES)
-- ============================================================================

DO $$
DECLARE
    t_name TEXT;
    target_tables TEXT[] := ARRAY[
        'produtos_viagem',
        'viagens',
        'reembolsos',
        'notificacoes',
        'mensagem_destinatarios',
        'mensagens_diretas',
        'loc_conferencias',
        'loc_pagamentos',
        'feedbacks_nps',
        'audit_logs',
        'campaigns',
        'meta_periodos',
        'meta_faixas',
        'profiles_xp_logs',
        'profiles_badges'
    ];
BEGIN
    -- 1. Zera de forma segura as tabelas transacionais que existirem no banco
    FOREACH t_name IN ARRAY target_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE;', t_name);
        END IF;
    END LOOP;

    -- 2. Apaga orçamentos concluídos (ACEITO / DESISTENCIA), preservando os em aberto
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orcamentos') THEN
        EXECUTE 'DELETE FROM public.orcamentos WHERE status = ''CONCLUIDO'';';
    END IF;

    -- 3. Remove lembretes vinculados a viagens ou orçamentos excluídos
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lembretes') THEN
        IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.lembretes'::regclass AND attname = 'orcamento_id' AND NOT attisdropped)
           AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orcamentos') THEN
            EXECUTE 'DELETE FROM public.lembretes WHERE orcamento_id IS NULL OR orcamento_id NOT IN (SELECT id FROM public.orcamentos);';
        ELSE
            EXECUTE 'TRUNCATE TABLE public.lembretes RESTART IDENTITY CASCADE;';
        END IF;
    END IF;

    -- 4. Remove comentários vinculados a viagens ou orçamentos excluídos (usando o catálogo nativo pg_attribute)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comentarios') THEN
        IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.comentarios'::regclass AND attname = 'item_id' AND NOT attisdropped)
           AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orcamentos') THEN
            EXECUTE 'DELETE FROM public.comentarios WHERE (tipo_item = ''orcamento'' AND item_id NOT IN (SELECT id FROM public.orcamentos)) OR tipo_item != ''orcamento'';';
        ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.comentarios'::regclass AND attname = 'parent_id' AND NOT attisdropped)
              AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orcamentos') THEN
            EXECUTE 'DELETE FROM public.comentarios WHERE parent_id NOT IN (SELECT id FROM public.orcamentos);';
        ELSE
            EXECUTE 'TRUNCATE TABLE public.comentarios RESTART IDENTITY CASCADE;';
        END IF;
    END IF;

    -- 5. Reseta/Sincroniza as sequências autônomas dos códigos de referência
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'viagens_seq_id_seq') THEN
        ALTER SEQUENCE public.viagens_seq_id_seq RESTART WITH 1;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'reembolsos_seq_id_seq') THEN
        ALTER SEQUENCE public.reembolsos_seq_id_seq RESTART WITH 1;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'orcamentos_seq_id_seq') THEN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orcamentos') THEN
            PERFORM setval('public.orcamentos_seq_id_seq', COALESCE((SELECT MAX(seq_id) FROM public.orcamentos), 0) + 1, false);
        END IF;
    END IF;

    -- 6. Reseta a pontuação de Gamificação de todos os consultores para Nível 1 (0 XP) se existirem as colunas
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass AND attname = 'xp' AND NOT attisdropped) THEN
            IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass AND attname = 'updated_at' AND NOT attisdropped) THEN
                EXECUTE 'UPDATE public.profiles SET xp = 0, nivel = 1, updated_at = NOW();';
            ELSE
                EXECUTE 'UPDATE public.profiles SET xp = 0, nivel = 1;';
            END IF;
        END IF;
    END IF;
END $$;
```

---

## 3. Script SQL de Verificação Pós-Execução

Após rodar o script de limpeza, execute este bloco no **SQL Editor** para confirmar se todas as tabelas zeraram corretamente e as entidades vitais foram preservadas:

```sql
-- VERIFICAÇÃO DE REGISTROS PÓS GO-LIVE
SELECT 'viagens (DEVE SER 0)' AS tabela, COUNT(*) AS total FROM public.viagens
UNION ALL
SELECT 'orcamentos_concluidos (DEVE SER 0)', COUNT(*) FROM public.orcamentos WHERE status = 'CONCLUIDO'
UNION ALL
SELECT 'orcamentos_em_aberto (PRESERVADOS)', COUNT(*) FROM public.orcamentos WHERE status != 'CONCLUIDO'
UNION ALL
SELECT 'reembolsos (DEVE SER 0)', COUNT(*) FROM public.reembolsos
UNION ALL
SELECT 'lembretes_em_aberto (PRESERVADOS)', COUNT(*) FROM public.lembretes
UNION ALL
SELECT 'comentarios_em_aberto (PRESERVADOS)', COUNT(*) FROM public.comentarios
UNION ALL
SELECT 'notificacoes (DEVE SER 0)', COUNT(*) FROM public.notificacoes
UNION ALL
SELECT 'clientes (DEVE CONTER REGISTROS)', COUNT(*) FROM public.clientes
UNION ALL
SELECT 'profiles (DEVE CONTER REGISTROS)', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'escala_diaria (DEVE CONTER REGISTROS)', COUNT(*) FROM public.escala_diaria
UNION ALL
SELECT 'todo_cards (DEVE CONTER REGISTROS)', COUNT(*) FROM public.todo_cards;
```

### Resultado Esperado da Verificação

- `viagens`, `orcamentos_concluidos`, `reembolsos`, `notificacoes`: **0**
- `orcamentos_em_aberto`, `lembretes_em_aberto`, `comentarios_em_aberto`: **Preservados (Maior ou igual a 0)**
- `clientes`, `profiles`, `escala_diaria`, `todo_cards`: **Maior que 0 (Preservados)**

