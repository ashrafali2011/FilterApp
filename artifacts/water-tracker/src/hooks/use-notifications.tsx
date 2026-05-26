import { useEffect, useRef, useCallback } from "react";

// ─── Audio ────────────────────────────────────────────────────────────────────

export function playNotificationChime() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5-E5-G5 ascending
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {}
}

export function playOverdueAlarm() {
  try {
    const ctx = new AudioContext();
    const notes = [783.99, 659.25, 523.25]; // G5-E5-C5 descending
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

// ─── Notification permission ──────────────────────────────────────────────────

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return Promise.resolve("denied");
  if (Notification.permission === "granted") return Promise.resolve("granted");
  if (Notification.permission === "denied") return Promise.resolve("denied");
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

// ─── Notified-set helpers ─────────────────────────────────────────────────────

const NOTIFIED_KEY = "aquatrack_notified";

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markNotified(key: string) {
  const set = getNotifiedSet();
  set.add(key);
  const arr = Array.from(set).slice(-500);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
}

function wasNotified(key: string): boolean {
  return getNotifiedSet().has(key);
}

/** Call this when toggling test-mode on so notifications re-fire immediately. */
export function clearNotifiedCache() {
  localStorage.removeItem(NOTIFIED_KEY);
}

function todayStamp(): string {
  return new Date().toISOString().split("T")[0];
}

/** Current minute slot — used for per-minute dedup in test mode */
function currentMinuteSlot(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
}

function showBrowserNotification(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/favicon.ico" });
  } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UpcomingItem {
  cartridgeId: number;
  cartridgeName: string;
  filterName: string;
  daysRemaining: number;
  status: string;
}

interface UseNotificationsOptions {
  enabled: boolean;
  /** Thresholds in days (normal) or minutes (testMode) */
  reminderThresholds: number[];
  upcoming: UpcomingItem[];
  /** When true, thresholds are treated as minutes, checks run every 30 s */
  testMode: boolean;
}

export function useNotifications({
  enabled,
  reminderThresholds,
  upcoming,
  testMode,
}: UseNotificationsOptions) {
  const checkedRef = useRef(false);

  const checkAndNotify = useCallback(() => {
    if (!enabled || upcoming.length === 0) return;

    const sorted = [...reminderThresholds].sort((a, b) => a - b);
    // tolerance: ±1 day in normal mode, ±2 minutes in test mode
    const tolerance = testMode ? 2 : 1;

    for (const item of upcoming) {
      const { cartridgeId, cartridgeName, filterName, daysRemaining, status } = item;

      // Convert to the active unit
      const valueRemaining = testMode ? daysRemaining * 1440 : daysRemaining;
      const unit = testMode ? "min" : "day";

      if (status === "overdue") {
        const slot = testMode ? currentMinuteSlot() : todayStamp();
        const key = `overdue_${cartridgeId}_${slot}`;
        if (!wasNotified(key)) {
          markNotified(key);
          playOverdueAlarm();
          const absVal = Math.abs(valueRemaining);
          showBrowserNotification(
            "⚠️ Overdue Replacement",
            `${filterName} › ${cartridgeName} is overdue by ${Math.round(absVal)} ${unit}${Math.round(absVal) !== 1 ? "s" : ""}`,
            key
          );
          break;
        }
      } else {
        const matchedThreshold = sorted.find(
          t => Math.abs(valueRemaining - t) <= tolerance
        );
        if (matchedThreshold !== undefined) {
          const slot = testMode ? currentMinuteSlot() : todayStamp();
          const key = `reminder_${cartridgeId}_${matchedThreshold}${unit}_${slot}`;
          if (!wasNotified(key)) {
            markNotified(key);
            playNotificationChime();
            showBrowserNotification(
              "🔔 Replacement Reminder",
              `${filterName} › ${cartridgeName} is due in ${Math.round(valueRemaining)} ${unit}${Math.round(valueRemaining) !== 1 ? "s" : ""}`,
              key
            );
            break;
          }
        }
      }
    }
  }, [enabled, reminderThresholds, upcoming, testMode]);

  // Check on mount + whenever upstream data changes
  useEffect(() => {
    if (upcoming.length === 0) return;
    checkAndNotify();
  }, [checkAndNotify, upcoming]);

  // Re-check on window focus
  useEffect(() => {
    const onFocus = () => checkAndNotify();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkAndNotify]);

  // Periodic check: every 30 s in test mode, every 60 min normally
  useEffect(() => {
    const ms = testMode ? 30_000 : 60 * 60 * 1000;
    const interval = setInterval(checkAndNotify, ms);
    return () => clearInterval(interval);
  }, [checkAndNotify, testMode]);
}

// ─── Test-mode localStorage helpers (used by Settings) ───────────────────────

const TEST_MODE_KEY = "aquatrack_notif_testmode";

export function getTestMode(): boolean {
  return localStorage.getItem(TEST_MODE_KEY) === "1";
}

export function setTestMode(on: boolean) {
  if (on) {
    localStorage.setItem(TEST_MODE_KEY, "1");
  } else {
    localStorage.removeItem(TEST_MODE_KEY);
  }
}
