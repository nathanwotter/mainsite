import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

const cookieName = "current_room_board_session";
const sessionPrefix = "current-room-board:";

export function kioskSessionValue(key: string) {
  return createHash("sha256").update(`${sessionPrefix}${key}`).digest("hex");
}

export function timingSafeMatches(provided: string, expected: string) {
  const providedDigest = Buffer.from(kioskSessionValue(provided), "hex");
  const expectedDigest = Buffer.from(kioskSessionValue(expected), "hex");
  return providedDigest.length === expectedDigest.length && timingSafeEqual(providedDigest, expectedDigest);
}

export async function hasKioskAccess() {
  const key = process.env.KIOSK_ACCESS_KEY;
  if (!key) return true;
  return (await cookies()).get(cookieName)?.value === kioskSessionValue(key);
}

export async function setKioskAccessCookie(key: string) {
  (await cookies()).set(cookieName, kioskSessionValue(key), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
