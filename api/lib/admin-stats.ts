/** Only derived counters leave the server; malformed legacy sections are ignored. */
export function summarizeState(state: unknown) {
  let partitions = 0,
    folders = 0,
    bookmarks = 0;
  if (
    state &&
    typeof state === "object" &&
    "partitions" in state &&
    Array.isArray(state.partitions)
  ) {
    for (const partition of state.partitions) {
      if (!partition || typeof partition !== "object") continue;
      partitions++;
      if (!Array.isArray(partition.items)) continue;
      for (const item of partition.items) {
        if (!item || typeof item !== "object") continue;
        if (item.kind === "bookmark" && item.bookmark) bookmarks++;
        if (item.kind === "group") {
          folders++;
          if (Array.isArray(item.group?.bookmarks))
            bookmarks += item.group.bookmarks.length;
        }
      }
    }
  }
  return {
    partitions,
    folders,
    bookmarks,
    bytes: state == null ? 0 : Buffer.byteLength(JSON.stringify(state), "utf8"),
  };
}
