import { NextResponse } from "next/server";
import { z } from "zod";
import type { ScheduleErrorCode } from "@/lib/schedule/types";
import { ArchieAuthenticationError, ArchieSchemaChangedError } from "@/lib/archie/types";
import { ArchieRateLimitError } from "@/lib/archie/client";
import type { ScheduleLoadDiagnostics } from "@/lib/archie/types";
import type { RefreshTrigger } from "@/lib/schedule/refreshFlow";
import { hasKioskAccess } from "@/lib/server/kioskSession";
import { loadDailyScheduleWithDiagnostics } from "@/lib/server/scheduleService";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function publicError(code: ScheduleErrorCode, status: number) {
  const message = code === "INVALID_DATE"
    ? "Choose a valid schedule date."
    : "The room schedule could not be refreshed.";
  return NextResponse.json({ error: { code, message } }, { status });
}

const refreshTriggers = new Set<RefreshTrigger>(["initial load", "polling", "manual refresh", "date navigation"]);

function requestDiagnostics(request: Request): ScheduleLoadDiagnostics {
  const trigger = request.headers.get("X-Current-Room-Board-Refresh-Trigger");
  return {
    refreshId: request.headers.get("X-Current-Room-Board-Refresh-Id") ?? undefined,
    trigger: trigger && refreshTriggers.has(trigger as RefreshTrigger) ? trigger as RefreshTrigger : undefined,
  };
}

export async function GET(request: Request) {
  if (!(await hasKioskAccess())) {
    return publicError("CONFIGURATION_ERROR", 401);
  }

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return publicError("INVALID_DATE", 400);

  try {
    const result = await loadDailyScheduleWithDiagnostics(parsed.data.date ?? null, requestDiagnostics(request));
    if ("error" in result) return publicError(result.error, 400);

    return NextResponse.json(result.value, {
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-Current-Room-Board-Cache": result.cache,
        "X-Current-Room-Board-Generated-At": result.value.generatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof ArchieSchemaChangedError || message.includes("schema")) return publicError("ARCHIE_SCHEMA_CHANGED", 502);
    if (error instanceof ArchieAuthenticationError || message.includes("authentication")) return publicError("ARCHIE_AUTHENTICATION_FAILED", 502);
    if (error instanceof ArchieRateLimitError || message.includes("rate")) return publicError("ARCHIE_RATE_LIMITED", 429);
    if (message.includes("Duplicate") || message.includes("ARCHIE_SPACE_DOMAIN") || message.includes("ARCHIE_LOCATION_ID")) {
      return publicError("CONFIGURATION_ERROR", 500);
    }
    return publicError("ARCHIE_UNAVAILABLE", 502);
  }
}
