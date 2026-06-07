import { PerfilConsultor } from '../../types';
import { getAvatarSvg, AVATAR_OPTIONS, salvarAvatarLocal } from '../../services/avatars';
import { supabase, atualizarSenhaAtual } from '../../services/supabase';
import { showCustomAlert } from '../../services/dialog';

export interface MeuPerfilModalOptions {
  perfil: PerfilConsultor;
  onProfileUpdated: (nome: string, avatar_url: string) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export class MeuPerfilModal {
  /**
   * Abre o modal premium de edição de perfil de consultor ("Meu Perfil")
   */
  static open(options: MeuPerfilModalOptions): void {
    const perfil = options.perfil;
    const overlay = document.createElement('div');
    overlay.id = 'meu-perfil-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    let selectedAvatarId = perfil.avatar_url || '';

    // Grade de seleção de avatares com efeito ativo e hover de zoom
    const renderAvatarsHtml = () => {
      let html = '';
      
      // Se o usuário possui uma foto customizada de perfil, exibe como a primeira opção na grade
      if (perfil.avatar_url && (perfil.avatar_url.startsWith('http') || perfil.avatar_url.startsWith('/') || perfil.avatar_url.startsWith('data:'))) {
        const isSelected = selectedAvatarId === perfil.avatar_url;
        html += `
          <button type="button" data-avatar-id="${perfil.avatar_url}" class="btn-select-avatar w-12 h-12 p-0.5 rounded-xl border-2 transition duration-200 transform hover:scale-110 relative flex items-center justify-center overflow-hidden ${
            isSelected 
              ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20' 
              : 'border-transparent hover:border-slate-350 dark:hover:border-slate-750'
          }" title="Minha Foto Customizada">
            <img src="${perfil.avatar_url}" alt="Minha Foto" class="w-full h-full object-cover rounded-lg" />
            ${isSelected ? `<div class="absolute -top-1 -right-1 bg-indigo-600 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm z-10">✓</div>` : ''}
          </button>
        `;
      }

      html += AVATAR_OPTIONS.map(opt => {
        const isSelected = selectedAvatarId === opt.id;
        return `
          <button type="button" data-avatar-id="${opt.id}" class="btn-select-avatar w-12 h-12 p-0.5 rounded-xl border-2 transition duration-200 transform hover:scale-110 relative flex items-center justify-center ${
            isSelected 
              ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20' 
              : 'border-transparent hover:border-slate-350 dark:hover:border-slate-750'
          }" title="${opt.nome}">
            ${opt.svg}
            ${isSelected ? `<div class="absolute -top-1 -right-1 bg-indigo-600 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm">✓</div>` : ''}
          </button>
        `;
      }).join('');

      return html;
    };

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[440px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col relative max-h-[90vh] overflow-y-auto custom-scrollbar" id="meu-perfil-card">
        
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center gap-2">
          <div id="modal-profile-avatar-preview" class="cursor-pointer group relative rounded-xl overflow-hidden shadow-md">
            ${getAvatarSvg(selectedAvatarId, perfil.nome || 'Consultor', 'w-16 h-16')}
            <div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">Enviar Foto</div>
          </div>
          <input type="file" id="input-profile-photo-file" accept="image/*" class="hidden" />
          <button type="button" id="btn-upload-profile-photo" class="text-[9px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 font-extrabold px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition">
            📷 Enviar Foto Própria
          </button>
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug mt-1">Meu Perfil</h2>
          <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold">Escolha um animal ou envie sua própria foto</p>
        </div>

        <form id="form-meu-perfil" class="p-6 space-y-4">
          <!-- Grade de avatares -->
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Selecione uma Carinha de Animal *</label>
            <div class="grid grid-cols-6 gap-2.5 justify-items-center" id="modal-avatar-selection-grid">
              ${renderAvatarsHtml()}
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome Completo *</label>
            <input id="input-mp-nome" type="text" required autocomplete="name" value="${perfil.nome || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail de Login</label>
            <input id="input-mp-email" type="email" disabled autocomplete="username" value="${perfil.email || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850/50 rounded-lg text-slate-400 dark:text-slate-500 font-bold text-sm cursor-not-allowed select-none" />
            <p class="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">O e-mail é único para login e não pode ser reconfigurado.</p>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h3 class="text-xs font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mb-2.5">Alterar Minha Senha</h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Nova Senha</label>
                <input id="input-mp-senha" type="password" minlength="6" autocomplete="new-password" placeholder="Mín. 6 dígitos" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Confirmar Senha</label>
                <input id="input-mp-senha-confirm" type="password" minlength="6" autocomplete="new-password" placeholder="Confirme a senha" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-mp-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold text-xs rounded-xl transition uppercase">
              Cancelar
            </button>
            <button id="btn-mp-submit" type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20 uppercase tracking-wider flex items-center justify-center">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Fade-in
    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('meu-perfil-card')?.classList.remove('scale-95');
      document.getElementById('meu-perfil-card')?.classList.add('scale-100');
    }, 10);

    const closeMPModal = () => {
      const card = document.getElementById('meu-perfil-card');
      if (card) {
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
      }
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('btn-mp-cancel')?.addEventListener('click', closeMPModal);

    // Adiciona evento na grade de seleção de avatares com reatividade premium
    const setupAvatarGridEvents = () => {
      const grid = overlay.querySelector('#modal-avatar-selection-grid') as HTMLElement;
      const preview = overlay.querySelector('#modal-profile-avatar-preview') as HTMLElement;
      const nomeInput = overlay.querySelector('#input-mp-nome') as HTMLInputElement;

      grid.querySelectorAll('.btn-select-avatar').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedAvatarId = btn.getAttribute('data-avatar-id') || '';
          
          // Re-renderiza grade para atualizar borda
          grid.innerHTML = renderAvatarsHtml();
          // Atualiza visualização de pré-exibição
          preview.innerHTML = getAvatarSvg(selectedAvatarId, nomeInput?.value || 'Consultor', 'w-16 h-16');
          
          setupAvatarGridEvents();
        });
      });
    };

    setupAvatarGridEvents();

    // Ouvinte para manter o preview do avatar atualizado dinamicamente enquanto digita
    const nomeInput = overlay.querySelector('#input-mp-nome') as HTMLInputElement;
    nomeInput?.addEventListener('input', () => {
      const preview = overlay.querySelector('#modal-profile-avatar-preview') as HTMLElement;
      preview.innerHTML = getAvatarSvg(selectedAvatarId, nomeInput.value || 'Consultor', 'w-16 h-16');
    });

    // Ouvintes para o upload de foto customizada de perfil
    const btnUpload = overlay.querySelector('#btn-upload-profile-photo') as HTMLButtonElement;
    const fileInput = overlay.querySelector('#input-profile-photo-file') as HTMLInputElement;
    const preview = overlay.querySelector('#modal-profile-avatar-preview') as HTMLElement;

    const triggerFileSelect = () => fileInput?.click();
    btnUpload?.addEventListener('click', triggerFileSelect);
    preview?.addEventListener('click', triggerFileSelect);

    fileInput?.addEventListener('change', async () => {
      const files = fileInput.files;
      if (files && files.length > 0) {
        const file = files[0];
        try {
          btnUpload.disabled = true;
          btnUpload.textContent = 'Processando...';

          // 1. Redimensionar e comprimir imagem via Canvas
          const { comprimirAvatarImage, uploadAvatarSupabase } = await import('../../services/avatars');
          const compressedBlob = await comprimirAvatarImage(file);
          
          btnUpload.textContent = 'Enviando...';
          // 2. Fazer upload para o Supabase Storage
          const fileExt = file.name.split('.').pop() || 'jpg';
          const url = await uploadAvatarSupabase(perfil.id, compressedBlob, fileExt);
          
          // 3. Atualizar localmente a foto selecionada
          selectedAvatarId = url;
          perfil.avatar_url = url; // Atualiza a ficha localmente para que o seletor funcione
          
          // 4. Atualizar o preview do modal
          preview.innerHTML = getAvatarSvg(selectedAvatarId, nomeInput.value || 'Consultor', 'w-16 h-16');
          
          // 5. Atualizar a grade de avatares para incluir a nova foto customizada
          const grid = overlay.querySelector('#modal-avatar-selection-grid') as HTMLElement;
          if (grid) {
            grid.innerHTML = renderAvatarsHtml();
            setupAvatarGridEvents();
          }

          options.showToast('Foto de perfil carregada com sucesso!', 'success');
        } catch (err: any) {
          console.error('Erro no upload da foto de perfil:', err);
          options.showToast(`Falha no upload: ${err.message || err}`, 'error');
        } finally {
          btnUpload.disabled = false;
          btnUpload.textContent = '📷 Enviar Foto Própria';
        }
      }
    });

    // Enviar formulário
    const form = overlay.querySelector('#form-meu-perfil') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-mp-submit') as HTMLButtonElement;
      const nomeVal = nomeInput.value.trim();
      const senhaVal = (overlay.querySelector('#input-mp-senha') as HTMLInputElement).value;
      const senhaConfirmVal = (overlay.querySelector('#input-mp-senha-confirm') as HTMLInputElement).value;

      if (!nomeVal) return;

      if (senhaVal) {
        if (senhaVal.length < 6) {
          await showCustomAlert('A nova senha deve conter pelo menos 6 caracteres.', 'Senha Curta');
          return;
        }
        if (senhaVal !== senhaConfirmVal) {
          await showCustomAlert('A confirmação de senha não coincide com a nova senha.', 'Confirmação Incorreta');
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';

      try {
        const isOffline = supabase.from === undefined || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !import.meta.env.VITE_SUPABASE_URL);

        salvarAvatarLocal(perfil.id, selectedAvatarId);

        if (!isOffline) {
          // 1. Persiste dados na tabela public profiles
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({ nome: nomeVal, avatar_url: selectedAvatarId })
            .eq('id', perfil.id);

          if (profileErr) throw profileErr;

          // 2. Atualiza os metadados do Supabase Auth
          const { error: authMetaErr } = await supabase.auth.updateUser({
            data: { nome: nomeVal, avatar_url: selectedAvatarId }
          });

          if (authMetaErr) {
            console.warn('Falha parcial ao atualizar metadados de autenticação:', authMetaErr);
          }

          // 3. Atualiza senha se solicitada
          if (senhaVal) {
            const { error: passwordErr } = await atualizarSenhaAtual(senhaVal);
            if (passwordErr) throw passwordErr;
          }
        }

        // Executa callback de sucesso
        options.onProfileUpdated(nomeVal, selectedAvatarId);
        options.showToast('Perfil atualizado com sucesso!', 'success');
        closeMPModal();

      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Alterações';
        await showCustomAlert(`Erro ao atualizar perfil:\n\n${err.message || err}`, 'Erro no Perfil');
      }
    });
  }
}
