# 📋 Pré-Requisitos e Preparação de Infraestrutura (WhatsApp & Instagram)

> **Projeto**: Triagem Autônoma de Leads com IA Soberana (PaxFlow)  
> **Objetivo**: Checklist detalhado de contas, acessos, números e credenciais que a agência precisa preparar antes do desenvolvimento técnico.

---

## 1. Conta da Meta (Facebook / WhatsApp / Instagram)

Toda a infraestrutura do WhatsApp Cloud API e Instagram Graph API é gerida pelo ecossistema empresarial da Meta.

### A. Meta Business Suite (Gerenciador de Negócios)
- [ ] **Acesso de Administrador**: Acesso de Administrador ao [business.facebook.com](https://business.facebook.com) da agência.
- [ ] **Verificação da Empresa (CNPJ)**:
  - Documentos em mãos: Cartão CNPJ atualizado, Contrato Social ou Certidão MEI, e uma conta de consumo (energia, telefone ou internet) no nome/endereço da empresa.
  - A verificação garante limites maiores de mensagens e evita bloqueios temporários por spam.
- [ ] **Página do Facebook da Agência**:
  - Deve estar vinculada ao Gerenciador de Negócios.
  - A conta do Instagram comercial deve estar associada a essa Página.

### B. Conta do Instagram
- [ ] **Perfil Comercial**: O Instagram da agência deve ser uma conta do tipo **Profissional / Comercial** (não pode ser conta pessoal ou conta de criador não vinculada).
- [ ] **Permissão de Acesso a Mensagens**:
  - No app do Instagram no celular: *Configurações e privacidade -> Mensagens e respostas a stories -> Ferramentas para mensagens -> Ativar "Permitir acesso às mensagens"*.

### C. Integração com o Digisac (WhatsApp Existente)
> [!NOTE]
> Como o WhatsApp da agência já opera centralizado no **Digisac**, **NÃO é necessário comprar chip novo nem migrar o número**. O PaxFlow atuará como o "Cérebro de Triagem" via Webhook do próprio Digisac, transferindo os tickets qualificados automaticamente para os vendedores lá dentro.

- [ ] **Acesso de Administrador ao Digisac**:
  - Acesso ao painel web do Digisac da agência.
- [ ] **Token de API do Digisac**:
  - Em *Configurações -> API / Desenvolvedores*, gerar ou copiar o Bearer Token de integração da agência.
- [ ] **Criação dos Departamentos / Fila no Digisac**:
  - Criar/identificar a fila inicial de entrada: ex: `Triagem / IA`.
  - Criar/identificar o departamento de destino dos vendedores: ex: `Comercial / Vendas`.
- [ ] **Configuração do Webhook de Mensagens no Digisac**:
  - Cadastrar o endpoint do PaxFlow (`https://<projeto>.supabase.co/functions/v1/digisac-webhook`) para receber os eventos de novas mensagens recebidas.

---

## 2. Instagram Graph API Direto (Meta for Developers)
Para comentários públicos em posts e mensagens diretas (DM) no Instagram:

- [ ] **Instagram Comercial**: Vinculado à Página do Facebook da agência.
- [ ] **Permissão de Acesso a Mensagens no App**: Ativar em *Configurações -> Mensagens -> Permitir acesso*.
- [ ] **App no Meta for Developers**: App criado para receber os webhooks do Instagram.

---

## 2. Provedor de Inteligência Artificial (LLM)

Para a IA interpretar a linguagem natural do cliente, extrair as informações e responder com tom humano.

### A. Google Gemini API (Recomendado pelo custo e velocidade) ou Anthropic Claude
- [ ] **Google AI Studio / Google Cloud**:
  - Acessar [aistudio.google.com](https://aistudio.google.com).
  - Criar um projeto e gerar uma **API Key**.
  - Vincular uma conta de faturamento (cartão de crédito) para habilitar o plano Pay-as-you-go (o modelo *Gemini 1.5 Flash* é ultrarrápido e custa frações de centavos).
- [ ] **Alternativa (Anthropic Claude)**:
  - Acessar [console.anthropic.com](https://console.anthropic.com), criar a conta e gerar a chave para o modelo *Claude 3.5 Haiku*.

---

## 3. Infraestrutura Supabase (Backend do PaxFlow)

Como toda a arquitetura será soberana, o próprio projeto Supabase já existente da agência receberá o tráfego.

- [ ] **Acesso ao Painel do Supabase**:
  - Acesso com perfil `Owner` ou `Admin` no projeto do PaxFlow.
- [ ] **Supabase CLI instalada/configurada**:
  - Necessária para o deploy das **Edge Functions** (mecanismo que recebe os webhooks da Meta).
- [ ] **Variáveis de Ambiente / Secrets a Registrar no Supabase**:
  - `META_WA_TOKEN`: Token de acesso permanente do WhatsApp Cloud API.
  - `META_WA_PHONE_ID`: Identificador do número de telefone no painel da Meta.
  - `META_VERIFY_TOKEN`: Palavra-chave secreta definida por nós para validação do webhook.
  - `AI_API_KEY`: Chave da API da LLM (Gemini ou Claude).

---

## 4. Definições de Negócio da Agência (Regras do Atendimento)

Antes de programar, o time da agência deve responder a 4 perguntas práticas:

1. **Tom de Voz da Agência**: Como a agência fala? (Mais descontraída com emojis ✈️🌴 ou mais formal/corporativa?).
2. **Critérios Mínimos de Qualificação**: Quais perguntas o robô é obrigado a colher antes de chamar o consultor?
   - Exemplo padrão sugerido:
     1. Nome completo.
     2. Destino ou tipo de viagem desejada.
     3. Data prevista ou mês/ano estimado.
     4. Quantidade de passageiros (adultos e crianças).
3. **Distribuição dos Leads Qualificados**:
   - Para onde vai o orçamento gerado?
   - Opção A: Todos entram em uma coluna comum do Kanban para qualquer consultor puxar.
   - Opção B: Roleta automática (distribui 1 para cada consultor ativo).
   - Opção C: Direcionamento por especialidade (ex: Europa vai para Consultor X, Nordeste para Consultor Y).
4. **Horário de Atendimento e Transição**:
   - Fora do horário comercial, a IA qualifica o lead e avisa que o consultor entrará em contato logo no primeiro horário da manhã?

---

## Resumo do Checklist de Entrega

| Item | Responsável | Status |
| :--- | :--- | :--- |
| Gerenciador de Negócios Meta com CNPJ verificado | Agência | ⏳ Pendente |
| Instagram comercial vinculado à Página do Facebook | Agência | ⏳ Pendente |
| Número de telefone apto a receber SMS/Ligação para a API | Agência | ⏳ Pendente |
| Chave de API de Inteligência Artificial (Google Gemini) | Agência / TI | ⏳ Pendente |
| Definição das perguntas obrigatórias de triagem | Agência / Vendas | ⏳ Pendente |

