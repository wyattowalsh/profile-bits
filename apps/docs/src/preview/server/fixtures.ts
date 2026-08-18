/**
 * Docs preview fixtures wrap T110 static only (auth none, used by demo).
 * Never call GitHub. Do not embed a second JSON fixture pack.
 */

declare module "@profile-bits/integrations" {
  export function loadPreviewFixtures(): Promise<unknown>;
  export function getStaticFixtures(): unknown;
}

type T110StaticModule = {
  loadPreviewFixtures: () => unknown | Promise<unknown>;
  getStaticFixtures: () => unknown | Promise<unknown>;
};

async function importT110Static(): Promise<T110StaticModule> {
  return import("@profile-bits/integrations") as Promise<T110StaticModule>;
}

/** T310c entry: T110 static fixture payload. Auth none. Zero GitHub. */
export async function loadPreviewFixtures(): Promise<unknown> {
  const { loadPreviewFixtures: load } = await importT110Static();
  return load();
}

/** Re-export of T110 `getStaticFixtures` (same static pack, no second JSON). */
export async function getStaticFixtures(): Promise<unknown> {
  const { getStaticFixtures: get } = await importT110Static();
  return get();
}
