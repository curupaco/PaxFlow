import { StudioProposta } from '../../types';

export class StudioPdfGenerator {
  /**
   * Abre uma nova janela de visualização do Caderno de Viagem pronta para impressão ou exportação em PDF.
   */
  public static imprimirOuSalvarPdf(proposta: StudioProposta): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para gerar o Caderno de Viagem.');
      return;
    }

    const urlPublica = `${window.location.origin}${window.location.pathname}#proposta?id=${proposta.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(urlPublica)}`;
    const capaUrl = proposta.foto_capa_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

    const formatarMoeda = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: proposta.moeda || 'BRL' }).format(val);
    };

    const formatarData = (dStr?: string) => {
      if (!dStr) return '';
      const p = dStr.split('-');
      if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
      return dStr;
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Caderno de Viagem - ${proposta.destino} - ${proposta.cliente_nome}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-size: 11pt;
            line-height: 1.5;
          }
          .no-print {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: #4f46e5;
            color: white;
            padding: 12px 24px;
            border-radius: 999px;
            border: none;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          @media print {
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
          }
          .capa-container {
            position: relative;
            height: 250mm;
            border-radius: 20px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 40px;
            color: white;
            background: linear-gradient(180deg, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.85) 100%), url('${capaUrl}') center/cover no-repeat;
          }
          .capa-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .tag-luxo {
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            border: 1px solid rgba(255,255,255,0.3);
          }
          .capa-body {
            margin-top: auto;
            margin-bottom: 20px;
          }
          .destino-titulo {
            font-size: 42pt;
            font-weight: 800;
            line-height: 1.1;
            margin: 0 0 10px 0;
            letter-spacing: -0.5px;
          }
          .cliente-subtitulo {
            font-size: 16pt;
            font-weight: 500;
            opacity: 0.95;
            margin-bottom: 20px;
          }
          .capa-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid rgba(255,255,255,0.25);
            padding-top: 20px;
          }
          .info-bloco {
            font-size: 11pt;
          }
          .info-bloco span {
            display: block;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.8;
          }
          .qr-box {
            background: white;
            padding: 8px;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            color: #0f172a;
          }
          .qr-box img {
            width: 90px;
            height: 90px;
          }
          .qr-box span {
            font-size: 7.5pt;
            font-weight: 700;
            margin-top: 4px;
          }

          /* Página Interna */
          .conteudo-secao {
            padding: 20px 0;
          }
          .secao-titulo {
            font-size: 16pt;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .card-resumo {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 14px;
          }
          .card-header-flex {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .card-titulo {
            font-size: 12pt;
            font-weight: 700;
            color: #0f172a;
          }
          .loc-badge {
            background: #e0e7ff;
            color: #4338ca;
            font-size: 9pt;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 6px;
            letter-spacing: 0.5px;
          }
          .dia-item {
            margin-bottom: 24px;
          }
          .dia-header {
            display: flex;
            align-items: baseline;
            gap: 12px;
            margin-bottom: 12px;
          }
          .dia-tag {
            background: #4f46e5;
            color: white;
            font-weight: 800;
            font-size: 9pt;
            padding: 4px 10px;
            border-radius: 999px;
          }
          .dia-data {
            font-size: 11pt;
            font-weight: 700;
            color: #334155;
          }
          .atividade-card {
            border-left: 3px solid #6366f1;
            padding-left: 14px;
            margin-left: 12px;
            margin-bottom: 14px;
          }
          .atividade-hora {
            font-size: 9pt;
            font-weight: 700;
            color: #64748b;
          }
          .atividade-titulo {
            font-size: 11pt;
            font-weight: 700;
            color: #0f172a;
          }
          .atividade-desc {
            font-size: 9.5pt;
            color: #475569;
            margin-top: 2px;
          }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / Salvar PDF
        </button>

        <!-- CAPA DO CADERNO -->
        <div class="capa-container">
          <div class="capa-header">
            <span class="tag-luxo">PaxFlow Studio™ · Caderno de Viagem</span>
            <span style="font-weight: 700; font-size: 12pt;">AGÊNCIA DE VIAGENS</span>
          </div>

          <div class="capa-body">
            <h1 class="destino-titulo">${proposta.destino}</h1>
            <div class="cliente-subtitulo">Preparado com carinho e exclusividade para <strong>${proposta.cliente_nome}</strong></div>
          </div>

          <div class="capa-footer">
            <div style="display: flex; gap: 30px;">
              <div class="info-bloco">
                <span>Período da Viagem</span>
                <strong>${formatarData(proposta.data_ida)} a ${formatarData(proposta.data_volta) || 'A definir'}</strong>
              </div>
              <div class="info-bloco">
                <span>Consultor Responsável</span>
                <strong>${proposta.consultor_nome || 'Consultoria Especializada'}</strong>
              </div>
              <div class="info-bloco">
                <span>Investimento Total</span>
                <strong>${formatarMoeda(proposta.valor_total)}</strong>
              </div>
            </div>

            <div class="qr-box">
              <img src="${qrCodeUrl}" alt="QR Code da Proposta">
              <span>Acesse no Celular</span>
            </div>
          </div>
        </div>

        <div class="page-break"></div>

        <!-- RESUMO DE SERVIÇOS & VOUCHERS -->
        <div class="conteudo-secao">
          <div class="secao-titulo">
            <span>✈️ Vouchers e Reservas Confirmadas</span>
          </div>

          ${(() => {
            // Extrai voos priorizando os itens revisados pelo usuário no itinerário
            const voosItinerario: Array<{
              companhia: string;
              voo: string;
              origem?: string;
              destino?: string;
              dataIda?: string;
              horaIda?: string;
              horaVolta?: string;
              localizador?: string;
            }> = [];

            if (proposta.itinerario_dias) {
              proposta.itinerario_dias.forEach(d => {
                d.itens.filter(i => i.tipo === 'voo').forEach(i => {
                  voosItinerario.push({
                    companhia: i.companhia || i.fornecedor || 'Companhia Aérea',
                    voo: i.numeroVoo || 'Voo Confirmado',
                    origem: i.origem,
                    destino: i.destino,
                    dataIda: i.dataInicio || d.dataStr || d.data,
                    horaIda: i.horaInicio || i.horario,
                    horaVolta: i.horaFim,
                    localizador: i.localizador
                  });
                });
              });
            }

            const voosFinais = voosItinerario.length > 0 ? voosItinerario : (proposta.dados_extraidos?.voos || []);
            if (voosFinais.length === 0) return '';

            return `
              <div class="card-resumo">
                <div class="card-header-flex">
                  <div class="card-titulo">Passagens Aéreas Confirmadas</div>
                  ${voosFinais[0].localizador ? `<span class="loc-badge">LOC: ${voosFinais[0].localizador}</span>` : ''}
                </div>
                ${voosFinais.map(v => `
                  <div style="margin-top: 8px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1; font-size: 10pt;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <span>
                        <strong style="color: #4f46e5;">✈️ ${v.companhia}</strong>
                        ${v.voo && v.voo !== 'Voo Confirmado' ? `· Voo <strong>${v.voo}</strong>` : ''}
                      </span>
                      ${v.localizador ? `<span style="font-family: monospace; font-weight: 700; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 8.5pt;">LOC: ${v.localizador}</span>` : ''}
                    </div>
                    <div style="margin-top: 3px; color: #334155;">
                      ${v.origem && v.destino ? `Trecho: <strong>${v.origem} ➔ ${v.destino}</strong> · ` : ''}
                      Data: <strong>${formatarData(v.dataIda)}</strong>
                      ${v.horaIda ? ` às <strong>${v.horaIda}</strong>` : ''}
                      ${v.horaVolta ? ` (Chegada: ${v.horaVolta})` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          })()}

          ${(() => {
            // Extrai hotéis priorizando itens revisados pelo usuário
            const hoteisItinerario: Array<{
              hotel: string;
              checkIn?: string;
              checkOut?: string;
              quarto?: string;
              regime?: string;
              voucher?: string;
            }> = [];

            if (proposta.itinerario_dias) {
              proposta.itinerario_dias.forEach(d => {
                d.itens.filter(i => i.tipo === 'hotel').forEach(i => {
                  hoteisItinerario.push({
                    hotel: i.titulo,
                    checkIn: i.dataInicio || d.dataStr || d.data,
                    checkOut: i.dataFim,
                    quarto: i.quarto,
                    regime: i.regime,
                    voucher: i.localizador
                  });
                });
              });
            }

            const hoteisFinais = hoteisItinerario.length > 0 ? hoteisItinerario : (proposta.dados_extraidos?.hospedagens || []);
            if (hoteisFinais.length === 0) return '';

            return `
              <div class="card-resumo">
                <div class="card-header-flex">
                  <div class="card-titulo">Hospedagem &amp; Conforto</div>
                  ${hoteisFinais[0].voucher ? `<span class="loc-badge">VOUCHER: ${hoteisFinais[0].voucher}</span>` : ''}
                </div>
                ${hoteisFinais.map(h => `
                  <div style="margin-top: 8px; font-size: 10pt;">
                    <strong>🏨 ${h.hotel}</strong>
                    ${h.voucher ? ` · <span style="font-family: monospace; font-weight: 700; color: #047857;">Voucher: ${h.voucher}</span>` : ''}
                    <br>
                    <span style="color: #475569;">
                      Check-in: ${formatarData(h.checkIn)} | Check-out: ${formatarData(h.checkOut) || 'Conforme Roteiro'} · 
                      <em>${h.quarto || 'Acomodação'} · ${h.regime || 'Hospedagem'}</em>
                    </span>
                  </div>
                `).join('')}
              </div>
            `;
          })()}

          ${proposta.dados_extraidos?.servicos && proposta.dados_extraidos.servicos.length > 0 ? `
            <div class="card-resumo">
              <div class="card-header-flex">
                <div class="card-titulo">Serviços Inclusos, Traslados &amp; Seguros</div>
              </div>
              ${proposta.dados_extraidos.servicos.map(s => `
                <div style="margin-top: 6px; font-size: 10pt;">
                  <strong>${s.tipo}</strong>: ${s.descricao} (${s.fornecedor || 'Parceiro Homologado'})
                  ${s.voucher ? ` · <span style="font-family: monospace; font-weight: 700;">Ref: ${s.voucher}</span>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- ROTEIRO DIA A DIA -->
          <div class="secao-titulo" style="margin-top: 30px;">
            <span>📅 Itinerário Detalhado Dia a Dia</span>
          </div>

          ${proposta.itinerario_dias && proposta.itinerario_dias.length > 0 ? proposta.itinerario_dias.map(dia => `
            <div class="dia-item">
              <div class="dia-header">
                <span class="dia-tag">DIA ${dia.diaNumero}</span>
                <span class="dia-data">${formatarData(dia.dataStr || dia.data)} — ${dia.tituloDia}</span>
              </div>
              ${dia.itens.map(item => `
                <div class="atividade-card">
                  <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px;">
                    <div>
                      ${item.horario || item.horaInicio ? `<span class="atividade-hora">${item.horario || item.horaInicio}</span> · ` : ''}
                      <span class="atividade-titulo">${item.titulo}</span>
                    </div>
                    ${item.localizador ? `<span class="loc-badge" style="font-size: 8pt; padding: 2px 6px;">LOC: ${item.localizador}</span>` : ''}
                  </div>
                  ${item.subtitulo ? `<div class="atividade-desc">${item.subtitulo}</div>` : ''}
                  ${item.observacoes ? `<div class="atividade-desc" style="font-style: italic; color: #64748b;">Obs: ${item.observacoes}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `).join('') : `
            <p style="color: #64748b; font-style: italic;">Programação de dias livres para descanso e lazer.</p>
          `}
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
