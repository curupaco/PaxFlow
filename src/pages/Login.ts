import { loginConsultor, supabase } from '../services/supabase';
import { PerfilConsultor } from '../types';

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
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-indigo-950/20 transition-colors duration-200 animate-fade-in">
        <div class="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col gap-6 relative overflow-hidden transition-all duration-300" id="login-card">
          
          <!-- Detalhe decorativo de gradiente no topo -->
          <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

          <!-- Cabeçalho de Identidade -->
          <div class="text-center flex flex-col items-center select-none">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-16 w-16 object-contain mb-4 filter drop-shadow-xl" />
            <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight" id="login-title">Entrar no PaxFlow</h2>
            <p class="text-xs text-slate-400 dark:text-slate-505 font-semibold mt-1.5" id="login-subtitle">Painel Operacional</p>
          </div>

          <div id="login-error-container" class="hidden px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/50">
            <!-- Container de Erro -->
          </div>

          <!-- Formulário de Login -->
          <div id="login-form-wrapper" class="transition-all duration-300">
            <form id="form-login" class="space-y-4.5">
               <div>
                 <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail do Consultor *</label>
                 <input id="input-login-email" type="email" required autocomplete="username" placeholder="seuemail@agencia.com" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
               </div>

               <div>
                 <div class="flex items-center justify-between mb-1.5 select-none">
                   <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Senha de Acesso *</label>
                   <button type="button" id="btn-esqueci-senha" class="text-[10px] font-extrabold text-indigo-655 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-350 transition hover:underline focus:outline-none uppercase tracking-wide">Esqueci minha senha</button>
                 </div>
                 <input id="input-login-password" type="password" required autocomplete="current-password" placeholder="••••••••" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
               </div>

              <button type="submit" id="btn-login-submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase mt-2.5 flex items-center justify-center">
                Acessar Painel
              </button>
            </form>
          </div>

          <!-- Formulário de Recuperação de Senha (Oculto por padrão) -->
          <div id="recovery-form-wrapper" class="hidden transition-all duration-300">
            <form id="form-recovery" class="space-y-4.5">
               <p class="text-xs text-slate-500 dark:text-slate-450 font-semibold leading-relaxed mb-1.5">
                 Esqueceu sua senha? Insira o e-mail cadastrado e enviaremos um link seguro de redefinição através do Supabase Auth.
               </p>
               <div>
                 <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail Cadastrado *</label>
                 <input id="input-recovery-email" type="email" required autocomplete="email" placeholder="seuemail@agencia.com" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
               </div>

              <button type="submit" id="btn-recovery-submit" class="w-full py-3 bg-indigo-655 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase mt-2 flex items-center justify-center">
                Enviar E-mail de Recuperação
              </button>
              <button type="button" id="btn-back-to-login" class="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-extrabold text-xs rounded-xl border border-slate-200/50 dark:border-slate-700/50 transition uppercase tracking-wider mt-1 flex items-center justify-center">
                Voltar ao Login
              </button>
            </form>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
            <span class="text-[10px] text-slate-400 dark:text-slate-505 font-medium">PaxFlow &bull; Sistema Restrito e Criptografado</span>
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
        errorContainer.textContent = err.message || 'Erro ao enviar e-mail de recuperação.';
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
          throw new Error(error?.message || 'E-mail ou senha inválidos.');
        }

        this.options.onLoginSuccess(user, perfil);

      } catch (err: any) {
        btn.disabled = false;
        btn.textContent = 'Acessar Painel';
        errorContainer.className = 'px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/50';
        errorContainer.textContent = err.message || 'Erro inesperado no servidor.';
      }
    });
  }
}
