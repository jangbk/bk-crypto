import { describe, expect, it } from "vitest";

import {
  getCryptoRiskInsight,
  getMcapInsight,
  getRecessionInsight,
} from "../insights";

import type { InsightType } from "../insights";

describe("getMcapInsight", () => {
  describe("total tab", () => {
    it("returns caution for >= 3T", () => {
      const result = getMcapInsight("total", 3e12);
      expect(result.type).toBe<InsightType>("caution");
      expect(result.text).toContain("$3.0T");
    });

    it("returns bullish for >= 2T", () => {
      const result = getMcapInsight("total", 2.5e12);
      expect(result.type).toBe<InsightType>("bullish");
      expect(result.text).toContain("$2.5T");
    });

    it("returns bullish for >= 1T", () => {
      const result = getMcapInsight("total", 1.5e12);
      expect(result.type).toBe<InsightType>("bullish");
      expect(result.text).toContain("$1.5T");
    });

    it("returns neutral for < 1T", () => {
      const result = getMcapInsight("total", 0.5e12);
      expect(result.type).toBe<InsightType>("neutral");
      expect(result.text).toContain("$0.50T");
    });
  });

  describe("btc tab", () => {
    it("returns caution for >= 2T", () => {
      const result = getMcapInsight("btc", 2e12);
      expect(result.type).toBe<InsightType>("caution");
      expect(result.text).toContain("BTC");
    });

    it("returns bullish for >= 1T", () => {
      const result = getMcapInsight("btc", 1.5e12);
      expect(result.type).toBe<InsightType>("bullish");
    });

    it("returns bullish for < 1T", () => {
      const result = getMcapInsight("btc", 0.5e12);
      expect(result.type).toBe<InsightType>("bullish");
      expect(result.text).toContain("$0.50T");
    });
  });

  describe("eth tab", () => {
    it("returns bullish for >= 500B", () => {
      const result = getMcapInsight("eth", 500e9);
      expect(result.type).toBe<InsightType>("bullish");
      expect(result.text).toContain("ETH");
    });

    it("returns neutral for >= 200B", () => {
      const result = getMcapInsight("eth", 300e9);
      expect(result.type).toBe<InsightType>("neutral");
    });

    it("returns bullish for < 200B", () => {
      const result = getMcapInsight("eth", 100e9);
      expect(result.type).toBe<InsightType>("bullish");
    });
  });
});

describe("getCryptoRiskInsight", () => {
  it("returns bearish for >= 0.7", () => {
    const result = getCryptoRiskInsight(0.8);
    expect(result.type).toBe<InsightType>("bearish");
    expect(result.text).toContain("0.800");
  });

  it("returns caution for >= 0.5", () => {
    const result = getCryptoRiskInsight(0.6);
    expect(result.type).toBe<InsightType>("caution");
    expect(result.text).toContain("0.600");
  });

  it("returns neutral for >= 0.3", () => {
    const result = getCryptoRiskInsight(0.4);
    expect(result.type).toBe<InsightType>("neutral");
    expect(result.text).toContain("0.400");
  });

  it("returns bullish for >= 0.15", () => {
    const result = getCryptoRiskInsight(0.2);
    expect(result.type).toBe<InsightType>("bullish");
    expect(result.text).toContain("0.200");
  });

  it("returns bullish for < 0.15 (extreme low)", () => {
    const result = getCryptoRiskInsight(0.1);
    expect(result.type).toBe<InsightType>("bullish");
    expect(result.text).toContain("0.100");
  });

  it("handles exact boundary at 0.7", () => {
    const result = getCryptoRiskInsight(0.7);
    expect(result.type).toBe<InsightType>("bearish");
  });

  it("handles exact boundary at 0.5", () => {
    const result = getCryptoRiskInsight(0.5);
    expect(result.type).toBe<InsightType>("caution");
  });

  it("handles exact boundary at 0.3", () => {
    const result = getCryptoRiskInsight(0.3);
    expect(result.type).toBe<InsightType>("neutral");
  });

  it("handles exact boundary at 0.15", () => {
    const result = getCryptoRiskInsight(0.15);
    expect(result.type).toBe<InsightType>("bullish");
  });
});

describe("getRecessionInsight", () => {
  it("returns bearish for >= 0.6", () => {
    const result = getRecessionInsight(0.75);
    expect(result.type).toBe<InsightType>("bearish");
    expect(result.text).toContain("0.750");
  });

  it("returns caution for >= 0.3", () => {
    const result = getRecessionInsight(0.45);
    expect(result.type).toBe<InsightType>("caution");
    expect(result.text).toContain("0.450");
  });

  it("returns bullish for >= 0.1", () => {
    const result = getRecessionInsight(0.2);
    expect(result.type).toBe<InsightType>("bullish");
    expect(result.text).toContain("0.200");
  });

  it("returns bullish for < 0.1", () => {
    const result = getRecessionInsight(0.05);
    expect(result.type).toBe<InsightType>("bullish");
    expect(result.text).toContain("0.050");
  });

  it("handles exact boundary at 0.6", () => {
    const result = getRecessionInsight(0.6);
    expect(result.type).toBe<InsightType>("bearish");
  });

  it("handles exact boundary at 0.3", () => {
    const result = getRecessionInsight(0.3);
    expect(result.type).toBe<InsightType>("caution");
  });

  it("handles exact boundary at 0.1", () => {
    const result = getRecessionInsight(0.1);
    expect(result.type).toBe<InsightType>("bullish");
  });
});
