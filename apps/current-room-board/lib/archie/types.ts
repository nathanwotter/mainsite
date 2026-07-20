import type { RefreshTrigger } from "@/lib/schedule/refreshFlow";
import type { DailyRoomSchedule } from "@/lib/schedule/types";

export interface ScheduleLoadDiagnostics {
  refreshId?: string;
  trigger?: RefreshTrigger;
}

export interface ArchieScheduleAdapter {
  getDailySchedule(date: string, timezone: string, diagnostics?: ScheduleLoadDiagnostics): Promise<DailyRoomSchedule>;
}

export type ArchieApprovalStatus = string | null | undefined;
export type ArchieReservationStatus = ArchieApprovalStatus | "cancelled";

export type ArchieMappedStatus = "reserved" | "blocked" | "ignored";
export type ArchieApprovalDecision = "confirmed" | "occupied-unconfirmed" | "pending" | "rejected";

export class ArchieSchemaChangedError extends Error {
  constructor(message = "Archie schema changed") {
    super(message);
    this.name = "ArchieSchemaChangedError";
  }
}

export class ArchieAuthenticationError extends Error {
  constructor(message = "Archie authentication failed") {
    super(message);
    this.name = "ArchieAuthenticationError";
  }
}

export function mapArchieReservationStatus(input: {
  cancelled?: boolean;
  approval_status?: ArchieApprovalStatus;
}): ArchieMappedStatus {
  if (input.cancelled) return "ignored";
  const decision = approvalDecision(input.approval_status);
  if (decision === "rejected") return "ignored";
  if (decision === "pending") return "blocked";
  return "reserved";
}

export function approvalDecision(status: ArchieApprovalStatus): ArchieApprovalDecision {
  if (typeof status !== "string") return "occupied-unconfirmed";
  const normalized = status.trim().toLowerCase();
  if (normalized === "approved" || normalized === "confirmed") return "confirmed";
  if (normalized === "declined" || normalized === "rejected") return "rejected";
  if (normalized === "pending") return "pending";
  return "occupied-unconfirmed";
}
