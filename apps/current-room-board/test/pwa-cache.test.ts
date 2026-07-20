import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("PWA cache policy", () => {
  it("does not include the schedule API in the service worker app shell cache", () => {
    const serviceWorker = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    const appShellBlock = serviceWorker.match(/const APP_SHELL = \[(?<body>[\s\S]*?)\];/)?.groups?.body || "";

    expect(appShellBlock).toContain('"/"');
    expect(appShellBlock).toContain('"/offline.html"');
    expect(appShellBlock).toContain('"/manifest.webmanifest"');
    expect(appShellBlock).toContain('"/icons/icon.svg"');
    expect(appShellBlock).not.toContain("/api/schedule");
    expect(serviceWorker).toContain('url.pathname.startsWith("/api/schedule")');
  });
});
