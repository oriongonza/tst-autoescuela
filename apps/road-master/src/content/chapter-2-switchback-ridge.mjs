import { loadContentPack, resolveContentPack } from './index.mjs';

export const CHAPTER_2_PACK_ID = 'chapter-2-switchback-ridge';
export const CHAPTER_2_PACK = resolveContentPack(CHAPTER_2_PACK_ID);

export async function loadChapter2SwitchbackRidge(fetchImpl = globalThis.fetch) {
  return loadContentPack(CHAPTER_2_PACK_ID, fetchImpl);
}
