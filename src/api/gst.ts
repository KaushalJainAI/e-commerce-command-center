// src/api/gst.ts
//
// GST classification + reporting.
//
// The HSN reference is REFERENCE DATA, not policy: `gst_rate` is the statutory
// rate published for a code, shown next to the rate the product actually
// charges. Nothing in this file (or the backend behind it) ever writes a rate
// from the reference — classification and pricing are the owner's decisions and
// the UI's job is only to stop a mismatch being invisible.
import api from './axiosInstance';

export interface HsnCode {
  code: string;
  description: string;
  /** Statutory GST % published for this code, as of `rates_as_of`. */
  gst_rate: number;
  chapter: string;
  /** Caveats worth reading before choosing this code. May be ''. */
  note: string;
  keywords: string[];
}

export interface HsnReference {
  /** Date the rates were published from — always show it, never imply it's live. */
  rates_as_of: string;
  rates_source: string;
  chapters: Record<string, string>;
  codes: HsnCode[];
}

export interface HsnCoverage {
  rates_as_of: string;
  unclassified: { id: number; name: string; tax_rate: number }[];
  rate_mismatch: {
    id: number;
    name: string;
    hsn_code: string;
    tax_rate: number;
    expected_rate: number;
    description: string;
    note: string;
  }[];
  unclassified_count: number;
  rate_mismatch_count: number;
}

export interface HsnSummaryRow {
  hsn_code: string;
  description: string;
  rate: number;
  uqc: string;
  quantity: number;
  taxable_value: number;
  tax_amount: number;
  total_value: number;
  is_service: boolean;
  is_unclassified: boolean;
}

export interface HsnSummary {
  from: string;
  to: string;
  rates_as_of: string;
  order_count: number;
  shipping_sac: string;
  rows: HsnSummaryRow[];
  totals: {
    quantity: number;
    taxable_value: number;
    tax_amount: number;
    total_value: number;
  };
  unclassified_value: number;
  /** Credit notes raised in the window. Reported, NOT netted off the rows. */
  refunded_in_period: { amount: number; tax: number };
  unclassified_products: { id: number; name: string; tax_rate: number }[];
}

export const getHsnReference = () =>
  api.get<HsnReference>('/admin/hsn-reference/').then(r => r.data);

export const getHsnCoverage = () =>
  api.get<HsnCoverage>('/admin/hsn-coverage/').then(r => r.data);

export const getHsnSummary = (from?: string, to?: string) =>
  api.get<HsnSummary>('/admin/hsn-summary/', { params: { from, to } })
    .then(r => r.data);

/**
 * Download the CSV rendering of the same summary.
 *
 * `download=csv`, NOT `format=csv` — DRF reserves `format` for renderer
 * negotiation and 404s on an unknown value.
 */
export const exportHsnSummaryCsv = async (from: string, to: string) => {
  const res = await api.get(
    `/admin/hsn-summary/?from=${from}&to=${to}&download=csv`,
    { responseType: 'blob' });
  const objectUrl = window.URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `hsn-summary-${from}-to-${to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
};
