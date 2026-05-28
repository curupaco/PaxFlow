export interface AvatarOption {
  id: string;
  nome: string;
  svg: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'lion',
    nome: 'Leão',
    svg: `<svg viewBox="0 0 100 100" class="w-full h-full">
      <defs>
        <linearGradient id="lionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
      </defs>
      <!-- Background -->
      <circle cx="50" cy="50" r="50" fill="url(#lionGrad)" />
      <!-- Mane (Juba) -->
      <path d="M 50,15 C 38,15 32,22 28,30 C 20,32 15,38 15,48 C 15,58 20,64 26,68 C 24,76 32,84 44,85 C 50,86 56,85 60,82 C 66,85 76,82 78,74 C 84,70 85,60 85,52 C 85,42 82,34 74,30 C 72,20 62,15 50,15 Z" fill="#d97706" />
      <path d="M 50,20 C 40,20 35,26 32,33 C 25,35 20,40 20,49 C 20,58 25,63 30,67 C 28,74 35,81 46,81 C 50,82 55,81 58,78 C 63,81 72,78 74,71 C 79,67 80,59 80,51 C 80,42 77,35 70,32 C 68,23 59,20 50,20 Z" fill="#b45309" />
      <!-- Ears -->
      <circle cx="34" cy="30" r="8" fill="#d97706" />
      <circle cx="66" cy="30" r="8" fill="#d97706" />
      <circle cx="34" cy="30" r="4.5" fill="#fef08a" />
      <circle cx="66" cy="30" r="4.5" fill="#fef08a" />
      <!-- Head -->
      <circle cx="50" cy="53" r="23" fill="#fef08a" />
      <!-- Inner Mane Face details -->
      <path d="M 33,48 Q 50,40 67,48" stroke="#f59e0b" stroke-width="2" fill="none" stroke-linecap="round" />
      <!-- Eyes -->
      <circle cx="42" cy="49" r="3" fill="#1e293b" />
      <circle cx="58" cy="49" r="3" fill="#1e293b" />
      <circle cx="43" cy="48" r="1" fill="#ffffff" />
      <circle cx="59" cy="48" r="1" fill="#ffffff" />
      <!-- Muzzle -->
      <ellipse cx="50" cy="59" rx="7.5" ry="5.5" fill="#ffffff" />
      <!-- Nose -->
      <path d="M 47,56.5 L 53,56.5 L 50,59.5 Z" fill="#b45309" stroke="#b45309" stroke-width="1.5" stroke-linejoin="round" />
      <!-- Mouth -->
      <path d="M 47,61.5 Q 50,63.5 50,61.5 Q 50,63.5 53,61.5" stroke="#1e293b" stroke-width="1.5" fill="none" stroke-linecap="round" />
      <!-- Whiskers -->
      <circle cx="45" cy="58" r="0.5" fill="#d97706" />
      <circle cx="46.5" cy="59" r="0.5" fill="#d97706" />
      <circle cx="53.5" cy="59" r="0.5" fill="#d97706" />
      <circle cx="55" cy="58" r="0.5" fill="#d97706" />
    </svg>`
  },
  {
    id: 'panda',
    nome: 'Panda',
    svg: `<svg viewBox="0 0 100 100" class="w-full h-full">
      <defs>
        <linearGradient id="pandaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#34d399" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <!-- Background -->
      <circle cx="50" cy="50" r="50" fill="url(#pandaGrad)" />
      <!-- Ears -->
      <circle cx="30" cy="31" r="11.5" fill="#1e293b" />
      <circle cx="70" cy="31" r="11.5" fill="#1e293b" />
      <circle cx="30" cy="31" r="6" fill="#0f172a" />
      <circle cx="70" cy="31" r="6" fill="#0f172a" />
      <!-- Head -->
      <circle cx="50" cy="54" r="27.5" fill="#ffffff" />
      <!-- Eye Patches -->
      <ellipse cx="40" cy="52.5" rx="8" ry="9.5" fill="#1e293b" transform="rotate(-12 40 52.5)" />
      <ellipse cx="60" cy="52.5" rx="8" ry="9.5" fill="#1e293b" transform="rotate(12 60 52.5)" />
      <!-- Eyes -->
      <circle cx="41" cy="51.5" r="2.5" fill="#ffffff" />
      <circle cx="59" cy="51.5" r="2.5" fill="#ffffff" />
      <circle cx="42" cy="50.5" r="1" fill="#000000" />
      <circle cx="58" cy="50.5" r="1" fill="#000000" />
      <!-- Blush -->
      <circle cx="28" cy="59" r="4.5" fill="#fbcfe8" opacity="0.75" />
      <circle cx="72" cy="59" r="4.5" fill="#fbcfe8" opacity="0.75" />
      <!-- Nose -->
      <ellipse cx="50" cy="58" rx="3.5" ry="2.5" fill="#0f172a" />
      <!-- Mouth -->
      <path d="M 47,61.5 Q 50,63.5 50,61.5 Q 50,63.5 53,61.5" stroke="#0f172a" stroke-width="1.5" fill="none" stroke-linecap="round" />
    </svg>`
  },
  {
    id: 'fox',
    nome: 'Raposa',
    svg: `<svg viewBox="0 0 100 100" class="w-full h-full">
      <defs>
        <linearGradient id="foxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
      </defs>
      <!-- Background -->
      <circle cx="50" cy="50" r="50" fill="url(#foxGrad)" />
      <!-- Ears -->
      <path d="M 23,43 L 26,18 L 43,36 Z" fill="#f97316" />
      <path d="M 77,43 L 74,18 L 57,36 Z" fill="#f97316" />
      <path d="M 26,41 L 28,23 L 40,36 Z" fill="#ea580c" />
      <path d="M 74,41 L 72,23 L 60,36 Z" fill="#ea580c" />
      <path d="M 28,39 L 29.5,27 L 37,36 Z" fill="#fee2e2" />
      <path d="M 72,39 L 70.5,27 L 63,36 Z" fill="#fee2e2" />
      <!-- Head Base -->
      <path d="M 50,78 C 30,78 22,58 22,46 C 22,39 25,36 34,36 C 45,36 47,38 50,38 C 53,38 55,36 66,36 C 75,36 78,39 78,46 C 78,58 70,78 50,78 Z" fill="#f97316" />
      <!-- White Cheeks -->
      <path d="M 50,78 C 40,78 23,73 23,55 C 23,46 25,44 32,44 C 40,44 47,56 50,56 C 53,56 60,44 68,44 C 75,44 77,46 77,55 C 77,73 60,78 50,78 Z" fill="#ffffff" />
      <!-- Inner Head Gradient/shadow -->
      <path d="M 50,38 Q 50,56 50,78" stroke="#ea580c" stroke-width="1" fill="none" opacity="0.3" />
      <!-- Eyes -->
      <circle cx="36" cy="48" r="3" fill="#1e293b" />
      <circle cx="64" cy="48" r="3" fill="#1e293b" />
      <circle cx="37" cy="47" r="1" fill="#ffffff" />
      <circle cx="65" cy="47" r="1" fill="#ffffff" />
      <!-- Blush -->
      <circle cx="28" cy="54" r="3.5" fill="#fecdd3" opacity="0.8" />
      <circle cx="72" cy="54" r="3.5" fill="#fecdd3" opacity="0.8" />
      <!-- Nose -->
      <circle cx="50" cy="62" r="3.5" fill="#0f172a" />
    </svg>`
  },
  {
    id: 'koala',
    nome: 'Coala',
    svg: `<svg viewBox="0 0 100 100" class="w-full h-full">
      <defs>
        <linearGradient id="koalaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#c084fc" />
          <stop offset="100%" stop-color="#7c3aed" />
        </linearGradient>
      </defs>
      <!-- Background -->
      <circle cx="50" cy="50" r="50" fill="url(#koalaGrad)" />
      <!-- Ears -->
      <circle cx="26" cy="40" r="16" fill="#94a3b8" />
      <circle cx="74" cy="40" r="16" fill="#94a3b8" />
      <circle cx="26" cy="40" r="12" fill="#cbd5e1" />
      <circle cx="74" cy="40" r="12" fill="#cbd5e1" />
      <circle cx="26" cy="40" r="8.5" fill="#fbcfe8" />
      <circle cx="74" cy="40" r="8.5" fill="#fbcfe8" />
      <!-- Fluff Details on Ears -->
      <path d="M 12,32 C 10,36 10,44 13,48" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M 88,32 C 90,36 90,44 87,48" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" />
      <!-- Head -->
      <circle cx="50" cy="54" r="26.5" fill="#cbd5e1" />
      <circle cx="50" cy="54" r="25" fill="#94a3b8" />
      <!-- Inner Ears Link -->
      <path d="M 33,42 Q 50,38 67,42" stroke="#64748b" stroke-width="1.5" fill="none" opacity="0.3" />
      <!-- Eyes -->
      <circle cx="39" cy="49" r="3" fill="#0f172a" />
      <circle cx="61" cy="49" r="3" fill="#0f172a" />
      <circle cx="40" cy="48" r="1" fill="#ffffff" />
      <circle cx="62" cy="48" r="1" fill="#ffffff" />
      <!-- Blush -->
      <circle cx="29" cy="56" r="3.5" fill="#fbcfe8" opacity="0.7" />
      <circle cx="71" cy="56" r="3.5" fill="#fbcfe8" opacity="0.7" />
      <!-- Nose (Large and dark) -->
      <rect x="44.5" y="47" width="11" height="17" rx="5.5" fill="#334155" />
      <rect x="46" y="48" width="8" height="15" rx="4" fill="#1e293b" />
      <ellipse cx="50" cy="51" rx="2" ry="1.2" fill="#64748b" opacity="0.4" />
      <!-- Mouth -->
      <path d="M 47,67.5 C 48.5,69 51.5,69 53,67.5" stroke="#0f172a" stroke-width="1.5" fill="none" stroke-linecap="round" />
    </svg>`
  },
  {
    id: 'rabbit',
    nome: 'Coelho',
    svg: `<svg viewBox="0 0 100 100" class="w-full h-full">
      <defs>
        <linearGradient id="rabbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f472b6" />
          <stop offset="100%" stop-color="#db2777" />
        </linearGradient>
      </defs>
      <!-- Background -->
      <circle cx="50" cy="50" r="50" fill="url(#rabbitGrad)" />
      <!-- Ears -->
      <rect x="29" y="10" width="10.5" height="34" rx="5.25" fill="#ffffff" transform="rotate(-6 34.25 27)" />
      <rect x="60.5" y="10" width="10.5" height="34" rx="5.25" fill="#ffffff" transform="rotate(6 65.75 27)" />
      <rect x="32" y="13.5" width="5.5" height="28" rx="2.75" fill="#fbcfe8" transform="rotate(-6 34.75 27.5)" />
      <rect x="62.5" y="13.5" width="5.5" height="28" rx="2.75" fill="#fbcfe8" transform="rotate(6 65.25 27.5)" />
      <!-- Head -->
      <circle cx="50" cy="55" r="26.5" fill="#ffffff" />
      <!-- Inner Ear Shadow -->
      <path d="M 33.5,43 Q 50,39 66.5,43" stroke="#f3f4f6" stroke-width="1.5" fill="none" />
      <!-- Eyes -->
      <circle cx="39" cy="50" r="3" fill="#1e293b" />
      <circle cx="61" cy="50" r="3" fill="#1e293b" />
      <circle cx="40" cy="49" r="1" fill="#ffffff" />
      <circle cx="62" cy="49" r="1" fill="#ffffff" />
      <!-- Blush -->
      <circle cx="28" cy="58" r="4.5" fill="#fbcfe8" opacity="0.8" />
      <circle cx="72" cy="58" r="4.5" fill="#fbcfe8" opacity="0.8" />
      <!-- Nose -->
      <path d="M 47.5,56 L 52.5,56 L 50,58.5 Z" fill="#db2777" stroke="#db2777" stroke-width="1" stroke-linejoin="round" />
      <!-- Mouth -->
      <path d="M 47,61 Q 50,62.5 50,61 Q 50,62.5 53,61" stroke="#1e293b" stroke-width="1.5" fill="none" stroke-linecap="round" />
    </svg>`
  },
  {
    id: 'bear',
    nome: 'Urso',
    svg: `<svg viewBox="0 0 100 100" class="w-full h-full">
      <defs>
        <linearGradient id="bearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#c2410c" />
        </linearGradient>
      </defs>
      <!-- Background -->
      <circle cx="50" cy="50" r="50" fill="url(#bearGrad)" />
      <!-- Ears -->
      <circle cx="31" cy="32" r="10" fill="#78350f" />
      <circle cx="69" cy="32" r="10" fill="#78350f" />
      <circle cx="31" cy="32" r="5.5" fill="#fef3c7" />
      <circle cx="69" cy="32" r="5.5" fill="#fef3c7" />
      <!-- Head -->
      <circle cx="50" cy="54" r="27" fill="#78350f" />
      <circle cx="50" cy="54" r="25.5" fill="#451a03" />
      <!-- Eyes -->
      <circle cx="40" cy="48" r="3" fill="#ffffff" opacity="0.1" />
      <circle cx="60" cy="48" r="3" fill="#ffffff" opacity="0.1" />
      <circle cx="39" cy="49" r="2.5" fill="#ffffff" />
      <circle cx="61" cy="49" r="2.5" fill="#ffffff" />
      <circle cx="38.5" cy="49.5" r="1" fill="#000000" />
      <circle cx="61.5" cy="49.5" r="1" fill="#000000" />
      <!-- Blush -->
      <circle cx="28" cy="56" r="3.5" fill="#f43f5e" opacity="0.45" />
      <circle cx="72" cy="56" r="3.5" fill="#f43f5e" opacity="0.45" />
      <!-- Muzzle -->
      <ellipse cx="50" cy="59.5" rx="8" ry="6" fill="#fef3c7" />
      <!-- Nose -->
      <path d="M 46.5,56.5 C 46.5,54.5 53.5,54.5 53.5,56.5 C 53.5,59.5 46.5,59.5 46.5,56.5 Z" fill="#1e1b4b" />
      <!-- Mouth -->
      <path d="M 47,61.5 Q 50,63.5 50,61.5 Q 50,63.5 53,61.5" stroke="#1e1b4b" stroke-width="1.5" fill="none" stroke-linecap="round" />
    </svg>`
  }
];

export function getAvatarSvg(avatarId: string | undefined, initials: string = 'C', extraClasses: string = 'w-10 h-10'): string {
  const found = AVATAR_OPTIONS.find(a => a.id === avatarId);
  if (found) {
    return `<div class="${extraClasses} flex items-center justify-center rounded-xl overflow-hidden shadow-sm select-none border border-slate-200/40 dark:border-slate-700/40 transition hover:scale-105 duration-200">${found.svg}</div>`;
  }
  
  // Custom styled initials fallback
  const firstLetters = initials ? initials.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'C';
  
  return `
    <div class="${extraClasses} bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 select-none shadow-sm text-sm uppercase">
      ${firstLetters}
    </div>
  `;
}

/**
 * Salva localmente o avatar de um usuário como fallback se o banco de dados não suportar a coluna
 */
export function salvarAvatarLocal(userId: string, avatarId: string): void {
  try {
    const localAvatars = JSON.parse(localStorage.getItem('paxflow-user-avatars') || '{}');
    localAvatars[userId] = avatarId;
    localStorage.setItem('paxflow-user-avatars', JSON.stringify(localAvatars));
  } catch (e) {
    console.error('Erro ao salvar avatar localmente:', e);
  }
}

/**
 * Recupera o avatar de um usuário salvo localmente
 */
export function obterAvatarLocal(userId: string): string | undefined {
  try {
    const localAvatars = JSON.parse(localStorage.getItem('paxflow-user-avatars') || '{}');
    return localAvatars[userId];
  } catch (e) {
    return undefined;
  }
}

/**
 * Mescla a lista de perfis do Supabase com os avatares locais
 */
export function mesclarAvataresLocais(perfis: any[]): any[] {
  return perfis.map(p => {
    if (p && p.id) {
      const local = obterAvatarLocal(p.id);
      if (local) {
        p.avatar_url = local;
      }
    }
    return p;
  });
}

