// Supabase (PostgREST) devuelve como máximo 1000 filas por consulta. Para
// tablas que crecen más que eso (p. ej. team_member_availability: hasta 112
// celdas por integrante) hay que pedir por páginas o se pierden datos sin
// ningún error visible.
const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

// `page(from, to)` debe devolver la consulta con .range(from, to) y un
// .order() estable, para que las páginas no se solapen ni salten filas.
export async function fetchAll<T>(page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
