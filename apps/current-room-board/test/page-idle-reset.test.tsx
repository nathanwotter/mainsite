import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import type { DailyRoomSchedule } from "@/lib/schedule/types";

function scheduleFor(date: string): DailyRoomSchedule {
  return {
    date,
    timezone: "America/New_York",
    generatedAt: `${date}T16:00:00.000Z`,
    rooms: [
      { id: "room-1", name: "Confluence", sortOrder: 10 },
      { id: "room-2", name: "Basin", sortOrder: 20 },
    ],
    reservations: [],
  };
}

function requestDate(input: RequestInfo | URL) {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
  return new URL(url, "http://localhost").searchParams.get("date") ?? "";
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("page idle reset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T16:00:00.000Z"));
    process.env.NEXT_PUBLIC_IDLE_RESET_SECONDS = "180";
    process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS = "1000";
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const date = requestDate(input);
      return Response.json(scheduleFor(date), {
        headers: {
          "X-Current-Room-Board-Cache": "MISS",
        },
      });
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("returns to today after navigating away and becoming idle", async () => {
    render(<Home />);
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Next day"));
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Tuesday, July 21")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });

    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(screen.getByText("Monday, July 20")).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/schedule?date=2026-07-20",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Current-Room-Board-Refresh-Trigger": "idle reset",
        }),
      }),
    );
  });

  it("resets the idle timer on interaction", async () => {
    render(<Home />);
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Next day"));
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    fireEvent.keyDown(window, { key: "Shift" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(screen.getByText("Tuesday, July 21")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(screen.getByText("Monday, July 20")).toBeInTheDocument();
  });

  it("does nothing on idle timeout when the board is already on today", async () => {
    render(<Home />);
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });

    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Monday, July 20")).toBeInTheDocument();
  });

  it("continues normal polling past the idle threshold while already on today", async () => {
    process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS = "60";
    render(<Home />);
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(4);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(5);

    const postInitialTriggers = vi.mocked(fetch).mock.calls
      .slice(1)
      .map(([, init]) => (init as RequestInit).headers as Record<string, string>)
      .map((headers) => headers["X-Current-Room-Board-Refresh-Trigger"]);
    expect(postInitialTriggers).toEqual(["polling", "polling", "polling", "polling"]);
  });

  it("cleans up idle timers and activity listeners on unmount", async () => {
    const { unmount } = render(<Home />);
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(1);

    unmount();
    fireEvent.pointerDown(window);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fetches today only once during an idle reset", async () => {
    render(<Home />);
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Previous day"));
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });

    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(3);
    const todayFetches = vi.mocked(fetch).mock.calls
      .map(([input]) => requestDate(input))
      .filter((date) => date === "2026-07-20");
    expect(todayFetches).toHaveLength(2);
  });

  it("does not run polling and idle reset as duplicate requests on the same boundary", async () => {
    process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS = "60";
    render(<Home />);
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Next day"));
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(4);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/schedule?date=2026-07-20",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Current-Room-Board-Refresh-Trigger": "idle reset",
        }),
      }),
    );
  });

  it("checks stale data and idle reset when returning from the background", async () => {
    process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS = "60";
    render(<Home />);
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Next day"));
    await flushEffects();
    expect(fetch).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    fireEvent(document, new Event("visibilitychange"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(181_000);
    });

    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    fireEvent(document, new Event("visibilitychange"));
    await flushEffects();

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/schedule?date=2026-07-20",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Current-Room-Board-Refresh-Trigger": "idle reset",
        }),
      }),
    );
    expect(screen.getByText("Monday, July 20")).toBeInTheDocument();
  });
});
