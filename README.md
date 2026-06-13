# PaxFlow

**Plataforma de Gestão Operacional e Fluxo de Passageiros para Agências de Viagem**

Plataforma SaaS de gestão operacional e fluxo de passageiros no turismo: acompanhamento de viagens, SLAs de passaporte/visto, pipeline de orçamentos, reembolsos e gestão documental — tudo integrado ao Supabase Storage e com colaboração em tempo real.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | TypeScript, Vite 5, Tailwind CSS 3 |
| Backend & BD | Supabase (PostgreSQL + Auth + Realtime) |
| Upload & Armazenamento | Supabase Storage + Canvas API (Compactação Client-side) |
| Drag & Drop | SortableJS |
| Gamificação | Web Audio API + Canvas-Confetti (CDN) |
| Fotos de Perfil | Supabase Storage + Canvas API (Compactação Client-side) |
| Deploy | Cloudflare Pages / Vercel / Netlify |

---

## Funcionalidades

- **Mission Control (Inbox)** — Central de alertas estilo e-mail com SLA de passaporte (180d), reembolsos atrasados e lembretes manuais. Inclui Visualização em Calendário unificada com visões de MÊS, SEMANA e AGENDA, sumarização via Regex e legenda hover tooltip. **Atualizado com busca em tempo real de alta precisão cobrindo campos estruturados, datas formatadas e o consultor responsável.**
- **Kanban de Viagens** — 5 colunas com drag-and-drop, SLAs visuais e gestão de produtos. **Atualizado com campo de busca em tempo real de alto desempenho (destino, LOC, passageiro, consultor e observações) e modal de gerenciamento ampliado com aba de Histórico de Reembolsos e aba de Produtos/Serviços. O código de reserva (LOC) do produto/serviço agora é obrigatório (máximo 20 caracteres, código único). Apresenta trava de transição de status: a movimentação a partir de 'Fechado' exige que o saldo de produtos esteja zerado e que cada produto esteja detalhado (soma de Tarifa + Taxa + Comissão igual ao Valor de Venda do produto).**
- **Pipeline de Orçamentos** — 4 estágios com temperatura de lead, tags, notas e upload de documentos. **Atualizado com busca em tempo real e modal de visualização em duas colunas. A busca por clientes recorrentes no autocomplete do formulário foi corrigida para precisão absoluta. Ao fechar uma venda, caso o cliente não possua documento cadastrado, exige e valida o CPF/CNPJ com máscara e verificação oficial de dígitos verificadores.**
- **Gestão e Ficha de Clientes** — Ficha única com passaporte/visto, validade monitorada por SLA, upload seguro para o Supabase Storage. **Atualizado com busca omnipresente de alta abrangência e Visualizador de Documentos Inline PaxFlow. O campo Documento conta com máscara de digitação dinâmica para CPF/CNPJ e validação matemática de dígitos verificadores contra fraudes e erros humanos, bloqueando o envio de formulários inválidos.**
- **Central de Reembolsos** — Tabela com cronômetro SLA em tempo real, status inline e métricas consolidadas. **Atualizado com campo de busca em tempo real em memória abrangendo clientes, destinos, localizadores, fornecedores, tipos de serviço, status e valores formatados.**
- **Sistema de Gamificação dos Consultores [NEW]** — Engajamento operacional por meio de ganho de XP e patentes temáticas (Mochileiro, Explorador, Navegador, Guia de Elite, Embaixador). Apresenta anel de progresso circular SVG gradiente e nível numérico ao redor do avatar na Sidebar (sincronizados ao vivo via Supabase Realtime) e displays de patente sob o nome do usuário.
- **Mural de Medalhas (Badges) [NEW]** — Grade interativa no perfil com 14 medalhas conquistáveis (SLA_CHAMP, DRIVE_MASTER, COMPLIANCE_HERO, etc.) exibidas em cores (conquistada) ou cinza com cadeado (bloqueada), acompanhadas de tooltips flutuantes em CSS contendo regras de desbloqueio.
- **Animações e Efeitos de Celebração [NEW]** — Comemoração ao subir de nível ou fechar vendas com explosões visuais de confete (canvas-confetti via CDN) e áudios de chimes musicais sintetizados dinamicamente via Web Audio API, além de um modal glassmorphic 3D.
- **Fotos de Perfil Personalizadas [NEW]** — Upload self-service de imagens do computador ou celular integrado ao Supabase Storage. As fotos são cortadas e comprimidas no navegador via Canvas para menos de 50KB antes de subir, economizando banda e armazenamento da agência.
- **Painel Administrativo (Configurações)** — Configuração de SLAs, gestão de consultores, limite máximo de upload configurável. Inclui aba "Importações" para importação em lote de chamados DIGISAC (CSV) com mapeamento inteligente de colunas, conversor monetário/temporal e fuzzy match de atendentes.
- **Cockpit de Tarefas** — Kanban interno standalone (todo.html) para planejamento da equipe.
- **Navegação & UI Premium (Sidebar Colapsável, Perfil Centralizado & Lupa Vetorial)** — Shell de navegação avançado com barra lateral colapsável sob demanda (estado persistido via `localStorage` sob a chave `"paxflow-sidebar-collapsed"`). Centralização dos controles de identidade (avatar, nome, e-mail do consultor logado), alternador de tema claro/escuro e encerramento de sessão (logout) diretamente no rodapé da Sidebar, removendo elementos redundantes dos cabeçalhos das páginas. Campos de busca unificados com ícones vetoriais modernos (SVGs Heroicons) alinhados de forma absoluta e perfeitamente centrada.
- **Utilitários de Banco de Dados** — Acompanha o script `supabase/clean_db.sql`, permitindo efetuar uma limpeza de dados transacionais e de teste em ambientes Supabase de maneira 100% resiliente e sem interferir na infraestrutura cadastrada.


---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (plano gratuito suficiente)

---

## Configuração e Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/paxflow.git
cd paxflow

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env

# Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

Crie o arquivo `.env` a partir do modelo `.env.example`:

```env
# 1. Supabase (Obrigatório)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```


## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run preview` | Preview do build de produção |

---

## Estrutura do Projeto

```
src/
├── main.ts           # Shell da SPA (auth, navegação, tema)
├── types/
│   └── index.ts      # Interfaces TypeScript do domínio
├── pages/
│   ├── Inbox.ts      # Mission Control (alertas SLA + Calendário)
│   ├── Dashboard.ts  # Kanban de viagens
│   ├── Orcamentos.ts # Pipeline de orçamentos
│   ├── Clientes.ts   # Gestão de clientes
│   ├── Reembolsos.ts # Central de reembolsos
│   └── Configuracoes.ts # Painel admin (Configurações + Importador CSV)
├── services/
│   ├── supabase.ts   # Cliente Supabase + auth + perfil
│   ├── googleDrive.ts # Serviço de Upload e Compressão no Supabase Storage
│   ├── csvImporter.ts # Parser e importador de CSV inteligente
│   ├── dialog.ts     # Componentes de modal/dialog
│   ├── avatars.ts    # Geração de avatares e compressão de imagem
│   └── gamification.ts # Serviço de cálculo de nível, XP e medalhas
├── utils/
│   ├── masks.ts      # Utilitários de máscaras, validações e formulários (CPF/CNPJ, etc.)
│   └── celebrations.ts # Comemoração de level up (confetes e som nativo)
├── todo.ts           # Kanban interno (standalone)
└── index.css         # Estilos globais + Tailwind

```

---

## Implantação

```bash
npm run build
# Envie o conteúdo de dist/ para seu CDN ou servidor estático
```

Configure as mesmas variáveis de ambiente no seu provedor de hospedagem.

---

## Licença

Este projeto é de propriedade de Thiago Costa. Todos os direitos reservados.

---

## Autoria

**Thiago Costa** — 2026

---

> Para propostas comerciais, demonstrações ou suporte, consulte o arquivo [`docs/documentation.md`](docs/documentation.md).
