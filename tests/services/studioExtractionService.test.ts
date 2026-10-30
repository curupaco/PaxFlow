import { describe, it, expect } from 'vitest';
import { StudioExtractionService } from '../../src/services/studioExtractionService';

describe('StudioExtractionService - Testes Subcutâneos de Extração e Linha do Tempo', () => {
  it('deve extrair voos a partir de texto com padrões comuns de companhias aéreas', async () => {
    // Setup
    const textoMockFornecedor = `
      CONFIRMAÇÃO DE VOO - LATAM AIRLINES
      Voo LA3456
      Origem: GRU - São Paulo
      Destino: MIA - Miami
      Data: 15/10/2026 22:15
      Chegada: 16/10/2026 06:30
      Localizador de Reserva: LAX99Z
      Valor total: R$ 4.850,00
    `;

    // Action
    const resultado = await StudioExtractionService.extrairDados(textoMockFornecedor, 'voo_latam.pdf');

    // Assert
    expect(resultado.tipoDetectado).toBe('voo');
    expect(resultado.fornecedor).toContain('LATAM');
    expect(resultado.loc).toBe('LAX99Z');
    expect(resultado.itens.length).toBeGreaterThan(0);
    const itemVoo = resultado.itens[0];
    expect(itemVoo.tipo).toBe('voo');
    expect(itemVoo.origem).toBe('GRU');
    expect(itemVoo.destino).toBe('MIA');
    expect(resultado.valorTotal).toBe(4850);
  });

  it('deve extrair hospedagem com check-in, check-out e noites calculadas', async () => {
    // Setup
    const textoMockHotel = `
      VOUCHER DE HOSPEDAGEM
      Hotel Fasano Rio de Janeiro
      Check-in: 16/10/2026
      Check-out: 20/10/2026
      Acomodação: Suíte Deluxe Vista Mar
      Regime: Café da Manhã incluso
      Código de Confirmação: BK-88412
      Valor da Estadia: R$ 8.200,00
    `;

    // Action
    const resultado = await StudioExtractionService.extrairDados(textoMockHotel, 'voucher_hotel.pdf');

    // Assert
    expect(resultado.tipoDetectado).toBe('hotel');
    expect(resultado.loc).toBe('BK-88412');
    expect(resultado.itens.length).toBe(1);
    const itemHotel = resultado.itens[0];
    expect(itemHotel.tipo).toBe('hotel');
    expect(itemHotel.titulo).toContain('Fasano');
    expect(itemHotel.dataInicio).toBe('2026-10-16');
    expect(itemHotel.dataFim).toBe('2026-10-20');
    expect(resultado.valorTotal).toBe(8200);
  });

  it('deve consolidar múltiplos itens e gerar itinerário dia a dia ordenado', () => {
    // Setup
    const itens = [
      {
        id: '1',
        tipo: 'voo' as const,
        titulo: 'Voo GRU -> MIA',
        dataInicio: '2026-10-15',
        horaInicio: '22:00',
        origem: 'GRU',
        destino: 'MIA',
        status: 'confirmado' as const
      },
      {
        id: '2',
        tipo: 'hotel' as const,
        titulo: 'Hotel Fontainebleau Miami',
        dataInicio: '2026-10-16',
        dataFim: '2026-10-19',
        horaInicio: '15:00',
        status: 'confirmado' as const
      },
      {
        id: '3',
        tipo: 'passeio' as const,
        titulo: 'Passeio de Barco Biscayne Bay',
        dataInicio: '2026-10-17',
        horaInicio: '10:00',
        status: 'confirmado' as const
      }
    ];

    // Action
    const dias = StudioExtractionService.gerarItinerarioDiaADia(itens);

    // Assert
    expect(dias.length).toBeGreaterThanOrEqual(3);
    expect(dias[0].data).toBe('2026-10-15');
    expect(dias[0].diaNumero).toBe(1);
    expect(dias[0].itens[0].id).toBe('1');
    expect(dias[1].data).toBe('2026-10-16');
    expect(dias[1].diaNumero).toBe(2);
    expect(dias[2].data).toBe('2026-10-17');
    expect(dias[2].itens.some(i => i.id === '3')).toBe(true);
  });

  it('NÃO deve trocar nem alucinar companhia aérea com palavras soltas como LA ou AD (Tolerância Zero a Falsos Positivos)', async () => {
    // Setup: bilhete com indicador de adulto "1 ADT" e cidade "LA PAZ", sem ser Azul nem LATAM
    const textoSemCia = `
      CONFIRMAÇÃO DE RESERVA DE VOO
      Passageiro: 1 ADT
      Voo: 7890
      Trecho: VVI -> LPB (La Paz)
      Data: 20/11/2026 14:00
      Localizador: BOL999
    `;

    // Action
    const resultado = await StudioExtractionService.extrairDados(textoSemCia, 'voo_lapaz.txt');

    // Assert: NÃO deve ser identificado como LATAM nem AZUL
    const voo = resultado.itens[0];
    expect(voo).toBeDefined();
    expect(voo.companhia).not.toBe('LATAM Airlines');
    expect(voo.companhia).not.toBe('Azul Linhas Aéreas');
    // Fidelidade: como não havia cia oficial no texto, mantém vazio para escolha pelo agente
    expect(voo.companhia).toBe('');
  });

  it('deve extrair com precisão companhias internacionais (ex: Air France, Turkish) e campos estruturados', async () => {
    // Setup
    const textoAirFrance = `
      BILHETE ELETRÔNICO - AIR FRANCE
      Voo AF 443
      Origem: GIG
      Destino: CDG
      Data: 10/12/2026 21:55
      Localizador: AFR888
    `;

    // Action
    const resultado = await StudioExtractionService.processarTextoColado(textoAirFrance);

    // Assert
    expect(resultado.itens.length).toBe(1);
    const item = resultado.itens[0];
    expect(item.companhia).toBe('Air France');
    expect(item.numeroVoo).toContain('AF 443');
    expect(item.origem).toBe('GIG');
    expect(item.destino).toBe('CDG');
    expect(item.localizador).toBe('AFR888');
  });

  it('deve reordenar dias de itinerário e atualizar sequencialmente a propriedade diaNumero', () => {
    // Setup - 3 dias de roteiro
    const diasOriginais: any[] = [
      { diaNumero: 1, tituloDia: 'Dia 1: Chegada em Roma', itens: [{ id: 'i1', titulo: 'Check-in Hotel' }] },
      { diaNumero: 2, tituloDia: 'Dia 2: Coliseu & Fórum Romano', itens: [{ id: 'i2', titulo: 'Passeio Coliseu' }] },
      { diaNumero: 3, tituloDia: 'Dia 3: Vaticano & Museus', itens: [{ id: 'i3', titulo: 'Tour Vaticano' }] },
    ];

    // Action - Mover Dia 3 (index 2) para a posição do Dia 1 (index 0)
    const reordenados = StudioExtractionService.reordenarDiasItinerario(diasOriginais, 2, 0);

    // Assert
    expect(reordenados).toHaveLength(3);
    // O antigo Dia 3 agora é o primeiro dia e seu diaNumero foi recalculado para 1
    expect(reordenados[0].tituloDia).toBe('Dia 3: Vaticano & Museus');
    expect(reordenados[0].diaNumero).toBe(1);
    expect(reordenados[0].itens[0].id).toBe('i3');

    // O antigo Dia 1 virou o segundo dia com diaNumero = 2
    expect(reordenados[1].tituloDia).toBe('Dia 1: Chegada em Roma');
    expect(reordenados[1].diaNumero).toBe(2);

    // O antigo Dia 2 virou o terceiro dia com diaNumero = 3
    expect(reordenados[2].tituloDia).toBe('Dia 2: Coliseu & Fórum Romano');
    expect(reordenados[2].diaNumero).toBe(3);
  });

  it('deve reordenar itens/atividades dentro de um mesmo dia', () => {
    // Setup
    const itensOriginais: any[] = [
      { id: 'a1', titulo: 'Café da manhã' },
      { id: 'a2', titulo: 'City Tour' },
      { id: 'a3', titulo: 'Jantar Romântico' }
    ];

    // Action - mover item 2 para o início
    const reordenados = StudioExtractionService.reordenarItensDoDia(itensOriginais, 2, 0);

    // Assert
    expect(reordenados).toHaveLength(3);
    expect(reordenados[0].id).toBe('a3');
    expect(reordenados[1].id).toBe('a1');
    expect(reordenados[2].id).toBe('a2');
  });

  it('deve extrair com fidelidade bilhete aéreo Agaxtur / NDC LATAM com múltiplos trechos, passageiros e datas por extenso', async () => {
    // Setup
    const textoAgaxtur = `
      Reserva Aérea - Plano de Viagem
      Usuário: Rafael Arantes Maciel de Sousa
      E-mail: atendimento4.ibirapuera1@agaxtur.com.br
      Telefone: 55 11 30907070
      Reserva
      Localizador Prazo Status Sistema Criação Contatos Agência
      LA9575541SANJ
      FFCWIZ
      --- Emitido NDCLatam
      26 OUT 21:55
      Passageiros
      Tipo Sobrenome Nome Sexo Nascimento Fidelidade Status
      Adulto NICODEM LIANE MARIA Feminino 02/03/74 Emitido
      Adulto PESSOA TRIO MARCELO Masculino 08/02/69 Emitido
      Voos
      Cia Origem / Destino Voo Esc. Cl. Info LocCia
      GRU- SAOPAULO
      06 Fev 2027 21:15
      Cabine: Econ.
      JFK - NOVA IORQUE
      07 Fev 2027 05:09 LA 6349 0 Q
      1
      1pc 23kg por peça
      Família: STANDARD Avião: 339 Base Tar: QLTKM50B Cabine: Econ. FFCWIZ
      ATENÇÃO: o voo 6349 pertence à companhia Lan Chile, mas é operado pela Delta.
      JFK - NOVA IORQUE
      23 Fev 2027 19:10
      Cabine: Econ.
      GRU- SAOPAULO
      24 Fev 2027 07:00 LA 8181 0 Q
      1
      1pc 23kg por peça
      Família: STANDARD Avião: 789 Base Tar: QLTKM50B Cabine: Econ. FFCWIZ
      Bilhetes
      Número Localizador Passageiro Data Emissão Conjugados
      957-2307960802 LA9575541SANJ NICODEM/ LIANE MARIA 27/10/2026 -
      957-2307960803 LA9575541SANJ PESSOA TRIO/MARCELO 27/10/2026 -
    `;

    // Action
    const resultado = await StudioExtractionService.extrairDados(textoAgaxtur, 'reserva_agaxtur.pdf');

    // Assert
    expect(resultado.tipoDetectado).toBe('voo');
    expect(resultado.loc).toBe('FFCWIZ');
    expect(resultado.itens.length).toBe(2);

    // Trecho 1: Ida GRU -> JFK
    const vooIda = resultado.itens[0];
    expect(vooIda.origem).toBe('GRU');
    expect(vooIda.destino).toBe('JFK');
    expect(vooIda.dataInicio).toBe('2027-02-06');
    expect(vooIda.numeroVoo).toBe('LA 6349');
    expect(vooIda.horaInicio).toBe('21:15');

    // Trecho 2: Volta JFK -> GRU
    const vooVolta = resultado.itens[1];
    expect(vooVolta.origem).toBe('JFK');
    expect(vooVolta.destino).toBe('GRU');
    expect(vooVolta.dataInicio).toBe('2027-02-23');
    expect(vooVolta.numeroVoo).toBe('LA 8181');
    expect(vooVolta.horaInicio).toBe('19:10');

    // Passageiros e Bilhetes
    expect(resultado.dadosBrutos.passageiros).toBeDefined();
    expect(resultado.dadosBrutos.passageiros?.length).toBe(2);
    expect(resultado.dadosBrutos.passageiros?.[0].nome).toBe('LIANE MARIA NICODEM');
    expect(resultado.dadosBrutos.bilhetes?.length).toBe(2);
    expect(resultado.dadosBrutos.bilhetes?.[0].numero).toBe('957-2307960802');

    // Itinerário gerado dia a dia
    const dias = StudioExtractionService.gerarItinerarioDias(resultado.dadosBrutos);
    expect(dias.length).toBe(2);
    expect(dias[0].dataStr).toBe('2027-02-06');
    expect(dias[1].dataStr).toBe('2027-02-23');
  });
});

