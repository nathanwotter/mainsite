import { z } from "zod";

export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().optional(),
});

export const archieAreaSchema = z.object({
  uuid: z.string().optional(),
  slug: z.string().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  archived: z.boolean().optional(),
}).passthrough();

export type ArchieArea = z.infer<typeof archieAreaSchema>;

export const conferenceRoomsResponseSchema = z.union([
  z.array(archieAreaSchema),
  z.object({
    data: z.array(archieAreaSchema),
    has_more: z.boolean().optional(),
    next_token: z.string().optional(),
    request_uuid: z.string().optional(),
    total_count: z.number().optional(),
    error: z.unknown().optional(),
  }).passthrough(),
  z.object({
    items: z.array(archieAreaSchema),
    has_more: z.boolean().optional(),
    next_token: z.string().optional(),
    request_uuid: z.string().optional(),
    total_count: z.number().optional(),
    error: z.unknown().optional(),
  }).passthrough(),
  z.object({
    results: z.array(archieAreaSchema),
    has_more: z.boolean().optional(),
    next_token: z.string().optional(),
    request_uuid: z.string().optional(),
    total_count: z.number().optional(),
    error: z.unknown().optional(),
  }).passthrough(),
]);

export const archieErrorResponseSchema = z.object({
  error: z.unknown(),
  request_uuid: z.string().optional(),
}).passthrough();

export function getConferenceRoomsFromResponse(response: z.infer<typeof conferenceRoomsResponseSchema>): ArchieArea[] {
  if (Array.isArray(response)) return response;
  const wrapped = response as { data?: ArchieArea[]; items?: ArchieArea[]; results?: ArchieArea[] };
  if (wrapped.data) return wrapped.data;
  if (wrapped.items) return wrapped.items;
  return wrapped.results ?? [];
}

export function getConferenceRoomsPagination(response: z.infer<typeof conferenceRoomsResponseSchema>) {
  if (Array.isArray(response)) return { has_more: false, next_token: undefined };
  const wrapped = response as { has_more?: boolean; next_token?: string };
  return {
    has_more: wrapped.has_more,
    next_token: wrapped.next_token,
  };
}

const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = z.preprocess((value) => value === "" || value === null ? undefined : value, nonEmptyString.optional());
const optionalText = z.preprocess((value) => value === null ? undefined : value, z.string().optional());
const nullableString = z.preprocess((value) => value === undefined ? undefined : value, z.string().nullable().optional());

export const archieUserSchema = z.object({
  uuid: z.string().optional(),
  id: z.string().optional(),
  fullname: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  email: z.string().optional(),
}).passthrough();

export const archieUserProfileSchema = archieUserSchema.superRefine((user, context) => {
  if (!user.uuid && !user.id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "User profile must include uuid or id",
      path: ["uuid"],
    });
  }
});

export type ArchieUserProfile = z.infer<typeof archieUserProfileSchema>;

export const archieGroupSchema = z.object({
  uuid: z.string().optional(),
  id: z.string().optional(),
  users: z.array(archieUserSchema).optional(),
}).passthrough();

export const archieGroupProfileSchema = archieGroupSchema.superRefine((group, context) => {
  if (!group.uuid && !group.id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Group profile must include uuid or id",
      path: ["uuid"],
    });
  }
});

export type ArchieGroupProfile = z.infer<typeof archieGroupProfileSchema>;

export const archieBookingSchema = z.object({
  uuid: optionalNonEmptyString,
  booking_key: optionalNonEmptyString,
  item_uuid: optionalNonEmptyString,
  conference_room: archieAreaSchema.optional(),
  start_date: optionalNonEmptyString,
  end_date: optionalNonEmptyString,
  cancelled: z.boolean().default(false),
  approval_status: nullableString,
  subscriber_type: z.enum(["user", "group", "google", "office-365"]).optional(),
  beneficiary_type: z.enum(["user", "group"]).optional(),
  subscriber_uuid: optionalNonEmptyString,
  beneficiary_uuid: optionalNonEmptyString,
  responsible: archieUserSchema.optional(),
  user_beneficiary: archieUserSchema.optional(),
  group_beneficiary: archieGroupSchema.optional(),
  user_subscriber: archieUserSchema.optional(),
  group_subscriber: archieGroupSchema.optional(),
  name: optionalText,
  description: optionalText,
  note: optionalText,
  full_day: z.boolean().optional(),
}).passthrough();

export const paginatedBookingsSchema = z.object({
  data: z.array(archieBookingSchema),
  has_more: z.boolean().optional(),
  next_token: z.string().optional(),
  request_uuid: z.string().optional(),
  total_count: z.number().optional(),
  error: z.unknown().optional(),
});

export type ArchieBooking = z.infer<typeof archieBookingSchema>;
