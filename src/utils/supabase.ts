import { supabase } from '@/lib/supabase';

interface PaginatedFetchOptions {
  table: string;
  select?: string;
  order?: { column: string; ascending: boolean } | { column: string; ascending: boolean }[];
  yearFilter?: { column: string; year: string };
  eqFilter?: { column: string; value: string };
  pageSize?: number;
}

export async function fetchAllPaginated<T>(options: PaginatedFetchOptions): Promise<T[]> {
  const { table, select = '*', order = { column: 'transaction_date', ascending: false }, yearFilter, eqFilter, pageSize = 1000 } = options;
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(select);

    const orders = Array.isArray(order) ? order : [order];
    for (const o of orders) {
      query = query.order(o.column, { ascending: o.ascending });
    }

    if (yearFilter && yearFilter.year !== 'All') {
      query = query
        .gte(yearFilter.column, `${yearFilter.year}-01-01`)
        .lte(yearFilter.column, `${yearFilter.year}-12-31`);
    }

    if (eqFilter) {
      query = query.eq(eqFilter.column, eqFilter.value);
    }

    const { data, error } = await query.range(from, from + pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < pageSize) hasMore = false;
      else from += pageSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
