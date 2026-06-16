function getConfetti(): Promise<any> {
  return new Promise((resolve) => {
    if ((window as any).confetti) {
      resolve((window as any).confetti);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    script.onload = () => {
      resolve((window as any).confetti);
    };
    script.onerror = () => {
      console.warn('Falha ao carregar canvas-confetti do CDN');
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Primeiro tom
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);
    
    // Segundo tom (mais agudo)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
    
    // Terceiro tom (acorde triunfal)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(783.99, now + 0.2); // G5
    gain3.gain.setValueAtTime(0.15, now + 0.2);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.2);
    osc3.stop(now + 0.6);
  } catch (e) {
    console.warn('Falha ao tocar som de comemoração:', e);
  }
}

/**
 * Dispara uma animação de confetes na tela
 */
export async function triggerConfetti(): Promise<void> {
  const confetti = await getConfetti();
  if (confetti) {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
    
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0 }
      });
    }, 150);

    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1 }
      });
    }, 300);
  }
}

/**
 * Exibe o popup modal de subida de nível com visual premium
 */
export function showLevelUpModal(nivel: number, patente: string, emoji: string): void {
  const overlay = document.createElement('div');
  overlay.id = 'levelup-overlay';
  overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 transition-all duration-500 opacity-0';
  
  overlay.innerHTML = `
    <div class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl max-w-sm w-full rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl p-6 text-center transform scale-90 transition-all duration-500 flex flex-col items-center gap-4 relative overflow-hidden" id="levelup-card">
      
      <!-- Decorative background glow -->
      <div class="absolute -top-10 -left-10 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl animate-pulse"></div>
      <div class="absolute -bottom-10 -right-10 w-28 h-28 bg-purple-500/20 rounded-full blur-2xl animate-pulse"></div>

      <!-- Level badge emoji container -->
      <div class="relative w-24 h-24 flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full text-white shadow-xl shadow-indigo-500/30">
        <span class="text-4xl animate-bounce select-none">${emoji}</span>
        <span class="absolute -bottom-2 bg-indigo-600 dark:bg-indigo-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm leading-none flex items-center justify-center whitespace-nowrap">
          NÍVEL ${nivel}
        </span>
      </div>

      <!-- Content -->
      <div class="space-y-1.5 mt-2 z-10">
        <h2 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-300 tracking-tight leading-tight uppercase animate-pulse">SUBIU DE PATENTE!</h2>
        <p class="text-sm text-slate-650 dark:text-slate-350 font-semibold leading-relaxed">
          Você agora é um <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">${patente}</span>.
        </p>
      </div>

      <p class="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed max-w-[240px] z-10">
        Continue agindo conforme os processos da agência para subir mais patentes e colecionar medalhas!
      </p>

      <button id="btn-levelup-close" type="button" class="w-full mt-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl transition shadow-lg shadow-indigo-600/20 uppercase tracking-wider z-10">
        Sensacional!
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Fade-in e som
  setTimeout(() => {
    overlay.classList.add('opacity-100');
    const card = document.getElementById('levelup-card');
    card?.classList.remove('scale-90');
    card?.classList.add('scale-100');
    playChime();
    triggerConfetti();
  }, 50);

  const closeLevelUp = () => {
    const card = document.getElementById('levelup-card');
    card?.classList.remove('scale-100');
    card?.classList.add('scale-90');
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.remove(), 400);
  };

  document.getElementById('btn-levelup-close')?.addEventListener('click', closeLevelUp);
}
