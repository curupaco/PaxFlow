/**
 * Utilitário de Efeitos Sonoros para Alertas e Notificações (Web Audio API)
 * Gera um tom harmônico cortês sem necessidade de arquivos MP3 externos.
 */

export function playNotificationSound(): void {
  try {
    const isMuted = localStorage.getItem('paxflow_sound_enabled') === 'false';
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    
    // Tonalidade suave em duas notas (La 5 ➔ Re 6)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5)
    osc.frequency.exponentialRampToValueAtTime(1174.66, audioCtx.currentTime + 0.1); // 1174.66Hz (D6)

    // Curva de volume suave (fade out)
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    // Silencioso em caso de restrição de interações de áudio do navegador
  }
}
