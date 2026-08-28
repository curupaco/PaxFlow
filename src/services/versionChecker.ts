export interface VersionInfo {
  version: string;
  buildTime: number;
  timestamp: string;
}

export class VersionChecker {
  private static instance: VersionChecker;
  private currentBuildTime: number;
  private isUpdateAvailable: boolean = false;
  private checkIntervalTimer: any = null;

  private constructor() {
    // __PAXFLOW_BUILD_TIME__ é injetado pelo Vite durante o build
    this.currentBuildTime = typeof __PAXFLOW_BUILD_TIME__ !== 'undefined'
      ? __PAXFLOW_BUILD_TIME__
      : Date.now();
  }

  public static getInstance(): VersionChecker {
    if (!VersionChecker.instance) {
      VersionChecker.instance = new VersionChecker();
    }
    return VersionChecker.instance;
  }

  /**
   * Inicializa o monitoramento de versão no PaxFlow
   */
  public init(intervalMs: number = 3 * 60 * 1000): void {
    // Executa verificação inicial logo após a montagem do app
    setTimeout(() => this.checkForUpdates(), 5000);

    // Configura polling regular
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
    }
    this.checkIntervalTimer = setInterval(() => {
      this.checkForUpdates();
    }, intervalMs);

    // Verifica ao focar a aba/janela
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates();
      }
    });

    window.addEventListener('focus', () => {
      this.checkForUpdates();
    });
  }

  /**
   * Consulta o arquivo /version.json com cache-busting rigoroso
   */
  public async checkForUpdates(): Promise<boolean> {
    if (this.isUpdateAvailable) return true;

    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) return false;

      const data: VersionInfo = await response.json();

      if (data && data.buildTime && data.buildTime > this.currentBuildTime) {
        console.log('[PaxFlow VersionChecker] Nova versão detectada!', {
          local: this.currentBuildTime,
          remote: data.buildTime
        });
        this.notifyNewVersionAvailable(data);
        return true;
      }
    } catch (err) {
      console.warn('[PaxFlow VersionChecker] Erro ao verificar versão:', err);
    }

    return false;
  }

  private notifyNewVersionAvailable(versionInfo: VersionInfo): void {
    if (this.isUpdateAvailable) return;
    this.isUpdateAvailable = true;

    window.dispatchEvent(
      new CustomEvent('paxflow-new-version-available', {
        detail: {
          source: 'version-checker',
          versionInfo
        }
      })
    );
  }

  /**
   * Recarrega a página de forma limpa, limpando service workers se necessário
   */
  public forceReload(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }).finally(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }
}
