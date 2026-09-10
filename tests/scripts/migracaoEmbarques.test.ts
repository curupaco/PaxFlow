import { describe, it, expect } from 'vitest';
import {
  parseValorMonetario,
  parseDestinoEServicos,
  parseTelefones,
  calcularStatusViagem,
  montarObservacoesViagem,
  processarRegistrosLegados,
  TAG_MIGRACAO,
  RegistroLegadoRaw
} from '../../src/utils/migracaoEmbarquesParser';
import { EMBARQUES_MALTA_RAW } from '../../src/data/embarquesMaltaData';

describe('Migração de Embarques — Malta Viagens (Regras e Parser)', () => {
  it('deve converter valores monetários em formato brasileiro para ponto flutuante com precisão', () => {
    // Setup
    const casos = [
      { entrada: '56.874,09', esperado: 56874.09 },
      { entrada: 9500, esperado: 9500 },
      { entrada: '2.455,94', esperado: 2455.94 },
      { entrada: '0', esperado: 0 },
      { entrada: 0, esperado: 0 },
      { entrada: '110.341,20', esperado: 110341.20 },
      { entrada: '', esperado: 0 }
    ];

    // Action & Assert
    casos.forEach(c => {
      // Action
      const resultado = parseValorMonetario(c.entrada);
      // Assert
      expect(resultado).toBe(c.esperado);
    });
  });

  it('deve extrair destino limpo e consolidar serviços em texto', () => {
    // Setup
    const textoEntrada = '* Roma:\nAGAXTUR - Aéreo Facial Econômica\nAGAXTUR - Circuitos\nAGAXTUR - Seguro Viagem\nCIAS AÉREAS - Assento/bagagem';

    // Action
    const { destino, servicos } = parseDestinoEServicos(textoEntrada);

    // Assert
    expect(destino).toBe('Roma');
    expect(servicos).toContain('AGAXTUR - Aéreo Facial Econômica');
    expect(servicos).toContain('AGAXTUR - Circuitos');
    expect(servicos).toContain('AGAXTUR - Seguro Viagem');
    expect(servicos).toContain('CIAS AÉREAS - Assento/bagagem');
  });

  it('deve separar telefones múltiplos preservando o principal e secundários', () => {
    // Setup
    const rawTelefones = '11 98429-1338, 11 98419-1907';

    // Action
    const { principal, secundarios } = parseTelefones(rawTelefones);

    // Assert
    expect(principal).toBe('11 98429-1338');
    expect(secundarios).toEqual(['11 98419-1907']);
  });

  it('deve tratar telefones internacionais sem truncamento', () => {
    // Setup
    const rawTelefone = '1 9178825281';

    // Action
    const { principal, secundarios } = parseTelefones(rawTelefone);

    // Assert
    expect(principal).toBe('1 9178825281');
    expect(secundarios).toHaveLength(0);
  });

  it('deve classificar status dinamicamente: pre_embarque (<= 7 dias ou em andamento) vs pos_venda (> 7 dias)', () => {
    // Setup
    const dataHoje = new Date('2026-09-09T00:00:00Z');

    // Action
    const statusEmAndamento = calcularStatusViagem('2026-08-27', '2026-09-14', dataHoje);
    const statusPreEmbarqueProximo = calcularStatusViagem('2026-09-13', '2026-09-17', dataHoje); // 4 dias
    const statusPosVendaDistante = calcularStatusViagem('2026-10-15', '2026-10-30', dataHoje); // > 7 dias

    // Assert
    expect(statusEmAndamento).toBe('pre_embarque');
    expect(statusPreEmbarqueProximo).toBe('pre_embarque');
    expect(statusPosVendaDistante).toBe('pos_venda');
  });

  it('deve assumir data de ida quando data de volta estiver vazia e registrar nas observações', () => {
    // Setup
    const registroSemVolta: RegistroLegadoRaw = {
      agencia: 'Malta Viagens',
      idLegado: 4919,
      dataAbertura: '2026-07-07 15:55:00',
      consultorLegado: 'Marinna Morena',
      valorVendaRaw: '3.467,80',
      dataEmbarque: '2026-09-14',
      dataRetorno: '',
      destinoEServicos: '* Paris:\nAGAXTUR - Aéreo Facial Econômica',
      clienteIdLegado: 1629,
      nomeCliente: 'Celso Marques De Oliveira',
      telefones: '11 98694-6120',
      email: 'celsomrqs@gmail.com'
    };

    // Action
    const { viagens } = processarRegistrosLegados([registroSemVolta]);
    const viagem = viagens[0];

    // Assert
    expect(viagem.dataIda).toBe('2026-09-14');
    expect(viagem.dataVolta).toBe('2026-09-14');
    expect(viagem.observacoes).toContain('Data de retorno não constava na planilha original');
    expect(viagem.origem).toBe(TAG_MIGRACAO);
  });

  it('deve processar a base completa da Malta Viagens sem erros e com deduplicação de ID legado', () => {
    // Setup
    expect(EMBARQUES_MALTA_RAW.length).toBeGreaterThan(50);

    // Action
    const { clientesMap, viagens } = processarRegistrosLegados(EMBARQUES_MALTA_RAW);

    // Assert
    // 1. Cada viagem deve ter código localizador único com prefixo #
    const localizadores = viagens.map(v => v.codigoLocalizador);
    const setLocalizadores = new Set(localizadores);
    expect(setLocalizadores.size).toBe(viagens.length);

    // 2. Nenhuma viagem pode ter campos mandatórios nulos
    viagens.forEach(v => {
      expect(v.destino).toBeTruthy();
      expect(v.dataIda).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.dataVolta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.origem).toBe(TAG_MIGRACAO);
      expect(v.observacoes).toContain(TAG_MIGRACAO);
      expect(typeof v.valorTotal).toBe('number');
      expect(isNaN(v.valorTotal)).toBe(false);
    });

    // 3. Clientes deduplicados
    expect(clientesMap.size).toBeGreaterThan(0);
    expect(clientesMap.size).toBeLessThanOrEqual(viagens.length);

    // 4. Verificação de clientes criados com a tag de rollback
    for (const cliente of clientesMap.values()) {
      expect(cliente.nome).toBeTruthy();
      expect(cliente.classificacoes).toContain(TAG_MIGRACAO);
    }
  });
});
