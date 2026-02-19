import { config } from "dotenv";
import { google } from "googleapis";
import { SHEET_HEADERS } from "../lib/constants";

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

  for (const [tab, headers] of Object.entries(SHEET_HEADERS)) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${tab}!A:ZZ`
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] }
    });
  }

  console.log("Reset complete. All tabs cleared and headers restored.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
