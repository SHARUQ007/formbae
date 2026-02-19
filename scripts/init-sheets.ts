import { google } from "googleapis";
import { config } from "dotenv";
import { SHEET_HEADERS } from "../lib/constants";
import { GaxiosError } from "gaxios";

config({ path: ".env.local" });
config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing`);
  return v;
}

async function main() {
  const spreadsheetId = required("GOOGLE_SHEETS_SPREADSHEET_ID");
  const email = required("GOOGLE_CLIENT_EMAIL");
  const key = required("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  const existing = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set((existing.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean));

  const toCreate = Object.keys(SHEET_HEADERS).filter((title) => !existingTitles.has(title));
  if (toCreate.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: toCreate.map((title) => ({ addSheet: { properties: { title } } }))
      }
    });
  }

  for (const [tab, headers] of Object.entries(SHEET_HEADERS)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] }
    });
  }

  const refreshed = await sheets.spreadsheets.get({ spreadsheetId });
  const titleToSheetId = new Map<string, number>();
  for (const sheet of refreshed.data.sheets ?? []) {
    const title = sheet.properties?.title;
    const id = sheet.properties?.sheetId;
    if (title && typeof id === "number") titleToSheetId.set(title, id);
  }

  const usersSheetId = titleToSheetId.get("Users");
  const requestsSheetId = titleToSheetId.get("Requests");
  const plansSheetId = titleToSheetId.get("Plans");

  const requestsPayload: Array<Record<string, unknown>> = [];

  if (typeof usersSheetId === "number") {
    requestsPayload.push(buildDropdownValidation(usersSheetId, 6, ["enabled", "disabled"]));
  }

  if (typeof requestsSheetId === "number") {
    requestsPayload.push(buildDropdownValidation(requestsSheetId, 5, ["pending", "approved", "rejected"]));
  }

  if (typeof plansSheetId === "number") {
    requestsPayload.push(buildDropdownValidation(plansSheetId, 5, ["draft", "active", "archived"]));
  }

  if (requestsPayload.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: requestsPayload as never[]
      }
    });
  }

  console.log("Sheets initialized with headers:", Object.keys(SHEET_HEADERS).join(", "));
}

function buildDropdownValidation(sheetId: number, columnIndex: number, values: string[]) {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1
      },
      rule: {
        condition: {
          type: "ONE_OF_LIST",
          values: values.map((v) => ({ userEnteredValue: v }))
        },
        strict: true,
        showCustomUi: true
      }
    }
  };
}

main().catch((err) => {
  const error = err as GaxiosError;
  const rawMessage = String(error?.message || "");
  const apiMessage = String((error?.response?.data as { error?: { message?: string } })?.error?.message || "");
  const combined = `${rawMessage}\n${apiMessage}`.toLowerCase();

  if (combined.includes("enotfound") || combined.includes("eai_again")) {
    console.error("Network error reaching Google APIs. Check internet/VPN/firewall and retry.");
  } else if (combined.includes("invalid_grant") || combined.includes("jwt")) {
    console.error("Google service account auth failed. Verify GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local.");
  } else if (combined.includes("requested entity was not found") || combined.includes("spreadsheet")) {
    console.error("Spreadsheet not found. Verify GOOGLE_SHEETS_SPREADSHEET_ID.");
  } else if (combined.includes("permission") || combined.includes("not have permission") || combined.includes("forbidden")) {
    console.error("Permission denied. Share the sheet with the service account email as Editor.");
  } else {
    console.error(err);
  }

  console.error("Using spreadsheet:", process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "(missing)");
  console.error("Using service account:", process.env.GOOGLE_CLIENT_EMAIL || "(missing)");
  process.exit(1);
});
