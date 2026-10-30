import { supabase } from './supabase';

export interface FotoAgencia {
  id: string;
  titulo: string;
  url: string;
  thumb_url?: string;
  tags?: string[];
  criado_em?: string;
  origem?: 'upload' | 'favorito' | 'padrao';
}

/**
 * Serviço de Galeria Própria de Fotos Institucionais e Upload para o PaxFlow Studio™.
 * Segue estritamente o padrão Zero-Break e resiliência a Schema Drift.
 */
export class StudioGaleriaService {
  /**
   * Catálogo de fotos institucionais base da agência.
   */
  public static FOTOS_PADRAO_AGENCIA: FotoAgencia[] = [
    {
      id: 'agencia-luxo-1',
      titulo: 'Boas-Vindas & Concierge Exclusivo',
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
      tags: ['institucional', 'luxo', 'resort', 'agencia'],
      origem: 'padrao'
    },
    {
      id: 'agencia-aereo-1',
      titulo: 'Experiência de Voo & Primeira Classe',
      url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=400&q=80',
      tags: ['aereo', 'classe executiva', 'voo', 'viagem'],
      origem: 'padrao'
    },
    {
      id: 'agencia-resort-1',
      titulo: 'Piscina Infinity & Bangalôs',
      url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=400&q=80',
      tags: ['hotel', 'resort', 'piscina', 'descanso'],
      origem: 'padrao'
    },
    {
      id: 'agencia-cruzeiro-1',
      titulo: 'Navio & Cruzeiro em Alto Mar',
      url: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=400&q=80',
      tags: ['cruzeiro', 'mar', 'navio', 'oceano'],
      origem: 'padrao'
    }
  ];

  /**
   * Lista todas as fotos da agência salvas no Supabase, mesclando com os presets institucionais.
   */
  public static async listarFotosAgencia(): Promise<FotoAgencia[]> {
    try {
      const { data, error } = await supabase
        .from('studio_fotos_agencia')
        .select('*')
        .order('criado_em', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const fotosDb: FotoAgencia[] = data.map((d: any) => ({
          id: d.id,
          titulo: d.titulo || 'Foto da Agência',
          url: d.url,
          thumb_url: d.thumb_url || d.url,
          tags: d.tags || [],
          criado_em: d.criado_em || d.created_at,
          origem: d.origem || 'upload'
        }));

        return [...fotosDb, ...this.FOTOS_PADRAO_AGENCIA];
      }
    } catch {
      // Tabela studio_fotos_agencia ainda não criada no banco
    }

    return [...this.FOTOS_PADRAO_AGENCIA];
  }

  /**
   * Salva uma nova foto na galeria da agência com padrão Zero-Break.
   */
  public static async salvarFotoAgencia(foto: { titulo: string; url: string; tags?: string[] }): Promise<FotoAgencia> {
    const novaFoto: FotoAgencia = {
      id: 'ag-' + Date.now(),
      titulo: foto.titulo || 'Foto Institucional',
      url: foto.url,
      thumb_url: foto.url,
      tags: foto.tags || ['agencia', 'personalizada'],
      criado_em: new Date().toISOString(),
      origem: 'upload'
    };

    try {
      const { data, error } = await supabase
        .from('studio_fotos_agencia')
        .insert([{
          titulo: novaFoto.titulo,
          url: novaFoto.url,
          thumb_url: novaFoto.thumb_url,
          tags: novaFoto.tags,
          origem: 'upload'
        }])
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          titulo: data.titulo,
          url: data.url,
          thumb_url: data.thumb_url || data.url,
          tags: data.tags,
          criado_em: data.criado_em || data.created_at,
          origem: 'upload'
        };
      }
    } catch {
      // Tabela ainda não criada
    }

    return novaFoto;
  }

  /**
   * Remove uma foto da galeria da agência.
   */
  public static async excluirFotoAgencia(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('studio_fotos_agencia').delete().eq('id', id);
      if (!error) return true;
    } catch {
      // Silencioso se tabela não existir
    }
    return true;
  }

  /**
   * Comprime e realiza o upload de imagem local do computador com padrão Zero-Break.
   * Utiliza canvas client-side para redimensionar fotos pesadas (ex: 10MB -> ~250KB).
   */
  public static async comprimirEUploadFoto(arquivo: File, titulo?: string): Promise<FotoAgencia> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Erro ao ler arquivo da imagem'));
      reader.onload = async () => {
        try {
          const img = new Image();
          img.onerror = () => reject(new Error('Formato de imagem inválido'));
          img.onload = async () => {
            // Compressão via Canvas (Max 1920 largura / 1080 altura)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              const fallbackFoto = await this.salvarFotoAgencia({
                titulo: titulo || arquivo.name.replace(/\.[^/.]+$/, ''),
                url: reader.result as string
              });
              return resolve(fallbackFoto);
            }

            let width = img.width;
            let height = img.height;
            const maxDim = 1920;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

            // Tenta upload no bucket Supabase Storage se configurado
            let urlFinal = compressedDataUrl;
            try {
              const byteString = atob(compressedDataUrl.split(',')[1]);
              const mimeString = compressedDataUrl.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const blob = new Blob([ab], { type: mimeString });
              const fileName = `studio-${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

              const { data: storageData, error: storageErr } = await supabase.storage
                .from('studio-propostas')
                .upload(fileName, blob, { contentType: mimeString, upsert: true });

              if (!storageErr && storageData) {
                const { data: publicUrlData } = supabase.storage
                  .from('studio-propostas')
                  .getPublicUrl(storageData.path);

                if (publicUrlData?.publicUrl) {
                  urlFinal = publicUrlData.publicUrl;
                }
              }
            } catch {
              // Mantém urlFinal = compressedDataUrl em caso de bucket ausente
            }

            const fotoSalva = await this.salvarFotoAgencia({
              titulo: titulo || arquivo.name.replace(/\.[^/.]+$/, ''),
              url: urlFinal
            });

            resolve(fotoSalva);
          };

          img.src = reader.result as string;
        } catch (err) {
          reject(err);
        }
      };

      reader.readAsDataURL(arquivo);
    });
  }
}
