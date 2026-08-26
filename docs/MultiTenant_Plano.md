# Especificação Arquitetural Enterprise: Escalonamento Multi-Tenant & Grupos de Agências (PaxFlow)

> [!IMPORTANT]
> **Status:** Documentação Técnica Salva para Implementação Futura (Revisão Cirúrgica v2.0).
> **Princípio de Segurança Primário:** A `agencia_id` é a unidade primária e obrigatória de isolamento operacional. A ausência de contexto de agência em ambiente multi-tenant é tratada como **Erro de Aplicação**, nunca como fallback silencioso definitivo.

---

## 1. Princípios Arquiteturais Fundamentais

1. **Agência como Tenant Operacional**: Toda entidade operacional (`clientes`, `viagens`, `orcamentos`, `reembolsos`, `escala`) pertence a **exatamente uma agência** (`agencia_id NOT NULL`).
2. **Grupo como Camada de Agregação e Autorização**: O `grupo_id` é uma camada de consolidação. A associação ao grupo é derivada da relação `agencia -> grupo`, evitando redundância e anomalias de dados (ex: viagem com `agencia_id = A` e `grupo_id = B`).
3. **Defesa em Profundidade (Defense in Depth)**:
   - *Frontend*: Interface reativa ao contexto ativo (`AgencyContext`).
   - *Backend*: Serviços validam autorização do usuário e escopo do tenant em todas as rotas.
   - *Banco de Dados*: Funções centralizadas de RLS + Constraints `NOT NULL` e `FOREIGN KEY`.
4. **Fallback Transitório com Telemetria**: A agência padrão (`DEFAULT_AGENCY_UUID`) é utilizada exclusivamente durante a fase de migração de dados legados, registrando logs de auditoria. No estado final, requisições sem `agencia_id` disparam erro imediato.
5. **Segurança de Segredos**: Credenciais de integrações (Digisac) nunca são expostas ao frontend ou trafegadas em query parameters de URLs.

---

## 2. Matriz Consolidada de Decisões Arquiteturais

| Pilar Arquitetural | Decisão Selecionada | Descrição Técnica |
| :--- | :--- | :--- |
| **Modelo Organizacional** | **Hierárquico Dedicado** | Tabela `grupos_agencias` (Rede/Holding) e tabela `agencias` (Filiais). Agências únicas possuem `grupo_id = NULL`. |
| **Fonte Única de Verdade** | **`agencia_id` Obrigatório** | Tabelas operacionais contêm estritamente `agencia_id NOT NULL`. O grupo é resolvido via JOIN com `agencias.grupo_id`. |
| **Modelagem de Tabelas** | **Tabelas de Configuração Desacopladas** | Divisão em `agencias`, `agencia_settings`, `agencia_branding` e `agencia_integracoes` (evitando mega-tabelas). |
| **Identidade e Autorização** | **Modelos de Membership Separados** | `usuario_agencias` (papéis: `agencia_admin`, `consultor`) e `usuario_grupos` (papel: `grupo_director`). `super_admin` possui escopo global. |
| **Contexto da Aplicação** | **`AgencyContext` Reativo Centralizado** | O objeto de contexto gerencia `activeAgencyId`, `availableAgencies`, `role` e `permissions`. O Tenant Switcher altera o contexto ativo sem ignorar autorizações no backend. |
| **Branding & Links Públicos** | **Customização por Agência com Slug** | Cada agência possui `slug` único, `logo_url` e `cor_primaria`. Links públicos validam o `slug` e as permissões do recurso. |
| **Segurança em Links Públicos** | **Tokens Criptográficos (UUIDv4)** | `public_access_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()`. O backend valida token $\rightarrow$ viagem $\rightarrow$ agência $\rightarrow$ permissão pública. |
| **Integração WhatsApp Digisac** | **Webhook REST com Assinatura em Header** | `POST /api/webhooks/digisac/{agencia_id}` com validação de assinatura `X-Webhook-Signature` no header e controle de idempotência. |
| **Armazenamento de Arquivos** | **Storage Estruturado com ID Único** | `/agencias/{agencia_id}/clientes/{cliente_id}/{document_id}/{filename}` no Supabase Storage com RLS por pasta de agência. |
| **Funções RLS Centralizadas** | **Helper Functions SQL** | Policies de RLS reutilizam `user_is_super_admin()`, `user_can_access_agency()` e `user_can_access_group()`. |
| **Onboarding & Anti-Spam** | **Fluxo com Moderação + Expurgo** | Cadastro via site cria agência com `status = 'pendente_aprovacao'`. Super Admin Aprova (ativa acesso) ou Nega (executa purge auditado). |
| **Rollout da Migração** | **Implantação em 9 Ondas com Rollback** | Rollout incremental com feature flags, validação de integridade, testes de isolamento negativo e plano de desativação/rollback. |

---

## 3. Modelo de Dados Relacional (Esquema SQL/Supabase)

```mermaid
erDiagram
    GRUPOS_AGENCIAS ||--o{ AGENCIAS : "possui filiais"
    AGENCIAS ||--|| AGENCIA_SETTINGS : "configura"
    AGENCIAS ||--|| AGENCIA_BRANDING : "personaliza"
    AGENCIAS ||--|| AGENCIA_INTEGRACOES : "conecta"
    AGENCIAS ||--o{ USUARIO_AGENCIAS : "associa"
    GRUPOS_AGENCIAS ||--o{ USUARIO_GRUPOS : "gerencia"
    PERFIS_USUARIOS ||--o{ USUARIO_AGENCIAS : "membro de"
    PERFIS_USUARIOS ||--o{ USUARIO_GRUPOS : "diretor em"
    AGENCIAS ||--o{ CLIENTES : "pertence a"
    AGENCIAS ||--o{ VIAGENS : "opera"
    AGENCIAS ||--o{ ORCAMENTOS : "negocia"
    AGENCIAS ||--o{ REEMBOLSOS : "gerencia"

    GRUPOS_AGENCIAS {
        uuid id PK
        string nome
        string cnpj_matriz
        timestamp created_at
    }

    AGENCIAS {
        uuid id PK
        uuid grupo_id FK "nullable"
        string nome
        string slug UK "ex: turismo-vip"
        string cnpj
        string status "pendente_aprovacao | ativa | bloqueada"
        timestamp created_at
    }

    AGENCIA_BRANDING {
        uuid agencia_id PK,FK
        string logo_url
        string cor_primaria
        string favicon_url
    }

    AGENCIA_INTEGRACOES {
        uuid agencia_id PK,FK
        string digisac_domain
        string digisac_service_id
        string digisac_token_encrypted
        string webhook_secret
    }

    AGENCIA_SETTINGS {
        uuid agencia_id PK,FK
        int prazo_reembolso_dias
        int sla_pre_embarque_dias
        boolean enviar_nps_automatico
    }

    PERFIS_USUARIOS {
        uuid id PK "auth.uid()"
        string nome
        string email UK
        string avatar_url
        timestamp created_at
    }

    USUARIO_AGENCIAS {
        uuid id PK
        uuid user_id FK
        uuid agencia_id FK
        string role "agencia_admin | consultor"
        boolean ativo
        constraint UK_user_agencia "UNIQUE(user_id, agencia_id)"
    }

    USUARIO_GRUPOS {
        uuid id PK
        uuid user_id FK
        uuid grupo_id FK
        string role "grupo_director"
        boolean ativo
        constraint UK_user_grupo "UNIQUE(user_id, grupo_id)"
    }
```

---

## 4. Políticas RLS com Funções Centralizadas de Autorização

Para evitar duplicidade de código SQL e garantir manutenibilidade em todas as tabelas operacionais, serão criadas três funções SQL de segurança:

```sql
-- 1. Verificar se o usuário é Super Admin PaxFlow
CREATE OR REPLACE FUNCTION user_is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfis_usuarios pu
    WHERE pu.id = p_user_id AND pu.is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Verificar se o usuário possui acesso à agência específica
CREATE OR REPLACE FUNCTION user_can_access_agency(p_user_id UUID, p_agencia_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Acesso direto via agência
  IF EXISTS (
    SELECT 1 FROM usuario_agencias ua
    WHERE ua.user_id = p_user_id AND ua.agencia_id = p_agencia_id AND ua.ativo = true
  ) THEN
    RETURN true;
  END IF;

  -- Acesso via Grupo (se o usuário for Diretor do Grupo ao qual a agência pertence)
  RETURN EXISTS (
    SELECT 1 FROM usuario_grupos ug
    JOIN agencias a ON a.grupo_id = ug.grupo_id
    WHERE ug.user_id = p_user_id AND a.id = p_agencia_id AND ug.ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Exemplo de Policy RLS em tabela operacional (Viagens)
CREATE POLICY "Isolamento de Viagens por Agencia" 
ON viagens 
FOR ALL 
USING (
  user_is_super_admin(auth.uid()) 
  OR user_can_access_agency(auth.uid(), agencia_id)
);
```

---

## 5. Arquitetura de Webhooks Digisac com Idempotência e Segurança

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (WhatsApp)
    participant Digisac as API Digisac
    participant Webhook as Edge Function PaxFlow
    participant DB as Supabase DB
    participant Inbox as Inbox da Agência

    Cliente->>Digisac: Envia mensagem no WhatsApp
    Digisac->>Webhook: POST /api/webhooks/digisac/{agencia_id} [X-Webhook-Signature]
    Webhook->>DB: Busca agencia_integracoes WHERE agencia_id = {agencia_id}
    Webhook->>Webhook: Valida HMAC Signature com webhook_secret
    Webhook->>DB: Verifica Idempotência (message_id no Redis/Table)
    alt Mensagem já processada
        Webhook-->>Digisac: HTTP 200 (Ignorado por duplicidade)
    else Nova mensagem
        Webhook->>DB: Salva mensagem com agencia_id estrito
        DB-->>Inbox: Atualiza a Caixa de Entrada da agência em tempo real
        Webhook-->>Digisac: HTTP 200 OK
    end
```

---

## 6. Plano de Migração Incremental em 9 Ondas (Rollout & Rollback)

```mermaid
flowchart TD
    F0[Fase 0: Preparação, Backup & Feature Flags] --> F1[Fase 1: Estrutura de Banco & Tabelas Multi-Tenant]
    F1 --> F2[Fase 2: Backfill com DEFAULT_AGENCY_UUID]
    F2 --> F3[Fase 3: Validação de Integridade de Dados Legados]
    F3 --> F4[Fase 4: AgencyContext no Frontend com Fallback Logado]
    F4 --> F5[Fase 5: Migração das Leitura de Banco com Filtro de Tenant]
    F5 --> F6[Fase 6: Escrita Obrigatória com agencia_id]
    F6 --> F7[Fase 7: Ativação das Policies RLS e Funções SQL]
    F7 --> F8[Fase 8: Liberação do Multi-Tenant & Switcher]
    F8 --> F9[Fase 9: Depreciação do Fallback & Remoção de Código Legado]
```

### Checklist dos Critérios de Conclusão (Definition of Done)

- [ ] 100% das entidades operacionais contêm `agencia_id NOT NULL` válido.
- [ ] 0 registros com anomalias de pertencimento entre agência e grupo.
- [ ] 100% das tabelas críticas protegidas por RLS reutilizando as funções SQL de segurança.
- [ ] **Testes Negativos de Isolamento Automatizados**:
  - *Teste*: Agência A tenta acessar registros da Agência B via ID direto $\rightarrow$ Resultado esperado: `404 Not Found` / `403 Forbidden`.
- [ ] Diretor de Grupo visualiza relatórios consolidados das agências filiadas.
- [ ] Roteamento de Webhooks Digisac validado via HMAC e idempotência por `message_id`.
- [ ] Links públicos acessíveis exclusivamente via `public_access_token` UUID aleatório.
- [ ] Armazenamento de arquivos no Storage organizado no padrão `/agencias/{agencia_id}/...`.
- [ ] Ocorrências do fallback da agência legada reduzidas a **Zero** no monitoramento de logs.
