const API = process.env.API_URL ?? 'http://localhost:8000';

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`API ${r.status}: ${path}`);
  return r.json();
}

export interface IpoSummary {
  ticker: string; company_name: string; status: string;
  final_price: number | null; price_low: number | null; price_high: number | null;
  lots_offered: number | null; listing_date: string | null; offering_end: string | null;
  logo_url: string | null; day1_return_pct: number | null;
}
export interface IpoDetail extends IpoSummary {
  sector: string | null; description: string | null; prospectus_url: string | null;
  source_url: string | null; shares_offered: number | null; percent_of_capital: number | null;
  bookbuilding_start: string | null; bookbuilding_end: string | null;
  offering_start: string | null; allotment_date: string | null;
  pooling_pct: number | null; oversub_ratio: number | null;
  effective_price: number | null; ipo_value: number | null;
  underwriters: { code: string; name: string; is_lead: boolean }[];
  performance: { day1_close: number | null; day1_return_pct: number | null; day1_ara: boolean | null } | null;
}
export interface UnderwriterStats {
  code: string; name: string; total_ipos: number;
  ara_rate_pct: number | null; avg_day1_return_pct: number | null; total_value: number;
}

export const getIpos = (qs = '') => get<{ items: IpoSummary[]; total: number }>(`/api/ipos${qs}`);
export const getIpo = (ticker: string) => get<IpoDetail>(`/api/ipos/${ticker}`);
export const getUnderwriters = () => get<UnderwriterStats[]>(`/api/underwriters`);
export const getUnderwriter = (code: string) =>
  get<UnderwriterStats & { ipos: IpoSummary[] }>(`/api/underwriters/${code}`);
