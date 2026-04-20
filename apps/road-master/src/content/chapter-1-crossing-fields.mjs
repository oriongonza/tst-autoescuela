import { loadContentPack, resolveContentPack } from './index.mjs';

export const CHAPTER_1_PACK_ID = 'chapter-1-crossing-fields';
export const CHAPTER_1_PACK = resolveContentPack(CHAPTER_1_PACK_ID);

export async function loadChapter1CrossingFields(fetchImpl = globalThis.fetch) {
  return loadContentPack(CHAPTER_1_PACK_ID, fetchImpl);
}
