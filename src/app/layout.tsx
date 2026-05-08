import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono, Orbitron } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { QueryProvider } from "@/components/layout/QueryProvider";
import { I18nProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { SidebarMain } from "@/components/layout/SidebarMain";
import { TickerTape } from "@/components/layout/TickerTape";
import { PWARegister } from "@/components/layout/PWARegister";
import ScrollToTop from "@/components/ui/ScrollToTop";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { PriceAlertProvider } from "@/components/providers/PriceAlertProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// 토큰 심볼·로고 디스플레이 한정. 본문엔 사용 X.
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1d2e" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "BK CRYPTO - 종합 투자 분석 플랫폼",
    template: "%s | BK CRYPTO",
  },
  description:
    "크립토, 매크로, 전통 금융을 아우르는 종합 투자 분석 플랫폼. 실시간 시장 데이터, 리스크 분석, AI 뉴스, 백테스트, DCA 시뮬레이션.",
  keywords: [
    "crypto",
    "bitcoin",
    "ethereum",
    "investment",
    "analysis",
    "portfolio",
    "macro",
    "on-chain",
  ],
  authors: [{ name: "BK INVESTMENT" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "BK INVESTMENT",
    title: "BK INVESTMENT - Investment Analysis Platform",
    description:
      "크립토, 매크로, 전통 금융을 아우르는 종합 투자 분석 플랫폼",
  },
  twitter: {
    card: "summary_large_image",
    title: "BK INVESTMENT",
    description: "크립토, 매크로, 전통 금융을 아우르는 종합 투자 분석 플랫폼",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${ibmPlexMono.variable} ${orbitron.variable} antialiased bg-background text-foreground`}
      >
        <I18nProvider>
          <ThemeProvider>
            <QueryProvider>
              <ToastProvider>
                <PriceAlertProvider>
                  <SidebarProvider>
                    {/* Skip to content for keyboard users */}
                    <a href="#main-content" className="skip-to-content">
                      본문으로 건너뛰기
                    </a>

                    {/* 상단 풀폭 티커 테이프 (32px) — sidebar 위에 노출 */}
                    <div className="fixed inset-x-0 top-0 z-50">
                      <TickerTape />
                    </div>

                    <Sidebar />

                    {/* Main column: sidebar 폭만큼 좌 padding 자동 적용 */}
                    <SidebarMain>
                      <Header />
                      <Breadcrumb />
                      <main id="main-content" className="min-h-[calc(100vh-6rem)]" role="main">
                        {children}
                      </main>
                      <Footer />
                    </SidebarMain>

                    <ScrollToTop />
                    <PWARegister />
                  </SidebarProvider>
                </PriceAlertProvider>
              </ToastProvider>
            </QueryProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
