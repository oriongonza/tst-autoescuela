import { loadContentPack, resolveContentPack } from './index.mjs';

export const CHAPTER_3_PACK_ID = 'chapter-3-lantern-docks';
export const CHAPTER_3_PACK = resolveContentPack(CHAPTER_3_PACK_ID);

export async function loadChapter3LanternDocks(fetchImpl = globalThis.fetch) {
  return loadContentPack(CHAPTER_3_PACK_ID, fetchImpl);
}
