import { describe, expect, it } from "vitest";

import {
  formatCompactNumber,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRisk,
  getRiskColor,
  getRiskTextColor,
} from "../formatters";

describe("formatCurrency", () => {
  it("returns $0.00 for NaN", () => {
    expect(formatCurrency(NaN)).toBe("$0.00");
  });

  it("formats trillions", () => {
    expect(formatCurrency(2.5e12)).toBe("$2.50T");
  });

  it("formats billions", () => {
    expect(formatCurrency(1.23e9)).toBe("$1.23B");
  });

  it("formats millions", () => {
    expect(formatCurrency(7.89e6)).toBe("$7.89M");
  });

  it("formats thousands", () => {
    expect(formatCurrency(4.56e3)).toBe("$4.56K");
  });

  it("uses 6 decimals for values below 1", () => {
    const result = formatCurrency(0.123456);
    expect(result).toBe("$0.123456");
  });

  it("uses 4 decimals for values between 1 and 100", () => {
    const result = formatCurrency(42.123456);
    expect(result).toBe("$42.1235");
  });

  it("uses 2 decimals for values 100+", () => {
    const result = formatCurrency(150.789);
    expect(result).toBe("$150.79");
  });

  it("respects explicit decimals override", () => {
    const result = formatCurrency(42.123456, 2);
    expect(result).toBe("$42.12");
  });

  it("handles negative trillions", () => {
    expect(formatCurrency(-1.5e12)).toBe("$-1.50T");
  });

  it("handles negative billions", () => {
    expect(formatCurrency(-3e9)).toBe("$-3.00B");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.000000");
  });
});

describe("formatPercent", () => {
  it("returns +0.00% for NaN", () => {
    expect(formatPercent(NaN)).toBe("+0.00%");
  });

  it("adds + sign for positive values", () => {
    expect(formatPercent(5.123)).toBe("+5.12%");
  });

  it("keeps - sign for negative values", () => {
    expect(formatPercent(-3.456)).toBe("-3.46%");
  });

  it("respects custom decimals", () => {
    expect(formatPercent(1.2345, 1)).toBe("+1.2%");
  });

  it("treats zero as positive", () => {
    expect(formatPercent(0)).toBe("+0.00%");
  });
});

describe("formatNumber", () => {
  it("formats with default 2 decimals", () => {
    expect(formatNumber(1234.567)).toBe("1,234.57");
  });

  it("respects custom decimals", () => {
    expect(formatNumber(1234.5, 0)).toBe("1,235");
  });

  it("formats small numbers", () => {
    expect(formatNumber(0.1, 4)).toBe("0.1000");
  });
});

describe("formatCompactNumber", () => {
  it("formats trillions", () => {
    expect(formatCompactNumber(2e12)).toBe("2.00T");
  });

  it("formats billions", () => {
    expect(formatCompactNumber(1.5e9)).toBe("1.50B");
  });

  it("formats millions", () => {
    expect(formatCompactNumber(3.7e6)).toBe("3.70M");
  });

  it("formats thousands", () => {
    expect(formatCompactNumber(9.1e3)).toBe("9.10K");
  });

  it("formats small numbers with 2 decimals", () => {
    expect(formatCompactNumber(42.567)).toBe("42.57");
  });

  it("handles negative millions", () => {
    expect(formatCompactNumber(-5e6)).toBe("-5.00M");
  });
});

describe("formatRisk", () => {
  it("formats to 3 decimal places", () => {
    expect(formatRisk(0.5)).toBe("0.500");
  });

  it("formats small risk values", () => {
    expect(formatRisk(0.123)).toBe("0.123");
  });

  it("formats high risk values", () => {
    expect(formatRisk(0.999)).toBe("0.999");
  });
});

describe("getRiskColor", () => {
  it("returns emerald for very low risk", () => {
    expect(getRiskColor(0.1)).toBe("bg-emerald-500");
    expect(getRiskColor(0.2)).toBe("bg-emerald-500");
  });

  it("returns green for low risk", () => {
    expect(getRiskColor(0.3)).toBe("bg-green-400");
    expect(getRiskColor(0.4)).toBe("bg-green-400");
  });

  it("returns lime for moderate risk", () => {
    expect(getRiskColor(0.5)).toBe("bg-lime-400");
  });

  it("returns yellow for elevated risk", () => {
    expect(getRiskColor(0.6)).toBe("bg-yellow-400");
  });

  it("returns amber for high risk", () => {
    expect(getRiskColor(0.7)).toBe("bg-amber-400");
  });

  it("returns orange for very high risk", () => {
    expect(getRiskColor(0.8)).toBe("bg-orange-400");
  });

  it("returns red-400 for severe risk", () => {
    expect(getRiskColor(0.9)).toBe("bg-red-400");
  });

  it("returns red-600 for extreme risk", () => {
    expect(getRiskColor(0.95)).toBe("bg-red-600");
  });
});

describe("getRiskTextColor", () => {
  it("returns emerald for low risk", () => {
    expect(getRiskTextColor(0.2)).toBe("text-emerald-600 dark:text-emerald-400");
  });

  it("returns lime for moderate risk", () => {
    expect(getRiskTextColor(0.4)).toBe("text-lime-600 dark:text-lime-400");
  });

  it("returns amber for elevated risk", () => {
    expect(getRiskTextColor(0.6)).toBe("text-amber-600 dark:text-amber-400");
  });

  it("returns red for high risk", () => {
    expect(getRiskTextColor(0.8)).toBe("text-red-600 dark:text-red-400");
  });

  it("handles boundary at 0.3", () => {
    expect(getRiskTextColor(0.3)).toBe("text-emerald-600 dark:text-emerald-400");
  });

  it("handles boundary at 0.5", () => {
    expect(getRiskTextColor(0.5)).toBe("text-lime-600 dark:text-lime-400");
  });

  it("handles boundary at 0.7", () => {
    expect(getRiskTextColor(0.7)).toBe("text-amber-600 dark:text-amber-400");
  });
});
