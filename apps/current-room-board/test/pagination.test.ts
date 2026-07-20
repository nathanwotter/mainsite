import { describe, expect, it } from "vitest";
import { collectPages } from "@/lib/archie/pagination";

describe("Archie pagination", () => {
  it("collects multiple pages", async () => {
    const items = await collectPages(async (cursor) => {
      if (!cursor) return { data: [1], has_more: true, next_token: "two" };
      return { data: [2], has_more: false };
    });
    expect(items).toEqual([1, 2]);
  });

  it("rejects repeated cursors", async () => {
    await expect(collectPages(async () => ({ data: [], has_more: true, next_token: "same" }))).rejects.toThrow(/pagination/);
  });
});
