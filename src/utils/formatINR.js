// src/utils/formatINR.js
// ─── Indian Currency Formatter ────────────────────────────────────────────────
// formatINR(1000000)    → "₹10,00,000.00"
// formatINR(1500.5)     → "₹1,500.50"
// formatINR(0)          → "₹0.00"

export const formatINR = (amount = 0) => {
  const fixed = Math.abs(Number(amount) || 0).toFixed(2);
  const [integer, decimal] = fixed.split('.');
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  const formatted = otherNumbers
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  return '₹' + formatted + '.' + decimal;
};

// Short version — no decimals, with suffix for large amounts
// formatINRShort(100000) → "₹1.0L"
// formatINRShort(1000)   → "₹1,000"
export const formatINRShort = (amount = 0) => {
  const n = Math.abs(Number(amount) || 0);
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)     return '₹' + (n / 1000).toFixed(1) + 'K';
  return formatINR(n);
};