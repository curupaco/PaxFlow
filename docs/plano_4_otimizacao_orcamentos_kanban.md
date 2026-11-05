# Plano 4 - Otimização de Desempenho: Orçamentos & Funil Kanban

## 1. Visão Geral e Diagnóstico Atual

O módulo de **Orçamentos** (`src/pages/Orcamentos.ts`) gerencia o funil de propostas da agência através de um quadro Kanban dinâmico, suportando criação ágil, conversão em viagem e acompanhamento de propostas desistidas.

### 1.1. Diagnóstico do Gargalo Atual
* **Arquivos principais**: `src/pages/Orcamentos.ts` (linhas 180 a 380) e `src/services/orcamentosService.ts` (linhas 20 a 100).
* **Comportamento atual**:
  * **Varredura Total de Clientes (`loadClientes`)**: No carregamento inicial, chama `OrcamentosService.loadClientes()`, que executa `supabase.from('clientes').select('*').order('nome')` sem limites. Conforme a base de clientes cresce para milhares de registros, essa chamada atrasa a abertura do Kanban desnecessariamente apenas para ter dados no autocompletar do modal.
  * **Carga de Todas as Propostas (`loadOrcamentos`)**: Traz todos os orçamentos da história com `select('*, destino_ref:destinos(*)')` sem paginação ou corte temporal nas colunas de concluídos/desistidos.
  * **Recarga Destrutiva Completa em Microações**:
    * Ao marcar o checkbox de "Contato realizado" em propostas desistidas: executa `await this.loadOrcamentos(); this.render();` — refazendo toda a consulta na rede e reconstruindo todo o DOM.
    * Ao reabrir uma proposta: dispara novamente `await this.loadOrcamentos(); this.render();`.
* **Métricas**:
  * Tempo de abertura da tela: 1.8s a 3.5s;
  * Microtravamentos visuais ao mover ou alterar cartões.

---

## 2. Metas de Desempenho e Arquitetura Alvo

| Métrica | Situação Atual | Meta Pós-Otimização |
| :--- | :--- | :--- |
| **Tempo de Abertura do Kanban** | 1.8s - 3.5s | **< 500ms** |
| **Carregamento de Clientes** | Tabela inteira baixada na abertura | **Lazy-loading sob demanda ao digitar 3 caracteres** |
| **Propostas Concluídas/Desistidas** | Todas carregadas no Kanban | **Carregar ativas + limite recente (ex: últimos 30 dias)** |
| **Atualização de Ações Rápidas** | Recarga total da rede (`loadOrcamentos`) | **Mutação cirúrgica em memória no array local** |

---

## 3. Especificação Técnica da Otimização

### Passo 1: Busca de Clientes Sob Demanda (Lazy Loading)
1. Remover a chamada `await OrcamentosService.loadClientes()` do ciclo de vida inicial `carregarDados`.
2. O formulário de novo orçamento já possui integração resiliente com `ClienteSearchService.buscarClientes` ao digitar 3 caracteres. Ajustar o input para disparar a busca remota diretamente via `debounce` (300ms), trazendo apenas os 10 clientes mais relevantes.

### Passo 2: Limitação Inteligente de Propostas no Kanban
1. As colunas ativas (**Solicitado**, **Em Andamento**, **Aguardando Retorno**) devem carregar todas as propostas abertas.
2. A coluna **Concluído / Desistência** deve trazer por padrão apenas as propostas dos últimos 30 dias:
   - Propostas anteriores ficam acessíveis via busca rápida ou botão "Ver Propostas Concluídas Anteriores".
   - Isso reduz drasticamente o número de nós HTML gerados no Kanban.

### Passo 3: Mutação Cirúrgica em Memória nas Interações
Substituir o padrão destrutivo de recarga nas ações rápidas:
1. **Ao marcar "Contato com cliente realizado"**:
   ```ts
   // Atualiza no banco
   await OrcamentosService.alternarContatoDesistencia(id, checked, this.perfil);
   // Atualiza diretamente no array em memória
   const item = this.orcamentos.find(o => o.id === id);
   if (item) {
     item.contatoDesistenciaRealizado = checked;
   }
   // Atualiza apenas o checkbox/badge correspondente no DOM sem remontar a tela
   ```
2. **Ao reabrir proposta**: Mover o objeto localmente para a coluna "SOLICITADO" e atualizar o contador de cabeçalho.

---

## 4. Estratégia de Testes Subcutâneos (Vitest)

Criar suíte dedicada em `tests/subcutaneous/orcamentos_performance.test.ts`:
1. **Teste 1**: Garantir que a inicialização de `OrcamentosPage` não invoque `loadClientes` irrestrito na carga da tela.
2. **Teste 2**: Comprovar que a ação de alternar contato de desistência atualiza o objeto local em memória sem acionar uma nova consulta `select` na tabela `orcamentos`.
3. **Teste 3**: Validar que a busca de clientes remota no modal seja acionada apenas quando o termo atingir 3 caracteres.

---

## 5. Critérios de Aceite
- [ ] Abertura do Kanban de Orçamentos em tempo inferior a 500ms.
- [ ] Interação instantânea ao marcar contato ou reabrir proposta sem efeito de tela piscando.
- [ ] Autocompletar de clientes funcional com busca instantânea.
- [ ] Suíte de testes 100% verde e build sem erros.

