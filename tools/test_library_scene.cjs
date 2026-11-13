/** Full-screen reading-room acceptance against production assets and the real server.
 * Called first by test_station_screens.cjs in both browser jobs.
 * Fast iteration: STATION_SCREEN_PHASES=library node tools/test_station_screens.cjs
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const library = JSON.parse(fs.readFileSync('content/library/synoptic_library.json', 'utf8'));
const dewPoint = library.articles.find(article => article.id === 'dew-point');
const SETTINGS = 'synopsis_26063_settings';

const nextPaint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

/** Sweep the union of actual visible UI rectangles; nested/overlapping areas count once.
 * Markers identify intentional panels, but visible surfaces, controls and text are
 * discovered independently so an omitted marker cannot inflate the open scene.
 */
async function measureLibraryScene(page, report, name, { expanded = false } = {}) {
  await page.locator('[data-library-scene]').waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('[data-library-scene] img')].map(img => img.decode()));
  });
  await nextPaint(page);
  const metric = await page.evaluate(() => {
    const main = document.querySelector('main');
    const scene = main.querySelector('[data-library-scene]');
    const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const boxOf = node => {
      const r = node.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    function clip(node, box, includeSelf = false) {
      const result = { left: Math.max(0, box.left), right: Math.min(innerWidth, box.right), top: Math.max(0, box.top), bottom: Math.min(innerHeight, box.bottom) };
      for (let current = node; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) return null;
        if (current === node && !includeSelf) continue;
        const r = current.getBoundingClientRect();
        if (style.overflowX !== 'visible') {
          result.left = Math.max(result.left, r.left + current.clientLeft);
          result.right = Math.min(result.right, r.left + current.clientLeft + current.clientWidth);
        }
        if (style.overflowY !== 'visible') {
          result.top = Math.max(result.top, r.top + current.clientTop);
          result.bottom = Math.min(result.bottom, r.top + current.clientTop + current.clientHeight);
        }
      }
      return result.right > result.left && result.bottom > result.top ? result : null;
    }
    const rectangles = [];
    function add(node, reason, rect = boxOf(node), includeSelf = false) {
      const clipped = clip(node, rect, includeSelf);
      if (clipped) rectangles.push({ ...clipped, reason, element: node.id || node.className || node.tagName });
    }
    const alpha = color => color !== 'transparent'
      && !/^rgba\([^,]+,[^,]+,[^,]+,\s*0(?:\.0+)?\s*\)$/.test(color)
      && !/\/\s*0(?:\.0+)?%?\s*\)$/.test(color);
    for (const node of main.querySelectorAll('*')) {
      if (!(node instanceof HTMLElement) || scene.contains(node) || node.contains(scene)) continue;
      const style = getComputedStyle(node);
      if (node.hasAttribute('data-scene-occluder')) add(node, 'declared-panel');
      if (alpha(style.backgroundColor) || style.backgroundImage !== 'none') add(node, 'painted-surface');
      if (node.matches('button,input,select,textarea,summary,[role="scrollbar"],h1,h2,h3,h4,p,label')) add(node, 'visible-control-or-text-block');
      for (const child of node.childNodes) if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
        const range = document.createRange(); range.selectNodeContents(child);
        for (const rect of range.getClientRects()) add(node, 'visible-text', rect, true);
      }
    }
    const edges = [...new Set(rectangles.flatMap(r => [r.left, r.right]))].sort((a, b) => a - b);
    let occupied = 0;
    for (let i = 1; i < edges.length; i++) {
      const x0 = edges[i - 1], x1 = edges[i];
      const intervals = rectangles.filter(r => r.left < x1 && r.right > x0).map(r => [r.top, r.bottom]).sort((a, b) => a[0] - b[0]);
      let total = 0, top = -1, bottom = -1;
      for (const [y0, y1] of intervals) {
        if (y0 > bottom) { if (bottom >= top && top >= 0) total += bottom - top; top = y0; bottom = y1; }
        else bottom = Math.max(bottom, y1);
      }
      if (top >= 0) total += bottom - top;
      occupied += (x1 - x0) * total;
    }
    const images = [...scene.querySelectorAll('img')].map(img => ({
      url: new URL(img.src).pathname, natural: [img.naturalWidth, img.naturalHeight], box: boxOf(img),
      fit: getComputedStyle(img).objectFit, rendering: getComputedStyle(img).imageRendering,
      clipped: clip(img, boxOf(img)),
    }));
    return { viewport: [innerWidth, innerHeight], scene: boxOf(scene), sceneClipped: clip(scene, boxOf(scene)),
      images, declaredPanels: rectangles.filter(r => r.reason === 'declared-panel'), occupiedArea: occupied,
      openSceneFraction: 1 - occupied / (innerWidth * innerHeight), measuredRectangles: rectangles,
      canvasCount: document.querySelectorAll('canvas').length,
      mainViewport: viewport, reducedMotion: document.documentElement.dataset.reducedMotion, lowPower: document.documentElement.dataset.lowPower,
      raining: scene.dataset.raining, paused: scene.dataset.paused,
      animatedDrops: [...scene.querySelectorAll('.station-room-art__drop')].filter(node => {
        const style = getComputedStyle(node); return style.display !== 'none' && style.animationName !== 'none';
      }).length };
  });
  report.cases.push({ name, ...metric, expanded, measurement: 'Union of visible panels, painted surfaces, controls and text; translucent panels count as occupied' });
  const [width, height] = metric.viewport;
  assert.ok(metric.sceneClipped && metric.sceneClipped.left <= 2 && metric.sceneClipped.top <= 2
    && metric.sceneClipped.right >= width - 2 && metric.sceneClipped.bottom >= height - 2,
  `${name}: room covers the entire application viewport: ${JSON.stringify(metric.sceneClipped)}`);
  assert.ok(metric.declaredPanels.length >= 2, `${name}: navigation and working surfaces are identified`);
  assert.equal(metric.canvasCount, 0, `${name}: reading room does not retain the station renderer`);
  assert.ok(metric.images.length >= 2, `${name}: actual window and interior artwork remain separate layers`);
  for (const img of metric.images) {
    assert.ok(img.natural[0] > 0 && img.natural[1] > 0, `${name}: ${img.url} decoded`);
    const ratio = img.box.width / img.box.height / (img.natural[0] / img.natural[1]);
    assert.ok(img.fit === 'cover' || Math.abs(1 - ratio) < .01,
      `${name}: artwork keeps its original aspect ratio: ${JSON.stringify(img)}`);
    assert.ok(img.clipped && img.clipped.left <= 2 && img.clipped.top <= 2
      && img.clipped.right >= width - 2 && img.clipped.bottom >= height - 2,
    `${name}: actual image layer covers the viewport, not just its wrapper`);
  }
  if (!expanded) assert.ok(metric.openSceneFraction > .5, `${name}: more than half of the scene remains open; measured ${metric.openSceneFraction}`);
  return metric;
}

async function runLibrarySceneChecks({ base, browser, report, capture, output }) {
  const { checkHitTarget, exerciseScrollbar } = require('./test_all_screens_browser.cjs');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(key => localStorage.setItem(key, JSON.stringify({ weather: 'rain', soundEnabled: false })), SETTINGS);
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ scenario: 'library-scene', viewport: viewport.width, message: error.message }));
    try {
      await page.goto(base + '/library');
      await page.getByRole('heading', { name: 'Библиотека синоптика', exact: true }).waitFor();
      await measureLibraryScene(page, report, `library-scene-entry-geometry-${viewport.width}`);
      await capture(page, `library-scene-entry-${viewport.width}`);
      const search = page.getByLabel('Что хотите найти?', { exact: true });
      await checkHitTarget(search, 'Library search');
      await search.fill('точка росы');
      assert.deepEqual(await page.locator('.library-result').evaluateAll(results => results.map(result => result.dataset.articleId)),
        ['dew-point', 'dewpoint-depression'], 'Search returns and ranks the two real dew-point articles');
      await measureLibraryScene(page, report, `library-scene-search-geometry-${viewport.width}`);
      await capture(page, `library-scene-search-${viewport.width}`);
      const result = page.locator('.library-result').first();
      await checkHitTarget(result, 'Library search result');
      await result.focus();
      const catalogueViewport = page.locator('.library-catalog-scroll > .pixel-scroll-area__viewport');
      const cataloguePosition = await catalogueViewport.evaluate(node => node.scrollTop);
      await result.press('Enter');
      const heading = page.getByRole('heading', { name: 'Точка росы', exact: true });
      await heading.waitFor();
      await page.waitForFunction(() => document.activeElement === document.querySelector('#library-article-heading'));
      assert.equal((await page.locator('.library-definition').innerText()).trim(), dewPoint.summary, 'Scientific definition is unchanged');
      for (const ref of dewPoint.sources) assert.ok((await page.locator('.library-sources').innerText()).includes(ref.locator), 'Exact source locator is preserved');
      await measureLibraryScene(page, report, `library-scene-reader-geometry-${viewport.width}`);
      await capture(page, `library-scene-reader-${viewport.width}`);
      const reader = page.locator('.library-reader-scroll');
      const readerViewport = reader.locator(':scope > .pixel-scroll-area__viewport');
      await exerciseScrollbar(page, reader, report, `library-scene-reader-scroll-${viewport.width}`);
      const expand = page.getByRole('button', { name: 'Развернуть чтение', exact: true });
      await checkHitTarget(expand, 'Expand reading');
      await expand.focus(); await expand.press('Enter');
      const collapse = page.getByRole('button', { name: 'Свернуть чтение', exact: true });
      await collapse.waitFor();
      await measureLibraryScene(page, report, `library-scene-expanded-geometry-${viewport.width}`, { expanded: true });
      await capture(page, `library-scene-expanded-${viewport.width}`);
      await checkHitTarget(collapse, 'Collapse reading');
      await collapse.focus(); await collapse.press('Space');
      await expand.waitFor();
      await page.waitForFunction(() => document.activeElement?.textContent.includes('Развернуть чтение'));
      await measureLibraryScene(page, report, `library-scene-collapsed-geometry-${viewport.width}`);
      if (viewport.width === 390) {
        // Scroll with user input; preserving this position is meaningful on a narrow reader.
        await readerViewport.hover(); await page.mouse.wheel(0, 110);
        await page.waitForFunction(() => document.querySelector('.library-reader-scroll > .pixel-scroll-area__viewport').scrollTop > 10);
        const saved = await readerViewport.evaluate(node => {
          const top = node.getBoundingClientRect().top;
          const block = [...node.querySelectorAll('[data-reading-block]')].find(element => element.getBoundingClientRect().bottom > top + 1);
          return { scrollTop: node.scrollTop, block: block?.dataset.readingBlock, text: block?.textContent, offset: block ? block.getBoundingClientRect().top - top : 0 };
        });
        await expand.click(); await collapse.waitFor(); await nextPaint(page);
        const position = () => readerViewport.evaluate((node, saved) => {
          const block = node.querySelector(`[data-reading-block="${saved.block}"]`);
          return { scrollTop: node.scrollTop, max: node.scrollHeight - node.clientHeight,
            text: block?.textContent, offset: block ? block.getBoundingClientRect().top - node.getBoundingClientRect().top : null };
        }, saved);
        const enlarged = await position();
        assert.equal(enlarged.text, saved.text, 'Expanding retains the same scientific paragraph');
        assert.ok(Math.abs(enlarged.offset - saved.offset) <= 3 || enlarged.scrollTop >= enlarged.max - 2,
          `Expanding retains the reading anchor unless the new bottom clamps scrolling: ${JSON.stringify({ saved, enlarged })}`);
        await collapse.click(); await expand.waitFor(); await nextPaint(page);
        const restored = await position();
        assert.equal(restored.text, saved.text);
        assert.ok(Math.abs(restored.offset - saved.offset) <= 3, `Collapsing restores the prior reading anchor: ${JSON.stringify({ saved, restored })}`);
        report.cases.push({ name: 'library-scene-reading-position-390', before: saved, expanded: enlarged, restored });
      }
      const sourceButton = page.getByRole('button', { name: 'Источники', exact: true });
      await checkHitTarget(sourceButton, 'Sources action');
      await sourceButton.focus(); await sourceButton.press('Enter');
      await page.locator('.library-sources a').first().waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.activeElement === document.querySelector('#library-sources-heading'));
      const sourcesVisible = await readerViewport.evaluate(node => {
        const viewport = node.getBoundingClientRect(), heading = node.querySelector('#library-sources-heading').getBoundingClientRect();
        return heading.top >= viewport.top - 2 && heading.top < viewport.bottom;
      });
      assert.ok(sourcesVisible, 'Sources action brings its heading into the actual reading viewport');
      await checkHitTarget(page.locator('.library-favorite'), 'Bookmark action');
      await page.locator('.library-favorite').click();
      assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem('synopsis_26063_library_favorites_v1')))).includes(dewPoint.id));
      const savedReading = await readerViewport.evaluate(node => {
        const top = node.getBoundingClientRect().top;
        const block = [...node.querySelectorAll('[data-reading-block]')].find(element => element.getBoundingClientRect().bottom > top + 1);
        return { scrollTop: node.scrollTop, block: block?.dataset.readingBlock, text: block?.textContent,
          offset: block ? block.getBoundingClientRect().top - top : null };
      });
      assert.ok(savedReading.scrollTop > 1 && savedReading.block, 'Sources establish a meaningful saved reading position');
      await page.getByRole('button', { name: /К каталогу/, exact: false }).click();
      await search.waitFor();
      assert.equal(await search.inputValue(), 'точка росы', 'Returning preserves the search');
      await page.waitForFunction(() => document.activeElement?.matches('.library-result[data-article-id="dew-point"]'));
      assert.ok(Math.abs(await catalogueViewport.evaluate(node => node.scrollTop) - cataloguePosition) <= 2,
        'Returning restores the catalogue scroll position');
      await measureLibraryScene(page, report, `library-scene-return-geometry-${viewport.width}`);
      await capture(page, `library-scene-return-${viewport.width}`);
      await result.click(); await nextPaint(page);
      const reopened = await readerViewport.evaluate((node, saved) => {
        const block = node.querySelector(`[data-reading-block="${saved.block}"]`);
        const box = node.getBoundingClientRect();
        return { scrollTop: node.scrollTop, text: block?.textContent,
          offset: block ? block.getBoundingClientRect().top - box.top : null,
          viewportFocused: document.activeElement === node,
          viewportVisible: box.width > 0 && box.height > 0 && box.top >= 0 && box.bottom <= innerHeight };
      }, savedReading);
      assert.equal(reopened.text, savedReading.text, 'Reopening retains the same scientific reading block');
      assert.ok(Math.abs(reopened.scrollTop - savedReading.scrollTop) <= 2 && Math.abs(reopened.offset - savedReading.offset) <= 3,
        `Reopening restores reading position: ${JSON.stringify({ savedReading, reopened })}`);
      assert.ok(reopened.viewportFocused && reopened.viewportVisible, 'Reopening focuses the visible reading viewport, not an off-screen heading');
      report.cases.push({ name: `library-scene-reopened-position-${viewport.width}`, savedReading, reopened, cataloguePosition, catalogueFocus: dewPoint.id });
      await capture(page, `library-scene-reopened-${viewport.width}`);
      await page.getByRole('button', { name: /К каталогу/ }).click();
      await search.waitFor();
      if (viewport.width === 390) {
        await result.click(); await expand.click();
        const before = await page.locator('.library-definition').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
        await page.evaluate(() => {
          // A controlled text-only enlargement test; this is not claimed as native browser zoom.
          const elements = [...document.querySelectorAll('main *')].filter(node => node instanceof HTMLElement
            && ([...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim()) || node.matches('input,select,button')));
          const styles = elements.map(node => ({ node, font: parseFloat(getComputedStyle(node).fontSize), line: parseFloat(getComputedStyle(node).lineHeight) }));
          for (const { node, font, line } of styles) { node.style.fontSize = `${font * 2}px`; if (Number.isFinite(line)) node.style.lineHeight = `${line * 2}px`; }
        });
        await nextPaint(page);
        const after = await page.locator('.library-definition').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
        assert.ok(after >= before * 2 - .1, 'Article text is enlarged to 200%');
        const measureTextLayout = () => page.evaluate(() => {
          const box = node => {
            const r = node.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };
          const selectors = ['.station-interior-nav', '.library-desk', '.library-header', '.library-reader-toolbar', '.library-reader-scroll', '.library-reader', '.library-footer'];
          const panels = Object.fromEntries(selectors.map(selector => [selector, box(document.querySelector(selector))]));
          const scrolling = [...document.querySelectorAll('.pixel-scroll-area__viewport,.library-desk')]
            .filter(node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
            .map(node => ({ className: node.className, scrollLeft: node.scrollLeft, scrollTop: node.scrollTop,
              width: node.clientWidth, totalWidth: node.scrollWidth, height: node.clientHeight, totalHeight: node.scrollHeight, box: box(node) }));
          const nav = panels['.station-interior-nav'], desk = panels['.library-desk'];
          const navDeskOverlapArea = Math.max(0, Math.min(nav.right, desk.right) - Math.max(nav.left, desk.left))
            * Math.max(0, Math.min(nav.bottom, desk.bottom) - Math.max(nav.top, desk.top));
          return { viewport: [innerWidth, innerHeight], panels, scrolling, navDeskOverlapArea };
        });
        const beforeInput = await measureTextLayout();
        await checkHitTarget(collapse, 'Collapse at 200% text size');
        await exerciseScrollbar(page, reader, report, 'library-scene-reader-scroll-text-200-390');
        const afterInput = await measureTextLayout();
        await capture(page, 'library-scene-text-200-390');
        report.cases.push({ name: 'library-scene-text-200-390', beforePx: before, afterPx: after, beforeInput, afterInput,
          method: 'CSS text-only enlargement of actual text elements; not native browser zoom' });
        for (const layout of [beforeInput, afterInput]) {
          assert.ok(layout.navDeskOverlapArea <= 1, `At 200% text navigation must not cover the book: ${JSON.stringify(layout)}`);
          for (const scroll of layout.scrolling) {
            assert.ok(Math.abs(scroll.scrollLeft) <= 1 && scroll.totalWidth <= scroll.width + 2,
              `At 200% text no nested viewport hides or shifts text horizontally: ${JSON.stringify(scroll)}`);
          }
        }
      }
      await page.goto(base + '/archive');
      await page.getByRole('heading', { name: 'Читальный зал архива', exact: true }).waitFor();
      await measureLibraryScene(page, report, `archive-scene-entry-geometry-${viewport.width}`);
      await capture(page, `archive-scene-entry-${viewport.width}`);
      await checkHitTarget(page.getByRole('button', { name: /Открыть библиотеку/ }), 'Reading-room library entrance');
      await page.getByRole('button', { name: /Открыть библиотеку/ }).click();
      await page.getByRole('heading', { name: 'Библиотека синоптика', exact: true }).waitFor();
      const motion = await page.evaluate(() => ({ paused: document.querySelector('[data-library-scene]').dataset.paused,
        animated: [...document.querySelectorAll('.station-room-art__drop')].filter(node => getComputedStyle(node).display !== 'none' && getComputedStyle(node).animationName !== 'none').length }));
      assert.equal(motion.paused, 'true'); assert.equal(motion.animated, 0, 'Reduced motion retains the scene without moving drops');
      report.cases.push({ name: `library-scene-reduced-motion-${viewport.width}`, ...motion });
    } catch (error) {
      const filename = `library-scene-failure-${viewport.width}.png`;
      await page.screenshot({ path: path.join(output, filename), fullPage: true }).then(() => report.screenshots.push(filename)).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
}

async function checkLibraryNativeAudio({ page, context, report, capture, waitForCampus }) {
  await page.locator('.hub-dock__archive').click();
  await page.getByRole('heading', { name: 'Библиотека синоптика', exact: true }).waitFor();
  await page.waitForFunction(() => window.__stationAudioProbe.contexts === 1 && window.__stationAudioProbe.buffers === 2 && window.__stationAudioProbe.oscillators > 0);
  const initial = await page.evaluate(() => ({ ...window.__stationAudioProbe }));
  await page.getByLabel('Что хотите найти?', { exact: true }).fill('точка росы');
  await page.locator('.library-result').first().click();
  await page.getByRole('button', { name: 'Развернуть чтение', exact: true }).click();
  await page.getByRole('button', { name: 'Свернуть чтение', exact: true }).click();
  await page.getByRole('button', { name: /К каталогу/ }).click();
  // The score contains real rests: observe a subsequent note, then allow a
  // zero-voice instant in the snapshot instead of treating silence as failure.
  await page.waitForFunction(() => window.__stationAudioProbe.oscillators > 0);
  const after = await page.evaluate(() => ({ ...window.__stationAudioProbe }));
  assert.equal(after.contexts, 1); assert.equal(after.buffers, initial.buffers, 'Reading/catalog transitions do not multiply the room/rain layers');
  assert.ok(after.oscillators >= 0 && after.oscillators <= 10, 'Music has bounded real voices, including score rests');
  const sound = page.getByRole('button', { name: 'Выключить звук', exact: true });
  await sound.click();
  await page.waitForFunction(() => window.__stationAudioProbe.buffers === 0 && window.__stationAudioProbe.oscillators === 0);
  await page.getByRole('button', { name: 'Включить звук', exact: true }).click();
  await page.waitForFunction(() => window.__stationAudioProbe.buffers === 2 && window.__stationAudioProbe.oscillators > 0);
  const background = await context.newPage();
  await background.goto('about:blank'); await background.bringToFront();
  await page.waitForFunction(() => document.visibilityState === 'hidden' && window.__stationAudioProbe.buffers === 0 && window.__stationAudioProbe.oscillators === 0, undefined, { polling: 100 });
  const hidden = await page.evaluate(() => ({ visibility: document.visibilityState, ...window.__stationAudioProbe,
    animatedDrops: [...document.querySelectorAll('.station-room-art__drop')].filter(node => getComputedStyle(node).display !== 'none' && getComputedStyle(node).animationName !== 'none').length }));
  assert.equal(hidden.animatedDrops, 0);
  await page.bringToFront();
  await page.waitForFunction(() => document.visibilityState === 'visible' && window.__stationAudioProbe.buffers === 2 && window.__stationAudioProbe.oscillators > 0);
  await background.close();
  assert.equal(await page.evaluate(() => window.__stationAudioProbe.contexts), 1);
  report.cases.push({ name: 'library-scene-native-audio', initial, afterReadingTransitions: after, subsequentMusicNoteObserved: true, mutedAndResumed: true, realHiddenState: hidden, oneContextAfterResume: true, subjectiveListening: false });
  await capture(page, 'library-scene-native-audio');
  await page.locator('.library-back').click(); await waitForCampus(page);
}

module.exports = { measureLibraryScene, runLibrarySceneChecks, checkLibraryNativeAudio };
