export type MilkSession = {
  morningLitres: number;
  morningFat: number;
  eveningLitres: number;
  eveningFat: number;
};

export type MilkTotals = {
  totalMilk: number;
  totalFat: number;
  sessionCount: number;
  averageFat: number;
  amount: number;
};

/**
 * Matches the original MilkBook implementation: each morning/evening session
 * contributes litres * that session's fat reading * rate. The monthly amount
 * is the sum of those session amounts.
 */
export function calculateMilkTotals(
  entries: readonly MilkSession[],
  ratePerFatUnit: number,
): MilkTotals {
  if (!Number.isFinite(ratePerFatUnit) || ratePerFatUnit < 0) {
    throw new Error('Rate must be a finite, non-negative number.');
  }

  let totalMilk = 0;
  let totalFat = 0;
  let sessionCount = 0;
  let amount = 0;

  for (const entry of entries) {
    const values = [
      entry.morningLitres,
      entry.morningFat,
      entry.eveningLitres,
      entry.eveningFat,
    ];

    if (values.some(value => !Number.isFinite(value) || value < 0)) {
      throw new Error('Milk and fat values must be finite and non-negative.');
    }

    if (entry.morningLitres > 0) {
      totalMilk += entry.morningLitres;
      totalFat += entry.morningFat;
      sessionCount += 1;
      amount += entry.morningLitres * entry.morningFat * ratePerFatUnit;
    }

    if (entry.eveningLitres > 0) {
      totalMilk += entry.eveningLitres;
      totalFat += entry.eveningFat;
      sessionCount += 1;
      amount += entry.eveningLitres * entry.eveningFat * ratePerFatUnit;
    }
  }

  const averageFat = sessionCount === 0 ? 0 : totalFat / sessionCount;

  return {
    totalMilk: roundToOne(totalMilk),
    totalFat: roundToOne(totalFat),
    sessionCount,
    averageFat: roundToOne(averageFat),
    amount: roundToTwo(amount),
  };
}

export function roundToOne(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
