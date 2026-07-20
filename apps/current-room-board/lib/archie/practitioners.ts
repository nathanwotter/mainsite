import { archieFetch } from "@/lib/archie/client";
import {
  archieGroupProfileSchema,
  archieUserProfileSchema,
  type ArchieBooking,
} from "@/lib/archie/schemas";
import type { ScheduleLoadDiagnostics } from "@/lib/archie/types";
import { ArchieSchemaChangedError } from "@/lib/archie/types";
import { logRefreshDebug } from "@/lib/debug/refresh";

export interface PractitionerIdentity {
  id: string;
  displayName: string;
}

interface PublicUserLike {
  uuid?: string;
  id?: string;
  fullname?: string;
  firstname?: string;
  lastname?: string;
}

export interface PractitionerResolutionDiagnostics {
  attempted: number;
  succeeded: number;
  failed: number;
  failureMessages?: string[];
}

type PractitionerReference =
  | { kind: "user"; sourceField: "user_beneficiary" | "beneficiary_uuid"; id: string; embeddedUser?: PublicUserLike }
  | { kind: "group"; sourceField: "group_beneficiary" | "beneficiary_uuid"; id: string; embeddedGroup?: { users?: PublicUserLike[] } };

const RESERVED_PRACTITIONER: PractitionerIdentity = {
  id: "reserved",
  displayName: "Reserved",
};

const identityCache = new Map<string, { expiresAt: number; identity: PractitionerIdentity }>();
const cacheTtlMs = 5 * 60 * 1000;

export function clearPractitionerIdentityCache() {
  identityCache.clear();
}

export function practitionerReferenceFromBooking(booking: ArchieBooking): PractitionerReference | null {
  if (booking.beneficiary_type === "user") {
    const embeddedId = booking.user_beneficiary?.uuid || booking.user_beneficiary?.id;
    if (embeddedId) return { kind: "user", sourceField: "user_beneficiary", id: embeddedId, embeddedUser: booking.user_beneficiary };
    if (booking.beneficiary_uuid) return { kind: "user", sourceField: "beneficiary_uuid", id: booking.beneficiary_uuid };
  }

  if (booking.beneficiary_type === "group") {
    const embeddedId = booking.group_beneficiary?.uuid || booking.group_beneficiary?.id;
    if (embeddedId) return { kind: "group", sourceField: "group_beneficiary", id: embeddedId, embeddedGroup: booking.group_beneficiary };
    if (booking.beneficiary_uuid) return { kind: "group", sourceField: "beneficiary_uuid", id: booking.beneficiary_uuid };
  }

  return null;
}

export function practitionerSourceFieldForBooking(booking: ArchieBooking) {
  return practitionerReferenceFromBooking(booking)?.sourceField ?? null;
}

export async function resolvePractitionerIdentities(
  bookings: ArchieBooking[],
  spaceDomain: string,
  diagnostics?: PractitionerResolutionDiagnostics,
  loadDiagnostics?: ScheduleLoadDiagnostics,
) {
  const references = new Map<string, PractitionerReference>();
  for (const booking of bookings) {
    const reference = practitionerReferenceFromBooking(booking);
    if (reference && !references.has(cacheKey(spaceDomain, reference))) references.set(cacheKey(spaceDomain, reference), reference);
  }

  const identities = new Map<string, PractitionerIdentity>();
  await Promise.all(Array.from(references.entries()).map(async ([key, reference]) => {
    diagnostics && (diagnostics.attempted += 1);
    const identity = await resolvePractitionerIdentity(spaceDomain, reference, key, loadDiagnostics).catch((error: unknown) => {
      diagnostics?.failureMessages?.push(safeExceptionMessage(error));
      logRefreshDebug({
        refresh_id: loadDiagnostics?.refreshId,
        trigger: loadDiagnostics?.trigger,
        stage: "practitioner resolution",
        endpoint_path: practitionerEndpointPath(spaceDomain, reference),
        practitioner_lookup_failed: true,
        exact_exception: safeExceptionMessage(error),
      });
      return RESERVED_PRACTITIONER;
    });
    identities.set(referenceKey(reference), identity);
    if (identity.displayName === RESERVED_PRACTITIONER.displayName) {
      diagnostics && (diagnostics.failed += 1);
    } else {
      diagnostics && (diagnostics.succeeded += 1);
    }
  }));
  return identities;
}

export function practitionerDisplayNameForBooking(
  booking: ArchieBooking,
  identities: Map<string, PractitionerIdentity>,
) {
  const reference = practitionerReferenceFromBooking(booking);
  if (!reference) return RESERVED_PRACTITIONER.displayName;
  return identities.get(referenceKey(reference))?.displayName ?? RESERVED_PRACTITIONER.displayName;
}

export function practitionerLookupSucceededForBooking(
  booking: ArchieBooking,
  identities: Map<string, PractitionerIdentity>,
) {
  const reference = practitionerReferenceFromBooking(booking);
  if (!reference) return false;
  return identities.get(referenceKey(reference))?.displayName !== RESERVED_PRACTITIONER.displayName;
}

async function resolvePractitionerIdentity(
  spaceDomain: string,
  reference: PractitionerReference,
  key: string,
  diagnostics?: ScheduleLoadDiagnostics,
) {
  const cached = identityCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.identity;

  const identity = reference.kind === "group"
    ? await resolveGroupPractitionerIdentity(spaceDomain, reference, diagnostics)
    : await resolveUserPractitionerIdentity(spaceDomain, reference, diagnostics);

  identityCache.set(key, { expiresAt: Date.now() + cacheTtlMs, identity });
  return identity;
}

async function resolveUserPractitionerIdentity(
  spaceDomain: string,
  reference: Extract<PractitionerReference, { kind: "user" }>,
  diagnostics?: ScheduleLoadDiagnostics,
): Promise<PractitionerIdentity> {
  const endpointPath = `/spaces/${encodeURIComponent(spaceDomain)}/users/{userUUID}`;
  const response = await archieFetch(`/spaces/${encodeURIComponent(spaceDomain)}/users/${encodeURIComponent(reference.id)}`);
  logRefreshDebug({
    refresh_id: diagnostics?.refreshId,
    trigger: diagnostics?.trigger,
    stage: "practitioner user lookup",
    endpoint_path: endpointPath,
    http_status: response.status,
  });
  if (!response.ok) {
    return {
      id: reference.id,
      displayName: publicUserDisplayName(reference.embeddedUser) ?? RESERVED_PRACTITIONER.displayName,
    };
  }

  const parsed = archieUserProfileSchema.safeParse(await response.json());
  if (!parsed.success) throw new ArchieSchemaChangedError("Archie user schema changed");

  return {
    id: parsed.data.uuid || parsed.data.id || reference.id,
    displayName: publicUserDisplayName(parsed.data) ?? publicUserDisplayName(reference.embeddedUser) ?? RESERVED_PRACTITIONER.displayName,
  };
}

async function resolveGroupPractitionerIdentity(
  spaceDomain: string,
  reference: Extract<PractitionerReference, { kind: "group" }>,
  diagnostics?: ScheduleLoadDiagnostics,
): Promise<PractitionerIdentity> {
  const endpointPath = `/spaces/${encodeURIComponent(spaceDomain)}/groups/{groupUUID}`;
  const response = await archieFetch(`/spaces/${encodeURIComponent(spaceDomain)}/groups/${encodeURIComponent(reference.id)}`);
  logRefreshDebug({
    refresh_id: diagnostics?.refreshId,
    trigger: diagnostics?.trigger,
    stage: "practitioner group lookup",
    endpoint_path: endpointPath,
    http_status: response.status,
  });
  if (!response.ok) return RESERVED_PRACTITIONER;

  const parsed = archieGroupProfileSchema.safeParse(await response.json());
  if (!parsed.success) throw new ArchieSchemaChangedError("Archie group schema changed");

  const users = parsed.data.users ?? reference.embeddedGroup?.users ?? [];
  if (users.length !== 1) return RESERVED_PRACTITIONER;
  const user = users[0];
  const id = user?.uuid || user?.id;
  if (!id) return RESERVED_PRACTITIONER;

  return {
    id,
    displayName: publicUserDisplayName(user) ?? RESERVED_PRACTITIONER.displayName,
  };
}

export function publicUserDisplayName(user: PublicUserLike | undefined) {
  if (!user) return undefined;
  const name = user.fullname?.trim() || [user.firstname, user.lastname].filter(Boolean).join(" ").trim();
  if (!name) return undefined;
  const normalized = name.replace(/\s+/g, " ").slice(0, 80);
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(normalized)) return undefined;
  if (/https?:\/\//i.test(normalized)) return undefined;
  return normalized;
}

function referenceKey(reference: PractitionerReference) {
  return `${reference.kind}:${reference.id}`;
}

function cacheKey(spaceDomain: string, reference: PractitionerReference) {
  return `${spaceDomain}:${referenceKey(reference)}`;
}

function practitionerEndpointPath(spaceDomain: string, reference: PractitionerReference) {
  const resource = reference.kind === "group" ? "groups" : "users";
  const idLabel = reference.kind === "group" ? "{groupUUID}" : "{userUUID}";
  return `/spaces/${encodeURIComponent(spaceDomain)}/${resource}/${idLabel}`;
}

function safeExceptionMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300);
}
