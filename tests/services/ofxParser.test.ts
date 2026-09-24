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
});
