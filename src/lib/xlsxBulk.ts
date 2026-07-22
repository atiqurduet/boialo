import * as XLSX from 'xlsx';

/**
 * Download data as an .xlsx file.
 * headers: column names (first row)
 * rows: array of arrays OR array of objects keyed by header names
 */
export function downloadXLSX(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][] | Record<string, any>[],
  filename: string,
  sheetName = 'Sheet1'
) {
  const aoa: any[][] = [headers];
  if (rows.length && !Array.isArray(rows[0])) {
    for (const r of rows as Record<string, any>[]) {
      aoa.push(headers.map((h) => (r[h] ?? '')));
    }
  } else {
    for (const r of rows as any[][]) aoa.push(r);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

/**
 * Parse an uploaded file (.xlsx, .xls, or .csv) into an array of row objects
 * keyed by the header row.
 */
export async function parseSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const wsName = wb.SheetNames[0];
  if (!wsName) return [];
  const ws = wb.Sheets[wsName];
  const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false, defval: '' });
  if (!aoa.length) return [];
  const headers = (aoa[0] as any[]).map((h) => String(h ?? '').trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const values = aoa[i] as any[];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const v = values?.[idx];
      row[h] = v == null ? '' : String(v).trim();
    });
    // Skip fully empty rows
    if (Object.values(row).some((v) => v !== '')) rows.push(row);
  }
  return rows;
}