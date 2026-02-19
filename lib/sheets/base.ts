import { getSheetsClient, getSpreadsheetId } from "@/lib/sheets/client";
import { GaxiosError } from "gaxios";

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const status = (error as GaxiosError)?.response?.status;
      const retryable = status === 429 || (status !== undefined && status >= 500);
      if (!retryable || attempt >= maxRetries) {
        throw error;
      }
      const delayMs = 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt += 1;
    }
  }
}

export async function readSheet(tab: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:ZZ`
  });
  const rows = (res.data.values ?? []) as string[][];
  if (rows.length <= 1) return rows;

  const header = rows[0] ?? [];
  const headerFirst = (header[0] ?? "").trim();
  const cleanedBody = rows.slice(1).filter((row) => {
    const first = (row[0] ?? "").trim();
    if (!first) return false;
    if (headerFirst && first === headerFirst) return false;
    return !header.every((h, i) => (row[i] ?? "").trim() === (h ?? "").trim());
  });
  return [header, ...cleanedBody];
}

export async function appendRows(tab: string, rows: string[][]): Promise<void> {
  if (!rows.length) return;
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  await withRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:ZZ`,
      valueInputOption: "RAW",
      requestBody: { values: rows }
    });
  });
}

export async function overwriteRows(tab: string, rows: string[][]): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  await withRetry(async () => {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${tab}!A:ZZ`
    });
  });
  if (!rows.length) return;
  await withRetry(async () => {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: rows }
    });
  });
}

export function toObjects<T extends Record<string, string>>(rows: string[][], headers: string[]): T[] {
  return rows.slice(1).map((row) => {
    const entry = {} as T;
    headers.forEach((h, i) => {
      entry[h as keyof T] = (row[i] ?? "") as T[keyof T];
    });
    return entry;
  });
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
