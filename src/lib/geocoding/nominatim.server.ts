import 'server-only';

/** Nominatim usage policy: max 1 request per second, process-wide. */
const MIN_INTERVAL_MS = 1100;

// Serialise requests through a promise chain and pace each one to the policy.
// One chain for every server caller (city check, approval geocoding).
let lastRequestStartedAt = 0;
let requestChain: Promise<void> = Promise.resolve();

export async function acquireNominatimSlot(): Promise<void> {
  const previous = requestChain;
  let release!: () => void;
  requestChain = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const waitMs = MIN_INTERVAL_MS - (Date.now() - lastRequestStartedAt);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestStartedAt = Date.now();
  release();
}
