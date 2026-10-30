import { Viagem, Cliente, GlobalSettings, RiskScoreResult, RiskItem, RiskTimelineEntry, ProdutoViagem, PerfilConsultor, ExigenciaDestinoViagem } from '../types';
import { supabase } from './supabase';
import { isRiskScoreEnabled } from '../utils/featureFlags';
import { ContatosEmbarqueService } from './contatosEmbarqueService';

/**
 * Serviço responsável pela inteligência do PaxFlow Risk Score™
 */
export class RiskScoreService {
  /**
   * Identifica e mapeia heurísticamente as regras de entrada, sanitárias, vacinas e vistos por país/destino.
   */
  public static obterExigenciasDestino(destino: string): ExigenciaDestinoViagem {
    const dest = (destino || '').toLowerCase().trim();
    const destNorm = dest.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Destino Doméstico / Nacional
    const termosNacionais = [
      'brasil', 'br', 'sao paulo', 'rio de janeiro', 'gramado', 'caldas novas', 'salvador', 'fortaleza',
      'recife', 'florianopolis', 'maceio', 'natal', 'porto seguro', 'curitiba', 'belo horizonte',
      'manaus', 'foz do iguacu', 'bonito', 'noronha', 'porto de galinhas', 'maragogi', 'campos do jordao'
    ];
    const isNacional = termosNacionais.some(t => destNorm.includes(t));

    if (isNacional && !destNorm.includes('internacional') && !destNorm.includes('exterior')) {
      return {
        destinoDetectado: destino || 'Brasil (Nacional)',
        categoria: 'nacional',
        vistoExigido: false,
        vistoDescricao: 'Não aplicável para voos domésticos',
        seguroObrigatorio: false,
        vacinaObrigatoria: false,
        docExigido: 'Documento original com foto (RG, CNH física ou via app Gov.br)',
        orientacaoGeral: 'Embarques nacionais exigem documento com foto em bom estado e emitido há menos de 10 anos ou CNH digital válida.'
      };
    }

    // 2. Estados Unidos da América (EUA)
    const termosEua = ['eua', 'usa', 'estados unidos', 'orlando', 'miami', 'new york', 'nova york', 'ny', 'disney', 'california', 'los angeles', 'las vegas', 'chicago', 'texas'];
    if (termosEua.some(t => destNorm.includes(t))) {
      return {
        destinoDetectado: destino || 'Estados Unidos (EUA)',
        categoria: 'eua',
        vistoExigido: true,
        vistoDescricao: 'Visto Americano de Turismo (B1/B2) válido ou Autorização ESTA (dupla cidadania)',
        seguroObrigatorio: false,
        vacinaObrigatoria: false,
        docExigido: 'Passaporte válido para o período de estadia + Visto consular ou ESTA',
        orientacaoGeral: 'Custos hospitalares nos EUA são os mais altos do mundo. Embora o seguro não seja exigido por lei na imigração americana, uma apólice médica é crítica para proteção financeira da família.'
      };
    }

    // 3. Europa / Espaço Schengen
    const termosSchengen = [
      'europa', 'schengen', 'franca', 'paris', 'italia', 'roma', 'espanha', 'madrid', 'barcelona',
      'portugal', 'lisboa', 'porto', 'alemanha', 'berlim', 'frankfurt', 'suica', 'zurique', 'genebra',
      'holanda', 'amsterda', 'amsterdam', 'grecia', 'atenas', 'santorini', 'austria', 'viena',
      'belgica', 'bruxelas', 'noruega', 'suecia', 'finlandia', 'dinamarca', 'londres', 'reino unido'
    ];
    if (termosSchengen.some(t => destNorm.includes(t))) {
      return {
        destinoDetectado: destino || 'Europa (Espaço Schengen)',
        categoria: 'schengen',
        vistoExigido: false,
        vistoDescricao: 'Isenção de visto para brasileiros para estadias de turismo de até 90 dias',
        seguroObrigatorio: true,
        seguroMinimoEur: 30000,
        seguroMinimoDescricao: 'Tratado de Schengen: Cobertura médica e hospitalar mínima de 30.000 Euros',
        vacinaObrigatoria: false,
        docExigido: 'Passaporte com validade mínima de 180 dias (6 meses) a contar da data de retorno',
        orientacaoGeral: 'O Tratado de Schengen EXIGE por lei apólice de seguro viagem com assistência médica de no mínimo 30.000 Euros. A imigração de fronteira pode barrar passageiros desprovidos do voucher de seguro.'
      };
    }

    // 4. Países com Exigência Obrigatória de Febre Amarela (CIVP Anvisa)
    const termosFebreAmarela = [
      'tailandia', 'bangkok', 'phuket', 'africa do sul', 'johannesburg', 'cidade do cabo',
      'colombia', 'bogota', 'cartagena', 'san andres', 'costa rica', 'panama', 'australia',
      'egito', 'cairo', 'india', 'nova deli', 'kenya', 'quenia', 'tanzania', 'zanzibar'
    ];
    if (termosFebreAmarela.some(t => destNorm.includes(t))) {
      return {
        destinoDetectado: destino || 'Destino com Exigência Sanitária',
        categoria: 'febre_amarela',
        vistoExigido: destNorm.includes('australia') || destNorm.includes('egito') || destNorm.includes('india'),
        vistoDescricao: (destNorm.includes('australia') || destNorm.includes('egito') || destNorm.includes('india')) ? 'Visto Eletrônico (eVisa) obrigatório' : 'Isenção de visto para fins turísticos de curta permanência',
        seguroObrigatorio: false,
        vacinaObrigatoria: true,
        vacinaDescricao: 'Certificado Internacional de Vacinação (CIVP) contra Febre Amarela da Anvisa (dose tomada há >= 10 dias)',
        docExigido: 'Passaporte válido por no mínimo 6 meses + Certificado CIVP Anvisa',
        orientacaoGeral: 'Embarque condicionado à apresentação do Certificado Internacional de Febre Amarela (CIVP). A vacina precisa ter sido aplicada há pelo menos 10 dias antes do embarque.'
      };
    }

    // 5. Mercosul / América do Sul
    const termosMercosul = [
      'argentina', 'buenos aires', 'bariloche', 'mendoza', 'chile', 'santiago', 'atacama',
      'uruguai', 'montevideu', 'punta del este', 'paraguai', 'assuncao', 'peru', 'lima', 'cusco', 'machu picchu'
    ];
    if (termosMercosul.some(t => destNorm.includes(t))) {
      return {
        destinoDetectado: destino || 'América do Sul (Mercosul)',
        categoria: 'mercosul',
        vistoExigido: false,
        vistoDescricao: 'Dispensado para turismo de cidadãos brasileiros',
        seguroObrigatorio: false,
        vacinaObrigatoria: false,
        docExigido: 'RG Original emitido há menos de 10 anos em ótimo estado OU Passaporte válido (CNH NÃO é aceita)',
        orientacaoGeral: 'Brasileiros podem viajar apenas com a Carteira de Identidade (RG), desde que emitida há menos de 10 anos e legível. A CNH não é reconhecida pelas polícias federais de fronteira.'
      };
    }

    // 6. Internacional Geral
    return {
      destinoDetectado: destino || 'Viagem Internacional',
      categoria: 'internacional_geral',
      vistoExigido: false,
      vistoDescricao: 'Verificar exigência consular específica para o país de destino',
      seguroObrigatorio: false,
      vacinaObrigatoria: false,
      docExigido: 'Passaporte válido por no mínimo 180 dias a contar do regresso',
      orientacaoGeral: 'Recomenda-se manter passaporte com 6 meses de vigência além da data de retorno e contratar seguro viagem internacional com cobertura para emergências médicas.'
    };
  }

  /**
   * Calcula a nota de Saúde Operacional (0 a 100) e diagnostica pendências de uma viagem.
   */
  public static calculateTripRiskScore(
    viagem: Viagem,
    cliente?: Cliente | null,
    produtos: ProdutoViagem[] = [],
    settings?: GlobalSettings | null,
    user?: any,
    perfil?: PerfilConsultor | null
  ): RiskScoreResult {
    // 0. Se o recurso estiver desativado para o usuário atual, retorna status neutro desativado
    if (!isRiskScoreEnabled(user, perfil, settings)) {
      return {
        score: 100,
        nivel: 'verde',
        corHex: '#10b981',
        badgeClass: 'hidden',
        fraseStatus: 'PaxFlow Risk Score™ Desativado',
        isGracePeriod: false,
        itens: [],
        historico: []
      };
    }

    const hoje = new Date();
    const dataIda = viagem.data_ida ? new Date(viagem.data_ida) : null;
    const dataVolta = viagem.data_volta ? new Date(viagem.data_volta) : null;

    // Janela de carência (Grace Period)
    const carenciaDias = settings?.risk_score_janela_carencia_dias || 60;
    let daysToDeparture = 999;
    if (dataIda) {
      const diffTime = dataIda.getTime() - hoje.getTime();
      daysToDeparture = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const isGracePeriod = daysToDeparture > carenciaDias;
    const itens: RiskItem[] = [];

    // Identificação de Exigências Internacionais, Sanitárias e Vistos por Destino
    const exigenciasDestino = RiskScoreService.obterExigenciasDestino(viagem.destino || '');
    const isNacional = exigenciasDestino.categoria === 'nacional';

    
    const temVoo = produtos.some(p => (p.tipo || '').toLowerCase().includes('voo') || (p.tipo || '').toLowerCase().includes('aéreo'));
    
    let tripDays = 1;
    if (dataIda && dataVolta) {
      const diffDays = Math.ceil((dataVolta.getTime() - dataIda.getTime()) / (1000 * 60 * 60 * 24));
      tripDays = Math.max(1, diffDays);
    }
    const isBateVolta = tripDays <= 1;

    // Checagem de Voucher Geral Unificado da Operadora e Anexos Categorizados
    const temVoucherGeral = Boolean(viagem.voucher_geral_anexado || viagem.voucher_geral_pacote);

    // Extração e normalização de múltiplos anexos vinculados à viagem
    let anexosViagem: any[] = Array.isArray((viagem as any).anexos) ? (viagem as any).anexos : [];
    if (anexosViagem.length === 0 && viagem.observacoes) {
      const matchAnexos = viagem.observacoes.match(/<!-- PAXFLOW_ANEXOS:(.*?) -->/);
      if (matchAnexos && matchAnexos[1]) {
        try {
          const parsed = JSON.parse(matchAnexos[1]);
          if (Array.isArray(parsed)) anexosViagem = parsed;
        } catch {}
      }
    }

    const temAnexoAereo = anexosViagem.some(a => a.tipo_documento === 'VOUCHER_AEREO');
    const temAnexoHotel = anexosViagem.some(a => a.tipo_documento === 'VOUCHER_HOTEL');
    const temAnexoSeguro = anexosViagem.some(a => a.tipo_documento === 'SEGURO');
    const temAnexoPassaporte = anexosViagem.some(a => a.tipo_documento === 'PASSAPORTE');
    const temAnexoDocNacional = anexosViagem.some(a => a.tipo_documento === 'RG' || a.tipo_documento === 'CNH');

    let score = 100;

    // PILAR 1: Documental & Vistos (Peso 30%)
    if (!isNacional) {
      // 1. Identificar quantidade de passageiros/pessoas da viagem internacional
      // Agrupa os produtos aéreos ativos por data de serviço (ou data de ida) para saber quantas passagens foram emitidas no mesmo trecho (evitando duplicar ida e volta)
      const produtosAereosAtivos = produtos.filter(p => 
        p.status !== 'cancelado' && 
        ((p.tipo || '').toLowerCase().includes('aéreo') || (p.tipo || '').toLowerCase().includes('voo'))
      );

      const contagemPorData = new Map<string, number>();
      produtosAereosAtivos.forEach(p => {
        const dataKey = p.dataServico || (p as any).data_servico || viagem.data_ida || 'data_embarque';
        contagemPorData.set(dataKey, (contagemPorData.get(dataKey) || 0) + 1);
      });

      const maxPassagensMesmaData = contagemPorData.size > 0 ? Math.max(...Array.from(contagemPorData.values())) : 0;
      const numPessoasViagem = Math.max(1, maxPassagensMesmaData);

      // Lista de passaportes cadastrados no perfil do cliente ou anexados
      let passaportesCadastrados: { nome: string; numero: string; validade: string }[] = [];
      if (cliente?.passaportes && Array.isArray(cliente.passaportes) && cliente.passaportes.length > 0) {
        passaportesCadastrados = cliente.passaportes.filter(p => (p.numero && p.numero.trim() !== '') || (p.validade && p.validade.trim() !== ''));
      } else if (cliente?.passaporteNumero) {
        passaportesCadastrados = [{
          nome: cliente.nome || 'Passageiro Titular',
          numero: cliente.passaporteNumero,
          validade: cliente.passaporteValidade || ''
        }];
      } else if (temAnexoPassaporte) {
        passaportesCadastrados = [{
          nome: cliente?.nome || 'Passageiro Titular',
          numero: 'Anexo Salvo',
          validade: ''
        }];
      }

      // Se a viagem tem múltiplas pessoas (> 1) e faltam passaportes cadastrados
      if (numPessoasViagem > 1 && passaportesCadastrados.length < numPessoasViagem) {
        const faltantes = numPessoasViagem - passaportesCadastrados.length;
        const pen = 30;
        score -= pen;
        itens.push({
          id: 'p1-passaportes-familia-faltantes',
          pilar: 1,
          pilarNome: 'Documental & Vistos',
          titulo: 'Passaportes da Família / Grupo Incompletos',
          descricaoHumana: `Viagem internacional para ${numPessoasViagem} pessoas com apenas ${passaportesCadastrados.length} passaporte(s) cadastrado(s) - faltam ${faltantes} passaporte(s) da família ou acompanhantes.`,
          penalidadePontos: pen,
          resolvido: false,
          acaoTipo: 'preencher_passaporte',
          acaoRotulo: '🛂 Completar Passaportes da Família',
          acaoWhatsAppTexto: `Olá, ${cliente?.nome ? cliente.nome.split(' ')[0] : 'Passageiro'}! Tudo bem? ✈️ Para a emissão segura da viagem para ${viagem.destino || 'seu destino'}, precisamos anexar os passaportes de todos os passageiros. Você poderia nos enviar foto da página de identificação dos viajantes? Muito obrigado!`
        });
      } else if (passaportesCadastrados.length === 0 && !isGracePeriod) {
        // Nenhuma informação de passaporte cadastrada
        const pen = 20;
        score -= pen;
        itens.push({
          id: 'p1-passaporte-ausente',
          pilar: 1,
          pilarNome: 'Documental & Vistos',
          titulo: 'Passaporte Não Cadastrado',
          descricaoHumana: 'Viagem internacional sem número ou validade de passaporte cadastrada no perfil do cliente.',
          penalidadePontos: pen,
          resolvido: false,
          acaoTipo: 'preencher_passaporte',
          acaoRotulo: '🛂 Preencher Passaporte',
          acaoWhatsAppTexto: `Olá, ${cliente?.nome ? cliente.nome.split(' ')[0] : 'Passageiro'}! Tudo bem? ✈️ Estamos finalizando os preparativos para ${viagem.destino || 'sua viagem'}. Para a conferência documental e emissão obrigatória, precisamos que nos envie uma foto da página com foto e validade do seu passaporte. Pode nos enviar por aqui? Obrigado!`
        });
      }

      // Verificação individual de SLA de validade de cada passaporte cadastrado
      if (passaportesCadastrados.length > 0 && dataVolta) {
        passaportesCadastrados.forEach((paxPass, idx) => {
          if (!paxPass.validade) return;
          const valPass = new Date(paxPass.validade);
          if (isNaN(valPass.getTime())) return;
          const diffPass = Math.ceil((valPass.getTime() - dataVolta.getTime()) / (1000 * 60 * 60 * 24));
          if (diffPass < 180) {
            const jaPenalizouValidade = itens.some(item => item.id.startsWith('p1-passaporte-critico-'));
            const pen = jaPenalizouValidade ? 0 : 30;
            if (pen > 0 && !itens.some(item => item.id === 'p1-passaportes-familia-faltantes')) {
              score -= pen;
            }
            const nomeExibicao = (paxPass.nome && paxPass.nome.trim() !== '') ? paxPass.nome.split(' ')[0] : `Passageiro ${idx + 1}`;
            itens.push({
              id: `p1-passaporte-critico-${idx}`,
              pilar: 1,
              pilarNome: 'Documental & Vistos',
              titulo: `Passaporte com Validade Crítica (${nomeExibicao})`,
              descricaoHumana: `O passaporte de ${paxPass.nome || nomeExibicao} expira em menos de 180 dias da data de volta (${diffPass < 0 ? 'já vencido' : diffPass + ' dias de validade restante'}).`,
              penalidadePontos: pen,
              resolvido: false,
              acaoTipo: 'preencher_passaporte',
              acaoRotulo: '🛂 Atualizar Passaporte',
              acaoWhatsAppTexto: `Olá, ${cliente?.nome ? cliente.nome.split(' ')[0] : 'Passageiro'}! Revisando a documentação da viagem para ${viagem.destino || 'seu destino'}, identificamos que o passaporte de ${paxPass.nome || nomeExibicao} está próximo de vencer. Muitos destinos exigem no mínimo 6 meses de validade no desembarque. Recomendamos agendar a renovação na Polícia Federal o quanto antes para viajar com total tranquilidade!`
            });
          }
        });
      }

      // 4. Verificação de Vacinas Obrigatórias (Febre Amarela / CIVP Anvisa)
      if (exigenciasDestino.vacinaObrigatoria) {
        const pen = isGracePeriod ? 0 : 15;
        if (pen > 0) score -= pen;
        itens.push({
          id: 'p1-civp-febre-amarela',
          pilar: 1,
          pilarNome: 'Documental & Vistos',
          titulo: 'Vacina Febre Amarela / CIVP Obrigatório',
          descricaoHumana: `${exigenciasDestino.destinoDetectado} exige o Certificado Internacional de Vacinação (CIVP) contra Febre Amarela emitido pela Anvisa, aplicado há pelo menos 10 dias do embarque.`,
          penalidadePontos: pen,
          resolvido: false,
          acaoTipo: 'orientar_visto_vacina',
          acaoRotulo: '💉 Orientar CIVP Anvisa',
          acaoWhatsAppTexto: `Olá, ${cliente?.nome ? cliente.nome.split(' ')[0] : 'Passageiro'}! Lembramos que para a entrada em ${viagem.destino || 'seu destino'}, é obrigatório apresentar o Certificado Internacional de Vacinação (CIVP) contra Febre Amarela emitido pela Anvisa. A vacina deve ser tomada no mínimo 10 dias antes do embarque. Qualquer dúvida para emitir no portal Gov.br, estamos à disposição!`
        });
      }

      // 5. Verificação Informativa Mercosul (RG < 10 anos)
      if (exigenciasDestino.categoria === 'mercosul' && passaportesCadastrados.length === 0) {
        itens.push({
          id: 'p1-mercosul-rg-10anos',
          pilar: 1,
          pilarNome: 'Documental & Vistos',
          titulo: 'Alerta Mercosul: RG < 10 anos (CNH Não Aceita)',
          descricaoHumana: 'Viagem para o Mercosul: a imigração de fronteira exige RG original expedido há menos de 10 anos e legível OU Passaporte válido. CNH não é aceita para cruzar a fronteira.',
          penalidadePontos: 0,
          resolvido: false,
          acaoTipo: 'orientar_visto_vacina',
          acaoRotulo: '🛂 Instruir Documentação Mercosul',
          acaoWhatsAppTexto: `Olá, ${cliente?.nome ? cliente.nome.split(' ')[0] : 'Passageiro'}! Lembramos que para viagens aos países do Mercosul (${viagem.destino || 'América do Sul'}), as polícias federais de fronteira exigem RG original emitido há menos de 10 anos em ótimo estado ou passaporte válido. A CNH não é aceita para ingressar no país!`
        });
      }
    }

    // PILAR 2: Vouchers & Confirmações de Fornecedores (Peso 25%)
    if (!temVoucherGeral && !isGracePeriod) {
      // Check hoteis (se houver anexo de hotel, considera o voucher fornecido)
      const hoteis = produtos.filter(p => (p.tipo || '').toLowerCase().includes('hotel') || (p.tipo || '').toLowerCase().includes('hospedagem'));
      const hoteisSemVoucher = temAnexoHotel 
        ? [] 
        : hoteis.filter(h => !h.codigoReserva && !h.dados_adicionais?.voucher_url && !h.dadosAdicionais?.voucher_url);

      if (hoteisSemVoucher.length > 0 && !isBateVolta) {
        const pen = 15;
        score -= pen;
        itens.push({
          id: 'p2-voucher-hotel',
          pilar: 2,
          pilarNome: 'Vouchers & Confirmados',
          titulo: 'Voucher de Hospedagem Pendente',
          descricaoHumana: `Falta anexar ou vincular o voucher de hospedagem para ${hoteisSemVoucher.length} hotel(is) reservado(s).`,
          penalidadePontos: pen,
          resolvido: false,
          acaoTipo: 'anexar_voucher',
          acaoRotulo: '📁 Anexar Voucher de Hotel'
        });
      }

      // Check voos (se houver anexo aéreo, considera o bilhete/voucher emitido)
      if (temVoo) {
        const voos = produtos.filter(p => (p.tipo || '').toLowerCase().includes('voo') || (p.tipo || '').toLowerCase().includes('aéreo'));
        const voosSemLoc = temAnexoAereo
          ? []
          : voos.filter(v => !v.codigoReserva && !viagem.codigo_localizador);

        if (voosSemLoc.length > 0) {
          const pen = 15;
          score -= pen;
          itens.push({
            id: 'p2-loc-voo',
            pilar: 2,
            pilarNome: 'Vouchers & Confirmados',
            titulo: 'E-Ticket / Localizador do Voo Pendente',
            descricaoHumana: 'Existe produto aéreo cadastrado sem o número de bilhete emitido ou código de reserva (LOC).',
            penalidadePontos: pen,
            resolvido: false,
            acaoTipo: 'vincular_loc',
            acaoRotulo: '✈️ Vincular E-ticket / LOC'
          });
        }
      }
    }

    // PILAR 3: Governança Operacional & Financeira (Peso 20%)
    if (!viagem.processo_conferido && !viagem.isProcessoConferido && !isGracePeriod) {
      const pen = 15;
      score -= pen;
      itens.push({
        id: 'p3-conferencia-op',
        pilar: 3,
        pilarNome: 'Governança & Financeiro',
        titulo: 'Conferência Operacional Não Concluída',
        descricaoHumana: 'A lista de verificação de conferência da viagem ainda não foi validada pela equipe.',
        penalidadePontos: pen,
        resolvido: false,
        acaoTipo: 'conferir_operacional',
        acaoRotulo: '✍️ Marcar Operacional Conferido'
      });
    }

    // Checagem de Contato Pré-Embarque Crítico (< 24h)
    const contatosEmbarque = ContatosEmbarqueService.extrairContatos(viagem);
    const embarquesViagem = ContatosEmbarqueService.obterEmbarquesViagem(viagem, produtos);

    const agora = new Date();
    const hojeAno = agora.getFullYear();
    const hojeMes = String(agora.getMonth() + 1).padStart(2, '0');
    const hojeDia = String(agora.getDate()).padStart(2, '0');
    const hojeDataIso = `${hojeAno}-${hojeMes}-${hojeDia}`;

    const dataAmanha = new Date(agora);
    dataAmanha.setDate(dataAmanha.getDate() + 1);
    const amanhaAno = dataAmanha.getFullYear();
    const amanhaMes = String(dataAmanha.getMonth() + 1).padStart(2, '0');
    const amanhaDia = String(dataAmanha.getDate()).padStart(2, '0');
    const amanhaDataIso = `${amanhaAno}-${amanhaMes}-${amanhaDia}`;

    let embarqueUrgenteSemContato: { chave: string; rotulo: string; dataStr: string } | null = null;

    for (const emb of embarquesViagem) {
      const contatoFeito = contatosEmbarque[emb.chave]?.feito === true;
      if (contatoFeito) continue;

      let isMenos24h = false;
      if (emb.horaStr && /^\d{2}:\d{2}/.test(emb.horaStr)) {
        const dataHoraObj = new Date(`${emb.dataStr}T${emb.horaStr}:00`);
        if (!isNaN(dataHoraObj.getTime())) {
          const diffMs = dataHoraObj.getTime() - agora.getTime();
          if (diffMs > -2 * 60 * 60 * 1000 && diffMs <= 24 * 60 * 60 * 1000) {
            isMenos24h = true;
          }
        }
      } else {
        if (emb.dataStr === hojeDataIso || emb.dataStr === amanhaDataIso) {
          isMenos24h = true;
        }
      }

      if (isMenos24h) {
        embarqueUrgenteSemContato = emb;
        break;
      }
    }

    if (embarqueUrgenteSemContato) {
      const pen = 25;
      score -= pen;
      itens.push({
        id: 'p3-contato-pre-embarque-24h',
        pilar: 3,
        pilarNome: 'Governança & Financeiro',
        titulo: 'Contato Pré-Embarque Urgente (< 24h)',
        descricaoHumana: `Embarque em menos de 24h (${embarqueUrgenteSemContato.rotulo}) sem contato de pré-embarque confirmado com o passageiro.`,
        penalidadePontos: pen,
        resolvido: false,
        acaoTipo: 'abrir_pre_embarque',
        acaoRotulo: '✈️ Realizar Contato Pré-Embarque',
        acaoWhatsAppTexto: `Olá, ${cliente?.nome ? cliente.nome.split(' ')[0] : 'Passageiro'}! Falta muito pouco para o seu embarque rumo a ${viagem.destino || 'seu destino'}! ✈️ Passando para desejar uma excelente viagem e confirmar se está tudo certo com seus vouchers, check-in e malas. Qualquer dúvida de última hora, conte com o nosso suporte!`
      });
    }


    // PILAR 4: Cobertura Inteligente de Roteiro (Peso 15%)
    if (!temVoucherGeral && !isGracePeriod) {
      const hoteis = produtos.filter(p => (p.tipo || '').toLowerCase().includes('hotel') || (p.tipo || '').toLowerCase().includes('hospedagem'));
      if (hoteis.length === 0 && tripDays > 2 && !isNacional) {
        const pen = 15;
        score -= pen;
        itens.push({
          id: 'p4-gap-hospedagem',
          pilar: 4,
          pilarNome: 'Cobertura de Roteiro',
          titulo: 'Viagem sem Hospedagem Cadastrada',
          descricaoHumana: `Viagem internacional de ${tripDays} dias sem nenhuma reserva de hospedagem vinculada.`,
          penalidadePontos: pen,
          resolvido: false,
          acaoTipo: 'anexar_voucher_geral',
          acaoRotulo: '🏨 Anexar Voucher / Pacote'
        });
      }

      const temSeguro = temAnexoSeguro || produtos.some(p => (p.tipo || '').toLowerCase().includes('seguro'));
      if (!isNacional && !temSeguro) {
        if (exigenciasDestino.seguroObrigatorio) {
          // Espaço Schengen: Seguro médico de 30.000€ exigido por lei
          const pen = 25;
          score -= pen;
          itens.push({
            id: 'p4-seguro-schengen-ausente',
            pilar: 4,
            pilarNome: 'Cobertura de Roteiro',
            titulo: 'Seguro Obrigatório Espaço Schengen Ausente (30.000€)',
            descricaoHumana: 'Viagem para a Europa sem apólice emitida. O Tratado de Schengen exige seguro viagem com assistência médica de no mínimo 30.000 Euros sob pena de recusa na imigração.',
            penalidadePontos: pen,
            resolvido: false,
            acaoTipo: 'anexar_voucher',
            acaoRotulo: '🛡️ Emitir Seguro Obrigatório (30k€)',
            acaoWhatsAppTexto: `Olá, ${cliente?.nome ? cliente.nome.split(' ')[0] : 'Passageiro'}! Lembramos que para a entrada no Espaço Schengen (${viagem.destino || 'Europa'}), as autoridades de fronteira exigem seguro viagem internacional com cobertura médica mínima de 30.000 Euros. Vamos providenciar a sua emissão para viajar 100% blindado?`
          });
        } else {
          const pen = 10;
          score -= pen;
          itens.push({
            id: 'p4-seguro-ausente',
            pilar: 4,
            pilarNome: 'Cobertura de Roteiro',
            titulo: 'Sem Seguro Viagem Internacional',
            descricaoHumana: 'Viagem internacional sem apólice de seguro viagem contratada ou anexada.',
            penalidadePontos: pen,
            resolvido: false,
            acaoTipo: 'anexar_voucher',
            acaoRotulo: '🛡️ Vincular Seguro Viagem'
          });
        }
      }
    }

    // PILAR 5: Qualidade Cadastral do Cliente (Peso 10%)
    const temDocumentoValido = Boolean(cliente?.documento || temAnexoDocNacional || temAnexoPassaporte);
    if (cliente && (!temDocumentoValido || !cliente.telefone || !cliente.email)) {
      const pen = 10;
      score -= pen;
      itens.push({
        id: 'p5-dados-cliente',
        pilar: 5,
        pilarNome: 'Qualidade Cadastral',
        titulo: 'Dados Cadastrais Incompletos',
        descricaoHumana: 'Perfil do cliente sem CPF/RG/Passaporte anexado, telefone de contato ou e-mail cadastrado.',
        penalidadePontos: pen,
        resolvido: false,
        acaoTipo: 'preencher_passaporte',
        acaoRotulo: '👤 Completar Perfil do Cliente',
        acaoWhatsAppTexto: `Olá, ${cliente?.nome ? cliente.nome.split(' ')[0] : 'Passageiro'}! Tudo bem? Estamos atualizando os cadastros da agência para a emissão segura dos vouchers da sua viagem para ${viagem.destino || 'seu destino'}. Poderia nos confirmar seu CPF/RG e e-mail para envio da documentação? Obrigado!`
      });
    }

    // Aplicação de Risco Justificado (Se aprovado pelo gerente)
    if (viagem.risk_score_justificativa) {
      score = Math.min(100, score + 25);
    }

    // Garantir intervalo entre 0 e 100
    const finalScore = Math.max(0, Math.min(100, score));

    // Determinar Nível e Identidade Visual
    let nivel: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    let corHex = '#10b981';
    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40';
    let fraseStatus = 'Viagem 100% blindada para você curtir seu fim de semana sem emergências! 🛡️';

    const limiteCritico = settings?.risk_score_limite_critico || 50;

    if (finalScore < limiteCritico) {
      nivel = 'vermelho';
      corHex = '#ef4444';
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40 animate-pulse';
      fraseStatus = 'Atenção! Pendências críticas exigem resolução antes do embarque.';
    } else if (finalScore < 80) {
      nivel = 'amarelo';
      corHex = '#f59e0b';
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40';
      fraseStatus = 'Acompanhe as pendências operacionais médias para atingir nível máximo de segurança.';
    }

    if (isGracePeriod && finalScore >= 70) {
      fraseStatus = '🟢 Viagem dentro do prazo (Aguardando janela de fornecedores de até 60 dias do embarque).';
    }

    return {
      score: finalScore,
      nivel,
      corHex,
      badgeClass,
      fraseStatus,
      isGracePeriod,
      gracePeriodMensagem: isGracePeriod ? `Faltam ${daysToDeparture} dias para o embarque. A cobrança fina de vouchers inicia nos últimos ${carenciaDias} dias.` : undefined,
      itens,
      historico: [],
      exigenciasDestino
    };

  }

  /**
   * Salva o comprovante de voucher unificado da operadora (Pacote Completo)
   */
  public static async salvarVoucherGeralPacote(viagemId: string, urlPdf: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('viagens').update({
        voucher_geral_pacote: urlPdf,
        voucher_geral_anexado: true
      }).eq('id', viagemId);

      if (!error) return true;

      // Fallback: se as colunas específicas não existirem, anexa com segurança nas observações
      console.warn('Tentando salvar voucher nas observações da viagem:', error.message);
      const { data: vData } = await supabase.from('viagens').select('observacoes').eq('id', viagemId).single();
      const currentObs = vData?.observacoes || '';
      const novoObs = `${currentObs}\n[VOUCHER_GERAL]: ${urlPdf}`.trim();
      const { error: errObs } = await supabase.from('viagens').update({ observacoes: novoObs }).eq('id', viagemId);
      return !errObs;
    } catch (err) {
      console.error('Erro ao salvar voucher geral:', err);
      return false;
    }
  }

  /**
   * Registra justificativa técnica para atenuar o Risco Operacional
   */
  public static async registrarJustificativaRisco(viagemId: string, justificativa: string, autorNome: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('viagens').update({
        risk_score_justificativa: justificativa,
        risk_score_justificado_por: autorNome,
        risk_score_justificado_em: new Date().toISOString()
      }).eq('id', viagemId);

      if (!error) return true;

      // Fallback: se as colunas específicas não existirem, anexa nas observações
      console.warn('Tentando salvar justificativa de risco nas observações da viagem:', error.message);
      const { data: vData } = await supabase.from('viagens').select('observacoes').eq('id', viagemId).single();
      const currentObs = vData?.observacoes || '';
      const novoObs = `${currentObs}\n[JUSTIFICATIVA_RISCO - ${autorNome}]: ${justificativa}`.trim();
      const { error: errObs } = await supabase.from('viagens').update({ observacoes: novoObs }).eq('id', viagemId);
      return !errObs;
    } catch (err) {
      console.error('Erro ao registrar justificativa de risco:', err);
      return false;
    }
  }
}
