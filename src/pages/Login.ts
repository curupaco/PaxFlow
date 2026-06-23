import { loginConsultor, supabase } from '../services/supabase';
import { PerfilConsultor } from '../types';
import { traduzirErro } from '../utils/errorTranslator';

export interface LoginPageOptions {
  onLoginSuccess: (user: any, perfil: PerfilConsultor | null) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export class LoginPage {
  private container: HTMLElement;
  private options: LoginPageOptions;

  constructor(container: HTMLElement, options: LoginPageOptions) {
    this.container = container;
    this.options = options;
  }

  /**
   * Renderiza a tela de login premium com recuperação de senha acoplada
   */
  public init(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-[#0b0f19] dark:to-[#0f172a] transition-colors duration-200 relative overflow-hidden animate-fade-in">
        
        <!-- Glowing background blobs -->
        <div class="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div class="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style="animation-delay: 3s;"></div>

        <!-- Botão de Alternância de Tema Flutuante -->
        <div class="absolute top-4 right-4 z-50">
          <button id="theme-toggle-btn" class="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-lg hover:shadow-xl backdrop-blur-md transition duration-200 flex items-center justify-center focus:outline-none" title="Alternar Tema">
            <!-- Lua -->
            <svg class="theme-icon-light w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <!-- Sol -->
            <svg class="theme-icon-dark w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>
        </div>

        <!-- Card de Login -->
        <div class="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-8 sm:p-10 rounded-[2rem] shadow-[0_24px_64px_-16px_rgba(79,70,229,0.08)] flex flex-col gap-7 relative overflow-hidden transition-all duration-300 z-10" id="login-card">
          
          <!-- Detalhe decorativo de gradiente no topo -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-700"></div>

          <!-- Cabeçalho de Identidade (Centralizado) -->
          <div class="text-center flex flex-col items-center select-none">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-16 w-16 object-contain mb-3 filter drop-shadow-[0_4px_12px_rgba(79,70,229,0.2)]" />
            <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight" id="login-title">Entrar no PaxFlow</h2>
            <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1" id="login-subtitle">Digite suas credenciais para acessar o painel operacional restrito.</p>
          </div>

          <div id="login-error-container" class="hidden px-4 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/40 animate-shake">
            <!-- Container de Erro -->
          </div>

          <!-- Formulário de Login -->
          <div id="login-form-wrapper" class="transition-all duration-300">
            <form id="form-login" class="space-y-5">
               <div>
                 <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 select-none">E-mail do Consultor *</label>
                 <div class="relative">
                   <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                     <!-- Icone Email -->
                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                       <path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                     </svg>
                   </div>
                   <input id="input-login-email" type="email" required autocomplete="username" placeholder="nome@agencia.com" class="w-full pl-10 pr-4 py-3 border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-slate-950/30 dark:hover:bg-slate-950/50 dark:focus:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
                 </div>
               </div>

               <div>
                 <div class="flex items-center justify-between mb-2 select-none">
                   <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Senha de Acesso *</label>
                   <button type="button" id="btn-esqueci-senha" class="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-400 transition hover:underline focus:outline-none uppercase tracking-wider">Esqueceu?</button>
                 </div>
                 <div class="relative">
                   <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                     <!-- Icone Cadeado -->
                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                       <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                     </svg>
                   </div>
                   <input id="input-login-password" type="password" required autocomplete="current-password" placeholder="••••••••" class="w-full pl-10 pr-4 py-3 border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-slate-950/30 dark:hover:bg-slate-950/50 dark:focus:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
                 </div>
               </div>

               <button type="submit" id="btn-login-submit" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all uppercase mt-2.5 flex items-center justify-center gap-2">
                 <span>Entrar no Sistema</span>
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                 </svg>
               </button>
            </form>
          </div>

          <!-- Formulário de Recuperação de Senha (Oculto por padrão) -->
          <div id="recovery-form-wrapper" class="hidden transition-all duration-300">
            <form id="form-recovery" class="space-y-5">
               <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-1.5">
                 Informe seu e-mail cadastrado. Enviaremos as instruções de recuperação e o link de redefinição para que você possa cadastrar uma nova senha.
               </p>
               <div>
                 <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 select-none">E-mail Cadastrado *</label>
                 <div class="relative">
                   <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                       <path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                     </svg>
                   </div>
                   <input id="input-recovery-email" type="email" required autocomplete="email" placeholder="nome@agencia.com" class="w-full pl-10 pr-4 py-3 border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-slate-950/30 dark:hover:bg-slate-950/50 dark:focus:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
                 </div>
               </div>

               <button type="submit" id="btn-recovery-submit" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition-all uppercase mt-2.5 flex items-center justify-center">
                 Enviar E-mail de Recuperação
               </button>
               <button type="button" id="btn-back-to-login" class="w-full py-3 bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold text-xs rounded-xl transition uppercase tracking-wider flex items-center justify-center">
                 Voltar ao Login
               </button>
            </form>
          </div>

          <!-- Rodapé do Card -->
          <div class="border-t border-slate-100 dark:border-slate-800/80 pt-5 text-center select-none">
            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">PaxFlow &bull; Sistema Restrito e Criptografado</span>
          </div>

        </div>
      </div>
    `;

    // Seleção de Elementos
    const loginWrapper = document.getElementById('login-form-wrapper') as HTMLElement;
    const recoveryWrapper = document.getElementById('recovery-form-wrapper') as HTMLElement;
    const loginTitle = document.getElementById('login-title') as HTMLElement;
    const loginSubtitle = document.getElementById('login-subtitle') as HTMLElement;
    const errorContainer = document.getElementById('login-error-container') as HTMLElement;

    // Alternar para Esqueci minha senha
    document.getElementById('btn-esqueci-senha')?.addEventListener('click', () => {
      loginWrapper.classList.add('hidden');
      recoveryWrapper.classList.remove('hidden');
      loginTitle.textContent = 'Recuperar Senha';
      loginSubtitle.textContent = 'Redefinição de acesso seguro';
      errorContainer.className = 'hidden';
      errorContainer.innerHTML = '';
    });

    // Alternar de volta para Login
    document.getElementById('btn-back-to-login')?.addEventListener('click', () => {
      recoveryWrapper.classList.add('hidden');
      loginWrapper.classList.remove('hidden');
      loginTitle.textContent = 'Entrar no PaxFlow';
      loginSubtitle.textContent = 'Painel Operacional';
      errorContainer.className = 'hidden';
      errorContainer.innerHTML = '';
    });

    // Submit de Recuperação de Senha
    const formRecovery = document.getElementById('form-recovery') as HTMLFormElement;
    formRecovery?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-recovery-submit') as HTMLButtonElement;
      const email = (document.getElementById('input-recovery-email') as HTMLInputElement).value.trim();

      if (!email) return;

      btn.disabled = true;
      btn.textContent = 'Enviando link...';
      errorContainer.className = 'hidden';

      const isSandboxMode = supabase.auth.getSession === undefined || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !import.meta.env.VITE_SUPABASE_URL);

      try {
        if (isSandboxMode) {
          // Simula redefinição no ambiente sandbox offline
          await new Promise((resolve) => setTimeout(resolve, 1200));
          this.options.showToast('E-mail simulado de redefinição enviado!', 'success');
        } else {
          // Envia e-mail real via Supabase
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
          });
          if (error) throw error;
        }

        // Sucesso na recuperação
        recoveryWrapper.innerHTML = `
          <div class="py-4 text-center space-y-4 animate-fade-in">
            <div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-2xl flex items-center justify-center text-xl border border-emerald-100 dark:border-emerald-900/40 mx-auto">
              ✉️
            </div>
            <div>
              <h4 class="text-sm font-black text-slate-800 dark:text-slate-100">Instruções Enviadas!</h4>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
                Enviamos um e-mail de redefinição para <strong class="text-slate-700 dark:text-slate-300">${email}</strong> com o link seguro. Verifique também a pasta de spam.
              </p>
            </div>
            <button type="button" id="btn-success-back-to-login" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">
              Voltar ao Login
            </button>
          </div>
        `;

        document.getElementById('btn-success-back-to-login')?.addEventListener('click', () => {
          this.init();
        });

      } catch (err: any) {
        btn.disabled = false;
        btn.textContent = 'Enviar E-mail de Recuperação';
        errorContainer.className = 'px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/50';
        errorContainer.textContent = traduzirErro(err);
      }
    });

    // Submit de Login
    const formLogin = document.getElementById('form-login') as HTMLFormElement;
    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = document.getElementById('btn-login-submit') as HTMLButtonElement;
      const email = (document.getElementById('input-login-email') as HTMLInputElement).value;
      const password = (document.getElementById('input-login-password') as HTMLInputElement).value;

      if (!email || !password) return;

      // Estado de Carregando
      btn.disabled = true;
      btn.textContent = 'Autenticando...';
      errorContainer.className = 'hidden';

      try {
        const { user, perfil, error } = await loginConsultor(email, password);

        if (error || !user) {
          throw new Error(traduzirErro(error));
        }

        this.options.onLoginSuccess(user, perfil);

      } catch (err: any) {
        btn.disabled = false;
        btn.textContent = 'Acessar Painel';
        errorContainer.className = 'px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/50';
        errorContainer.textContent = traduzirErro(err);
      }
    });
  }
}
