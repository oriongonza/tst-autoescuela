const dataRoot = new URL('../../data/', import.meta.url);

export const ANNOTATION_SCHEMA_ID = 'road-master.annotation.v1';
export const CONTENT_INDEX_URL = new URL('content-index.json', dataRoot).href;
export const CONTENT_SCHEMA_URL = new URL('content-schema.json', dataRoot).href;

const contentPackDefinitions = [
  {
    id: 'chapter-1-crossing-fields',
    title: 'Chapter I: Crossing Fields',
    version: '0.1.0',
    kind: 'chapter',
    dataDir: 'chapter-1-crossing-fields',
    packUrl: new URL('chapter-1-crossing-fields/pack.json', dataRoot).href
  },
  {
    id: 'chapter-2-switchback-ridge',
    title: 'Chapter II: Switchback Ridge',
    version: '0.1.0',
    kind: 'chapter',
    dataDir: 'chapter-2-switchback-ridge',
    packUrl: new URL('chapter-2-switchback-ridge/pack.json', dataRoot).href
  },
  {
    id: 'chapter-3-lantern-docks',
    title: 'Chapter III: Lantern Docks',
    version: '0.1.0',
    kind: 'chapter',
    dataDir: 'chapter-3-lantern-docks',
    packUrl: new URL('chapter-3-lantern-docks/pack.json', dataRoot).href
  }
];

export const CONTENT_PACKS = Object.freeze(
  Object.fromEntries(contentPackDefinitions.map((pack) => [pack.id, Object.freeze({ ...pack })]))
);
export const CONTENT_PACK_IDS = Object.freeze(contentPackDefinitions.map((pack) => pack.id));

function asFetchUrl(urlLike) {
  return typeof urlLike === 'string' ? urlLike : urlLike.href;
}

export function listContentPacks() {
  return contentPackDefinitions.map((pack) => ({ ...pack }));
}

export function resolveContentPack(packId) {
  const pack = CONTENT_PACKS[packId];
  if (!pack) {
    throw new Error(`Unknown content pack: ${packId}`);
  }

  return pack;
}

export async function loadJson(url, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('loadJson requires a fetch implementation.');
  }

  const response = await fetchImpl(asFetchUrl(url));
  if (!response.ok) {
    throw new Error(`Failed to load ${asFetchUrl(url)}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function loadContentIndex(fetchImpl = globalThis.fetch) {
  return loadJson(CONTENT_INDEX_URL, fetchImpl);
}

export async function loadContentSchema(fetchImpl = globalThis.fetch) {
  return loadJson(CONTENT_SCHEMA_URL, fetchImpl);
}

export async function loadContentCatalog(fetchImpl = globalThis.fetch) {
  const index = await loadContentIndex(fetchImpl);
  const packs = (index.packs || []).map((pack) => ({
    ...resolveContentPack(pack.id),
    ...pack
  }));

  return {
    index,
    packs
  };
}

export async function loadContentPack(packId, fetchImpl = globalThis.fetch) {
  const pack = resolveContentPack(packId);
  const manifest = await loadJson(pack.packUrl, fetchImpl);
  const baseUrl = new URL('./', pack.packUrl);
  const fileEntries = Object.entries(manifest.files || {});
  const loaded = await Promise.all(
    fileEntries.map(async ([key, relativePath]) => {
      const data = await loadJson(new URL(relativePath, baseUrl), fetchImpl);
      return [key, data];
    })
  );

  return {
    manifest,
    ...Object.fromEntries(loaded)
  };
}
