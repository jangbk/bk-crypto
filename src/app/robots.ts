import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/api/", "/member-login"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://bk-crypto.vercel.app"}/sitemap.xml`,
  };
}
