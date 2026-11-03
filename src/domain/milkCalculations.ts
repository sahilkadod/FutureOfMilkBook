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
 * Preserves the legacy MilkBook billing formula:
 * totalMilk * (totalFat / (sessionCount * 2)) * rate.
 *
 * Here totalFat is the sum of the entered morning/evening fat readings.
 * Verify this interpretation against the original app and dairy statements
 * before using the result for production invoices.
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
    }

    if (entry.eveningLitres > 0) {
      totalMilk += entry.eveningLitres;
      totalFat += entry.eveningFat;
      sessionCount += 1;
    }
  }

  const averageFat = sessionCount === 0 ? 0 : totalFat / (sessionCount * 2);
  const amount = totalMilk * averageFat * ratePerFatUnit;

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
