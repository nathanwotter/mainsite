export function StaleDataBanner({ status }: { status: "loading" | "fresh" | "stale" | "offline" }) {
  if (status === "fresh" || status === "loading") return null;
  return (
    <div className="stale-banner" role="status">
      {status === "offline" ? "Offline - schedule may be out of date" : "Schedule refresh failed - showing last successful update"}
    </div>
  );
}
