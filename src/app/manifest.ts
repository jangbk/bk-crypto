import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BK CRYPTO - 종합 투자 분석 플랫폼",
    short_name: "BK CRYPTO",
    description: "크립토, 매크로, 전통 금융을 아우르는 종합 투자 분석 플랫폼",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1a1d2e",
    theme_color: "#2e3b8c",
    orientation: "portrait-primary",
    categories: ["finance", "business"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
