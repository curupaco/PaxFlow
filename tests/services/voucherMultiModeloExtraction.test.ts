import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { StudioExtractionService } from '../../src/services/studioExtractionService';
import { parsePnrText } from '../../src/utils/pnrParser';

describe('VoucherMultiModeloExtraction - Testes Subcutâneos dos 4 Modelos', () => {
  // Setup: carregar textos extraídos dos 4 PDFs anexados
  const mscText = fs.readFileSync('/tmp/pdf_extracts/msc.txt', 'utf-8');
  const infoteraText = fs.readFileSync('/tmp/pdf_extracts/infotera.txt', 'utf-8');
  const kroozeText = fs.readFileSync('/tmp/pdf_extracts/krooze.txt', 'utf-8');
  const travellinkText = fs.readFileSync('/tmp/pdf_extracts/travellink.txt', 'utf-8');

  it('Modelo 1: MSC Cruzeiros - deve extrair reserva, navio, cabine, passageiros e itinerário dia a dia de 8 dias', () => {
    // Action

    const extraidos = StudioExtractionService.analisarTextoDocumento(mscText, 'Thiago2.pdf');
    const loc = StudioExtractionService.extrairLocalizador(mscText);
    const itinerarioDias = StudioExtractionService.gerarItinerarioDias(extraidos);
    const parsed = parsePnrText(mscText);

    // Assert
    expect(loc).toBe('75942907');
    expect(extraidos.cruzeiros).toBeDefined();
    expect(extraidos.cruzeiros!.length).toBeGreaterThan(0);

    const crz = extraidos.cruzeiros![0];
    expect(crz.navio).toContain('MSC Virtuosa');
    expect(crz.cabine).toBe('11225');
    expect(crz.deck).toBe('11');
    expect(crz.categoria).toBe('Balcony');
    expect(crz.experiencia).toBe('FANTASTICA');
    expect(crz.portoEmbarque).toContain('Santos');
    expect(crz.dataEmbarque).toBe('2026-12-26');

    // Passageiros
    expect(extraidos.passageiros).toBeDefined();
    const nomesPax = extraidos.passageiros!.map(p => p.nome.toUpperCase());
    expect(nomesPax.some(n => n.includes('CELINE ELAINE'))).toBe(true);
    expect(nomesPax.some(n => n.includes('MONIQUE'))).toBe(true);

    // Itinerário dia a dia (Opção A: Desmembrar escalas dia a dia)
    expect(itinerarioDias.length).toBeGreaterThanOrEqual(7);
    const portos = crz.itinerarioEscalas!.map(e => e.porto);
    expect(portos.some(p => p.includes('Santos'))).toBe(true);
    expect(portos.some(p => p.includes('Búzios') || p.includes('Buzios'))).toBe(true);
    expect(portos.some(p => p.includes('Salvador'))).toBe(true);
    expect(portos.some(p => p.includes('Copacabana'))).toBe(true);
    expect(portos.some(p => p.includes('Ilhabela'))).toBe(true);

    // Serviços adicionais
    expect(crz.servicosAdicionais).toBeDefined();
    expect(crz.servicosAdicionais!.some(s => s.includes('EASY PACKAGE'))).toBe(true);
    expect(crz.servicosAdicionais!.some(s => s.includes('HOTEL SERVICE CHARGE'))).toBe(true);

    // Parsed PNR produtos
    expect(parsed.produtos).toBeDefined();
    expect(parsed.produtos!.some(p => p.tipo === 'MARÍTIMO')).toBe(true);
  });

  it('Modelo 2: Agaxtur Infotera - deve desmembrar múltiplos hotéis (Pestana e Acta) com seus respectivos localizadores e datas', () => {
    // Action

    const extraidos = StudioExtractionService.analisarTextoDocumento(infoteraText, 'thiago1.pdf');
    const locGeral = StudioExtractionService.extrairLocalizador(infoteraText);
    const parsed = parsePnrText(infoteraText);

    // Assert
    expect(locGeral).toBe('607814');
    expect(extraidos.hospedagens).toBeDefined();
    expect(extraidos.hospedagens!.length).toBe(2);

    // Hotel 1: Pestana CR7 Lisboa
    const h1 = extraidos.hospedagens![0];
    expect(h1.hotel).toContain('Pestana CR7 Lisboa');
    expect(h1.voucher).toBe('9111139149617');
    expect(h1.checkIn).toBe('2027-02-04');
    expect(h1.checkOut).toBe('2027-02-06');
    expect(h1.quarto).toContain('Quarto superior');
    expect(h1.taxas).toContain('16.00');

    // Hotel 2: Hotel Acta Atrium Palace
    const h2 = extraidos.hospedagens![1];
    expect(h2.hotel).toContain('Hotel Acta Atrium Palace');
    expect(h2.voucher).toBe('9111139149762');
    expect(h2.checkIn).toBe('2027-02-20');
    expect(h2.checkOut).toBe('2027-02-23');
    expect(h2.quarto).toContain('Quarto casal');
    expect(h2.taxas).toContain('55.44');

    // Hóspedes
    expect(extraidos.passageiros).toBeDefined();
    const nomes = extraidos.passageiros!.map(p => p.nome.toUpperCase());
    expect(nomes.some(n => n.includes('MARIA D ASSUNCAO') || n.includes('COSTA YIDA'))).toBe(true);
    expect(nomes.some(n => n.includes('JOSE FLAUZINO') || n.includes('DA SILVA'))).toBe(true);

    // Parsed PNR produtos
    expect(parsed.produtos!.length).toBe(2);
    expect(parsed.produtos![0].tipo).toBe('HOTEL');
    expect(parsed.produtos![1].tipo).toBe('HOTEL');
    expect(parsed.produtos![0].codigoReserva).toBe('9111139149617');
    expect(parsed.produtos![1].codigoReserva).toBe('9111139149762');
  });

  it('Modelo 3: Agaxtur Krooze - deve desmembrar multisserviço (Marítimo R$ 34.258,10, Taxa Serviço R$ 1.694,00 e Seguro R$ 480,00)', () => {
    // Action

    const extraidos = StudioExtractionService.analisarTextoDocumento(kroozeText, 'Sonia_+_Salim_03jan27_MSC_Seaview.pdf');
    const loc = StudioExtractionService.extrairLocalizador(kroozeText);
    const parsed = parsePnrText(kroozeText);

    // Assert
    expect(loc).toBe('CR-0E92F2A329');
    expect(extraidos.valores?.total).toBe(36432.10);

    // Passageiros
    expect(extraidos.passageiros).toBeDefined();
    const nomes = extraidos.passageiros!.map(p => p.nome.toUpperCase());
    expect(nomes.some(n => n.includes('SONIA CRESPO VILAR'))).toBe(true);
    expect(nomes.some(n => n.includes('SALIM HADDAD NETTO'))).toBe(true);

    // Serviços Krooze
    expect(extraidos.servicos).toBeDefined();
    const taxaServ = extraidos.servicos!.find(s => s.tipo === 'Taxa de Serviço');
    expect(taxaServ).toBeDefined();
    expect(taxaServ!.valor).toBe(1694.00);

    const seguro = extraidos.servicos!.find(s => s.tipo === 'Seguro Viagem');
    expect(seguro).toBeDefined();
    expect(seguro!.fornecedor).toBe('Europ Assistance');
    expect(seguro!.valor).toBe(480.00);

    // Parsed PNR produtos
    expect(parsed.produtos).toBeDefined();
    expect(parsed.produtos!.some(p => p.tipo === 'MARÍTIMO')).toBe(true);
    expect(parsed.produtos!.some(p => p.tipo === 'TAXAS')).toBe(true);
    expect(parsed.produtos!.some(p => p.tipo === 'SEGURO')).toBe(true);
  });

  it('Modelo 4: Agaxtur Travellink GOL - deve extrair localizador OABIUA, e-ticket 127 e os 2 trechos de voo G3 1634 e G3 1639', () => {
    // Action

    const extraidos = StudioExtractionService.analisarTextoDocumento(travellinkText, 'Rosana_Aereo_GOL.pdf');
    const loc = StudioExtractionService.extrairLocalizador(travellinkText);
    const parsed = parsePnrText(travellinkText);

    // Assert
    expect(loc).toBe('OABIUA');

    // Passageira
    expect(extraidos.passageiros).toBeDefined();
    const nomePax = extraidos.passageiros![0].nome.toUpperCase();
    expect(nomePax).toContain('ROSA NA COELHO');

    // E-ticket
    expect(extraidos.bilhetes).toBeDefined();
    expect(extraidos.bilhetes!.some(b => b.numero.includes('127-2311356591'))).toBe(true);

    // Voos
    expect(extraidos.voos).toBeDefined();
    expect(extraidos.voos!.length).toBe(2);

    // Voo Ida: G3 1634 CGH -> SSA em 2026-12-19
    const ida = extraidos.voos![0];
    expect(ida.voo).toContain('G3 1634');
    expect(ida.origem).toBe('CGH');
    expect(ida.destino).toBe('SSA');
    expect(ida.dataIda).toBe('2026-12-19');
    expect(ida.horaIda).toBe('16:00');

    // Voo Volta: G3 1639 SSA -> CGH em 2027-01-01
    const volta = extraidos.voos![1];
    expect(volta.voo).toContain('G3 1639');
    expect(volta.origem).toBe('SSA');
    expect(volta.destino).toBe('CGH');
    expect(volta.dataIda).toBe('2027-01-01');
    expect(volta.horaIda).toBe('18:50');

    // Parsed PNR
    expect(parsed.voos.length).toBe(2);
    expect(parsed.produtos!.length).toBe(2);
    expect(parsed.produtos![0].tipo).toBe('AÉREO OPERADORA');
  });
});
