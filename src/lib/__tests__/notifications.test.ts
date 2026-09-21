import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showBrowserNotification, requestNotificationPermission } from "../notifications";

/**
 * 회귀 테스트 — Android Chrome 의 `new Notification()` 금지.
 *
 * 실제 Chrome on Android 는 생성자 호출 시 다음으로 throw 한다:
 *   TypeError: Failed to construct 'Notification': Illegal constructor.
 *              Use ServiceWorkerRegistration.showNotification() instead.
 *
 * 이 예외가 usePriceAlerts 의 useEffect 를 타고 루트 레이아웃까지 올라가
 * global-error.tsx ("심각한 오류가 발생했습니다") 를 띄웠다.
 * 어떤 경로로도 예외가 호출자에게 새지 않아야 한다.
 */

const ANDROID_MESSAGE =
  "Failed to construct 'Notification': Illegal constructor. " +
  "Use ServiceWorkerRegistration.showNotification() instead.";

function androidChromeNotification(permission: NotificationPermission = "granted") {
  const ctor = function () {
    throw new TypeError(ANDROID_MESSAGE);
  } as unknown as typeof Notification;
  Object.defineProperty(ctor, "permission", { value: permission, configurable: true });
  Object.defineProperty(ctor, "requestPermission", {
    value: () => Promise.resolve(permission),
    configurable: true,
  });
  return ctor;
}

const g = globalThis as Record<string, unknown>;
let savedNotification: unknown;
let savedNavigator: unknown;
let savedWindow: unknown;

beforeEach(() => {
  savedNotification = g.Notification;
  savedNavigator = g.navigator;
  savedWindow = g.window;
  // vitest environment 가 "node" 라 window 가 없다. 세우지 않으면
  // canNotify() 가 조기 반환해 모든 테스트가 거짓 통과한다.
  g.window = g;
});

afterEach(() => {
  g.Notification = savedNotification;
  if (savedWindow === undefined) delete g.window;
  else g.window = savedWindow;
  if (savedNavigator === undefined) delete g.navigator;
  else Object.defineProperty(g, "navigator", { value: savedNavigator, configurable: true });
  vi.restoreAllMocks();
});

function setNavigator(value: unknown) {
  Object.defineProperty(g, "navigator", { value, configurable: true, writable: true });
}

describe("showBrowserNotification on Android Chrome", () => {
  it("생성자가 throw 해도 예외를 밖으로 내보내지 않는다 (SW 없음)", () => {
    g.Notification = androidChromeNotification();
    setNavigator({});
    expect(() => showBrowserNotification("t", "b")).not.toThrow();
  });

  it("SW 등록이 있으면 showNotification 으로 보내고 생성자를 쓰지 않는다", async () => {
    const ctor = androidChromeNotification();
    g.Notification = ctor;
    const showNotification = vi.fn().mockResolvedValue(undefined);
    setNavigator({
      serviceWorker: { getRegistration: () => Promise.resolve({ showNotification }) },
    });

    expect(() => showBrowserNotification("title", "body", { tag: "x" })).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));

    expect(showNotification).toHaveBeenCalledWith("title", {
      body: "body",
      icon: "/favicon.ico",
      tag: "x",
    });
  });

  it("getRegistration 이 reject 해도 예외가 새지 않는다", async () => {
    g.Notification = androidChromeNotification();
    setNavigator({
      serviceWorker: { getRegistration: () => Promise.reject(new Error("no sw")) },
    });

    expect(() => showBrowserNotification("t", "b")).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });

  it("권한이 granted 가 아니면 아무것도 하지 않는다", () => {
    const ctor = androidChromeNotification("denied");
    g.Notification = ctor;
    setNavigator({});
    expect(() => showBrowserNotification("t", "b")).not.toThrow();
  });

  it("Notification 자체가 없는 환경에서 조용히 넘어간다", () => {
    delete g.Notification;
    setNavigator({});
    expect(() => showBrowserNotification("t", "b")).not.toThrow();
  });
});

describe("requestNotificationPermission", () => {
  it("requestPermission 이 throw 해도 예외를 내보내지 않는다", () => {
    const ctor = function () {} as unknown as typeof Notification;
    Object.defineProperty(ctor, "permission", { value: "default", configurable: true });
    Object.defineProperty(ctor, "requestPermission", {
      value: () => {
        throw new TypeError("legacy callback signature");
      },
      configurable: true,
    });
    g.Notification = ctor;
    setNavigator({});
    expect(() => requestNotificationPermission()).not.toThrow();
  });
});
