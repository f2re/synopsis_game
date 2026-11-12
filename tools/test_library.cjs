const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require(path.join(process.cwd(), 'apps/web/node_modules/typescript'));
const data = JSON.parse(fs.readFileSync('content/library/synoptic_library.json', 'utf8'));
const codebook = JSON.parse(fs.readFileSync('content/codebook/kn01_level1.json', 'utf8'));
const sources = JSON.parse(fs.readFileSync('content/sources/sources.json', 'utf8')).sources;
const compiled = ts.transpileModule(fs.readFileSync('apps/web/src/features/library/librarySearch.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });
const { searchLibrary, normalizeLibraryQuery, parseLibraryFavorites } = moduleExports;
const ids = new Set(data.articles.map(article => article.id));
const categoryIds = new Set(data.categories.map(category => category.id));
const sourceIds = new Set(sources.map(source => source.id));

assert.equal(ids.size, data.articles.length, 'Article identifiers must be unique');
assert.equal(sourceIds.size, sources.length, 'Source identifiers must be unique');
for (const article of data.articles) {
  assert.ok(categoryIds.has(article.category), `Unknown category for ${article.id}`);
  assert.ok(article.sources.length > 0, `No sources for ${article.id}`);
  assert.ok(article.paragraphs.length > 0 && article.summary && article.tip, `Incomplete article ${article.id}`);
  for (const source of article.sources) {
    assert.ok(sourceIds.has(source.source_id), `Unknown source ${source.source_id}`);
    assert.ok(source.locator, `No locator for ${article.id}`);
  }
  for (const related of article.related) assert.ok(ids.has(related), `Broken related link ${article.id} → ${related}`);
}
for (const page of codebook.pages) {
  assert.ok(sourceIds.has(page.sourceId), `Codebook source ${page.sourceId} must be resolvable`);
  assert.ok(page.sourceLocator, `Codebook page ${page.id} needs a precise locator`);
}
const queries = {
  'КН-01': 'kn01', 'кн 01': 'kn01', 'SYNOP': 'kn01',
  'Td': 'dew-point', 'T': 'air-temperature', '1snTTT': 'air-temperature',
  '5appp': 'pressure-tendency', 'АТ500': 'absolute-topography',
  'AT 500': 'absolute-topography', 'ОТ500/1000': 'relative-topography',
  'подъем карты': 'map-highlighting', 'подъём карты': 'map-highlighting',
  'направление ветра': 'wind',
};
for (const [query, expectedId] of Object.entries(queries)) {
  assert.equal(searchLibrary(data.articles, query)[0]?.id, expectedId, `Search should prefer ${expectedId} for ${query}`);
}
assert.equal(normalizeLibraryQuery('  ТЁПЛЫЙ—ФРОНТ  '), 'теплый фронт');
assert.equal(searchLibrary(data.articles, 'несуществующийтермин').length, 0, 'Empty search results must remain empty');
assert.equal(searchLibrary(data.articles, ' ').length, data.articles.length, 'Empty query returns the catalog');
assert.equal(searchLibrary(data.articles, 'Td')[0].id, 'dew-point', 'Short abbreviations must not match unrelated syllables first');
assert.equal(JSON.stringify(parseLibraryFavorites('{broken', ids)), '[]');
assert.equal(JSON.stringify(parseLibraryFavorites('{"dew-point":true}', ids)), '[]');
assert.equal(JSON.stringify(parseLibraryFavorites('["dew-point",null,0,"missing","dew-point","wind"]', ids)), '["dew-point","wind"]');
console.log(`PASS: ${data.articles.length} complete articles; source and related-link integrity; ${Object.keys(queries).length} realistic Russian/code searches; empty results; malformed/stale/duplicate bookmark recovery; ${codebook.pages.length} codebook locators.`);
