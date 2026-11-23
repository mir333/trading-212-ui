/** Pages are newest-first: take items until the first already-known id. */
export function mergePage<T>(
  knownIds: Set<string>,
  page: T[],
  idOf: (item: T) => string,
): { fresh: T[]; reachedKnown: boolean } {
  const fresh: T[] = [];
  for (const item of page) {
    if (knownIds.has(idOf(item))) return { fresh, reachedKnown: true };
    fresh.push(item);
  }
  return { fresh, reachedKnown: false };
}
