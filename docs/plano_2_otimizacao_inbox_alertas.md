# Plano 2 - Otimização de Desempenho: Inbox & Central de Alertas

## 1. Visão Geral e Diagnóstico Atual

A **Inbox** (`src/pages/Inbox.ts`) e seu serviço central (`src/services/inboxService.ts`) são responsáveis por consolidar alertas operacionais, lembretes delegados, vencimentos de passaportes, solicitações de escala e mensagens diretas da equipe.

### 1.1. Diagnóstico do Gargalo Atual
* **Arquivo principal**: `src/services/inboxService.ts` (linhas 515 a 1750) e `src/pages/Inbox.ts`.
* **Comportamento atual**:
  * **8 Etapas Sequenciais em Série**: O método `loadAndBuildAlerts` roda em fila (`await` após `await`), acumulando a latência de rede de 8 viagens distintas de ida e volta ao Supabase.
  * **Varredura Total de Clientes para Passaportes (Parte 2)**: Executa `supabase.from('clientes').select('*')`, transferindo **toda** a base cadastral da agência para rodar laço no JavaScript procurando clientes com data de expiração de passaporte inferior a 6 meses.
  * **Varredura de Fallback em Lembretes (Parte 1)**: Se a junção do PostgREST apresentar falha de chave estrangeira, baixa tabelas inteiras de `orcamentos`, `viagens`, `clientes` e `profiles` para costurar dados em memória via `.find()`.
  * **Pós-Viagem e Pré-Embarque (Parte 6)**: Baixa viagens completas com clientes para avaliar datas no frontend.
  * **Recarga Destrutiva em Microinterações**: Ao marcar uma mensagem como lida ou arquivada, o método chama `getReadAlerts` ou recarrega a lista do zero, causando piscadas e requisições repetitivas.
* **Métricas**:
  * Tempo de montagem dos alertas: 2.5s a 5s;
  * Múltiplas requisições sequenciais redundantes ao interagir com a lista.

---

## 2. Metas de Desempenho e Arquitetura Alvo

| Métrica | Situação Atual | Meta Pós-Otimização |
| :--- | :--- | :--- |
| **Tempo de Carregamento da Inbox** | 2.5s - 5s | **< 600ms** |
| **Execução das Consultas** | 8 etapas sequenciais (`await`) | **Paralelização em bloco (`Promise.all`)** |
| **Checagem de Passaportes** | Varredura de 100% dos clientes | **Consulta indexada no banco com limite** |
| **Marcar Lido / Arquivado** | Re-consulta imediata na rede | **Atualização cirúrgica em memória (zero roundtrip)** |

---

## 3. Especificação Técnica da Otimização

### Passo 1: Paralelização Completa das Etapas Independentes
Substituir a cascata de `await` sequencial por uma execução paralela em bloco único com `Promise.all`:
1. `pLembretes`: Lembretes manuais com junções diretas;
2. `pPassaportes`: Consulta direta com filtro de data;
3. `pReembolsos`: Reembolsos em aberto;
4. `pNotificacoes`: Menções e mensagens diretas ativas;
5. `pViagensSla`: Viagens para pré-embarque (próximos 7 dias) e pós-viagem (últimos 3 dias);
6. `pEscala`: Solicitações de escala pendentes de aprovação.

### Passo 2: Consulta Cirúrgica de Passaportes no Banco de Dados
Eliminar o `clientes.select('*')` irrestrito. Executar consulta com filtro de intervalo diretamente no Supabase:
```ts
// Traz apenas clientes cujo passaporte expira nos próximos 180 dias
const limiteData = new Date();
limiteData.setMonth(limiteData.getMonth() + 6);
const limiteIso = limiteData.toISOString().split('T')[0];

const { data: passaportesAlerta } = await supabase
  .from('clientes')
  .select('id, nome, passaporte_numero, passaporte_validade, consultor_responsavel_id')
  .not('passaporte_validade', 'is', null)
  .lte('passaporte_validade', limiteIso);
```

### Passo 3: Filtro Cirúrgico de Viagens para Pós-Viagem e Pré-Embarque
Não consultar todas as viagens da história. Buscar apenas a janela operacional relevante:
* Pré-embarque: viagens com `data_ida` entre hoje e `hoje + 7 dias`;
* Pós-viagem (pesquisa de satisfação): viagens com `data_volta` entre `hoje - 5 dias` e hoje.

### Passo 4: Atualização Cirúrgica de Estado em Memória
1. Quando o consultor clica para marcar como lido ou arquivar:
   - Disparar a gravação no banco em segundo plano (background);
   - Atualizar imediatamente o conjunto (`readSet` ou `archivedSet`) em memória local;
   - Atualizar a contagem do badge superior e o estilo visual do item sem re-executar `getReadAlerts()` nem re-renderizar toda a lista.

---

## 4. Estratégia de Testes Subcutâneos (Vitest)

Criar suíte dedicada em `tests/subcutaneous/inbox_performance.test.ts`:
1. **Teste 1**: Comprovar que `loadAndBuildAlerts` executa as fontes de alertas em paralelo e conclui em uma única rodada.
2. **Teste 2**: Validar que a checagem de passaportes utiliza restrição de data no construtor de consulta (`.lte`), garantindo zero varredura de clientes sem passaporte.
3. **Teste 3**: Assegurar que marcar um alerta como lido atualize o estado em memória e persista no Supabase sem disparar leitura secundária.

---

## 5. Critérios de Aceite
- [ ] Abertura da Inbox em tempo inferior a 600 milissegundos.
- [ ] Marcação de leitura e arquivamento com resposta visual instantânea (menos de 50ms).
- [ ] Zero varredura de clientes sem alertas de passaporte.
- [ ] 100% dos testes de unidade e subcutâneos passando verde.

