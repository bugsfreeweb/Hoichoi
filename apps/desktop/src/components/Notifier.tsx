import { useEffect, useRef } from "react";
import { isTauri } from "../lib/tauri";

/**
 * Native desktop notifications for desk events.
 *
 * The web bell only works while someone is looking at the console. The desk is
 * often running behind the editor, so an event that needs a human — a provider
 * going into cooldown, a credential expiring, a cron that failed closed — should
 * surface as an OS notification.
 *
 * Rules this file keeps:
 * - It reads the same `/api/admin/notifications` endpoint the bell reads, so the
 *   two can never disagree.
 * - It notifies only for `warn` and `critical`, and only once per alert id: the
 *   poll runs every 30 s and re-notifying the same row would be a siren.
 * - Nothing is invented locally — no alert text is generated in the client.
 */

const POLL_MS = 30_000;
const MAX_SEEN = 200;

interface Alert {
  id: string;
  severity: "info" | "warn" | "critical";
  title_bn: string;
  body_bn: string | null;
  read_at: string | null;
}

export default function Notifier() {
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    let timer: number | undefined;

    const load = async (): Promise<void> => {
      try {
        const res = await fetch("http://localhost:3070/api/admin/notifications", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; alerts?: Alert[] };
        if (cancelled || !data.ok || !Array.isArray(data.alerts)) return;

        // The first poll seeds the seen set: an operator opening the desk should
        // not get a burst of OS popups for history they already know about.
        if (first.current) {
          for (const a of data.alerts) seen.current.add(a.id);
          first.current = false;
          return;
        }

        const { sendNotification, isPermissionGranted, requestPermission } = await import(
          "@tauri-apps/plugin-notification"
        );
        let granted = await isPermissionGranted();
        if (!granted) granted = (await requestPermission()) === "granted";
        if (!granted) return;

        for (const alert of data.alerts) {
          if (seen.current.has(alert.id)) continue;
          seen.current.add(alert.id);
          if (alert.severity === "info" || alert.read_at) continue;
          sendNotification({
            title: alert.severity === "critical" ? `হৈচৈ · জরুরি — ${alert.title_bn}` : `হৈচৈ — ${alert.title_bn}`,
            body: alert.body_bn ?? undefined,
          });
        }

        if (seen.current.size > MAX_SEEN) {
          seen.current = new Set(Array.from(seen.current).slice(-MAX_SEEN));
        }
      } catch {
        /* offline / server not up yet: the next poll retries */
      }
    };

    void load();
    timer = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return null;
}
