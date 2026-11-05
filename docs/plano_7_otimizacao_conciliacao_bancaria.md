# Plano 7 - Otimização de Desempenho: Conciliação Bancária

## 1. Visão Geral e Diagnóstico Atual

O módulo de **Conciliação Bancária** (`src/pages/Conciliacao.ts` e `src/services/conciliacaoService.ts`) permite importar extratos bancários (OFX/CSV), identificar recebimentos de clientes e pagamentos de fornecedores e realizar o pareamento inteligente (*Smart Match*).

### 1.1. Diagnóstico do Gargalo Atual
* **Arquivos principais**: `src/pages/Conciliacao.ts` (linhas 80 a 120) e `src/services/conciliacaoService.ts` (linhas 310 a 480).
* **Comportamento atual**:
  * **Busca Irrestrita de Recebimentos Pendentes**: `listarRecebimentosPendentes()` consulta a tabela `loc_pagamentos` inteira, trazendo todos os registros da história do sistema que ainda não foram marcados como conciliados, mesmo que datem de anos anteriores.
  * **Algoritmo de Pareamento no Navegador**: A função `calcularSmartMatches` compara cada item do extrato contra cada recebimento e conta a pagar em loops aninhados no JavaScript do navegador.
* **Métricas**:
  * Tempo de abertura: 0.8s a 1.8s;
  * Pico temporário de processador ao calcular o pareamento para extratos com centenas de linhas.

---

## 2. Metas de Desempenho e Arquitetura Alvo

| Métrica | Situação Atual | Meta Pós-Otimização |
| :--- | :--- | :--- |
| **Tempo de Abertura da Conciliação** | 0.8s - 1.8s | **< 350ms** |
| **Escopo de Recebimentos** | Toda a tabela `loc_pagamentos` | **Apenas competência do extrato (+/- 45 dias de margem)** |
| **Processamento de Pareamento** | Comparação produto cartesiano total | **Indexado por chave de valor aproximado (Map/Set)** |
| **Atualização ao Conciliar Item** | Recarga completa via `carregarDados` | **Mutação cirúrgica em memória dos itens conciliados** |

---

## 3. Especificação Técnica da Otimização

### Passo 1: Delimitação Temporal dos Recebimentos Pendentes
1. Se houver um extrato selecionado na tela, limitar a consulta de `loc_pagamentos` e de `fin_contas_pagar` à janela de datas das transações do extrato (+/- 45 dias de tolerância para compensações bancárias).
2. Se nenhum extrato estiver selecionado, limitar aos últimos 90 dias por padrão.

### Passo 2: Otimização do Algoritmo de Pareamento Inteligente (Smart Match)
1. Indexar os pagamentos pendentes em um mapa com base no valor arredondado (`Map<number, LocPagamentoPendente[]>`).
2. Para cada transação bancária do extrato, consultar diretamente o mapa de valores próximos (diferença de centavos ou valor exato), evitando o custo de percorrer a lista completa para cada linha do extrato.

### Passo 3: Mutação Cirúrgica em Memória ao Conciliar
Ao conciliar uma transação com um localizador ou despesa:
1. Gravar a vinculação no Supabase;
2. Atualizar o status da transação para `'conciliado'` diretamente no array local `this.transacoes`;
3. Remover o recebimento pareado da lista de pendentes em memória;
4. Recalcular o resumo e atualizar apenas os contadores visuais e a linha afetada, sem chamar `this.carregarDados()`.

---

## 4. Estratégia de Testes Subcutâneos (Vitest)

Criar suíte dedicada em `tests/subcutaneous/conciliacao_performance.test.ts`:
1. **Teste 1**: Garantir que a consulta de recebimentos pendentes aplique a janela temporal do lote selecionado.
2. **Teste 2**: Validar que o algoritmo de *Smart Match* indexado produza as mesmas sugestões de pareamento com alta velocidade de execução.
3. **Teste 3**: Comprovar que a ação de conciliar atualiza o estado em memória sem refazer a chamada de listagem completa.

---

## 5. Critérios de Aceite
- [ ] Abertura da tela de Conciliação em menos de 350ms.
- [ ] Processamento instantâneo do pareamento mesmo em extratos volumosos.
- [ ] Resposta visual imediata ao vincular recebimentos ou despesas.
- [ ] 100% dos testes da suíte passando verde.

