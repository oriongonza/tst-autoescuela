import { ANNOTATION_SCHEMA_ID, CONTENT_SCHEMA_URL, loadContentSchema } from './index.mjs';

export { ANNOTATION_SCHEMA_ID, CONTENT_SCHEMA_URL, loadContentSchema };

export async function loadAnnotationSchema(fetchImpl = globalThis.fetch) {
  return loadContentSchema(fetchImpl);
}
