import { expect, test } from "@playwright/test";

test("renders the room-column kiosk board without private data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Current Wellness")).toBeVisible();
  await expect(page.getByText("Confluence")).toBeVisible();
  await expect(page.getByText("Tributary")).toBeVisible();
  await expect(page.getByText("9:00 AM").first()).toBeVisible();
  await expect(page.getByText("Available", { exact: true })).toHaveCount(0);
  const layoutGap = await page.evaluate(() => {
    const topbar = document.querySelector(".topbar")?.getBoundingClientRect();
    const header = document.querySelector(".room-header-row")?.getBoundingClientRect();
    const scroll = document.querySelector(".calendar-scroll")?.getBoundingClientRect();
    return {
      toolbarToHeader: Math.round((header?.top ?? 0) - (topbar?.bottom ?? 0)),
      headerToGrid: Math.round((scroll?.top ?? 0) - (header?.bottom ?? 0)),
    };
  });
  expect(layoutGap).toEqual({ toolbarToHeader: 0, headerToGrid: 0 });
  await expect(page.getByLabel(/Sam, 9:15 AM to 10:00 AM/)).toBeVisible();

  const ninety = await page.getByLabel(/Amy, 8:00 AM to 9:30 AM/).boundingBox();
  const thirty = await page.getByLabel(/Lee, 11:00 AM to 11:30 AM/).boundingBox();
  expect(ninety?.height ?? 0).toBeGreaterThan(thirty?.height ?? 0);

  const gutterBefore = await page.getByText("9:00 AM").first().boundingBox();
  await page.locator(".calendar-wrap").evaluate((node) => { node.scrollLeft = 400; });
  await expect.poll(async () => {
    const gutterAfter = await page.getByText("9:00 AM").first().boundingBox();
    return Math.round(gutterAfter?.x ?? 0);
  }).toBe(Math.round(gutterBefore?.x ?? 0));
  await expect(page.locator("body")).not.toContainText("Private Client Name");
  await expect(page.locator("body")).not.toContainText("Sensitive");
  await expect(page.locator("body")).not.toContainText("example.com");
});
