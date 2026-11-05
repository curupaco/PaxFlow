# Plano 3 - Otimização de Desempenho: Oportunidades & Próximas Viagens

## 1. Visão Geral e Diagnóstico Atual

A tela **NextTrip / Próxima Viagem** (`src/pages/NextTripPage.ts`) gerencia a régua de recompra automática, detectando clientes com potencial de nova viagem com base em viagens realizadas no ano anterior e preferências históricas.

### 1.1. Diagnóstico do Gargalo Atual
* **Arquivo principal**: `src/pages/NextTripPage.ts` (linhas 75 a 120).
* **Comportamento atual**:
  * Ao carregar a página, o método `carregarDados` executa um `Promise.all` baixando:
    * `clientes.select('*')`: Toda a base de clientes cadastrada no sistema;
    * `viagens.select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)')`: Todas as viagens já registradas no histórico do PaxFlow com 4 junções completas;
    * `orcamentos.select('*')`: Todas as cotações já emitidas;
    * `profiles.select('*')`: Todos os consultores ativos.
  * O método `NextTripEngineService.calculateOpportunities` processa todos esses arrays brutos em memória no navegador, gerando combinações cruzadas para descobrir aniversários de viagem.
* **Métricas**:
  * Tempo de carregamento: 2s a 4s;
  * Picos repentinos de consumo de memória RAM ao carregar relacionamentos de produtos e passageiros não utilizados pela regra de recompra.

---

## 2. Metas de Desempenho e Arquitetura Alvo

| Métrica | Situação Atual | Meta Pós-Otimização |
| :--- | :--- | :--- |
| **Tempo de Carregamento** | 2s - 4s | **< 600ms** |
| **Escopo de Viagens Consultadas** | Todo o histórico acumulado | **Apenas viagens do ciclo de recompra (10 a 24 meses)** |
| **Campos Selecionados** | Todos (`*`) com 4 tabelas aninhadas | **Projeção enxuta (apenas cliente, destino e data)** |
| **Clientes Carregados** | Toda a tabela `clientes` | **Apenas clientes com viagens no intervalo elegível** |

---

## 3. Especificação Técnica da Otimização

### Passo 1: Delimitação da Janela de Recompra no Banco
A régua de recompra foca em viagens que ocorreram no mesmo período do ano anterior (sazonalidade de férias). Não há necessidade de consultar viagens com menos de 6 meses ou mais de 24 meses:
```ts
// Filtra apenas viagens ocorridas entre 10 e 24 meses atrás
const dataMin = new Date();
dataMin.setMonth(dataMin.getMonth() - 24);

const dataMax = new Date();
dataMax.setMonth(dataMax.getMonth() - 10);

const { data: viagensElegiveis } = await supabase
  .from('viagens')
  .select(`
    id,
    codigo_ref,
    destino,
    data_ida,
    data_volta,
    consultor_id,
    cliente:clientes (id, nome, telefone, email)
  `)
  .gte('data_ida', dataMin.toISOString().split('T')[0])
  .lte('data_ida', dataMax.toISOString().split('T')[0])
  .in('status', ['concluida', 'confirmada']);
```

### Passo 2: Remoção de Relações Desnecessárias
* Remover joins com `produtos_viagem` e `reembolsos` na tela NextTrip: o motor de recompra avalia sazonalidade, destino e cliente, não detalhes de bilhetes aéreos ou taxas de reembolso.
* Eliminar a consulta irrestrita `clientes.select('*')`: os dados de contato do cliente já vêm aninhados na viagem elegível.

### Passo 3: Paginação e Carregamento Sob Demanda das Oportunidades
* Gerar as oportunidades no motor e renderizar inicialmente os primeiros 20 cartões com prioridade alta (maior probabilidade de conversão).
* Adicionar botão ou rolagem infinita "Carregar Mais Oportunidades" para os próximos blocos.

---

## 4. Estratégia de Testes Subcutâneos (Vitest)

Criar suíte dedicada em `tests/subcutaneous/nexttrip_performance.test.ts`:
1. **Teste 1**: Verificar que a consulta de viagens para o motor de recompra aplica as cláusulas `.gte` e `.lte` de período sazonal.
2. **Teste 2**: Validar que o motor gera oportunidades corretamente a partir de viagens projetadas sem depender da tabela de produtos.
3. **Teste 3**: Garantir que consultores vejam apenas oportunidades da sua carteira, mantendo a visão ampla apenas para administradores.

---

## 5. Critérios de Aceite
- [ ] Carregamento inicial da tela NextTrip em menos de 600ms.
- [ ] Redução de mais de 80% no volume de dados trafegados na rede.
- [ ] Nenhuma quebra visual nos cartões de oportunidade e ações de envio de mensagem.
- [ ] Suíte de testes subcutâneos 100% verde.

