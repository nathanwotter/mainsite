import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { setKioskAccessCookie, timingSafeMatches } from "@/lib/server/kioskSession";

const failures = new Map<string, { count: number; lastFailureAt: number }>();
const maxDelayMs = 10_000;

function clientKey(headerValue: string | null) {
  return headerValue?.split(",")[0]?.trim() || "unknown";
}

function delayFor(count: number) {
  return Math.min(maxDelayMs, count <= 1 ? 0 : 250 * 2 ** (count - 2));
}

async function activateKiosk(formData: FormData) {
  "use server";

  const expected = process.env.KIOSK_ACCESS_KEY;
  if (!expected) redirect("/");

  const headerStore = await headers();
  const key = clientKey(headerStore.get("x-forwarded-for") || headerStore.get("x-real-ip"));
  const failure = failures.get(key);
  if (failure) {
    const remainingDelay = delayFor(failure.count) - (Date.now() - failure.lastFailureAt);
    if (remainingDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingDelay));
    }
  }

  const provided = String(formData.get("key") || "");
  if (provided && timingSafeMatches(provided, expected)) {
    failures.delete(key);
    await setKioskAccessCookie(provided);
    redirect("/");
  }

  failures.set(key, { count: (failure?.count || 0) + 1, lastFailureAt: Date.now() });
  redirect("/kiosk/activate?error=1");
}

export default async function ActivatePage() {
  const expected = process.env.KIOSK_ACCESS_KEY;

  if (!expected) {
    redirect("/");
  }

  return (
    <main className="activation">
      <h1>Current Wellness</h1>
      <p>Kiosk activation key required.</p>
      <form action={activateKiosk}>
        <label htmlFor="key">Activation key</label>
        <input id="key" name="key" type="password" autoComplete="off" required />
        <button type="submit">Activate</button>
      </form>
    </main>
  );
}
