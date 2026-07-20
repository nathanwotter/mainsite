"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { RefreshCcw, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { DailyRoomCalendar } from "@/components/schedule/DailyRoomCalendar";
import { StaleDataBanner } from "@/components/schedule/StaleDataBanner";
import { appTimezone } from "@/config/schedule";
import { logRefreshDebug } from "@/lib/debug/refresh";
import {
  failedRefreshState,
  isAbortLike,
  persistScheduleLocally,
  successfulRefreshState,
  type RefreshTrigger,
  type StoredSchedule,
} from "@/lib/schedule/refreshFlow";
import { idleResetMs, refreshIntervalMs, shouldRefreshWhenVisible, shouldResetDateAfterIdle } from "@/lib/schedule/refreshTimer";
import type { DailyRoomSchedule } from "@/lib/schedule/types";

type Status = "loading" | "fresh" | "stale" | "offline";
const storedScheduleKey = "current-room-board:last-schedule";
const storedUpdatedKey = "current-room-board:last-updated";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: appTimezone }).format(new Date());
}

export default function Home() {
  const [date, setDate] = useState(today);
  const [schedule, setSchedule] = useState<DailyRoomSchedule | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [clock, setClock] = useState(new Date());
  const abortRef = useRef<AbortController | null>(null);
  const scheduleRef = useRef<DailyRoomSchedule | null>(null);
  const refreshIdRef = useRef(0);
  const lastSuccessfulUpdateRef = useRef<string | null>(null);
  const dateRef = useRef(date);
  const lastActivityRef = useRef(Date.now());
  const lastIdleResetRef = useRef(0);
  const skipNextDateLoadRef = useRef(false);

  const refreshSeconds = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS || "60");
  const idleResetSeconds = Number(process.env.NEXT_PUBLIC_IDLE_RESET_SECONDS || "180");

  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js");
  }, []);

  const load = useCallback(async (trigger: RefreshTrigger = "manual refresh", scheduleDate = dateRef.current) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const refreshId = `${Date.now()}-${refreshIdRef.current + 1}`;
    refreshIdRef.current += 1;
    const startedAt = new Date().toISOString();
    logRefreshDebug({
      refresh_id: refreshId,
      trigger,
      stage: "start",
      started_at: startedAt,
      request_path: "/api/schedule",
      query_parameter_names: ["date"],
    });
    try {
      const response = await fetch(`/api/schedule?date=${scheduleDate}`, {
        signal: controller.signal,
        headers: {
          "X-Current-Room-Board-Refresh-Id": refreshId,
          "X-Current-Room-Board-Refresh-Trigger": trigger,
        },
      });
      logRefreshDebug({
        refresh_id: refreshId,
        trigger,
        stage: "api response",
        http_status: response.status,
        displayed_data_source: scheduleRef.current ? "previous" : null,
      });
      if (!response.ok) throw new Error(`Schedule refresh failed: ${response.status}`);
      const nextSchedule = await response.json() as DailyRoomSchedule;
      if (controller.signal.aborted || abortRef.current !== controller) {
        logRefreshDebug({
          refresh_id: refreshId,
          trigger,
          stage: "finish",
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          aborted: controller.signal.aborted,
          superseded: abortRef.current !== controller,
        });
        return;
      }
      const nextState = successfulRefreshState({
        schedule: nextSchedule,
        responseCacheHeader: response.headers.get("X-Current-Room-Board-Cache"),
      });
      scheduleRef.current = nextSchedule;
      lastSuccessfulUpdateRef.current = nextState.updatedTimestamp;
      setSchedule(nextState.schedule);
      setLastUpdated(nextState.updatedTimestamp);
      setStatus(nextState.status);
      try {
        persistScheduleLocally(window.localStorage, storedScheduleKey, storedUpdatedKey, nextSchedule, nextState.updatedTimestamp);
      } catch (storageError) {
        logRefreshDebug({
          refresh_id: refreshId,
          trigger,
          stage: "cache persistence",
          cache_persistence_failed: true,
          exception: storageError instanceof Error ? storageError.message : String(storageError),
        });
      }
      logRefreshDebug({
        refresh_id: refreshId,
        trigger,
        stage: "finish",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        displayed_data_source: nextState.displayedDataSource,
        bookings_returned: nextSchedule.reservations.length,
        last_successful_update: nextState.lastSuccessfulUpdate,
        displayed_updated_timestamp: nextState.updatedTimestamp,
        response_cache: nextState.responseCache,
      });
    } catch (error) {
      const aborted = isAbortLike(error) || controller.signal.aborted;
      const superseded = abortRef.current !== controller;
      if (aborted || superseded) {
        logRefreshDebug({
          refresh_id: refreshId,
          trigger,
          stage: "finish",
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          aborted,
          superseded,
        });
        return;
      }

      let storedSchedule: StoredSchedule | null = null;
      const rawStoredSchedule = window.localStorage.getItem(storedScheduleKey);
      if (rawStoredSchedule) {
        try {
          const restoredSchedule = JSON.parse(rawStoredSchedule) as DailyRoomSchedule;
          storedSchedule = {
            schedule: restoredSchedule,
            updatedAt: restoredSchedule.generatedAt,
          };
        } catch {
          window.localStorage.removeItem(storedScheduleKey);
          window.localStorage.removeItem(storedUpdatedKey);
        }
      }
      const nextState = failedRefreshState({
        existingSchedule: scheduleRef.current,
        storedSchedule,
        online: navigator.onLine,
      });
      if (nextState.schedule) {
        scheduleRef.current = nextState.schedule;
        setSchedule(nextState.schedule);
      }
      setLastUpdated(nextState.updatedTimestamp);
      setStatus(nextState.status);
      logRefreshDebug({
        refresh_id: refreshId,
        trigger,
        stage: "finish",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        displayed_data_source: nextState.displayedDataSource,
        bookings_returned: nextState.schedule?.reservations.length ?? 0,
        exact_exception: error instanceof Error ? error.message : String(error),
        aborted,
        superseded,
        last_successful_update: nextState.lastSuccessfulUpdate,
        displayed_updated_timestamp: nextState.updatedTimestamp,
      });
    }
  }, []);

  useEffect(() => {
    if (skipNextDateLoadRef.current) {
      skipNextDateLoadRef.current = false;
      return;
    }
    void load(scheduleRef.current ? "date navigation" : "initial load");
  }, [date, load]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    let timer: number;
    const intervalMs = refreshIntervalMs(refreshSeconds);
    const idleMs = idleResetMs(idleResetSeconds);
    const poll = () => {
      const now = Date.now();
      const todayDate = today();
      const idleResetDue = shouldResetDateAfterIdle(dateRef.current, todayDate, lastActivityRef.current, now, idleMs);
      const sameIdleBoundary = now - lastIdleResetRef.current < 1000;
      if (!document.hidden && !sameIdleBoundary && !idleResetDue) {
        void load("polling");
      }
      timer = window.setTimeout(poll, intervalMs);
    };
    timer = window.setTimeout(poll, intervalMs);
    const visible = () => {
      if (document.hidden) return;
      const now = Date.now();
      const todayDate = today();
      if (shouldResetDateAfterIdle(dateRef.current, todayDate, lastActivityRef.current, now, idleMs)) {
        skipNextDateLoadRef.current = true;
        dateRef.current = todayDate;
        setDate(todayDate);
        lastActivityRef.current = now;
        lastIdleResetRef.current = now;
        void load("idle reset", todayDate);
        return;
      }
      if (shouldRefreshWhenVisible(lastSuccessfulUpdateRef.current, now, intervalMs)) {
        void load("polling");
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [idleResetSeconds, load, refreshSeconds]);

  useEffect(() => {
    let timer: number;
    const idleMs = idleResetMs(idleResetSeconds);
    const markActivity = () => {
      lastActivityRef.current = Date.now();
      window.clearTimeout(timer);
      timer = window.setTimeout(checkIdle, idleMs);
    };
    const checkIdle = () => {
      const now = Date.now();
      if (document.hidden) {
        timer = window.setTimeout(checkIdle, idleMs);
        return;
      }
      const todayDate = today();
      if (shouldResetDateAfterIdle(dateRef.current, todayDate, lastActivityRef.current, now, idleMs)) {
        skipNextDateLoadRef.current = true;
        dateRef.current = todayDate;
        setDate(todayDate);
        lastActivityRef.current = now;
        lastIdleResetRef.current = now;
        void load("idle reset", todayDate);
        timer = window.setTimeout(checkIdle, idleMs);
        return;
      }
      timer = window.setTimeout(checkIdle, idleMs);
    };

    timer = window.setTimeout(checkIdle, idleMs);
    const events = ["pointerdown", "touchstart", "keydown"] as const;
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [idleResetSeconds, load]);

  const dateLabel = useMemo(() => format(parseISO(`${date}T12:00:00`), "EEEE, MMMM d"), [date]);

  const markControlActivity = () => {
    lastActivityRef.current = Date.now();
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>Current Wellness</span>
          <strong>{dateLabel}</strong>
        </div>
        <nav className="controls" aria-label="Schedule date controls">
          <button type="button" aria-label="Previous day" onClick={() => {
            markControlActivity();
            setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"));
          }}>
            <ChevronLeft size={24} />
          </button>
          <button type="button" onClick={() => {
            markControlActivity();
            setDate(today());
          }}>
            <CalendarDays size={20} />
            Today
          </button>
          <button type="button" aria-label="Next day" onClick={() => {
            markControlActivity();
            setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"));
          }}>
            <ChevronRight size={24} />
          </button>
          <button type="button" aria-label="Refresh schedule" onClick={() => {
            markControlActivity();
            void load("manual refresh");
          }}>
            <RefreshCcw size={22} />
          </button>
        </nav>
        <div className="status-stack">
          <span>{clock.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          <small>{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Loading"}</small>
        </div>
      </header>
      <StaleDataBanner status={status} />
      {schedule ? <DailyRoomCalendar schedule={schedule} /> : <div className="loading">Loading room schedule</div>}
    </main>
  );
}
