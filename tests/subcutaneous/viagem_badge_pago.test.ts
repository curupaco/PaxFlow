import { describe, it, expect } from 'vitest';
import { verificarViagemTotalmentePaga } from '../../src/utils/productFinancialHelper';

describe('Subcutaneous: Validação de Quitação Integral de Viagens para Badge PAGO', () => {
  it('deve retornar false quando a viagem não possui produtos cadastrados', () => {
    // Setup
    const produtos: any[] = [];
    const pagamentos: any[] = [
      { codigo_localizador: 'LOC123', valor: 1000 }
    ];

    // Action
    const resultadoVazio = verificarViagemTotalmentePaga(produtos, pagamentos);
    const resultadoNulo = verificarViagemTotalmentePaga(null as any, pagamentos);

    // Assert
    expect(resultadoVazio).toBe(false);
    expect(resultadoNulo).toBe(false);
  });

  it('deve retornar false quando a viagem possui produtos mas nenhum pagamento registrado', () => {
    // Setup
    const produtos = [
      { id: 'p1', codigo_reserva: 'LOC123', valor_venda: 1500 }
    ];
    const pagamentos: any[] = [];

    // Action
    const resultado = verificarViagemTotalmentePaga(produtos, pagamentos);

    // Assert
    expect(resultado).toBe(false);
  });

  it('deve retornar false quando o pagamento do LOC for parcial', () => {
    // Setup
    const produtos = [
      { id: 'p1', codigo_reserva: 'LOC123', valor_venda: 2000 }
    ];
    const pagamentos = [
      { codigo_localizador: 'LOC123', valor: 1500 }
    ];

    // Action
    const resultado = verificarViagemTotalmentePaga(produtos, pagamentos);

    // Assert
    expect(resultado).toBe(false);
  });

  it('deve retornar false quando um LOC estiver pago mas outro LOC estiver pendente', () => {
    // Setup
    const produtos = [
      { id: 'p1', codigo_reserva: 'LOC_AEREO', valor_venda: 3000 },
      { id: 'p2', codigo_reserva: 'LOC_HOTEL', valor_venda: 2500 }
    ];
    const pagamentos = [
      { codigo_localizador: 'LOC_AEREO', valor: 3000 }
    ];

    // Action
    const resultado = verificarViagemTotalmentePaga(produtos, pagamentos);

    // Assert
    expect(resultado).toBe(false);
  });

  it('deve retornar true quando um LOC estiver 100% quitado com pagamento único', () => {
    // Setup
    const produtos = [
      { id: 'p1', codigo_reserva: 'LOC999', valor_venda: 4500 }
    ];
    const pagamentos = [
      { codigo_localizador: 'LOC999', valor: 4500 }
    ];

    // Action
    const resultado = verificarViagemTotalmentePaga(produtos, pagamentos);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve retornar true quando múltiplos produtos do mesmo LOC forem quitados por pagamentos somados', () => {
    // Setup
    const produtos = [
      { id: 'p1', codigo_reserva: 'LOC_COMBO', valor_venda: 2000 },
      { id: 'p2', codigo_reserva: 'LOC_COMBO', valor_venda: 1500 }
    ];
    const pagamentos = [
      { codigo_localizador: 'LOC_COMBO', valor: 2000 },
      { codigo_localizador: 'LOC_COMBO', valor: 1500 }
    ];

    // Action
    const resultado = verificarViagemTotalmentePaga(produtos, pagamentos);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve retornar true quando múltiplos LOCs distintos forem integralmente quitados', () => {
    // Setup
    const produtos = [
      { id: 'p1', codigo_reserva: 'LOC1', valor_venda: 1000 },
      { id: 'p2', codigo_reserva: 'LOC2', valor_venda: 2000 },
      { id: 'p3', codigo_reserva: 'LOC3', valor_venda: 3000 }
    ];
    const pagamentos = [
      { codigo_localizador: 'LOC1', valor: 1000 },
      { codigo_localizador: 'LOC2', valor: 2000 },
      { codigo_localizador: 'LOC3', valor: 3000 }
    ];

    // Action
    const resultado = verificarViagemTotalmentePaga(produtos, pagamentos);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve aceitar tolerância de arredondamento de centavos (R$ 0,01)', () => {
    // Setup
    const produtos = [
      { id: 'p1', codigo_reserva: 'LOC_CENTAVOS', valor_venda: 100.00 }
    ];
    const pagamentos = [
      { codigo_localizador: 'LOC_CENTAVOS', valor: 99.995 }
    ];

    // Action
    const resultado = verificarViagemTotalmentePaga(produtos, pagamentos);

    // Assert
    expect(resultado).toBe(true);
  });
});
