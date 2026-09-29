export function formatARS(value: number): string {
  const absolute = Math.abs(value);
  const [integerPart, fractionPart] = absolute.toFixed(2).split(".");
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = fractionPart === "00" ? "" : `,${fractionPart}`;
  const sign = value < 0 ? "-" : "";

  return `$ ${sign}${withThousands}${decimals}`;
}
