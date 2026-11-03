import {calculateMilkTotals} from './milkCalculations';

describe('calculateMilkTotals', () => {
  it('calculates legacy MilkBook totals for two sessions', () => {
    const result = calculateMilkTotals(
      [{morningLitres: 60, morningFat: 8, eveningLitres: 59.5, eveningFat: 7.7}],
      8.4,
    );
    expect(result.totalMilk).toBe(119.5);
    expect(result.totalFat).toBe(15.7);
    expect(result.sessionCount).toBe(2);
    expect(result.amount).toBe(7879.83);
  });

  it('returns zeroes when there are no entries', () => {
    expect(calculateMilkTotals([], 8.4)).toMatchObject({
      totalMilk: 0, totalFat: 0, sessionCount: 0, averageFat: 0, amount: 0,
    });
  });
});
