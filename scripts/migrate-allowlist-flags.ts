import { config } from "dotenv";
import { readSheet, overwriteRows } from "../lib/sheets/base";
import { SHEETS, SHEET_HEADERS } from "../lib/constants";

config({ path: ".env.local" });
config();

function normalize(value: string): "enabled" | "disabled" {
  return (value || "").trim().toLowerCase() === "enabled" || (value || "").trim().toLowerCase() === "true"
    ? "enabled"
    : "disabled";
}

async function main() {
  const sheetName = SHEETS.users;
  const headers = SHEET_HEADERS[sheetName];
  const rows = await readSheet(sheetName);

  const headerRow = rows[0] ?? headers;
  const allowlistIdx = headers.indexOf("allowlistFlag");

  const body = (rows[0] ? rows.slice(1) : []).map((row) => {
    const next = [...row];
    while (next.length < headers.length) next.push("");
    next[allowlistIdx] = normalize(next[allowlistIdx] ?? "");
    return next;
  });

  await overwriteRows(sheetName, [headerRow, ...body]);
  console.log("Users.allowlistFlag migrated to enabled/disabled.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
