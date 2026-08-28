import { supabase } from './supabase';
import { playNotificationSound } from '../utils/soundAlerts';

export interface RealtimeMessageEventDetail {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: any;
  oldRecord: any;
}

export class RealtimeMessagingService {
  private static channel: any = null;
  private static activeUserId: string | null = null;
  private static activeUserRole: string | null = null;
  private static heartbeatInterval: any = null;
  private static onMessageCallback: ((detail: RealtimeMessageEventDetail) => void) | null = null;

  /**
   * Inicializa o canal WebSocket de Realtime para o usuário logado
   */
  public static init(userId: string, role: string, onNewMessage?: (detail: RealtimeMessageEventDetail) => void): void {
    if (this.activeUserId === userId && this.channel) {
      return; // Já inicializado para este usuário
    }

    this.stop();

    this.activeUserId = userId;
    this.activeUserRole = role;
    this.onMessageCallback = onNewMessage || null;

    const channelName = `paxflow-realtime-user-${userId}`;

    try {
      this.channel = supabase
        .channel(channelName)
        // 1. Inscrição na tabela de escala_solicitacoes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'escala_solicitacoes' },
          (payload: any) => this.handlePayload('escala_solicitacoes', payload)
        )
        // 2. Inscrição na tabela de lembretes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lembretes' },
          (payload: any) => this.handlePayload('lembretes', payload)
        )
        // 3. Inscrição na tabela de notificacoes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notificacoes' },
          (payload: any) => this.handlePayload('notificacoes', payload)
        )
        // 4. Inscrição na tabela de mensagens_diretas
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mensagens_diretas' },
          (payload: any) => this.handlePayload('mensagens_diretas', payload)
        )
        // 5. Inscrição na tabela de comentarios
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comentarios' },
          (payload: any) => this.handlePayload('comentarios', payload)
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('⚡ Realtime Messaging conectado com sucesso para o usuário:', userId);
          }
        });
    } catch (err) {
      console.warn('Aviso ao registrar canal de Realtime:', err);
    }

    // Heartbeat leve de 45 segundos para verificar conexão
    this.heartbeatInterval = setInterval(() => {
      this.checkConnection();
    }, 45000);
  }

  /**
   * Trata payloads em tempo real recebidos do WebSocket Supabase
   */
  private static handlePayload(table: string, payload: any): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const newRecord = payload.new || {};
    const oldRecord = payload.old || {};

    let isRelevant = false;

    // Lógica de relevância baseada no perfil do usuário
    if (table === 'escala_solicitacoes') {
      const isTarget = String(newRecord.destinatario_id) === String(this.activeUserId) ||
                       String(newRecord.solicitante_id) === String(this.activeUserId) ||
                       this.activeUserRole === 'admin';
      if (isTarget) isRelevant = true;
    } else if (table === 'lembretes') {
      const isTarget = String(newRecord.consultor_id) === String(this.activeUserId) ||
                       String(newRecord.criador_id) === String(this.activeUserId);
      if (isTarget) isRelevant = true;
    } else if (table === 'notificacoes') {
      const isTarget = String(newRecord.user_id) === String(this.activeUserId);
      if (isTarget) isRelevant = true;
    } else if (table === 'mensagens_diretas') {
      if (eventType === 'INSERT') {
        isRelevant = true;
      }
    } else if (table === 'comentarios') {
      if (eventType === 'INSERT') {
        isRelevant = true;
      }
    }

    if (isRelevant) {
      const detail: RealtimeMessageEventDetail = {
        table,
        eventType,
        newRecord,
        oldRecord
      };

      // Reproduzir áudio suave
      if (eventType === 'INSERT' || (eventType === 'UPDATE' && newRecord.status !== oldRecord.status)) {
        playNotificationSound();
      }

      // Disparar evento no DOM global para que main.ts e InboxPage.ts reajam dinamicamente
      window.dispatchEvent(new CustomEvent('paxflow:new-message', { detail }));

      if (this.onMessageCallback) {
        this.onMessageCallback(detail);
      }
    }
  }

  /**
   * Checagem periódica leve
   */
  private static checkConnection(): void {
    if (!this.channel && this.activeUserId && this.activeUserRole) {
      this.init(this.activeUserId, this.activeUserRole, this.onMessageCallback || undefined);
    }
  }

  /**
   * Encerra a conexão WebSocket ao fazer logout
   */
  public static stop(): void {
    if (this.channel) {
      try {
        this.channel.unsubscribe();
      } catch (e) {}
      this.channel = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.activeUserId = null;
    this.activeUserRole = null;
  }
}
