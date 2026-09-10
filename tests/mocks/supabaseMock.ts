import { vi } from 'vitest';

export interface MockQueryResult<T = any> {
  data: T | null;
  error: any | null;
}

/**
 * Cria um mock encadeável e flexível para queries do Supabase JavaScript Client.
 * Suporta encadeamento fluente de operadores de filtro, ordenação, mutação e resolução de Promise.
 */
export function createSupabaseQueryMock(data: any = [], error: any = null) {
  const result: MockQueryResult = { data, error };

  const mock: any = {
    select: vi.fn(() => mock),
    order: vi.fn(() => mock),
    limit: vi.fn(() => mock),
    range: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    neq: vi.fn(() => mock),
    gt: vi.fn(() => mock),
    gte: vi.fn(() => mock),
    lt: vi.fn(() => mock),
    lte: vi.fn(() => mock),
    like: vi.fn(() => mock),
    ilike: vi.fn(() => mock),
    is: vi.fn(() => mock),
    in: vi.fn(() => mock),
    contains: vi.fn(() => mock),
    containedBy: vi.fn(() => mock),
    match: vi.fn(() => mock),
    not: vi.fn(() => mock),
    or: vi.fn(() => mock),
    filter: vi.fn(() => mock),
    insert: vi.fn(() => Promise.resolve(result)),
    update: vi.fn(() => mock),
    upsert: vi.fn(() => Promise.resolve(result)),
    delete: vi.fn(() => mock),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    csv: vi.fn(() => Promise.resolve(result)),
    then(onFulfilled: any, onRejected?: any) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    }
  };

  return mock;
}
