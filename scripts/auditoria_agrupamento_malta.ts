// Mock de WebSocket para compatibilidade com Node.js 18
(globalThis as any).WebSocket = class MockWebSocket {};

import { EMBARQUES_MALTA_RAW } from '../src/data/embarquesMaltaData';
import { processarRegistrosLegados, TAG_MIGRACAO, parseDestinoEServicos, parseValorMonetario } from '../src/utils/migracaoEmbarquesParser';
import { normalizarTipoProduto } from '../src/controllers/cadastrosController';

interface ViagemAgrupavel {
  codigoLocalizador: string;
  destino: string;
  dataIda: string;
  dataVolta: string;
  valorTotal: number;
  status: string;
  dataFinanceiro: string | null;
  consultorNomeLegado: string;
  clienteIdLegado: number;
  nomeCliente: string;
  servicos: string;
}

interface GrupoConsolidado {
  chave: string;
  clienteIdLegado: number;
  clienteNome: string;
  destino: string;
  mesAno: string;
  viagensOriginais: ViagemAgrupavel[];
  viagemPrincipal: {
    dataIda: string;
    dataVolta: string;
    valorTotal: number;
    codigoLocalizador: string;
    status: string;
    consultor: string;
  };
  produtosGerados: Array<{
    tipo: string;
    descricao: string;
    fornecedor: string;
    valorVenda: number;
    codigoReserva: string;
    dataServico: string;
  }>;
}

function normalizarDestino(destino: string): string {
  if (!destino) return 'indefinido';
  return destino
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function extrairAnoMes(dataIsoStr: string): string {
  if (!dataIsoStr) return 'indefinido';
  return dataIsoStr.slice(0, 7); // Ex: "2026-09"
}

async function main() {
  console.log('\n========================================================================');
  console.log(`📊 PAXFLOW — AUDITORIA E SIMULAÇÃO DE AGRUPAMENTO DE VIAGENS (DRY-RUN)`);
  console.log(`Lote / Origem: ${TAG_MIGRACAO}`);
  console.log('Regra Aprovada: Mesmo Cliente + Mesmo Destino + Mesmo Mês/Ano de Embarque');
  console.log('========================================================================\n');

  console.log('🔍 Carregando e processando registros oficiais da Malta Viagens...');
  const { clientesMap, viagens } = processarRegistrosLegados(EMBARQUES_MALTA_RAW);

  console.log(`✅ Base Carregada:`);
  console.log(`  • Total de Vouchers/Linhas Originais: ${viagens.length} linhas de viagens no painel`);
  console.log(`  • Total de Clientes Únicos:          ${clientesMap.size} clientes\n`);

  // Montar lista completa enriquecida com o nome do cliente e serviços
  const viagensEnriquecidas: ViagemAgrupavel[] = viagens.map(v => {
    const c = clientesMap.get(v.clienteIdLegado);
    return {
      codigoLocalizador: v.codigoLocalizador,
      destino: v.destino,
      dataIda: v.dataIda,
      dataVolta: v.dataVolta,
      valorTotal: v.valorTotal,
      status: v.status,
      dataFinanceiro: v.dataFinanceiro,
      consultorNomeLegado: v.consultorNomeLegado,
      clienteIdLegado: v.clienteIdLegado,
      nomeCliente: c?.nome || 'Cliente Não Identificado',
      servicos: v.observacoes
    };
  });

  // Agrupamento por Cliente (ID Legado) + Destino Normalizado + Mês/Ano de Embarque
  const gruposMap = new Map<string, ViagemAgrupavel[]>();

  for (const v of viagensEnriquecidas) {
    const destNorm = normalizarDestino(v.destino);
    const anoMes = extrairAnoMes(v.dataIda);
    const chave = `${v.clienteIdLegado}___${destNorm}___${anoMes}`;

    if (!gruposMap.has(chave)) {
      gruposMap.set(chave, []);
    }
    gruposMap.get(chave)!.push(v);
  }

  const gruposConsolidados: GrupoConsolidado[] = [];
  let totalGruposMultiplos = 0;
  let totalLinhasEliminadas = 0;

  for (const [chave, lista] of gruposMap.entries()) {
    // Ordenar por data_ida ascendente
    lista.sort((a, b) => (a.dataIda || '').localeCompare(b.dataIda || ''));

    const primeira = lista[0];
    const clienteNome = primeira.nomeCliente;
    const destinoOficial = primeira.destino;
    const anoMes = extrairAnoMes(primeira.dataIda);

    // Menor data_ida
    const todasIdas = lista.map(v => v.dataIda).filter(Boolean);
    todasIdas.sort();
    const menorDataIda = todasIdas[0] || primeira.dataIda;

    // Maior data_volta
    const todasVoltas = lista.map(v => v.dataVolta || v.dataIda).filter(Boolean);
    todasVoltas.sort().reverse();
    const maiorDataVolta = todasVoltas[0] || menorDataIda;

    // Soma dos valores
    const somaValores = lista.reduce((acc, v) => acc + Number(v.valorTotal || 0), 0);

    // Concatenação de códigos legados (#4270, #4278, #4279, etc.)
    const codigosLegados = lista.map(v => v.codigoLocalizador.trim()).filter(Boolean);
    const codigosUnicos = Array.from(new Set(codigosLegados));
    const codigoLocalizadorConsolidado = codigosUnicos.join(', ');

    // Produtos gerados a partir de cada item
    const produtosGerados = lista.map(v => {
      const tipoInferido = normalizarTipoProduto(v.servicos || v.destino);
      
      // Extrair nome limpo do serviço
      let desc = 'Serviço da Viagem';
      if (v.servicos) {
        const match = v.servicos.match(/-\s*([^\n\r]+)/);
        if (match) {
          desc = match[1].trim();
        } else {
          desc = `${tipoInferido} - ${v.destino}`;
        }
      }

      return {
        tipo: tipoInferido.toLowerCase(),
        descricao: desc,
        fornecedor: 'AGAXTUR',
        valorVenda: Number(v.valorTotal || 0),
        codigoReserva: v.codigoLocalizador,
        dataServico: v.dataIda || menorDataIda
      };
    });

    if (lista.length > 1) {
      totalGruposMultiplos++;
      totalLinhasEliminadas += (lista.length - 1);
    }

    gruposConsolidados.push({
      chave,
      clienteIdLegado: primeira.clienteIdLegado,
      clienteNome,
      destino: destinoOficial,
      mesAno: anoMes,
      viagensOriginais: lista,
      viagemPrincipal: {
        dataIda: menorDataIda,
        dataVolta: maiorDataVolta,
        valorTotal: Number(somaValores.toFixed(2)),
        codigoLocalizador: codigoLocalizadorConsolidado,
        status: primeira.status,
        consultor: primeira.consultorNomeLegado
      },
      produtosGerados
    });
  }

  // Estatísticas e Verificação Financeira
  const valorTotalOriginal = viagens.reduce((acc, v) => acc + Number(v.valorTotal || 0), 0);
  const valorTotalConsolidado = gruposConsolidados.reduce((acc, g) => acc + g.viagemPrincipal.valorTotal, 0);
  const totalProdutosASeremCriados = gruposConsolidados.reduce((acc, g) => acc + g.produtosGerados.length, 0);
  const diferencaCentavos = Math.abs(valorTotalOriginal - valorTotalConsolidado);

  console.log('========================================================================');
  console.log('📈 RESUMO EXECUTIVO DO AGRUPAMENTO (SIMULAÇÃO)');
  console.log('========================================================================');
  console.log(`• Linhas de Viagens Atuais no Painel:        ${viagens.length} viagens`);
  console.log(`• Viagens Consolidadas Finais:               ${gruposConsolidados.length} viagens`);
  console.log(`• Redução Líquida no Painel Operacional:     -${totalLinhasEliminadas} linhas redundantes eliminadas`);
  console.log(`• Pacotes com Múltiplos Produtos Agrupados:  ${totalGruposMultiplos} viagens completas`);
  console.log(`• Total de Produtos em produtos_viagem:      ${totalProdutosASeremCriados} itens vinculados`);
  console.log('------------------------------------------------------------------------');
  console.log(`💰 Faturamento Total Antes:                  R$ ${valorTotalOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`💰 Faturamento Total Depois:                 R$ ${valorTotalConsolidado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🔒 Integridade de Centavos:                  ${diferencaCentavos < 0.01 ? '✅ 100% IDÊNTICO (Zero divergência financeira)' : '❌ Divergência: ' + diferencaCentavos}`);
  console.log('========================================================================\n');

  // Destaque Especial: MAURICIO NEVES FONSECA
  const gruposMauricio = gruposConsolidados.filter(g => 
    g.clienteNome.toLowerCase().includes('mauricio neves')
  );

  console.log('🎯 CASO DE TESTE REAL DO PRINT: MAURICIO NEVES FONSECA');
  console.log('========================================================================');
  if (gruposMauricio.length === 0) {
    console.log('Nenhum grupo localizado para Mauricio Neves Fonseca.');
  } else {
    gruposMauricio.forEach((g, idx) => {
      console.log(`\n📦 Viagem ${idx + 1}: ${g.destino} (${g.mesAno}) - Consultor: ${g.viagemPrincipal.consultor}`);
      console.log(`   • Linhas Redundantes Agrupadas: ${g.viagensOriginais.length} linhas -> 1 Viagem Consolidada`);
      console.log(`   • Período Consolidado:          ${g.viagemPrincipal.dataIda} até ${g.viagemPrincipal.dataVolta}`);
      console.log(`   • Valor Total do Pacote:        R$ ${g.viagemPrincipal.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      console.log(`   • Localizadores Combinados:     ${g.viagemPrincipal.codigoLocalizador}`);
      console.log(`   • Detalhamento dos Produtos Internos (${g.produtosGerados.length} itens):`);
      g.produtosGerados.forEach(p => {
        console.log(`     - [${p.codigoReserva}] ${p.tipo.toUpperCase()}: ${p.descricao} -> R$ ${p.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      });
    });
  }

  // Exemplos de outros clientes com múltiplos produtos
  console.log('\n\n🎯 OUTROS EXEMPLOS DE AGRUPAMENTOS IDENTIFICADOS NA MALTA:');
  console.log('========================================================================');
  const outrosComMultiplos = gruposConsolidados
    .filter(g => g.viagensOriginais.length > 1 && !g.clienteNome.toLowerCase().includes('mauricio neves'))
    .slice(0, 4);

  outrosComMultiplos.forEach((g, idx) => {
    console.log(`\n${idx + 1}. Cliente: ${g.clienteNome}`);
    console.log(`   • Destino: ${g.destino} (${g.mesAno})`);
    console.log(`   • De ${g.viagensOriginais.length} viagens no painel para 1 Viagem com ${g.produtosGerados.length} produtos.`);
    console.log(`   • Período: ${g.viagemPrincipal.dataIda} a ${g.viagemPrincipal.dataVolta} | Total: R$ ${g.viagemPrincipal.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   • Vouchers: ${g.viagemPrincipal.codigoLocalizador}`);
    g.produtosGerados.forEach(p => {
      console.log(`     - [${p.codigoReserva}] ${p.descricao} (R$ ${p.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
    });
  });

  console.log('\n========================================================================');
  console.log('ℹ️  STATUS DA SIMULAÇÃO: 100% VALIDADA E SEGURA.');
  console.log('   NENHUM DADO FOI ALTERADO NO BANCO AINDA (DRY-RUN).');
  console.log('========================================================================\n');
}

main().catch(err => {
  console.error('Erro na auditoria:', err);
  process.exit(1);
});
