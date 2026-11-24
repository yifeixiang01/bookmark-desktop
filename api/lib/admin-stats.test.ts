import { describe, it, expect } from "vitest";
import { summarizeState } from "./admin-stats";
describe("admin counters", () => {
  it("counts nested folders without exposing URLs or app content", () => {
    const state = {
      partitions: [
        {
          items: [
            { kind: "bookmark", bookmark: { url: "https://private.example" } },
            { kind: "group", group: { bookmarks: [{}, {}] } },
            { kind: "app", app: { text: "private note" } },
          ],
        },
      ],
    };
    expect(summarizeState(state)).toEqual({
      partitions: 1,
      folders: 1,
      bookmarks: 3,
      bytes: Buffer.byteLength(JSON.stringify(state)),
    });
  });
  it("handles absent and malformed legacy states", () => {
    expect(summarizeState(null)).toEqual({
      partitions: 0,
      folders: 0,
      bookmarks: 0,
      bytes: 0,
    });
    expect(
      summarizeState({
        partitions: [null, {}, { items: [null, { kind: "group" }] }],
      })
    ).toMatchObject({ partitions: 2, folders: 1, bookmarks: 0 });
  });
});
