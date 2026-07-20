export interface Page<T> {
  data: T[];
  has_more?: boolean;
  next_token?: string;
}

export async function collectPages<T>(loadPage: (startAfter?: string) => Promise<Page<T>>, maxPages = 20) {
  const results: T[] = [];
  const seenTokens = new Set<string>();
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const response = await loadPage(cursor);
    results.push(...response.data);
    if (!response.has_more) return results;
    if (!response.next_token || seenTokens.has(response.next_token)) {
      throw new Error("Malformed Archie pagination metadata");
    }
    seenTokens.add(response.next_token);
    cursor = response.next_token;
  }

  throw new Error("Archie pagination exceeded the maximum page count");
}
