# PaxFlow

Plataforma SaaS de gestão operacional e fluxo de passageiros no turismo: acompanhamento de viagens, SLAs de passaporte/visto, pipeline de orçamentos, reembolsos e gestão documental — tudo integrado ao Supabase Storage e com colaboração em tempo real.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | TypeScript, Vite 5, Tailwind CSS 3 |
| Backend & BD | Supabase (PostgreSQL + Auth + Realtime) |
| Upload & Armazenamento | Supabase Storage + Canvas API (Compactação Client-side) |
| Drag & Drop | SortableJS |
| Gamificação | Web Audio API + Canvas-Confetti (CDN) |
| Fotos de Perfil | Supabase Storage + Canvas API (Compactação Client-side) |
| Deploy | Cloudflare Pages / Vercel / Netlify |

---

## Funcionalidades

- **Melhorias Estratégicas no Módulo de Relatórios (Modal de Orçamento Sobreposto, Validação de Gestor e Chat Digisac) [NEW]** — Evolução da inteligência e governança operacional nas visões analíticas de Relatórios (`src/pages/Relatorios.ts`):
  - **Orçamentos Sobrepostos em Relatórios (Sem Troca de Rota)**: Links nos nomes de clientes e botões `📄 Orçamento` (em Desistências e Embarques) abrem o modal completo de visualização/edição do orçamento (`VerNotasModal`) diretamente sobre a tela de Relatórios, mantendo a aba ativa, filtros e posição intactos ao fechar.
  - **Embarques - Validação do Gestor**: Nova coluna "Validação Gestor" restrita exclusivamente a usuários com perfil de Administrador (`perfil.role === 'admin'`), permitindo marcar conferências de embarque em 1-clique (`🛡️ Conferido` / `⏳ Pendente`), com registro de autor, data/hora e persistência resiliente a Schema Drift.
  - **Embarques - Ações Rápidas**: Inclusão de botão dedicado `📄 Orçamento` ao lado de `🔍 Viagem` na coluna de Ações para abrir diretamente o orçamento vinculado.
  - **Integração Global com WhatsApp / Digisac**: Botão de WhatsApp padronizado em todas as tabelas analíticas com passageiros/clientes (Desistências, Embarques, Pós-Venda, SLAs Documentais e Risco), abrindo a tela de conversa no Digisac em modo de visualização/controle sem disparar mensagens automáticas.
- **Central de Lembretes com Descrição & Resolução de Nome Fidedigna [NEW]** — Formulário de criação de lembretes no Mission Control/Inbox enriquecido com campo de texto multilinha dedicado para detalhamento do assunto/motivo do lembrete, além de resolução matemática e contextual precisa do nome do cliente titular nas propostas e viagens (eliminando exibições genéricas como "CLIENTE VIAGEM").
- **Painel de Filtros Avançados Combináveis, Resumo Financeiro & Exportação CSV de Viagens [UPDATED]** — Sistema avançado de filtragem e inteligência no painel operacional de Viagens (`Dashboard.ts`). Substitui o filtro simples de data por um botão dinâmico **🎛️ Avançado (N)** com contagem de critérios ativos e painel colapsável combinatório com rolagem interna otimizada (`overflow-y-auto`): multi-select de Produtos/Serviços com alternância lógica (**Contém TODOS [E]** vs **Contém QUALQUER [OU]**), **Filtros de Produtos com Markup e/ou RAV** (pills interativas: `Todos`, `💎⚡ Markup + RAV (e/ou)`, `💎 Com Markup`, `⚡ Com RAV`, `✨ Ambos (MKP e RAV)`, `💼 Apenas Comissão` e `🚫 Sem MKP/RAV`), **Filtro por Todos os Valores Financeiros do Produto** (faixas numéricas de Mínimo e Máximo em R$ para Tarifa Base Líquida, Taxas, Comissão de Fornecedor, Markup, RAV, Rentabilidade Líquida Total e Valor Total de Venda), seletor rápido de competência (`YYYY-MM`) e datas customizadas por tipo (Criação, Financeiro, Ida, Volta), Destinos em pills, busca por Fornecedor/Cia Aérea, tri-state de Vouchers/Anexos, Conferência de Processo e Financeira, e status de SLAs/Risk Score. Inclui **Barra de Resumo Financeiro em Tempo Real** (Vendas Totais, Rentabilidade Acumulada, Ticket Médio e Contagem de Viagens), **Chips de Filtros Ativos com remoção individual (`✕`)** e **Exportação de Viagens para CSV/Excel** com codificação UTF-8 BOM e delimitador `;`.
- **Especialização de Campos Financeiros por Tipo de Produto (`EditTravelModal`) [NEW]** — Interface inteligente e reativa no editor de produtos da viagem: no produto tipo **`RAV - 12%` / `RAV`**, exibe exclusivamente os campos **Venda** e **RAV** (calculando 88% de rentabilidade líquida e ocultando taxas, comissão, markup e tarifa); no produto tipo **`MARKUP`**, exibe exclusivamente os campos **Venda** e **Markup** (calculando 100% de rentabilidade e ocultando taxas, comissão, rav e tarifa); e para **todos os demais tipos de produto** (Aéreo, Hotel, Seguro, etc.), exibe **Venda, Taxas, Comissão e Tarifa**, removendo permanentemente os campos de Markup e RAV. Sincroniza dinamicamente na troca do tipo e valida o detalhamento com 100% de precisão.
- **PaxFlow FinRecon™ (Módulo de Conciliação Bancária & Smart Matching) [NEW]** — Módulo financeiro completo (rota `#conciliacao` acessível a Administradores/Gestores) para casar lançamentos do extrato bancário com recebimentos do sistema (`loc_pagamentos`). Inclui importação drag-and-drop de arquivos `.ofx` e `.csv` dos principais bancos nacionais com upload em lote e arquivamento seguro no Supabase Storage (`extratos-bancarios`), algoritmo de Smart Matching com pontuação preditiva de 0 a 100 (proximidade de valor com tolerância de até 5% para taxas de gateway/cartão, proximidade de data e correspondência de nomes/LOCs), conciliação 1:1 e 1:N (um único depósito liquidando múltiplos recebimentos com 1-clique para absorção da taxa), modal de justificativa para entradas não operacionais (Aportes, Rendimentos, TEDs internas, Estornos), fechamento de competência com trancamento contábil (`🔒 Fechar Mês`), exportação de relatórios em CSV (UTF-8 com BOM) e resiliência total a Schema Drift (fallback 42P01 e 42703).
- **Controle de Participação em Métricas, Rankings e KPIs no Cadastro de Usuários [NEW]** — Interruptor dedicado (`profiles.participa_metricas`) no cadastro e edição de consultores nas Configurações Administrativas. Permite excluir usuários específicos (ex: Administradores, Contas de Teste, Suporte Técnico ou Diretoria) de disputas de rankings individuais de vendas, tabelas comparativas comerciais, campanhas de metas de equipe e da gamificação/leaderboard de XP, mantendo 100% da fidelidade financeira no faturamento global da agência, com tratamento de resiliência a Schema Drift (fallback 42703).
- **Atalho Rápido e Modal Sobreposto de Cadastro do Cliente na Venda [NEW]** — Botão compacto (**👤 Ver Ficha**) integrado ao lado do campo de cliente no modal de detalhes da venda (`EditTravelModal`), permitindo aos consultores abrir instantaneamente uma janela sobreposta para visualização e edição completa da ficha cadastral do passageiro (dados de contato, endereço, CPF/CNPJ, passaportes com SLA de validade, preferências e observações) persistindo no Supabase e sincronizando os dados na venda em tempo real sem perder o formulário aberto.
- **Barra de Completude Cadastral na Ficha do Cliente (Profile Completeness) [NEW]** — Auditoria e governança de dados em tempo real no topo da Ficha do Cliente, com badge visual dinâmico (`85% Preenchido`), coloração por nível de integridade (🔴 < 50%, 🟡 50-79%, 🟢 ≥ 80%) e tooltip interativo com checklist detalhado de itens concluídos e pendências (Nome, E-mail, Telefone, CPF/CNPJ, Data de Nascimento e Passaporte com Validade).
- **Linha do Tempo Unificada do Cliente (PaxFlow Customer 360°) [NEW]** — Aba dedicada na Ficha do Cliente que consolida toda a história de relacionamento com a agência em ordem cronológica reversa: data de cadastro inicial, orçamentos solicitados com status e valores, viagens operacionais confirmadas e LOCs, documentos anexados no Google Drive e notas de avaliações NPS pós-viagem.
- **Assistente Passo a Passo para Conversão de Orçamento em Viagem (Mini-Wizard) [NEW]** — Ao fechar uma venda no Kanban de Orçamentos, o processo é conduzido por um modal inteligente em 2 etapas intuitivas: *Passo 1 (Validação Cadastral do Passageiro Titular com máscara e data de nascimento)* e *Passo 2 (Dados de Roteiro & Finanças com busca de destino, datas, valor da venda e notas operacionais)*, com stepper visual de progresso e validação de consistência.
- **Reordenação Drag & Drop de Dias do Roteiro no PaxFlow Studio™ [NEW]** — Cada bloco de dia no editor de propostas e cadernos de viagem possui uma alça de arraste nativa (`⋮⋮`), permitindo reorganizar a sequência dos dias de viagem por arrasto no mouse, com renumeração automática de `diaNumero` e atualização instantânea do Live Preview em tempo real.
- **Telas de Carregamento Esqueleto (Skeleton Screens) [NEW]** — Substituição de spinners convencionais por blocos pulsantes estruturados (`animate-pulse`) que espelham com exatidão a volumetria e formato de tabelas, cards e fichas enquanto os dados do Supabase são carregados, eliminando oscilações e saltos de layout (CLS).
- **Gestos de Deslizar nos Cards Mobile (Swipe Actions) [NEW]** — Suporte a gestos nativos de toque para smartphones e tablets nos cards da visualização mobile: deslizar para a direita abre o atalho de WhatsApp com o passageiro, e deslizar para a esquerda abre a gaveta de detalhes operacionais da viagem.
- **Menu de Ações Rápidas nos Cards de Orçamento (⋮) & Lead Aging [NEW]** — No Kanban de Orçamentos, cada card conta com indicador visual de tempo na etapa (🟢 ≤2d, 🟡 3-5d, 🔴 >5d com animação pulsante) para identificar leads estagnados. O botão de ações rápidas (`⋮`) permite alterar a temperatura comercial com 1-toque (🔥 Quente, ⚡ Normal, ❄️ Frio), disparar mensagens no WhatsApp, agendar lembrete em 2 dias e visualizar notas/detalhes sem precisar abrir múltiplos modais.
- **Abas Superiores com Contadores Dinâmicos na Central de Reembolsos [NEW]** — Barra de status estilo pill no topo da tabela de reembolsos categorizando as solicitações em tempo real: `Todos (N)`, `⏳ Solicitados (N)`, `🔍 Em Análise (N)`, `✅ Aprovados / Pagos (N)` e `❌ Recusados / Cancelados (N)`, permitindo alternância instantânea com filtragem combinada à busca por texto.
- **Sync Scroll Espelhado no PaxFlow Studio™ [NEW]** — Rolagem vertical sincronizada e suave no modo Split Screen do PaxFlow Studio™, espelhando a navegação do editor na prévia visual do Live Preview para acompanhamento visual contínuo do caderno de viagem.
- **Drag & Drop de Vouchers Diretamente sobre o Card do Produto [NEW]** — No modal de gerenciamento da viagem, consultores podem arrastar arquivos PDF ou imagens diretamente para o card de qualquer produto, acionando a zona de soltura com realce visual e abrindo imediatamente a janela de upload pré-vinculada ao serviço e passageiro.
- **Atalho Universal [Ctrl + Enter] / [Cmd + Enter] para Envio Rápido [NEW]** — Produtividade aprimorada pelo teclado em caixas de comentários de produtos, orçamentos e viagens, no modal de Nova Mensagem Direta da Inbox e nos formulários de edição de viagem.
- **Gestão Inteligente de Múltiplos Anexos e Documentos (Clientes e Viagens) [NEW]** — Reformulação completa da arquitetura documental eliminando a limitação de considerar arquivos apenas como passaportes. Introduz taxonomia universal com 12 categorias estruturadas (`Passaporte`, `RG`, `CNH`, `Visto`, `Voucher Aéreo`, `Voucher Hotel`, `Ingresso`, `Voucher Transporte`, `Seguro Viagem`, `Contrato`, `Roteiro`, `Outros`). Conta com o novo componente `UploadAnexoModal` para drag-and-drop e upload em lote de múltiplos arquivos com inferência contextual inteligente do tipo por regex no nome do arquivo, permitindo edição de rótulo, metadados opcionais (`numero_documento` e `data_validade`) e associação a passageiros específicos em viagens em grupo/família. Integra **Compressão Inteligente Client-Side de PDFs Acima de 25MB via Lazy Loading** (`PdfCompressorService`): quando um arquivo excede o teto de 25MB (como PDFs pesados de 50MB a 100MB+ de digitalizações brutas), o navegador carrega sob demanda bibliotecas de renderização e reprocessa visualmente cada página em 150 DPI com compressão JPEG balanceada e feedback em tempo real, adequando o documento ao limite do sistema antes de transmiti-lo pela rede. Integra sincronização bidirecional entre Viagem e Ficha do Passageiro, galeria visual com badges coloridos, visualizador Lightbox inline (PDFs e imagens), download direto, compartilhamento de link via WhatsApp e controle de exclusão por perfil. Totalmente integrado ao PaxFlow Risk Score™ (onde vouchers abatem pendências logísticas e RG/CNH validam viagens nacionais) e com resiliência Zero-Break a Schema Drift (fallback automático para erro `42703`/`42P01`).
- **PaxFlow Studio™ (Criação de Propostas de Luxo, Split Screen & Live Preview) [NEW]** — Módulo completo de engenharia de propostas e cadernos de viagem de alto padrão (rota `#studio`). Apresenta interface moderna em **Split Screen (Tela Dividida)**: à esquerda, editor estruturado em etapas limpas (Ingestão recolhível de múltiplos PDFs e textos de reserva com fidelidade estrita, Dados do Passageiro & Foto de Capa cinematográfica e Roteiro Dia a Dia com cards compactos); à direita, **Live Preview em Tempo Real**, renderizando instantaneamente a proposta digital conforme o consultor digita (com alternador de visualização Desktop e Mobile). Inclui **Barra Inferior Fixa** com indicador de status (`Modificações pendentes` vs `Salvo no banco`), botão destacado `Salvar Proposta`, suporte a atalho de teclado `Ctrl+S`, exportação de Caderno de Viagem em PDF A4 de alta resolução, Link do Cliente e conversão em 1-clique em Viagem confirmada. Conta com **Gaveta Lateral de Propostas (Drawer)** com busca dinâmica e **Modal Focado de Atividades** para edição rápida de voos, hotéis, transfers e passeios sem poluição visual.
- **Next Trip Engine™ (Motor Preditivo de Recompra & Ciclo de Vida do Viajante)** — Central comercial preditiva acessível no menu lateral principal (rota `#next-trip`) e em widget compacto nos Dashboards. Analisa o histórico de viagens, destinos anteriores, notas de NPS, ticket médio e sazonalidade para responder: *"Quais clientes da agência estão no momento ideal para comprar uma nova viagem?"*. Apresenta Score de Potencial de Recompra (0 a 100) baseado em 5 vetores estratégicos, agrupamento por Alto Potencial (>= 75) e Médio Potencial, ações de 1-Clique (*Criar Orçamento Preditivo* e *Disparar WhatsApp Personalizado*), ciclo de engajamento com snooze automático de 30 dias e agrupamento por titular da família/grupo.
- **PaxFlow Upsell Engine™ (Motor Preditivo de Upgrades & Experiências) [NEW]** — Algoritmo preditivo de inteligência de vendas integrado ao envio de propostas de Orçamentos e oportunidades da Next Trip. Analisa os destinos e serviços selecionados para sugerir automaticamente adições de alto valor e margem (Seguros Saúde Internacional/Nacional, Passeios VIP & Ingressos de Atrações, Transfers Privativos, Upgrades de Hotelaria e Seguro Cancel Flex). Pode ser ativado ou desativado globalmente nas Configurações da Agência (`global_settings`).
- **PaxFlow Risk Score™ (Diagnóstico Preditivo de Saúde Operacional 0 a 100) [NEW]** — Inteligência preditiva de auditoria operacional que avalia continuamente cada viagem cadastrada. Calcula uma nota de saúde de 0 a 100 baseada em 4 pilares estratégicos: *Documental & Vistos* (SLA de 180 dias de passaportes), *Financeiro & LOCs* (quitação por formas de recebimento e conferência de reserva), *Logística & Vouchers* (anexo de documentos de embarque) e *SLAs Temporais*. Conta com isenções inteligentes para viagens nacionais e bate-volta, gaveta lateral interativa de diagnósticos (`RiskDiagnosisDrawer`) e exibição de badges dinâmicos (`🛡️ Risk Score: X/100`) no Kanban do Dashboard e na tela de gerenciamento de viagem (`EditTravelModal`).
- **Painel Preditivo de Risco & Churn (Inteligência 24/7) [NEW]** — Algoritmo ativo de prevenção contra perdas comerciais e erros operacionais. Monitora em tempo real cotações de orçamentos com leads esfriando por inatividade (Quente > 48h, Morno > 5d, Frio > 10d) ordenados por ticket financeiro e viagens fechadas prestes a embarcar com pendências de conferência de LOC, passaportes em SLA crítico ou falta de vouchers. Conta com ações rápidas de 1-Clique para disparo de mensagens pré-formatadas no WhatsApp, delegação de lembretes urgentes no Inbox da equipe e abertura direta de fichas.
- **Leitor e Importador em 1-Clique de PNR / E-mails de Emissão [NEW]** — Utilitário de inteligência de parsing de bilhetes e confirmações aéreas (`pnrParser.ts`). Permite colar o texto de e-mails de emissão (Gol, Azul, LATAM, Amadeus, Sabre) e extrair instantaneamente o Localizador (LOC), fornecedor e trechos do voo para autopreenchimento dos produtos da viagem sem digitação manual.
- **Ações em Massa e Seleção por Checkbox (Batch Operations) [NEW]** — Interface com seleção múltipla de clientes por checkboxes e barra flutuante de ações em lote para atribuição massiva de etiquetas/tags (ex: VIP, Grupo Disney 2027) e comunicados.
- **Trava de Segurança para Alterações Não Salvas [NEW]** — Componente `UnsavedChangesModal.ts` que monitora formulários modificados (`dirty state`) prevenindo descartes acidentais de dados, acompanhado de rotina sanitizada de desvinculação de ouvintes no desmonte de páginas.
- **Mensageria em Tempo Real & Alertas Automáticos [NEW]** — Sistema de sincronização instantânea em tempo real via WebSockets do Supabase (`postgres_changes`) com tempo de resposta sub-segundo (< 1s) para mensagens diretas P2P, solicitações de escala, menções `@`, lembretes e alertas operacionais. Atualiza a lista da Inbox e os contadores de forma reativa e fluida, sem necessidade de dar F5 ou recarregar a página. Conta com alertas sonoros corteses gerados nativamente via Web Audio API (*ding-dong* de tom duplo 880Hz ➔ 1174Hz) e Toasts flutuantes com nome do remetente.
- **Notificações Push Nativas no Celular (PWA no Android & iOS) [NEW]** — Suporte nativo a Web Push com Service Worker em segundo plano (`public/sw.js`) para smartphones Android e iOS 16.4+ (quando adicionado à Tela de Início). O aplicativo toca e vibra exibindo o alerta na tela de bloqueio do celular mesmo com o navegador ou app totalmente fechados, permitindo navegação direta para o alerta com 1 toque.
- **Modelo Agência Colaborativa & RLS de Alta Performance [NEW]** — Arquitetura de permissões baseada no modelo de colaboração de agências de turismo. O banco de dados PostgreSQL/Supabase opera com políticas RLS flexíveis para leitura e edição colaborativa entre usuários autenticados da mesma agência, eliminando ocultações acidentais de dados e perdas de vínculos (como cliente desvinculado por alteração de titularidade). O controle de isolamento de privacidade de dados é aplicado rigorosamente na camada de software: consultores navegam por padrão apenas em seus próprios orçamentos, viagens, clientes e solicitações de reembolsos.
- **Modo Co-Piloto Unificado & Pesquisa Global com Agrupamento Inteligente (Balcão de Atendimento) [UPDATED]** — Recurso de inteligência colaborativa integrado à barra de pesquisa global no cabeçalho superior (`/`). Permite que qualquer consultor pesquise instantaneamente por nome, CPF, e-mail, telefone ou localizador (LOC) em toda a base da agência para prestar suporte presencial a clientes de colegas ou atuar em regime de balcão. Conta com **agrupamento inteligente condensado por cliente (acordeão)** com contadores de viagens e orçamentos, botão global de `[Expandir Todos / Recolher Todos]`, **desambiguação visual destacada por períodos de viagens (`🗓️ DD/MM/AAAA a DD/MM/AAAA`) e datas de orçamentos (`📅 DD/MM/AAAA`)**, além de atendimento instantâneo em 1-Clique (`Atender 🤝`) com notificação direta no Inbox do consultor titular.
- **Integração de Dados Íntegros (Fim dos Dados Mascarados) [NEW]** — Remoção completa de backups locais poluentes (`localStorage`) e fallbacks com dados fictícios mascarados. O sistema opera de forma transparente com dados originais e íntegros diretamente no Supabase PostgreSQL, garantindo que alterações de nomes, documentos e contatos efetuadas por administradores reflitam imediatamente para toda a equipe.
- **Mission Control (Inbox e Calendário)** — Central de alertas estilo e-mail com SLA de passaporte (180d), reembolsos atrasados e lembretes manuais. Inclui Visualização em Calendário unificada (visões de MÊS, SEMANA e AGENDA), sumarização via Regex e legenda tooltip. **Agora atualizado com pesquisa em tempo real de alta precisão, um sistema completo de Mensagens Diretas Internas (P2P) entre consultores (contendo autocomplete de contatos por tags no Para/Cc, pasta dedicada "Enviadas" e funcionalidade de resposta rápida integrada), suporte a histórico de conversas estruturado (Threading) que agrupa e exibe todas as mensagens anteriores sob um mesmo tema, agendamento colaborativo e delegação de lembretes com cores diferenciadas por propriedade e status de conclusão riscado (line-through), campo de texto dedicado para descrição/motivo do lembrete (com destaque no Inbox e assuntos customizados), resolução fidedigna do nome do passageiro titular da viagem/orçamento (eliminando fallbacks genéricos como "Cliente Viagem") e o Agendador Ágil via Notas/Comentários com sincronização instantânea.**
- **Kanban de Viagens & Usabilidade Mobile [UPDATED]** — 5 colunas com drag-and-drop, SLAs visuais e gestão de produtos. **Redesenho 100% responsivo para smartphones com Botão Flutuante FAB (`+ Nova Viagem`), compartilhamento nativo de itinerários (`navigator.share`), modal full-screen para celular e gavetas inferiores (Bottom Sheets). Atualizado com Cópia Rápida de LOC em 1-Clique (`📋`) no cabeçalho geral, agrupamentos e produtos individuais, campo de busca em tempo real de alto desempenho, modal de gerenciamento ampliado com abas de Histórico de Reembolsos, aba de Produtos/Serviços, painel financeiro com exibição da Rentabilidade acumulada baseada na rentabilidade total dos produtos salvos, e persistência contínua de tela no salvamento dos detalhes da viagem (permanecendo aberto após salvar alterações cadastrais na coluna esquerda). O código de reserva (LOC) do produto/serviço é obrigatório (máximo 20 caracteres, código único). Conta agora com a quitação financeira do LOC por meio de N Formas de Recebimento cadastradas (com suporte para remover todos os pagamentos e retornar ao estado de "Sem Pagamento"). Inclui o processo de Conferência Financeira individual por LOC (restrito a admin, com bloqueio rígido de edições e travamento caso haja pendência de recebimento) e o processo de Conferência de Processo por Viagem (bloqueando dados cadastrais cadastrados, com exceção de status/etapa editável, anexos e comentários funcionais). Apresenta **Novo Menu Popover de Conferência com Pills (`Conf.`)**: permite filtrar com precisão e seleção múltipla viagens com pendências (ex: `⏳ Fin. Pendente`, `✅ Fin. OK`, `⏳ Proc. Pendente`, `✅ Proc. OK`), atalhos rápidos (`✨ 100% OK` e `⏳ Nenhum OK`) e combinação lógica simultânea.**
- **Pipeline de Orçamentos** — 4 estágios com temperatura de lead, tags, notas e upload de documentos. **Atualizado com busca em tempo real e modal de visualização em duas colunas. A busca por clientes recorrentes no autocomplete do formulário foi corrigida para precisão absoluta. Ao fechar uma venda, caso o cliente não possua documento cadastrado, exige e valida o CPF/CNPJ com máscara e verificação oficial de dígitos verificadores (suportando a nova máscara CNPJ Alfanumérico da Receita Federal). A data de nascimento do passageiro e a Data Financeiro agora são obrigatórias na conversão, garantindo a consistência com o financeiro, enquanto a data de volta tornou-se opcional.**
- **Gestão e Ficha de Clientes** — Ficha única com passaporte/visto, validade monitorada por SLA, upload seguro para o Supabase Storage. **Atualizado com busca omnipresente de alta abrangência, Visualizador de Documentos Inline PaxFlow, campo integrado para preenchimento e edição da Origem do Lead, validação matemática estrita de CPF/CNPJ, e gestão resiliente de documentos anexados com suporte à exclusão limpa de passaportes legados (`legado-cliente-UUID`) sem erros de restrição de chave no banco e sincronização instantânea da ficha.**
- **Central de Reembolsos** — Tabela com cronômetro SLA em tempo real, status inline e métricas consolidadas. **Atualizado com campo de busca em tempo real em memória abrangendo clientes, destinos, localizadores, fornecedores, tipos de serviço, status e valores formatados.**
- **Sistema de Gamificação dos Consultores [NEW]** — Engajamento operacional por meio de ganho de XP e patentes temáticas (Mochileiro, Explorador, Navegador, Guia de Elite, Embaixador). Apresenta anel de progresso circular SVG gradiente e nível numérico ao redor do avatar na Sidebar (sincronizados ao vivo via Supabase Realtime) e displays de patente sob o nome do usuário.
- **Mural de Medalhas (Badges) [NEW]** — Grade interativa no perfil com 14 medalhas conquistáveis (SLA_CHAMP, DRIVE_MASTER, COMPLIANCE_HERO, etc.) exibidas em cores (conquistada) ou cinza com cadeado (bloqueada), acompanhadas de tooltips flutuantes em CSS contendo regras de desbloqueio.
- **Animações e Efeitos de Celebração [NEW]** — Comemoração ao subir de nível ou fechar vendas com explosões visuais de confete (canvas-confetti via CDN) e áudios de chimes musicais sintetizados dinamicamente via Web Audio API, além de um modal glassmorphic 3D.
- **Fotos de Perfil Personalizadas [NEW]** — Upload self-service de imagens do computador ou celular integrado ao Supabase Storage. As fotos são cortadas e comprimidas no navegador via Canvas para menos de 50KB antes de subir, economizando banda e armazenamento da agência.
- **PaxFlow Studio™ (Propostas de Luxo & Cadernos de Viagem) [NEW]** — Módulo em Split Screen para criação ágil de propostas comerciais e cadernos de viagem prontos para impressão em PDF A4 ou visualização pública interativa pelo passageiro (`#proposta?id=UUID`). Conta com **Galeria Unsplash™ com Tradução Semântica Automática (PT-BR ➔ EN)** para fotos de capa em altíssima resolução, **Branding Customizável de Tagline/Capa** (alterando livremente o título de marca padrão *"PAXFLOW LUXURY TRAVEL"*), **Card do Consultor Dedicado** com auto-preenchimento de foto e botões de ação rápida (WhatsApp e ligação), ingestão documental com fidelidade estrita (PDFs e texto), Live Preview espelhado em tempo real (*Sync Scroll*), controles de visualização Desktop/Mobile, reordenação Drag & Drop de dias e atalho global `Ctrl+S`.
- **Painel Administrativo & Configurações** — Gestão de parâmetros globais da agência, administração da equipe de consultores (perfis e roles), aba de importações em lote de chamados DIGISAC (CSV) e nova aba de "Automações & SLAs" para controle de prazos e transições de status.
- **Módulo de Cadastros (Central Unificada: Serviços, Destinos, Recebimentos, Origens de Lead, Campanhas, Metas e Modelos) [NEW]** — Nova página restrita a administradores que consolida 7 abas estratégicas: Gestão de Tipos de Produtos/Serviços (cores, ícones e campos extras), Cadastro de Destinos Turísticos (com suporte a higienização), Formas de Recebimento, **Origens de Lead (canais de captação e conversão)**, **Campanhas de Vendas**, **Metas Financeiras** e o **Hub de Modelos de Mensagem (WhatsApp / Templates)**.
- **Localização de Erros e Tradução Global (I18n) [NEW]** — Utilitário centralizado `errorTranslator.ts` que intercepta e traduz erros técnicos em inglês (Supabase Auth, banco de dados PostgreSQL/RLS, uploads e erros de conexão de rede) para o Português do Brasil de forma amigável antes de exibi-los ao usuário.
- **Cockpit de Tarefas** — Kanban interno standalone (todo.html) para planejamento da equipe.
- **Navegação & UI Premium (Sidebar Colapsável, Perfil Centralizado & Lupa Vetorial)** — Shell de navegação avançado com barra lateral colapsável sob demanda (estado persistido via `localStorage` sob a chave `"paxflow-sidebar-collapsed"`). Centralização dos controles de identidade (avatar, nome, e-mail do consultor logado), alternador de tema claro/escuro e encerramento de sessão (logout) diretamente no rodapé da Sidebar, removendo elementos redundantes dos cabeçalhos das páginas. **Otimizado com layout vertical compacto e sistema de rolagem interna inteligente (`overflow-y-auto`) para se adaptar perfeitamente a viewports de menor resolution vertical ou níveis elevados de zoom sem quebrar o layout.** Campos de busca unificados com ícones vetoriais modernos (SVGs Heroicons) alinhados de forma absoluta e perfeitamente centrada.
- **Itinerário Digital Interativo [NEW]** — Rota pública mobile-first (`#itinerario?id=UUID`) acessível anonimamente pelo passageiro final, exibindo o cronograma completo de vôos, hotéis e vouchers organizados por dia com contagem regressiva para a partida.
- **Auditoria de Pré-Embarque e Controle de Contato por Trecho [NEW]** — Nova coluna interativa no Relatório de Embarque com alternância em 1-clique (`⏳ Pendente` / `✅ Feito`), permitindo rastrear o contato individual de cada trecho aéreo e partidas da viagem. Conta com persistência direta no Supabase, exportação em CSV, filtro de contatos e auditoria completa em tooltip (autor e data/hora).
- **PaxFlow Risk Score™ com Criticidade < 24h [NEW]** — Algoritmo inteligente que aplica penalidade crítica de 25 pontos na Saúde Operacional quando a viagem possui embarque nas próximas 24 horas sem confirmação de contato pré-embarque, com recuperação imediata da pontuação após a conclusão do contato.
- **Marcador Inteligente de Contato em Detalhes da Viagem [NEW]** — Indicador reativo posicionado ao lado de Comunicação na tela Gerenciar Viagem, identificando o próximo voo iminente: abre o modal de mensagens com modelo de Pré-Embarque pré-selecionado (caso pendente) ou foca no histórico de conversa do Digisac (caso feito).
- **Pesquisa NPS Pós-Viagem [NEW]** — Rota pública (`#feedback?id=UUID`) para coleta anônima de satisfação pós-viagem integrada às estatísticas administrativas e ao fluxo de dados.
- **Hub de Modelos de Mensagem (WhatsApp / Digisac) [NEW]** — Módulo de gestão de templates agora integrado ao menu **Cadastros**, com editor reativo drag-and-drop/clique-para-colar para 11 variáveis do sistema. Apresenta modal de disparo reativo com visualização da mensagem (WhatsApp Preview), suporte a envio direto e integração completa com a API Digisac (incluindo painel de histórico de conversa split-screen para monitorar o andamento da conversa com o cliente).
- **Campanhas de Vendas & Leaderboard [NEW]** — Aba unificada "Campanhas & Metas" agora disponível no menu **Cadastros**, listando campanhas ativas e renderizando o ranking (Leaderboard) de consultores ordenados por XP para engajar a equipe.
- **Códigos de Referência Sequenciais (ORC, VIA, RBS, CLI) [NEW]** — Sistema de geração automática de IDs internos sequenciais formatados (ex: `ORC-0001`, `VIA-0023`, `RBS-0009`, `CLI-0001`) ordenados retroativamente por data de criação (`created_at` ASC). Permite fácil citação e busca direta pelos códigos em todas as telas principais da aplicação.
- **Validação Automatizada de Viagens e Conferência de Processos [NEW]** — Novo motor de conformidade operacional que confere se as viagens em estágio 'Fechado' estão totalmente detalhadas e quitadas financeiramente por Formas de Recebimento. Permite travar a edição de cadastros via Conferência de Processo e oferece filtros por status de auditoria financeira/operacional.
- **Configurações de Identidade Visual (White-Label Branding) [NEW]** — Customização estética completa que permite o upload do logotipo oficial da agência (com compressão local por Canvas) e escolha de cor primária (hexadecimal) por seletor visual, aplicando as customizações automaticamente às telas públicas de itinerário e NPS dos passageiros.
- **Alertas Automatizados de Pré-Embarque e Pós-Viagem NPS [NEW]** — Alertas de cronograma no Inbox gerados automaticamente 48 horas antes do embarque do passageiro e 24 horas após o retorno, integrando ações rápidas para envio direto de mensagens customizadas via WhatsApp.
- **Métricas Avançadas de Performance e Rendimento de Equipe [NEW]** — Painel comercial analítico contendo indicadores de conversão de leads, tempo médio de fechamento de propostas em dias corridos, gap financeiro de desistências e ranking de experiência (XP) dos consultores.
- **Auditoria Operacional & Extrato Analítico de Recebimentos por Meio de Pagamento [NEW]** — Painel analítico de conciliação financeira no módulo de Relatórios (`🪙 Recebimentos & Auditoria`). Permite drilldown com 1-clique em qualquer forma de pagamento (Pix, Cartão, Boleto, etc.) ou através do botão "Extrato Completo ↗" para inspecionar individualmente cada lançamento financeiro, detalhando Data, Cliente, Viagem (`VIA-...`), Localizador (LOC) copiável em 1-clique (`📋`), produtos/serviços amarrados ao localizador (`[AÉREO] Air France`, etc.), Consultor responsável e Valor Pago. Conta com filtros dinâmicos por forma de pagamento e consultor, busca textual em tempo real, atalho direto para abrir a viagem no Dashboard e exportação de planilha em formato CSV formatado para Excel (UTF-8 com BOM).
- **Barra de Chips de Filtros Ativos e Limpeza Rápida [NEW]** — Painel dinâmico de tags visuais logo abaixo das abas do Dashboard exibindo todos os filtros ativos (termo de busca, períodos de datas, consultor, conferência financeira/processo e status) com botão individual de remoção (`✕`) em cada chip e atalho `Limpar Todos`.
- **Painel de Filtros Avançados Combináveis de Viagens [NEW]** — Modal/Gaveta retrátil de alta precisão com filtros combinados em tempo real no Dashboard: Tipos de Produtos/Serviços (pills reativas com cores e ícones), Destinos Turísticos (pills rápidas + dropdown completo com busca), Consultores/Usuários (pills com avatar/iniciais), Formas de Recebimento (pills cruzando com lançamentos financeiros de `loc_pagamentos`), Origem do Lead (pills cruzando canais do cliente titular), Faixas de Passageiros (1 PAX, 2 PAX, 3 a 5 PAX, 6+ PAX), Tags e Classificações (pills multi-select consolidadas), Status de Arquivos/Anexos (com/sem anexos), Faixas de Valor de Venda (mínimo/máximo) e Período de Embarque/Retorno/Criação. Inclui recálculo automático do resumo financeiro (Valor Total e Rentabilidade Total filtrados) e exportação em CSV com novas colunas analíticas.
- **Search Highlighting Inteligente [NEW]** — Realce visual instantâneo dos termos pesquisados (`highlightMatch`) nas telas de Viagens/Dashboard, Orçamentos e Reembolsos, destacando o texto correspondente nos nomes de clientes, códigos de referência, destinos, fornecedores e localizadores.
- **Pills de Agendamento Rápido no Inbox (1-Toque) [NEW]** — Atalhos operacionais (`⚡ Hoje 17h`, `☀️ Amanhã 09h`, `🗓️ Em 3 dias`, `💼 Próx. Segunda`) ao compor mensagens com lembrete no Inbox, preenchendo automaticamente a data e o turno do calendário.
- **Relatório de Metas Comerciais, Campanhas de Incentivo & Auditoria de Registros [NEW]** — Painel executivo e operacional completo no módulo de Relatórios (`🎯 Metas & Campanhas`). Permite acompanhar metas e campanhas ativas, passadas ou futuras com base no calendário real. Suporta **4 métricas de apuração**: Faturamento Bruto (R$), Rentabilidade Líquida / Lucro (R$), **Quantidade de Orçamentos Criados** (ex: Campanha "Boa viagem! - 40 orçamentos") e **Quantidade de Vendas Fechadas**. Inclui KPIs globais de agência, ranking da equipe com barras de progresso e faixas atingidas (Bronze, Prata, Ouro), e **Auditoria Analítica em 1-Clique (`🔍 Auditar`)** para que administradores confiram individualmente cada orçamento ou venda que compõe o número do consultor.
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

| Camada | Tecnologia |
| --- | --- |
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run preview` | Preview do build de produção |

---

## Estrutura do Projeto

```text
src/
├── main.ts           # Shell da SPA (auth, navegação, tema, sidebar, router)
├── index.css         # Estilos globais + Tailwind + Custom Animations
├── router.ts         # Roteador simples da SPA (mapeamento de rotas e hash navigation)
├── todo.ts           # Kanban interno (standalone todo.html logic)
├── types/
│   └── index.ts      # Interfaces TypeScript do domínio
├── components/       # Componentes e Modais da UI modularizados
│   ├── dashboard/
│   │   └── DashboardTemplates.ts # Templates HTML/CSS do Kanban
│   ├── inbox/
│   │   ├── EmailReaderModal.ts   # Visualizador de e-mail e histórico/threading
│   │   └── NewMessageModal.ts    # Formulário P2P e autocomplete de contatos
│   ├── orcamentos/
│   │   └── VerNotasModal.ts      # Modal de orçamento com duas colunas e anexo inline
│   ├── relatorios/
│   │   └── ExtratoRecebimentosModal.ts # Modal analítico de extrato e conciliação de recebimentos [NEW]
│   └── profile/
│   │   └── MeuPerfilModal.ts     # Modal de perfil, XP, medalhas e upload de avatar
├── pages/
│   ├── ComercialDashboard.ts # Dashboard de resultados (Analytics + Performance)
│   ├── Inbox.ts      # Mission Control (alertas SLA + Calendário + P2P)
│   ├── Dashboard.ts  # Kanban de viagens (operação + detalhamento de produtos)
│   ├── Orcamentos.ts # Pipeline de orçamentos (negociação + conversão)
│   ├── Clientes.ts   # Gestão de clientes (ficha + documentação inline)
│   ├── Reembolsos.ts # Central de reembolsos (tabela SLA + busca em memória)
│   ├── Cadastros.ts  # Central de Cadastros (Serviços, Destinos, Recebimentos, Campanhas, Metas, Templates)
│   ├── Relatorios.ts # Painel de Relatórios Gerenciais (Desempenho, SLAs, Faturamento, Previsão, Fornecedores) [NEW]
│   ├── Configuracoes.ts # Painel admin (Parâmetros Globais, Consultores, Importações, Automações)
│   └── Login.ts      # Tela de login e recuperação de credenciais
├── services/
│   ├── supabase.ts   # Cliente Supabase + Auth + Session helper
│   ├── googleDrive.ts # Serviço legado de links do Drive
│   ├── csvImporter.ts # Parser e mapeador de CSV inteligente
│   ├── dialog.ts     # Componentes de modal/dialog customizados (Alerts/Confirm)
│   ├── avatars.ts    # Compressão de imagem canvas e geração de avatares SVG
│   ├── comments.ts   # Serviço colaborativo de comentários e menções (@)
│   ├── documentViewer.ts # Lightbox inline para PDFs e imagens do storage
│   ├── inboxService.ts   # Regras de negócio, contadores e alertas do Inbox
│   ├── orcamentosService.ts # Serviços auxiliares para persistência de orçamentos
│   ├── viagensService.ts # Regras e persistência operacional de viagens e produtos
│   └── gamification.ts # Serviço de XP, níveis e regras de medalhas
└── utils/
    ├── masks.ts      # Utilitários de máscaras, validações (CPF/CNPJ, etc.)
    ├── errorTranslator.ts # Interceptador e tradutor amigável de erros (I18n)
    ├── mockData.ts   # Dados fictícios para demonstração e fallback offline
    └── celebrations.ts # Celebrações de level up (canvas-confetti + Web Audio API)
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
