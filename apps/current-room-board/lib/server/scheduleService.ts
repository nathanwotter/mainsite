import { appTimezone } from "@/config/schedule";
import { LiveArchieScheduleAdapter } from "@/lib/archie/adapter";
import { MockArchieScheduleAdapter } from "@/lib/archie/mock";
import type { ScheduleLoadDiagnostics } from "@/lib/archie/types";
import { parseScheduleDate } from "@/lib/schedule/dateRange";
import { cachedSingleFlight } from "@/lib/server/cache";

export async function loadDailySchedule(dateParam: string | null) {
  return loadDailyScheduleWithDiagnostics(dateParam);
}

export async function loadDailyScheduleWithDiagnostics(dateParam: string | null, diagnostics?: ScheduleLoadDiagnostics) {
  const range = parseScheduleDate(dateParam, appTimezone);
  if (!range) return { error: "INVALID_DATE" as const };

  const useMock = process.env.USE_MOCK_ARCHIE_DATA !== "false";
  const adapter = useMock ? new MockArchieScheduleAdapter() : new LiveArchieScheduleAdapter();
  const locationId = process.env.ARCHIE_SPACE_DOMAIN || process.env.ARCHIE_LOCATION_ID || "mock-location";
  const key = `${locationId}:${range.date}`;

  return cachedSingleFlight(key, 45_000, () => adapter.getDailySchedule(range.date, appTimezone, diagnostics));
}
