# Plano 5 - Otimização de Desempenho: Painel Comercial

## 1. Visão Geral e Diagnóstico Atual

O **Painel Comercial** (`src/pages/ComercialDashboard.ts`) oferece a visão gerencial de vendas, taxas de conversão por etapa do funil, desempenho individual de consultores e ticket médio da agência.

### 1.1. Diagnóstico do Gargalo Atual
* **Arquivo principal**: `src/pages/ComercialDashboard.ts` (linhas 255 a 330).
* **Comportamento atual**:
  * Ao carregar a tela no método `loadData`:
    * Executa `supabase.from('orcamentos').select('*')` sem corte de data.
    * Executa `supabase.from('viagens').select('*, produtos:produtos_viagem(*)')` sem corte de data.
  * Para o perfil de Administrador/Diretoria, o sistema baixa todas as propostas e viagens com produtos da agência para calcular:
    * Funil de conversão (quantos orçamentos viraram viagens);
    * Faturamento por consultor e rankings;
    * Tempo médio de fechamento.
* **Métricas**:
  * Tempo de abertura: 1.5s a 3s para perfis de gestão;
  * Cálculo em memória de matrizes de conversão em tempo de execução.

---

## 2. Metas de Desempenho e Arquitetura Alvo

| Métrica | Situação Atual | Meta Pós-Otimização |
| :--- | :--- | :--- |
| **Tempo de Abertura do Painel** | 1.5s - 3s | **< 500ms** |
| **Janela Padrão de Análise** | Toda a história da agência | **Mês atual ou último trimestre configurável** |
| **Projeção de Colunas** | `select('*')` completo | **Apenas colunas essenciais de conversão e valores** |
| **Consumo de Banda** | Alto para gestores | **Leve e focado na competência analisada** |

---

## 3. Especificação Técnica da Otimização

### Passo 1: Seletor de Competência com Janela Padrão no Banco
1. Configurar o painel para iniciar por padrão no **Mês Vigente** (ou últimos 30/90 dias).
2. Adicionar as restrições nas queries do Supabase:
   ```ts
   // Exemplo conceitual da restrição temporal no painel
   const inicioMesIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

   queryOrc = queryOrc.gte('created_at', inicioMesIso);
   queryVia = queryVia.gte('created_at', inicioMesIso);
   ```
3. Disponibilizar seletor de período rápido no cabeçalho ("Este Mês", "Mês Passado", "Trimestre", "Ano Atual"). Ao trocar o seletor, consultar apenas o intervalo solicitado.

### Passo 2: Eliminação de Campos Não Utilizados
* Na tabela `viagens`, selecionar apenas `id, codigo_ref, consultor_id, valor_total, created_at, status`.
* Na tabela `produtos_viagem`, selecionar apenas `id, viagem_id, tipo_produto, valor_venda, comissao_total`.
* Na tabela `orcamentos`, selecionar apenas `id, consultor_id, status, valor_proposta, created_at`.
* Eliminar campos textuais densos (observações, regras tarifárias, mensagens, contratos).

---

## 4. Estratégia de Testes Subcutâneos (Vitest)

Criar suíte dedicada em `tests/subcutaneous/comercial_dashboard_performance.test.ts`:
1. **Teste 1**: Validar que a busca inicial no `ComercialDashboard` inclui a cláusula temporal `.gte` da competência padrão.
2. **Teste 2**: Comprovar que a troca de período no seletor dispara a consulta correspondente ao intervalo sem misturar dados em memória.
3. **Teste 3**: Garantir que as métricas de conversão e faturamento permaneçam matematicamente exatas com a projeção enxuta de colunas.

---

## 5. Critérios de Aceite
- [ ] Abertura do Painel Comercial em menos de 500ms para todos os perfis de acesso.
- [ ] Gráficos e números do funil exibidos de forma instantânea.
- [ ] 100% dos testes da suíte passando verde.

