import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VersionChecker } from '../../src/services/versionChecker';

describe('VersionChecker - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve fornecer uma instância Singleton do VersionChecker', () => {
    // Action
    const instance1 = VersionChecker.getInstance();
    const instance2 = VersionChecker.getInstance();

    // Assert
    expect(instance1).toBe(instance2);
    expect(typeof instance1.checkForUpdates).toBe('function');
  });

  it('deve retornar versão atual padrão quando nenhuma versão remota foi carregada', () => {
    // Setup
    const checker = VersionChecker.getInstance();

    // Action
    const versao = checker.getCurrentVersion();

    // Assert
    expect(typeof versao).toBe('string');
    expect(versao.length).toBeGreaterThan(0);
  });

  it('deve detectar atualização quando o buildTime remoto for superior ao local', async () => {
    // Setup
    const checker = VersionChecker.getInstance();
    const now = Date.now();

    const remoteVersion = {
      version: '1.0.3',
      buildTime: now + 50000,
      timestamp: new Date().toISOString(),
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(remoteVersion),
    } as any);

    // Action
    const updateAvailable = await checker.checkForUpdates(true);

    // Assert
    expect(updateAvailable).toBe(true);
    expect(checker.getCurrentVersion()).toBe('1.0.3');
  });

  it('deve retornar falso e não quebrar caso a requisição de versão falhe', async () => {
    // Setup
    const checker = VersionChecker.getInstance();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as any);

    // Action
    const updateAvailable = await checker.checkForUpdates(true);

    // Assert
    expect(updateAvailable).toBe(false);
  });
});
