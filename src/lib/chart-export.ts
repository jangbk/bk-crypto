const HEADER_HEIGHT = 48;
const PADDING = 16;
const WATERMARK_FONT = "10px ui-sans-serif, system-ui, sans-serif";
const TITLE_FONT = "bold 14px ui-sans-serif, system-ui, sans-serif";
const DATE_FONT = "11px ui-sans-serif, system-ui, sans-serif";

function formatExportDate(): string {
  const now = new Date();
  return now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * Find the largest visible canvas inside a container element.
 * Lightweight-charts may create multiple canvases; we want
 * the one with the biggest area (the main chart surface).
 */
function findMainCanvas(container: HTMLElement): HTMLCanvasElement | null {
  const canvases = container.querySelectorAll("canvas");
  if (canvases.length === 0) return null;

  let best: HTMLCanvasElement | null = null;
  let bestArea = 0;

  for (const c of canvases) {
    const area = c.width * c.height;
    if (area > bestArea) {
      bestArea = area;
      best = c;
    }
  }

  return best;
}

/**
 * Export the chart rendered inside `containerEl` as a PNG download.
 *
 * Uses native canvas API only -- no external dependencies.
 * Composites a header (title + date), the chart canvas, and a
 * "BK CRYPTO" watermark into a single image.
 */
export async function exportChartAsImage(
  containerEl: HTMLElement,
  title: string,
): Promise<void> {
  const sourceCanvas = findMainCanvas(containerEl);
  if (!sourceCanvas) {
    throw new Error("No chart canvas found");
  }

  const dark = isDarkMode();
  const bgColor = dark ? "#1a1a2e" : "#ffffff";
  const textColor = dark ? "#e2e8f0" : "#1e293b";
  const mutedColor = dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.18)";
  const dateColor = dark ? "#94a3b8" : "#64748b";

  const dpr = window.devicePixelRatio || 1;
  const chartW = sourceCanvas.width;
  const chartH = sourceCanvas.height;

  const headerPx = HEADER_HEIGHT * dpr;
  const padPx = PADDING * dpr;

  const totalW = chartW + padPx * 2;
  const totalH = chartH + headerPx + padPx * 2;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = totalW;
  exportCanvas.height = totalH;

  const ctx = exportCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, totalW, totalH);

  // Title (top-left of header)
  ctx.fillStyle = textColor;
  ctx.font = TITLE_FONT.replace("14px", `${14 * dpr}px`);
  ctx.textBaseline = "middle";
  ctx.fillText(title, padPx, headerPx / 2);

  // Date (top-right of header)
  ctx.fillStyle = dateColor;
  ctx.font = DATE_FONT.replace("11px", `${11 * dpr}px`);
  ctx.textAlign = "right";
  ctx.fillText(formatExportDate(), totalW - padPx, headerPx / 2);
  ctx.textAlign = "left";

  // Chart
  ctx.drawImage(sourceCanvas, padPx, headerPx);

  // Watermark (bottom-right, semi-transparent)
  ctx.fillStyle = mutedColor;
  ctx.font = WATERMARK_FONT.replace("10px", `${10 * dpr}px`);
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("BK CRYPTO", totalW - padPx, totalH - padPx / 2);

  // Download via blob
  return new Promise<void>((resolve, reject) => {
    exportCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to generate image blob"));
          return;
        }

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${title.replace(/[^a-zA-Z0-9가-힣 ]/g, "").replace(/\s+/g, "_")}_${formatExportDate().replace(/\./g, "").replace(/\s/g, "")}.png`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        resolve();
      },
      "image/png",
    );
  });
}
