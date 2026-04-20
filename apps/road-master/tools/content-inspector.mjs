#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadContentCatalog, loadContentPack, loadContentSchema } from '../src/content/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

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
  console.error('Usage: content-inspector.mjs <summary|list|show|validate> [entity] [id] [packId]');
  process.exit(exitCode);
}

function countPack(packData) {
  return {
    concepts: packData.concepts.length,
    traps: packData.traps.length,
    bosses: packData.bosses.length,
    analogies: packData.analogies.length,
    explanations: packData.explanations.length,
    templates: packData.templates.length,
    questions: packData.questions.length
  };
}

function totalize(counts) {
  return counts.reduce(
    (acc, count) => {
      for (const key of Object.keys(count)) {
        acc[key] += count[key];
      }
      return acc;
    },
    {
      concepts: 0,
      traps: 0,
      bosses: 0,
      analogies: 0,
      explanations: 0,
      templates: 0,
      questions: 0
    }
  );
}

async function loadCatalogData() {
  const schema = await loadContentSchema(fileFetch);
  const catalog = await loadContentCatalog(fileFetch);
  const packs = await Promise.all(
    catalog.packs.map(async (pack) => ({
      descriptor: pack,
      data: await loadContentPack(pack.id, fileFetch)
    }))
  );

  return {
    schema,
    catalog,
    packs
  };
}

function printSummary(catalogData, selectedPackId = null) {
  const packs = selectedPackId
    ? catalogData.packs.filter((entry) => entry.descriptor.id === selectedPackId)
    : catalogData.packs;

  if (packs.length === 0) {
    throw new Error(`Unknown pack: ${selectedPackId}`);
  }

  const counts = packs.map((entry) => countPack(entry.data));
  const totals = totalize(counts);

  console.log(`Schema: ${catalogData.schema.schemaId}`);
  console.log(`Index packs: ${catalogData.catalog.index.packs.length}`);
  console.log(`Loaded packs: ${packs.length}`);
  for (const entry of packs) {
    const { manifest } = entry.data;
    const packCounts = countPack(entry.data);
    console.log(
      `${manifest.packId}\t${manifest.title}\t${packCounts.questions} questions\t${packCounts.concepts} concepts\t${packCounts.traps} traps\t${packCounts.bosses} bosses`
    );
  }
  console.log(
    `Totals: ${totals.concepts} concepts, ${totals.traps} traps, ${totals.bosses} bosses, ${totals.analogies} analogies, ${totals.explanations} explanations, ${totals.templates} templates, ${totals.questions} questions`
  );
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

function findRecordAcrossPacks(packs, entity, id, packId = null) {
  if (packId) {
    const pack = packs.find((entry) => entry.descriptor.id === packId);
    if (!pack) {
      throw new Error(`Unknown pack: ${packId}`);
    }
    const record = pack.data[entity].find((item) => item.id === id);
    return record ? { packId, record } : null;
  }

  const matches = [];
  for (const pack of packs) {
    const record = pack.data[entity].find((item) => item.id === id);
    if (record) {
      matches.push({ packId: pack.descriptor.id, record });
    }
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous ${entity.slice(0, -1)} id: ${id} matches ${matches.map((match) => match.packId).join(', ')}`);
  }

  return matches[0] || null;
}

function validatePack(packData, schema, index) {
  const errors = [];
  const manifest = packData.manifest;
  const arrays = ['concepts', 'traps', 'bosses', 'analogies', 'explanations', 'templates', 'questions'];
  const references = {
    concepts: new Map(packData.concepts.map((item) => [item.id, item])),
    traps: new Map(packData.traps.map((item) => [item.id, item])),
    bosses: new Map(packData.bosses.map((item) => [item.id, item])),
    analogies: new Map(packData.analogies.map((item) => [item.id, item])),
    explanations: new Map(packData.explanations.map((item) => [item.id, item])),
    templates: new Map(packData.templates.map((item) => [item.id, item]))
  };
  const validDifficulties = new Set(schema.enums.difficulty);
  const validArcs = new Set(schema.enums.arc);
  const indexEntry = index.packs.find((pack) => pack.id === manifest.packId);

  if (schema.schemaId !== 'road-master.annotation.v1') {
    errors.push(`Unexpected schema id: ${schema.schemaId}`);
  }
  if (!indexEntry) {
    errors.push(`Missing pack index entry for ${manifest.packId}`);
  }
  if (!index.packs.some((pack) => pack.id === manifest.packId)) {
    errors.push(`Pack ${manifest.packId} is missing from the content index.`);
  }

  if (manifest.region?.id !== packData.questions[0]?.regionId) {
    errors.push(`Pack ${manifest.packId} region id does not match the question region.`);
  }
  if (manifest.submap?.id !== packData.questions[0]?.submapId) {
    errors.push(`Pack ${manifest.packId} submap id does not match the question submap.`);
  }

  if (manifest.playableSlice?.questionCount !== packData.questions.length) {
    errors.push(`Pack ${manifest.packId} question count does not match playableSlice.`);
  }
  if (manifest.playableSlice?.conceptCount !== packData.concepts.length) {
    errors.push(`Pack ${manifest.packId} concept count does not match playableSlice.`);
  }
  if (manifest.playableSlice?.trapCount !== packData.traps.length) {
    errors.push(`Pack ${manifest.packId} trap count does not match playableSlice.`);
  }
  if (manifest.playableSlice?.bossCount !== packData.bosses.length) {
    errors.push(`Pack ${manifest.packId} boss count does not match playableSlice.`);
  }

  for (const entity of arrays) {
    const seen = new Set();
    for (const item of packData[entity]) {
      if (seen.has(item.id)) {
        errors.push(`Duplicate ${entity} id in ${manifest.packId}: ${item.id}`);
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
    if (!validDifficulties.has(question.difficulty)) {
      errors.push(`Question ${question.id} has invalid difficulty ${question.difficulty}.`);
    }
    if (!validArcs.has(question.arc)) {
      errors.push(`Question ${question.id} has invalid arc ${question.arc}.`);
    }
    if (question.regionId !== manifest.region?.id) {
      errors.push(`Question ${question.id} references the wrong region.`);
    }
    if (question.submapId !== manifest.submap?.id) {
      errors.push(`Question ${question.id} references the wrong submap.`);
    }
    if (!Array.isArray(question.bossIds) || question.bossIds.length === 0) {
      errors.push(`Question ${question.id} must reference at least one boss.`);
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
    } else {
      const explanation = references.explanations.get(question.explanationId);
      if (!references.templates.has(explanation.templateId)) {
        errors.push(`Question ${question.id} explanation template is missing.`);
      }
    }
    for (const bossId of question.bossIds || []) {
      if (!references.bosses.has(bossId)) {
        errors.push(`Question ${question.id} references missing boss ${bossId}`);
      }
    }
  }

  for (const trap of packData.traps) {
    if (!(trap.conceptIds || []).every((conceptId) => references.concepts.has(conceptId))) {
      errors.push(`Trap ${trap.id} references a missing concept.`);
    }
  }

  for (const analogy of packData.analogies) {
    if (!(analogy.sourceConceptIds || []).every((conceptId) => references.concepts.has(conceptId))) {
      errors.push(`Analogy ${analogy.id} references a missing concept.`);
    }
  }

  for (const explanation of packData.explanations) {
    if (!references.traps.has(explanation.trapId)) {
      errors.push(`Explanation ${explanation.id} references a missing trap.`);
    }
    if (!(explanation.conceptIds || []).every((conceptId) => references.concepts.has(conceptId))) {
      errors.push(`Explanation ${explanation.id} references a missing concept.`);
    }
  }

  for (const boss of packData.bosses) {
    if (!Array.isArray(boss.phases) || boss.phases.length === 0) {
      errors.push(`Boss ${boss.id} must have phases.`);
    }
    if (!boss.lines || !Array.isArray(boss.lines.intro) || !Array.isArray(boss.lines.defeat)) {
      errors.push(`Boss ${boss.id} must have intro and defeat lines.`);
    }
    if (!(boss.weaknessConceptIds || []).every((conceptId) => references.concepts.has(conceptId))) {
      errors.push(`Boss ${boss.id} references a missing concept.`);
    }
  }

  return errors;
}

async function main() {
  const command = process.argv[2] || 'summary';
  const entity = process.argv[3];
  const id = process.argv[4];
  const packId = process.argv[5];
  const catalogData = await loadCatalogData();

  switch (command) {
    case 'summary':
      printSummary(catalogData, entity === 'pack' ? id : null);
      return;
    case 'list':
      if (entity === 'packs') {
        printList('packs', catalogData.catalog.packs);
        return;
      }
      if (!entity) usage();
      if (entity === 'concepts' || entity === 'traps' || entity === 'bosses' || entity === 'analogies' || entity === 'explanations' || entity === 'templates' || entity === 'questions') {
        if (id) {
          const pack = catalogData.packs.find((entry) => entry.descriptor.id === id);
          if (!pack) {
            throw new Error(`Unknown pack: ${id}`);
          }
          printList(entity, pack.data[entity]);
          return;
        }

        const aggregated = catalogData.packs.flatMap((entry) =>
          entry.data[entity].map((record) => ({
            id: `${entry.descriptor.id}:${record.id}`,
            name: record.name || record.title || record.prompt
          }))
        );
        printList(entity, aggregated);
        return;
      }
      usage();
      return;
    case 'show':
      if (!entity || !id) usage();
      if (entity === 'pack') {
        const pack = catalogData.packs.find((entry) => entry.descriptor.id === id);
        if (!pack) {
          throw new Error(`Unknown pack: ${id}`);
        }
        printJson(pack.data.manifest);
        return;
      }
      if (entity === 'questions' || entity === 'concepts' || entity === 'traps' || entity === 'bosses' || entity === 'analogies' || entity === 'explanations' || entity === 'templates') {
        const record = findRecordAcrossPacks(catalogData.packs, entity, id, packId);
        if (!record) {
          throw new Error(`Missing ${entity.slice(0, -1)}: ${id}`);
        }
        printJson({
          packId: record.packId,
          record: record.record
        });
        return;
      }
      usage();
      return;
    case 'validate': {
      const selectedPacks = entity ? catalogData.packs.filter((entry) => entry.descriptor.id === entity) : catalogData.packs;
      if (entity && selectedPacks.length === 0) {
        throw new Error(`Unknown pack: ${entity}`);
      }

      const errors = [];
      for (const pack of selectedPacks) {
        const packErrors = validatePack(pack.data, catalogData.schema, catalogData.catalog.index);
        if (packErrors.length > 0) {
          errors.push(`Pack ${pack.descriptor.id}:`);
          errors.push(...packErrors.map((error) => `  - ${error}`));
        }
      }

      if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exit(1);
      }

      const totals = totalize(selectedPacks.map((entry) => countPack(entry.data)));
      console.log(
        `Validated ${selectedPacks.length} packs: ${totals.questions} questions, ${totals.concepts} concepts, ${totals.traps} traps, ${totals.bosses} bosses.`
      );
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
