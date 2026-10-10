// Limite le nombre d'essais par clé (ex. « adhesion:<ip> ») sur une fenêtre glissante.
// shortcut: compteur en mémoire, valable pour une seule instance du site ; passer à Redis/PostgreSQL si plusieurs réplicas.
const hits = new Map<string, number[]>();

/** true = autorisé (et compté, sauf record = false), false = limite atteinte. */
export function rateLimit(key: string, max: number, windowMs: number, { now = Date.now(), record = true } = {}): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  if (record) recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
