import { useEffect, useRef, useCallback } from "react";

// ─── Audio ────────────────────────────────────────────────────────────────────

export function playNotificationChime() {
  try {
    const ctx = new AudioContext();
    // Pleasant ascending C-E-G chime
    const notes = [523.25, 659.25, 783.99];
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
    // Close context after chime finishes
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // AudioContext may be blocked — silently ignore
  }
}

export function playOverdueAlarm() {
  try {
    const ctx = new AudioContext();
    // Two-note descending alarm: G-E
    const notes = [783.99, 659.25, 523.25];
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

// ─── Notification helpers ─────────────────────────────────────────────────────

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
  // Prune old entries — keep at most 500
  const arr = Array.from(set).slice(-500);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
}

function wasNotified(key: string): boolean {
  return getNotifiedSet().has(key);
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

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

function showBrowserNotification(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });
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
  reminderDays: number[];
  upcoming: UpcomingItem[];
}

export function useNotifications({ enabled, reminderDays, upcoming }: UseNotificationsOptions) {
  const checkedRef = useRef(false);

  const checkAndNotify = useCallback(() => {
    if (!enabled || upcoming.length === 0) return;

    const sortedReminders = [...reminderDays].sort((a, b) => a - b);

    for (const item of upcoming) {
      const { cartridgeId, cartridgeName, filterName, daysRemaining, status } = item;

      if (status === "overdue") {
        // Notify once per day for overdue items
        const key = `overdue_${cartridgeId}_${today()}`;
        if (!wasNotified(key)) {
          markNotified(key);
          playOverdueAlarm();
          showBrowserNotification(
            "⚠️ Overdue Replacement",
            `${filterName} › ${cartridgeName} is overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? "s" : ""}`,
            key
          );
          // Only fire alarm once per batch to avoid noise
          break;
        }
      } else {
        // Check if daysRemaining matches any reminder threshold (±1 day tolerance)
        const matchedDay = sortedReminders.find(
          d => Math.abs(daysRemaining - d) <= 1
        );
        if (matchedDay !== undefined) {
          const key = `reminder_${cartridgeId}_${matchedDay}d_${today()}`;
          if (!wasNotified(key)) {
            markNotified(key);
            playNotificationChime();
            showBrowserNotification(
              "🔔 Replacement Reminder",
              `${filterName} › ${cartridgeName} is due in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`,
              key
            );
            break; // One chime per check, next ones fire on next focus/load
          }
        }
      }
    }
  }, [enabled, reminderDays, upcoming]);

  // Check on mount + whenever data changes
  useEffect(() => {
    if (upcoming.length === 0) return;
    checkAndNotify();
  }, [checkAndNotify, upcoming]);

  // Re-check when window regains focus (user comes back to the tab)
  useEffect(() => {
    const onFocus = () => {
      checkedRef.current = false;
      checkAndNotify();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkAndNotify]);

  // Periodic check every 60 minutes while tab is open
  useEffect(() => {
    const interval = setInterval(checkAndNotify, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAndNotify]);
}
