export function normalizeMobile(input: string): string {
  return input.replace(/\D/g, "").trim();
}

export function isValidMobile(input: string): boolean {
  const value = normalizeMobile(input);
  return value.length >= 8 && value.length <= 15;
}
