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
  private latestRemoteVersion: VersionInfo | null = null;

  private constructor() {
    this.currentBuildTime = typeof __PAXFLOW_BUILD_TIME__ !== 'undefined'
      ? __PAXFLOW_BUILD_TIME__
      : 0;

    // Se já tivermos aceitado esta versão no localStorage, atualiza a referência local
    const ackTime = parseInt(localStorage.getItem('paxflow_acknowledged_build_time') || '0', 10);
    if (ackTime > this.currentBuildTime) {
      this.currentBuildTime = ackTime;
    }
  }

  public static getInstance(): VersionChecker {
    if (!VersionChecker.instance) {
      VersionChecker.instance = new VersionChecker();
    }
    return VersionChecker.instance;
  }

  /**
   * Obtém a versão atual do sistema
   */
  public getCurrentVersion(): string {
    if (this.latestRemoteVersion && this.latestRemoteVersion.version) {
      return this.latestRemoteVersion.version;
    }
    return '1.0.0';
  }

  /**
   * Inicializa o monitoramento de versão no PaxFlow
   */
  public init(intervalMs: number = 3 * 60 * 1000): void {
    // Executa verificação inicial após a montagem do app
    setTimeout(() => this.checkForUpdates(), 3000);

    // Configura polling regular a cada N minutos
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
  public async checkForUpdates(forceCheck: boolean = false): Promise<boolean> {
    if (this.isUpdateAvailable && !forceCheck) return true;

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
      this.latestRemoteVersion = data;

      const ackTime = parseInt(localStorage.getItem('paxflow_acknowledged_build_time') || '0', 10);
      const effectiveLocalBuild = Math.max(this.currentBuildTime, ackTime);

      // Detecta nova versão por buildTime superior ou se effectiveLocalBuild ainda não estiver gravado
      if (data && data.buildTime && (data.buildTime > (effectiveLocalBuild + 1000) || (effectiveLocalBuild === 0 && data.buildTime > 0))) {
        console.log('[PaxFlow VersionChecker] 🚀 Nova versão detectada no servidor!', {
          localEffective: effectiveLocalBuild,
          remote: data.buildTime,
          version: data.version
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
   * Recarrega a página de forma limpa, gravando a nova versão aceita e atualizando Service Workers
   */
  public forceReload(): void {
    if (this.latestRemoteVersion && this.latestRemoteVersion.buildTime) {
      localStorage.setItem('paxflow_acknowledged_build_time', String(this.latestRemoteVersion.buildTime));
    } else if (this.currentBuildTime) {
      localStorage.setItem('paxflow_acknowledged_build_time', String(this.currentBuildTime));
    }

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

(window as any).VersionChecker = VersionChecker;
