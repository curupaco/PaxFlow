import { PerfilConsultor } from '../types';

export interface FeedbackNpsItem {
  id: string;
  viagem_id?: string;
  cliente_id?: string;
  consultor_id?: string;
  nps_rating: number;
  comentarios?: string | null;
  created_at: string;
  cliente?: {
    id?: string;
    nome?: string;
    email?: string;
    telefone?: string;
  };
  viagem?: {
    id?: string;
    destino?: string;
    data_viagem?: string;
    data_retorno?: string;
    consultor_id?: string;
  };
  consultor?: {
    id?: string;
    nome?: string;
    avatar_url?: string;
  };
}

export interface MetricasNpsConsolidadas {
  total: number;
  mediaNota: number;
  promotores: number;
  neutros: number;
  detratores: number;
  percPromotores: number;
  percNeutros: number;
  percDetratores: number;
  npsScore: number;
  zona: 'excelencia' | 'qualidade' | 'aperfeicoamento' | 'critica';
  zonaDescricao: string;
  totalComComentarios: number;
}

export interface ConsultorNpsResumo {
  consultorId: string;
  consultorNome: string;
  avatarUrl?: string;
  totalFeedbacks: number;
  mediaNota: number;
  npsScore: number;
  promotores: number;
  detratores: number;
}

export class SatisfacaoService {
  /**
   * Classifica a nota de 0 a 10 na categoria padrão Net Promoter Score
   */
  public static classificarNps(nota: number): {
    categoria: 'promotor' | 'neutro' | 'detrator';
    label: string;
    badgeClass: string;
    emoji: string;
  } {
    const n = Number(nota);
    if (n >= 9) {
      return {
        categoria: 'promotor',
        label: 'Promotor',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
        emoji: '🟢'
      };
    }
    if (n >= 7) {
      return {
        categoria: 'neutro',
        label: 'Neutro / Passivo',
        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
        emoji: '🟡'
      };
    }
    return {
      categoria: 'detrator',
      label: 'Detrator',
      badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/60',
      emoji: '🔴'
    };
  }

  /**
   * Calcula as métricas e termômetro consolidado de NPS
   */
  public static calcularMetricas(feedbacks: FeedbackNpsItem[]): MetricasNpsConsolidadas {
    const total = feedbacks.length;
    if (total === 0) {
      return {
        total: 0,
        mediaNota: 0,
        promotores: 0,
        neutros: 0,
        detratores: 0,
        percPromotores: 0,
        percNeutros: 0,
        percDetratores: 0,
        npsScore: 0,
        zona: 'aperfeicoamento',
        zonaDescricao: 'Sem avaliações no período',
        totalComComentarios: 0
      };
    }

    let somaNotas = 0;
    let promotores = 0;
    let neutros = 0;
    let detratores = 0;
    let totalComComentarios = 0;

    feedbacks.forEach(f => {
      const nota = Math.max(0, Math.min(10, Number(f.nps_rating) || 0));
      somaNotas += nota;
      if (nota >= 9) {
        promotores++;
      } else if (nota >= 7) {
        neutros++;
      } else {
        detratores++;
      }

      if (f.comentarios && f.comentarios.trim().length > 0) {
        totalComComentarios++;
      }
    });

    const mediaNota = Number((somaNotas / total).toFixed(1));
    const percPromotores = Math.round((promotores / total) * 100);
    const percNeutros = Math.round((neutros / total) * 100);
    const percDetratores = Math.round((detratores / total) * 100);
    const npsScore = percPromotores - percDetratores;

    let zona: MetricasNpsConsolidadas['zona'] = 'aperfeicoamento';
    let zonaDescricao = 'Zona de Aperfeiçoamento';

    if (npsScore >= 75) {
      zona = 'excelencia';
      zonaDescricao = 'Zona de Excelência 🌟';
    } else if (npsScore >= 50) {
      zona = 'qualidade';
      zonaDescricao = 'Zona de Qualidade 👍';
    } else if (npsScore >= 0) {
      zona = 'aperfeicoamento';
      zonaDescricao = 'Zona de Aperfeiçoamento ⚠️';
    } else {
      zona = 'critica';
      zonaDescricao = 'Zona Crítica 🚨';
    }

    return {
      total,
      mediaNota,
      promotores,
      neutros,
      detratores,
      percPromotores,
      percNeutros,
      percDetratores,
      npsScore,
      zona,
      zonaDescricao,
      totalComComentarios
    };
  }

  /**
   * Filtra a lista de feedbacks considerando período, consultor, categoria e busca
   */
  public static filtrarFeedbacks(
    feedbacks: FeedbackNpsItem[],
    opcoes: {
      dataInicio?: string;
      dataFim?: string;
      consultorId?: string;
      categoria?: 'todos' | 'promotores' | 'neutros' | 'detratores' | 'com_comentario';
      buscaTexto?: string;
    }
  ): FeedbackNpsItem[] {
    const { dataInicio, dataFim, consultorId, categoria, buscaTexto } = opcoes;
    const buscaLimpa = (buscaTexto || '').trim().toLowerCase();

    return feedbacks.filter(f => {
      // 1. Filtro de período por created_at
      if (f.created_at) {
        const dataStr = f.created_at.slice(0, 10);
        if (dataInicio && dataStr < dataInicio) return false;
        if (dataFim && dataStr > dataFim) return false;
      }

      // 2. Filtro de consultor
      const cId = f.consultor_id || f.viagem?.consultor_id;
      if (consultorId && consultorId !== 'todos') {
        if (String(cId) !== String(consultorId)) return false;
      }

      // 3. Filtro de categoria NPS
      const nota = Number(f.nps_rating) || 0;
      if (categoria === 'promotores' && nota < 9) return false;
      if (categoria === 'neutros' && (nota < 7 || nota > 8)) return false;
      if (categoria === 'detratores' && nota > 6) return false;
      if (categoria === 'com_comentario' && (!f.comentarios || f.comentarios.trim().length === 0)) return false;

      // 4. Filtro por termo de busca (passageiro, destino, consultor ou comentário)
      if (buscaLimpa) {
        const clienteNome = (f.cliente?.nome || '').toLowerCase();
        const destino = (f.viagem?.destino || '').toLowerCase();
        const consultorNome = (f.consultor?.nome || '').toLowerCase();
        const comentarios = (f.comentarios || '').toLowerCase();

        const match = clienteNome.includes(buscaLimpa) ||
          destino.includes(buscaLimpa) ||
          consultorNome.includes(buscaLimpa) ||
          comentarios.includes(buscaLimpa);

        if (!match) return false;
      }

      return true;
    });
  }

  /**
   * Agrupa e calcula as métricas individuais por consultor
   */
  public static calcularPorConsultor(
    feedbacks: FeedbackNpsItem[],
    consultores: PerfilConsultor[]
  ): ConsultorNpsResumo[] {
    const agrupado = new Map<string, FeedbackNpsItem[]>();

    feedbacks.forEach(f => {
      const cId = f.consultor_id || f.viagem?.consultor_id || 'desconhecido';
      const arr = agrupado.get(cId) || [];
      arr.push(f);
      agrupado.set(cId, arr);
    });

    const resumos: ConsultorNpsResumo[] = [];

    agrupado.forEach((lista, cId) => {
      const consultorObj = consultores.find(c => c && c.id === cId);
      const consultorNome = consultorObj?.nome || lista[0]?.consultor?.nome || 'Consultor';
      const avatarUrl = consultorObj?.avatar_url || lista[0]?.consultor?.avatar_url;

      const metricas = this.calcularMetricas(lista);
      resumos.push({
        consultorId: cId,
        consultorNome,
        avatarUrl,
        totalFeedbacks: metricas.total,
        mediaNota: metricas.mediaNota,
        npsScore: metricas.npsScore,
        promotores: metricas.promotores,
        detratores: metricas.detratores
      });
    });

    // Ordena do maior score para o menor
    resumos.sort((a, b) => b.npsScore - a.npsScore || b.totalFeedbacks - a.totalFeedbacks);
    return resumos;
  }
}
