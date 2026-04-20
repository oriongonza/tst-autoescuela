#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadContentIndex, loadContentPack, loadContentSchema } from '../src/content/index.mjs';
import { CHAPTER_1_PACK_ID } from '../src/content/chapter-1-crossing-fields.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const dataRoot = path.join(appRoot, 'data');

function makeFileFetch() {
  return async function fileFetch(urlLike) {
    const url = typeof urlLike === 'string' ? new URL(urlLike, pathToFileURL(appRoot + path.sep)) : urlLike;
    if (url.protocol !== 'file:') {
      throw new Error(`Unsupported URL protocol for local fetch: ${url.protocol}`);
    }

    const body = await fs.readFile(fileURLToPath(url), 'utf8');
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => JSON.parse(body),
      text: async () => body
    };
  };
}

const fileFetch = makeFileFetch();

function usage(exitCode = 1) {
  console.error('Usage: content-inspector.mjs <summary|list|show|validate> [entity] [id]');
  process.exit(exitCode);
}

async function loadPack() {
  return loadContentPack(CHAPTER_1_PACK_ID, fileFetch);
}

function printSummary(packData, schema, index) {
  const { manifest, concepts, traps, bosses, analogies, explanations, templates, questions } = packData;
  console.log(`${manifest.title} (${manifest.packId})`);
  console.log(`Schema: ${schema.schemaId}`);
  console.log(`Index packs: ${index.packs.length}`);
  console.log(`Counts: ${concepts.length} concepts, ${traps.length} traps, ${bosses.length} bosses, ${analogies.length} analogies, ${explanations.length} explanations, ${templates.length} templates, ${questions.length} questions`);
  console.log(`Region: ${manifest.region.name} -> ${manifest.submap.name}`);
  console.log(`Boss: ${manifest.bossId}`);
}

function printList(entity, items) {
  console.log(items.map((item) => `${item.id}\t${item.name || item.title || item.prompt}`).join('\n'));
  if (items.length === 0) {
    console.log('');
  }
}

function printJson(entity) {
  console.log(JSON.stringify(entity, null, 2));
}

function findById(items, id) {
  return items.find((item) => item.id === id);
}

function validatePack(packData, schema, index) {
  const errors = [];
  const arrays = ['concepts', 'traps', 'bosses', 'analogies', 'explanations', 'templates', 'questions'];
  const references = {
    concepts: new Map(packData.concepts.map((item) => [item.id, item])),
    traps: new Map(packData.traps.map((item) => [item.id, item])),
    bosses: new Map(packData.bosses.map((item) => [item.id, item])),
    analogies: new Map(packData.analogies.map((item) => [item.id, item])),
    explanations: new Map(packData.explanations.map((item) => [item.id, item])),
    templates: new Map(packData.templates.map((item) => [item.id, item]))
  };

  if (schema.schemaId !== 'road-master.annotation.v1') {
    errors.push(`Unexpected schema id: ${schema.schemaId}`);
  }

  if (!index.packs.some((pack) => pack.id === CHAPTER_1_PACK_ID)) {
    errors.push(`Missing pack index entry for ${CHAPTER_1_PACK_ID}`);
  }

  for (const entity of arrays) {
    const seen = new Set();
    for (const item of packData[entity]) {
      if (seen.has(item.id)) {
        errors.push(`Duplicate ${entity} id: ${item.id}`);
      }
      seen.add(item.id);
    }
  }

  for (const question of packData.questions) {
    if (!Array.isArray(question.choices) || question.choices.length !== 4) {
      errors.push(`Question ${question.id} must have exactly four choices.`);
    }
    if (question.answerIndex < 0 || question.answerIndex >= question.choices.length) {
      errors.push(`Question ${question.id} has an invalid answer index.`);
    }

    for (const conceptId of question.conceptIds || []) {
      if (!references.concepts.has(conceptId)) {
        errors.push(`Question ${question.id} references missing concept ${conceptId}`);
      }
    }
    if (!references.traps.has(question.trapId)) {
      errors.push(`Question ${question.id} references missing trap ${question.trapId}`);
    }
    if (!references.analogies.has(question.analogyId)) {
      errors.push(`Question ${question.id} references missing analogy ${question.analogyId}`);
    }
    if (!references.explanations.has(question.explanationId)) {
      errors.push(`Question ${question.id} references missing explanation ${question.explanationId}`);
    }
    if (!(question.bossIds || []).every((bossId) => references.bosses.has(bossId))) {
      errors.push(`Question ${question.id} references a missing boss.`);
    }
    if (!references.templates.has(references.explanations.get(question.explanationId).templateId)) {
      errors.push(`Question ${question.id} explanation template is missing.`);
    }
  }

  for (const trap of packData.traps) {
    if (!(trap.conceptIds || []).every((conceptId) => references.concepts.has(conceptId))) {
      errors.push(`Trap ${trap.id} references a missing concept.`);
    }
  }

  return errors;
}

async function main() {
  const command = process.argv[2] || 'summary';
  const entity = process.argv[3];
  const id = process.argv[4];
  const schema = await loadContentSchema(fileFetch);
  const index = await loadContentIndex(fileFetch);
  const packData = await loadPack();

  switch (command) {
    case 'summary':
      printSummary(packData, schema, index);
      return;
    case 'list':
      if (!entity) usage();
      if (entity === 'concepts' || entity === 'traps' || entity === 'bosses' || entity === 'analogies' || entity === 'explanations' || entity === 'templates' || entity === 'questions') {
        printList(entity, packData[entity]);
        return;
      }
      usage();
      return;
    case 'show':
      if (!entity || !id) usage();
      if (entity === 'questions' || entity === 'concepts' || entity === 'traps' || entity === 'bosses' || entity === 'analogies' || entity === 'explanations' || entity === 'templates') {
        const record = findById(packData[entity], id);
        if (!record) {
          throw new Error(`Missing ${entity.slice(0, -1)}: ${id}`);
        }
        printJson(record);
        return;
      }
      usage();
      return;
    case 'validate': {
      const errors = validatePack(packData, schema, index);
      if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exit(1);
      }
      console.log(`Validated ${packData.manifest.packId}: ${packData.questions.length} questions, ${packData.concepts.length} concepts, ${packData.traps.length} traps.`);
      return;
    }
    default:
      usage();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
