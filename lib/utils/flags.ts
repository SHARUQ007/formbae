export function isEnabledFlag(value: string): boolean {
  return (value || "").trim().toLowerCase() === "enabled";
}

export function normalizeEnabledFlag(value: string): "enabled" | "disabled" {
  return (value || "").trim().toLowerCase() === "enabled" ? "enabled" : "disabled";
}
