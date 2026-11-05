# Plano 6 - Otimização de Desempenho: Central de Reembolsos

## 1. Visão Geral e Diagnóstico Atual

A **Central de Reembolsos** (`src/pages/Reembolsos.ts`) controla o ciclo de vida de solicitações de estorno, cancelamento e devolução de valores de fornecedores e companhias aéreas, com cronômetro de prazo de atendimento (SLA).

### 1.1. Diagnóstico do Gargalo Atual
* **Arquivos principais**: `src/pages/Reembolsos.ts` (linhas 150 a 300) e `src/services/reembolsosService.ts` (linhas 175 a 210).
* **Comportamento atual**:
  * **Consultas em Sequência com Joins Profundos**:
    1. Executa primeiro `supabase.from('reembolsos').select('*, viagem:viagens(*, cliente:clientes(*)), produto:produtos_viagem(*)')` trazendo todos os reembolsos da história;
    2. Em seguida, executa sequencialmente `ReembolsosService.buscarViagensOrfasReembolso()` com outra consulta pesada trazendo viagens marcadas como "reembolso solicitado" sem protocolo criado.
  * **Recarga Total a Cada Ação**: Ao alterar status de reembolso (ex: "Em Análise", "Aprovado", "Pago ao Cliente"), o código dispara `await this.loadReembolsos()` recarregando toda a base de dados do servidor.
  * **Timer de 1 Segundo no DOM**: O método `iniciarSlaTimer` roda um `setInterval` de 1000ms varrendo elementos HTML com classe `.sla-active-timer` para atualizar segundos.
* **Métricas**:
  * Tempo de abertura: 1.2s a 2.5s;
  * Quedas de taxa de quadros e consumo contínuo de processador pelo timer global.

---

## 2. Metas de Desempenho e Arquitetura Alvo

| Métrica | Situação Atual | Meta Pós-Otimização |
| :--- | :--- | :--- |
| **Tempo de Carregamento da Tela** | 1.2s - 2.5s | **< 400ms** |
| **Execução das Consultas** | Sequencial (`await` em série) | **Paralelizada com `Promise.all`** |
| **Ações de Alteração de Status** | Recarga completa da rede | **Atualização cirúrgica em memória** |
| **Cronômetro de SLA** | Atualização a cada 1s varrendo todo o DOM | **Atualização suave a cada 30s ou apenas minutos** |

---

## 3. Especificação Técnica da Otimização

### Passo 1: Paralelização das Consultas de Entrada
Unificar a consulta dos protocolos de reembolso existentes e das viagens órfãs em um único `Promise.all`:
```ts
const [resReembolsos, resViagensOrfas] = await Promise.all([
  supabase
    .from('reembolsos')
    .select(`
      id,
      codigo_protocolo,
      status,
      valor_solicitado,
      valor_aprovado,
      created_at,
      consultor_solicitante_id,
      viagem:viagens (id, codigo_ref, destino, cliente:clientes(id, nome)),
      produto:produtos_viagem (id, tipo_produto, fornecedor)
    `)
    .order('created_at', { ascending: false }),
  ReembolsosService.buscarViagensOrfasReembolso()
]);
```

### Passo 2: Atualização Cirúrgica de Status em Memória
Ao alterar o status de um reembolso ou salvar comprovante:
1. Gravar a atualização no Supabase;
2. Atualizar o objeto localmente no array `this.reembolsos`;
3. Atualizar apenas o card ou a linha da tabela alterada, sem recarregar a lista inteira do servidor.

### Passo 3: Otimização do Timer de SLA
* Substituir o intervalo de 1 segundo por um intervalo de **30 a 60 segundos**: prazos de reembolso de fornecedores duram dias ou semanas; atualizar segundos em tela gera processamento inútil no cliente.
* Destruir o timer de forma defensiva ao navegar para outra tela (`beforeUnmount` / `destroy`).

---

## 4. Estratégia de Testes Subcutâneos (Vitest)

Criar suíte dedicada em `tests/subcutaneous/reembolsos_performance.test.ts`:
1. **Teste 1**: Garantir que o carregamento inicial de reembolsos e viagens órfãs seja executado em paralelo.
2. **Teste 2**: Validar que a atualização de status de um reembolso altere o estado local sem invocar `loadReembolsos` novamente.
3. **Teste 3**: Garantir que o temporizador seja limpo ao destruir a instância da tela para evitar vazamentos de memória.

---

## 5. Critérios de Aceite
- [ ] Abertura da Central de Reembolsos em menos de 400ms.
- [ ] Transições de status fluidas e imediatas sem piscar a tela.
- [ ] Eliminação de consumo residual de processador pelo temporizador de SLA.
- [ ] Suíte de testes 100% verde.

