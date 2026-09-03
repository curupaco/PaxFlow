import { supabase } from '../../services/supabase';
import { Viagem, Cliente, ProdutoViagem, GlobalSettings, RiskScoreResult, RiskItem } from '../../types';
import { RiskScoreService } from '../../services/riskScoreService';
import { showCustomAlert, showCustomConfirm, showCustomPrompt } from '../../services/dialog';
import { registrarXp } from '../../services/gamification';
import { showBadgeCelebrationModal } from '../../utils/celebrations';

import { isRiskScoreEnabled } from '../../utils/featureFlags';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class RiskDiagnosisDrawer {
  private static drawerId = 'paxflow-risk-drawer';

  public static async open(viagemId: string, user: any, perfil: any, onUpdate?: () => void): Promise<void> {
    // Fecha qualquer gaveta existente imediatamente de forma síncrona para evitar race condition no DOM
    this.close(true);

    // 1. Carregar dados da viagem, cliente, produtos e settings
    let viagem: Viagem | null = null;
    let cliente: Cliente | null = null;
    let produtos: ProdutoViagem[] = [];
    let settings: GlobalSettings | null = null;

    try {
      const { data: vData } = await supabase.from('viagens').select('*, cliente:clientes(*), produtos:produtos_viagem(*)').eq('id', viagemId).single();
      if (vData) {
        viagem = vData;
        cliente = vData.cliente || null;
        produtos = vData.produtos || [];
      }

      const { data: sData } = await supabase.from('global_settings').select('*').limit(1).maybeSingle();
      settings = sData || null;
    } catch (err) {
      console.warn('Erro ao carregar dados do Risk Score. Utilizando fallback local.', err);
    }

    if (!isRiskScoreEnabled(user, perfil, settings)) {
      showCustomAlert('O recurso Risk Score™ encontra-se desativado nas configurações globais.', 'Recurso Desativado');
      return;
    }

    if (!viagem) {
      showCustomAlert('Não foi possível carregar os dados da viagem.', 'Erro');
      return;
    }

    const diagnosis = RiskScoreService.calculateTripRiskScore(viagem, cliente, produtos, settings, user, perfil);

    // 2. Criar HTML do Drawer
    const backdrop = document.createElement('div');
    backdrop.id = `${this.drawerId}-backdrop`;
    backdrop.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 transition-opacity duration-300 opacity-0';

    const drawer = document.createElement('div');
    drawer.id = this.drawerId;
    drawer.className = 'fixed inset-y-0 right-0 w-full sm:w-[520px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transform translate-x-full transition-transform duration-300 ease-out border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100';

    const isGreen = diagnosis.nivel === 'verde';
    const isRed = diagnosis.nivel === 'vermelho';

    drawer.innerHTML = `
      <!-- Cabeçalho com Safe Area -->
      <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner" style="background-color: ${diagnosis.corHex}15; color: ${diagnosis.corHex};">
            🛡️
          </div>
          <div>
            <h3 class="text-base font-black tracking-tight text-slate-800 dark:text-slate-100">Diagnóstico de Risco PaxFlow™</h3>
            <p class="text-xs text-slate-400 font-semibold">${escapeHtml(viagem.destino)} — ${cliente ? escapeHtml(cliente.nome) : 'Cliente Sem Perfil'}</p>
          </div>
        </div>
        <button id="btn-close-risk-drawer" class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          ✕
        </button>
      </div>

      <!-- Conteúdo Rolável -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        <!-- Big Score Card -->
        <div class="p-6 rounded-3xl border ${isRed ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' : isGreen ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40' : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'} flex flex-col items-center text-center relative overflow-hidden shadow-sm">
          
          <div class="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3 ${diagnosis.badgeClass}">
            ${diagnosis.isGracePeriod ? '🟢 Dentro do Prazo Operacional' : diagnosis.nivel.toUpperCase() + ' RISCO'}
          </div>

          <div class="relative mb-2">
            <span class="text-5xl font-black tracking-tight" style="color: ${diagnosis.corHex};">
              ${diagnosis.score}
            </span>
            <span class="text-xs font-bold text-slate-400 tracking-wider">/100</span>
          </div>

          <p class="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-sm leading-relaxed mt-1">
            ${escapeHtml(diagnosis.fraseStatus)}
          </p>

          ${diagnosis.gracePeriodMensagem ? `
            <div class="mt-4 p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 font-medium border border-slate-200/50 dark:border-slate-700">
              💡 ${escapeHtml(diagnosis.gracePeriodMensagem)}
            </div>
          ` : ''}
        </div>

        <!-- Botão Ação Rápida: Voucher Geral da Operadora (Pacote Completo) -->
        <div class="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-center justify-between gap-3">
          <div class="pr-2">
            <strong class="block text-xs font-black text-indigo-900 dark:text-indigo-200">Voucher Geral da Operadora (PDF Único)</strong>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Anexe o PDF com Voo, Hotel e Transfer juntos para validar tudo em 1-clique.</p>
          </div>
          <input id="input-upload-voucher-geral" type="file" accept=".pdf,image/*" class="hidden" />
          <button id="btn-upload-voucher-geral" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition shrink-0 uppercase tracking-wider">
            ${viagem.voucher_geral_anexado ? '✅ Anexado' : '📁 Anexar PDF'}
          </button>
        </div>

        <!-- Lista de Pendências Detectadas -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-black uppercase tracking-wider text-slate-400">Diagnóstico Causa-Efeito (${diagnosis.itens.length} pendências)</h4>
            <span class="text-[10px] font-bold text-slate-400">Clique no botão para resolver</span>
          </div>

          ${diagnosis.itens.length === 0 ? `
            <div class="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center space-y-2">
              <span class="text-2xl">🎉</span>
              <h5 class="text-xs font-black text-slate-700 dark:text-slate-200">Zero Pendências Críticas!</h5>
              <p class="text-[11px] text-slate-400 font-medium">Esta viagem está com documentação, hospedagem e conferências 100% em dia.</p>
            </div>
          ` : diagnosis.itens.map((item: RiskItem) => `
            <div class="p-4 bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-2 hover:border-indigo-500/40 transition">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="inline-block text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md mb-1">
                    ${escapeHtml(item.pilarNome)}
                  </span>
                  <h5 class="text-xs font-black text-slate-800 dark:text-slate-100">${escapeHtml(item.titulo)}</h5>
                </div>
                <span class="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-lg shrink-0">
                  -${item.penalidadePontos} pts
                </span>
              </div>

              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                ${escapeHtml(item.descricaoHumana)}
              </p>

              <div class="pt-2 flex justify-end">
                <button data-action="${item.acaoTipo}" data-item-id="${item.id}" class="btn-resolve-risk-item px-3.5 py-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-white font-extrabold text-[11px] rounded-xl transition shadow-sm flex items-center gap-1.5">
                  ${escapeHtml(item.acaoRotulo)}
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Seção de Risco Justificado -->
        ${viagem.risk_score_justificativa ? `
          <div class="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl space-y-1">
            <strong class="block text-xs font-black text-amber-900 dark:text-amber-300">Justificativa Operacional Registrada ✍️</strong>
            <p class="text-xs text-amber-800/90 dark:text-amber-400 italic font-medium">"${escapeHtml(viagem.risk_score_justificativa)}"</p>
            <span class="block text-[9px] text-amber-700/70 dark:text-amber-500">Por ${escapeHtml(viagem.risk_score_justificado_por || 'Consultor')} em ${viagem.risk_score_justificado_em ? new Date(viagem.risk_score_justificado_em).toLocaleDateString('pt-BR') : ''}</span>
          </div>
        ` : `
          <div class="pt-2">
            <button id="btn-abrir-justificativa-risco" class="w-full py-2.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-500 hover:text-indigo-600 dark:text-slate-400 text-xs font-bold rounded-2xl transition text-center">
              ✍️ Registrar Justificativa Operacional de Exceção
            </button>
          </div>
        `}

      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    // Animação de entrada
    requestAnimationFrame(() => {
      backdrop.classList.remove('opacity-0');
      backdrop.classList.add('opacity-100');
      drawer.classList.remove('translate-x-full');
      drawer.classList.add('translate-x-0');
    });

    // Event listeners
    const handleClose = () => {
      this.close();
    };

    backdrop.addEventListener('click', handleClose);
    drawer.querySelector('#btn-close-risk-drawer')?.addEventListener('click', handleClose);

    // Handler de Upload de Voucher Geral
    const uploadInput = drawer.querySelector('#input-upload-voucher-geral') as HTMLInputElement;
    drawer.querySelector('#btn-upload-voucher-geral')?.addEventListener('click', () => {
      uploadInput?.click();
    });

    uploadInput?.addEventListener('change', async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      const jaTinhaVoucher = viagem?.voucher_geral_anexado;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Url = reader.result as string;
        const saved = await RiskScoreService.salvarVoucherGeralPacote(viagemId, base64Url);
        if (saved) {
          showCustomAlert('Voucher Geral da Operadora vinculado com sucesso!', 'Sucesso');
          
          // Recompensa de XP apenas se for a primeira vinculação
          if (!jaTinhaVoucher && user && user.id) {
            await registrarXp(user.id, 'BLINDAGEM_RISK_SCORE', 50);
            showBadgeCelebrationModal('Operador Blindado', '🛡️', 'Viagem 100% conformada!');
          }

          if (onUpdate) onUpdate();
          RiskDiagnosisDrawer.open(viagemId, user, perfil, onUpdate);
        }
      };
      reader.readAsDataURL(file);
    });

    // Handlers de Ações em 1-Clique nos Itens
    drawer.querySelectorAll('.btn-resolve-risk-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-action');
        
        if (action === 'conferir_operacional') {
          const jaConferido = viagem?.processo_conferido || viagem?.isProcessoConferido;
          await supabase.from('viagens').update({ processo_conferido: true, isProcessoConferido: true }).eq('id', viagemId);
          showCustomAlert('Conferência Operacional marcada como concluída!', 'Sucesso');
          
          if (!jaConferido && user && user.id) {
            await registrarXp(user.id, 'CONFERENCIA_RISK_SCORE', 50);
          }

          if (onUpdate) onUpdate();
          RiskDiagnosisDrawer.open(viagemId, user, perfil, onUpdate);
        } else if (action === 'anexar_voucher' || action === 'anexar_voucher_geral') {
          uploadInput?.click();
        } else if (action === 'vincular_loc' || action === 'preencher_passaporte') {
          // Abrir modal de edição da viagem para resolução rápida
          this.close(true);
          const { EditTravelModal } = await import('../dashboard/EditTravelModal');
          const editModal = new EditTravelModal({
            perfil,
            user,
            consultores: [],
            tiposProduto: [],
            viagens: viagem ? [viagem] : [],
            isFallbackMode: false,
            onUpdate: async () => {
              if (onUpdate) onUpdate();
              RiskDiagnosisDrawer.open(viagemId, user, perfil, onUpdate);
            },
            showToast: (msg) => showCustomAlert(msg, 'Aviso'),
            checkSLA: () => ({ alert: false, type: null, text: '' })
          });
          await editModal.open(viagemId);
        }

      });
    });

    // Handler de registrar justificativa com modal customizado
    drawer.querySelector('#btn-abrir-justificativa-risco')?.addEventListener('click', async () => {
      const text = await showCustomPrompt(
        'Digite a justificativa operacional de exceção para atenuar o risco desta viagem:',
        'Registrar Justificativa Operacional',
        viagem?.risk_score_justificativa || '',
        'Ex: Documentação validada manualmente direto com a operadora...'
      );
      if (text && text.trim()) {
        const ok = await RiskScoreService.registrarJustificativaRisco(viagemId, text.trim(), perfil?.nome || 'Consultor');
        if (ok) {
          showCustomAlert('Justificativa operacional registrada com sucesso!', 'Sucesso');
          if (onUpdate) onUpdate();
          RiskDiagnosisDrawer.open(viagemId, user, perfil, onUpdate);
        }
      }
    });
  }

  public static close(immediate = false): void {
    const drawer = document.getElementById(this.drawerId);
    const backdrop = document.getElementById(`${this.drawerId}-backdrop`);

    if (drawer) {
      drawer.id = `${this.drawerId}-closing`;
      if (immediate) {
        drawer.remove();
      } else {
        drawer.classList.remove('translate-x-0');
        drawer.classList.add('translate-x-full');
        setTimeout(() => drawer.remove(), 300);
      }
    }

    if (backdrop) {
      backdrop.id = `${this.drawerId}-backdrop-closing`;
      if (immediate) {
        backdrop.remove();
      } else {
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');
        setTimeout(() => backdrop.remove(), 300);
      }
    }
  }
}
