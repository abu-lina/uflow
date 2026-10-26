// Tests that spawn shell scripts, git or jq run dozens of processes. On a shared machine under
// full-suite load a single spawn can take 10-100x longer, so the 5s default is too tight.
export const spawnTestTimeoutMs = 60_000;
