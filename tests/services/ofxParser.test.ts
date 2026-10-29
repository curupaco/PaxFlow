import { describe, it, expect } from 'vitest';
import { parseOFX } from '../../src/services/ofxParser';
import { parseCSVExtrato } from '../../src/services/csvExtratoParser';

describe('OFX e CSV Extrato Parsers (PaxFlow FinRecon™)', () => {
  it('deve extrair transações de um arquivo OFX bancário padrão com valores positivos e negativos', () => {
    // Setup
    const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:UTF-8
CHARSET:1252
COMPRESSION:NONE
OLDFILEFAIL:NONE
NEWFILEFAIL:NONE

<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <CURDEF>BRL</CURDEF>
        <BANKACCTFROM>
          <BANKID>0341</BANKID>
          <ACCTID>12345-6</ACCTID>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>20261001120000[-03:EST]</DTSTART>
          <DTEND>20261031120000[-03:EST]</DTEND>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20261015120000</DTPOSTED>
            <TRNAMT>4500.50</TRNAMT>
            <FITID>2026101500123</FITID>
            <CHECKNUM>987654</CHECKNUM>
            <MEMO>PIX RECEBIDO - JOAO SILVA</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20261016120000</DTPOSTED>
            <TRNAMT>-150.00</TRNAMT>
            <FITID>2026101600124</FITID>
            <MEMO>TAR CONTA CORRENTE</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
        <LEDGERBAL>
          <BALAMT>15000.00</BALAMT>
          <DTASOF>20261031120000</DTASOF>
        </LEDGERBAL>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
`;

    // Action
    const resultado = parseOFX(ofxContent);

    // Assert
    expect(resultado.transacoes.length).toBe(2);
    // Ordenado da mais recente para a mais antiga (16/10 depois 15/10)
    const credito = resultado.transacoes.find(t => t.tipo === 'CREDITO');
    const debito = resultado.transacoes.find(t => t.tipo === 'DEBITO');

    expect(credito).toBeDefined();
    expect(credito?.valor).toBe(4500.50);
    expect(credito?.fitid).toBe('2026101500123');
    expect(credito?.documento).toBe('987654');
    expect(credito?.descricao).toBe('PIX RECEBIDO - JOAO SILVA');
    expect(credito?.data).toBe('2026-10-15');

    expect(debito).toBeDefined();
    expect(debito?.valor).toBe(150.00);
    expect(debito?.data).toBe('2026-10-16');

    expect(resultado.saldoFinal).toBe(15000.00);
    expect(resultado.moeda).toBe('BRL');
  });

  it('deve extrair transações de extrato CSV brasileiro delimitado por ponto e vírgula', () => {
    // Setup
    const csvContent = `Data;Historico;Documento;Valor
15/10/2026;PIX RECEBIDO MARIA SOUZA;DOC1234;3.500,00
16/10/2026;TED RECEBIDA AGENCIA 4321;TED9988;1.250,50
17/10/2026;TARIFA BANCARIA;TAR01;-25,00
`;

    // Action
    const resultado = parseCSVExtrato(csvContent);

    // Assert
    expect(resultado.transacoes.length).toBe(3);
    const pix = resultado.transacoes.find(t => t.descricao === 'PIX RECEBIDO MARIA SOUZA');
    expect(pix?.data).toBe('2026-10-15');
    expect(pix?.documentoRef).toBe('DOC1234');
    expect(pix?.valor).toBe(3500.00);
    expect(pix?.tipo).toBe('CREDITO');

    const tarifa = resultado.transacoes.find(t => t.descricao === 'TARIFA BANCARIA');
    expect(tarifa?.valor).toBe(25.00);
    expect(tarifa?.tipo).toBe('DEBITO');
  });

  it('deve extrair transações de extrato CSV delimitado por vírgula no formato padrão bancário internacional', () => {
    // Setup
    const csvContent = `"Date","Memo","Amount"
"2026-10-20","TRANSFER TO ACCOUNT","5,200.00"
"2026-10-21","FEE PAYMENT","-45.00"
"2026-10-22","INVOICE PAYMENT","1,250.50"
`;

    // Action
    const resultado = parseCSVExtrato(csvContent);

    // Assert
    expect(resultado.transacoes.length).toBe(3);
    const transfer = resultado.transacoes.find(t => t.descricao === 'TRANSFER TO ACCOUNT');
    expect(transfer?.data).toBe('2026-10-20');
    expect(transfer?.valor).toBe(5200.00);
    expect(transfer?.tipo).toBe('CREDITO');

    const fee = resultado.transacoes.find(t => t.descricao === 'FEE PAYMENT');
    expect(fee?.data).toBe('2026-10-21');
    expect(fee?.valor).toBe(45.00);
    expect(fee?.tipo).toBe('DEBITO');

    const invoice = resultado.transacoes.find(t => t.descricao === 'INVOICE PAYMENT');
    expect(invoice?.data).toBe('2026-10-22');
    expect(invoice?.valor).toBe(1250.50);
    expect(invoice?.tipo).toBe('CREDITO');
  });

  it('deve retornar lista vazia graciosamente quando o conteúdo estiver vazio ou sem dados válidos', () => {
    // Setup
    const vazio = '';
    const semLinhas = 'Header1;Header2;Header3\n';

    // Action
    const resOfx = parseOFX(vazio);
    const resCsv = parseCSVExtrato(semLinhas);

    // Assert
    expect(resOfx.transacoes).toEqual([]);
    expect(resCsv.transacoes).toEqual([]);
  });

  it('deve extrair com perfeição o extrato bancário real do Santander (com documento, saldo e valores monetários)', () => {
    // Setup
    const santanderCSV = `AGENCIA,0435,CONTA,130061089,
,,,,
Data,Histórico,Documento,Valor (R$),Saldo (R$)
31/08/2026,RENDIMENTO LIQUIDO DE CONTAMAX  7000 RENDIMENTO LIQUIDO DE CONTAMAX     ,,"R$ 0,40","R$ 70.928,42"
31/08/2026,PIX ENVIADO  57537438 EDSON PEREIRA DO,,"-R$ 300,00","R$ 70.928,02"
31/08/2026,PAGAMENTO DARF EM CANAIS  INTERNET SIMPLES NACIONAL,213530,"-R$ 1.402,34","R$ 71.228,02"
31/08/2026,PAGAMENTO DE BOLETO OUTROS BANCOS  NITRO2CODE LTDA EPP,0000000000,"-R$ 343,00","R$ 77.018,51"
31/08/2026,PIX RECEBIDO  06374602000195,,"R$ 13.609,16","R$ 90.833,32"
`;

    // Action
    const resultado = parseCSVExtrato(santanderCSV);

    // Assert
    expect(resultado.transacoes.length).toBe(5);

    // 1. Rendimento (Crédito)
    const rendimento = resultado.transacoes.find(t => t.descricao.includes('RENDIMENTO LIQUIDO'));
    expect(rendimento).toBeDefined();
    expect(rendimento?.data).toBe('2026-08-31');
    expect(rendimento?.valor).toBe(0.40);
    expect(rendimento?.tipo).toBe('CREDITO');

    // 2. Pix Enviado (Débito)
    const pixEnviado = resultado.transacoes.find(t => t.descricao.includes('EDSON PEREIRA'));
    expect(pixEnviado).toBeDefined();
    expect(pixEnviado?.valor).toBe(300.00);
    expect(pixEnviado?.valorOriginal).toBe(-300.00);
    expect(pixEnviado?.tipo).toBe('DEBITO');

    // 3. DARF com Documento numérico (que não deve ser confundido com valor!)
    const darf = resultado.transacoes.find(t => t.documento === '213530');
    expect(darf).toBeDefined();
    expect(darf?.documentoRef).toBe('213530');
    expect(darf?.valor).toBe(1402.34);
    expect(darf?.valorOriginal).toBe(-1402.34);
    expect(darf?.tipo).toBe('DEBITO');

    // 4. Boleto Nitro2Code com documento 0000000000
    const boleto = resultado.transacoes.find(t => t.descricao.includes('NITRO2CODE'));
    expect(boleto).toBeDefined();
    expect(boleto?.valor).toBe(343.00);
    expect(boleto?.tipo).toBe('DEBITO');

    // 5. Pix Recebido (Crédito alto)
    const pixRecebido = resultado.transacoes.find(t => t.descricao.includes('06374602000195'));
    expect(pixRecebido).toBeDefined();
    expect(pixRecebido?.valor).toBe(13609.16);
    expect(pixRecebido?.tipo).toBe('CREDITO');
  });

  it('deve extrair com perfeição o extrato bancário real da XP Empresas (delimitador ponto e vírgula e status)', () => {
    // Setup
    const xpCSV = `Saldo; Periodo;
R$ 4.344,16; 01/06/2026 at 31/08/2026
Descrição; Data da transação; Status da transação; Valor;
Pix enviado para Agaxtur Agencia de Viagens e Turismo S.A;03/08/2026;Efetivada;-R$ 4.614,01
Pix enviado para Rafael Arantes Maciel de Sousa;03/08/2026;Efetivada;-R$ 369,81
Pix recebido de Malta Viagens e Turismo Ltda;03/08/2026;Efetivada;R$ 10.000,00
`;

    // Action
    const resultado = parseCSVExtrato(xpCSV);

    // Assert
    expect(resultado.transacoes.length).toBe(3);

    const pixAgaxtur = resultado.transacoes.find(t => t.descricao.includes('Agaxtur'));
    expect(pixAgaxtur).toBeDefined();
    expect(pixAgaxtur?.data).toBe('2026-08-03');
    expect(pixAgaxtur?.valor).toBe(4614.01);
    expect(pixAgaxtur?.valorOriginal).toBe(-4614.01);
    expect(pixAgaxtur?.tipo).toBe('DEBITO');

    const pixMalta = resultado.transacoes.find(t => t.descricao.includes('Malta Viagens'));
    expect(pixMalta).toBeDefined();
    expect(pixMalta?.data).toBe('2026-08-03');
    expect(pixMalta?.valor).toBe(10000.00);
    expect(pixMalta?.tipo).toBe('CREDITO');
  });

  it('deve extrair transações a partir de texto de PDF da XP Empresas e do Santander', async () => {
    // Setup
    const { parseTextoExtratoBancario } = await import('../../src/services/pdfExtratoParser');

    const textoPdfXP = `
Extrato da Conta Digital PJ
03/08/2026 Valor
Pix enviado para Agaxtur Agencia de Viagens e Turismo S.A -R$ 4.614,01
Pix enviado para Rafael Arantes Maciel de Sousa -R$ 369,81
Pix recebido de Malta Viagens e Turismo Ltda R$ 10.000,00
Saldo do dia R$ 4.344,16
31/07/2026 Valor
Pix enviado para Fernanda Ganem Costa -R$ 11.000,00
TED recebida de K2 PARTNERING SOLUTIONS DO BRA R$ 10.591,84
Saldo do dia R$ 4.140,77
`;

    // Action
    const resXP = parseTextoExtratoBancario(textoPdfXP);

    // Assert
    expect(resXP.transacoes.length).toBe(5);
    const debitoAgaxtur = resXP.transacoes.find(t => t.descricao.includes('Agaxtur'));
    expect(debitoAgaxtur?.valor).toBe(4614.01);
    expect(debitoAgaxtur?.tipo).toBe('DEBITO');

    const tedK2 = resXP.transacoes.find(t => t.descricao.includes('K2 PARTNERING'));
    expect(tedK2?.valor).toBe(10591.84);
    expect(tedK2?.tipo).toBe('CREDITO');

    // Setup Santander PDF
    const textoPdfSantander = `
Santander Empresas
Data Histórico Documento Valor (R$) Saldo (R$)
31/08/2026 Rendimento Liquido De Contamax 7000 RENDIMENTO LIQUIDO DE CONTAMAX 0,40 70.928,42
31/08/2026 Pix Enviado 57537438 EDSON PEREIRA DO -300,00 70.928,02
31/08/2026 Pagamento Darf Em Canais INTERNET SIMPLES NACIONAL 213530 -1.402,34 71.228,02
`;

    // Action
    const resSantander = parseTextoExtratoBancario(textoPdfSantander);

    // Assert
    expect(resSantander.transacoes.length).toBe(3);
    const darf = resSantander.transacoes.find(t => t.documento === '213530');
    expect(darf).toBeDefined();
    expect(darf?.valor).toBe(1402.34);
    expect(darf?.tipo).toBe('DEBITO');
  });
});


