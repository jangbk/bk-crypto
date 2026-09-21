/**
 * 브라우저 알림 — Android Chrome 안전 래퍼.
 *
 * Android Chrome 은 `new Notification()` 을 금지하고 다음으로 throw 한다:
 *   TypeError: Failed to construct 'Notification': Illegal constructor.
 *              Use ServiceWorkerRegistration.showNotification() instead.
 *
 * usePriceAlerts 가 이 생성자를 루트 레이아웃(PriceAlertProvider) 안의
 * useEffect 에서 try/catch 없이 호출하고 있었다. 알림 권한을 허용한 채
 * 조건을 만족한 가격 알림이 하나라도 있으면, 폰 크롬에서는 어느 경로로
 * 들어오든 루트 경계(global-error.tsx)가 떴다. "심각한 오류가 발생했습니다".
 *
 * 알림 실패는 앱을 깨뜨릴 사유가 아니다 — 전부 삼킨다.
 */

const ICON = "/favicon.ico";

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** 권한 요청. 미지원 브라우저·거부 정책에서 throw 하지 않는다. */
export function requestNotificationPermission(): void {
  if (!canNotify()) return;
  try {
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {
    /* Safari 구버전 등 콜백 시그니처 — 무시 */
  }
}

/**
 * 알림 표시. SW 등록이 있으면 showNotification 을 쓰고(Android 필수),
 * 없을 때만 생성자로 내려간다. 어떤 경로든 예외가 밖으로 새지 않는다.
 */
export function showBrowserNotification(
  title: string,
  body: string,
  extra?: NotificationOptions,
): void {
  if (!canNotify()) return;
  if (Notification.permission !== "granted") return;

  const options: NotificationOptions = { body, icon: ICON, ...extra };

  const direct = () => {
    try {
      new Notification(title, options);
    } catch {
      /* Android Chrome 의 Illegal constructor 등 — 조용히 포기 */
    }
  };

  const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
  if (!sw?.getRegistration) {
    direct();
    return;
  }

  try {
    void sw
      .getRegistration()
      .then((reg) => (reg ? reg.showNotification(title, options) : direct()))
      .catch(direct);
  } catch {
    direct();
  }
}
