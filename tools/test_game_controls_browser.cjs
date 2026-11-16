/** Real UI controls on an isolated server. Arbitrary valid answers test interaction,
 * never the scientific correctness of content. No successful API response is mocked. */
'use strict';
const assert = require('node:assert/strict');
const { login } = require('./test_saved_portrait_browser.cjs');
const { exerciseScrollbar } = require('./test_all_screens_browser.cjs');
const pathOf = response => new URL(response.url()).pathname;
async function checkWorkroom(page, expected, report, phase) {
  const art = page.locator('.workroom-backdrop').last();
  await art.waitFor();
  const geometry = await art.evaluate(async node => {
    const images = [...node.querySelectorAll('img')];
    await Promise.all(images.map(image => image.decode()));
    const box = node.getBoundingClientRect(), plane = node.querySelector('.station-room-art__plane').getBoundingClientRect();
    const viewport = document.querySelector('.app-page-viewport');
    return {
      room: node.dataset.room,
      imageSizes: images.map(image => [image.naturalWidth, image.naturalHeight]),
      imageRendering: images.map(image => getComputedStyle(image).imageRendering),
      fixed: getComputedStyle(node).position === 'fixed',
      passive: getComputedStyle(node).pointerEvents === 'none',
      coversViewport: box.left <= 1 && box.top <= 1 && box.right >= innerWidth - 1 && box.bottom >= innerHeight - 1,
      planeRatio: plane.width / plane.height,
      paused: node.dataset.paused,
      noPageOverflowX: !viewport || viewport.scrollWidth <= viewport.clientWidth + 1,
      glassMask: getComputedStyle(node).getPropertyValue('--room-glass-mask'),
    };
  });
  assert.equal(geometry.room, expected, `The ${phase} opens its matching room`);
  assert.deepEqual(geometry.imageSizes, [[512, 288], [512, 288]], 'Both actual production layers have their native dimensions');
  assert.ok(geometry.imageRendering.every(value => value === 'pixelated'), 'Room pixels are not interpolated');
  assert.ok(geometry.fixed && geometry.passive && geometry.coversViewport, 'The full-screen room stays behind scrolling controls');
  assert.ok(Math.abs(geometry.planeRatio - 16 / 9) < 0.005, 'Window, mask and room share an undistorted 16:9 plane');
  assert.ok(geometry.noPageOverflowX, 'Scientific overflow stays inside its own region');
  assert.equal(geometry.paused, 'true', 'Reduced-motion keeps the room still');
  assert.ok(geometry.glassMask.includes(expected === 'reading' ? 'station-room-r01' : `/workrooms-r01/${expected}/`), 'Rain uses this room’s window mask');
  report.cases.push({ name: `workroom-${phase}-${page.viewportSize().width}`, ...geometry });
}
async function afterClick(page, control, path, method = 'POST') {
  const pending = page.waitForResponse(response => pathOf(response) === path && response.request().method() === method);
  await control.click(); const response = await pending;
  assert.ok(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`);
  return response.json();
}
async function pressWithoutPageScroll(page, control) {
  await control.scrollIntoViewIfNeeded();
  if (!await control.evaluate(node => node === document.activeElement)) await control.focus();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const parent = page.locator('.app-page-viewport');
  const before = await parent.evaluate(node => node.scrollTop);
  await control.press('Space');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await parent.evaluate(node => node.scrollTop), before, 'Space selects the diagram position without scrolling the page');
}

// Run only after the unchanged production probe has failed. These temporary
// variants explain a failure; none can change the result of the asserted gate.
async function diagnoseSvgEdge(control, point) {
  return control.evaluate(async (node, point) => {
    const target = node.querySelector('.station-slot-target');
    if (!target) return null;
    const svg = target.ownerSVGElement;
    const saved = { targetStyle: target.getAttribute('style'), svgStyle: svg.getAttribute('style'), rx: target.getAttribute('rx') };
    const restoreAttribute = (element, name, value) => value === null ? element.removeAttribute(name) : element.setAttribute(name, value);
    const restore = () => {
      restoreAttribute(target, 'style', saved.targetStyle);
      restoreAttribute(svg, 'style', saved.svgStyle);
      restoreAttribute(target, 'rx', saved.rx);
    };
    const hitAt = point => {
      const hit = document.elementFromPoint(point.x, point.y);
      return { point, receivesPointer: node.contains(hit), tag: hit?.tagName, className: hit?.getAttribute('class') };
    };
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const grid = [];
    for (let delta = -2; delta <= 2; delta += .25) grid.push(hitAt({ x: point.x, y: point.y + delta }));
    const variants = [];
    const changes = [
      ['square-rect', () => { if (target.tagName === 'rect') target.setAttribute('rx', '0'); }],
      ['opaque-fill', () => { target.style.fill = '#fff'; target.style.fillOpacity = '1'; target.style.opacity = '1'; }],
      ['pointer-fill', () => { target.style.pointerEvents = 'fill'; }],
      ['translate-z', () => { svg.style.transform = `${getComputedStyle(svg).transform} translateZ(0)`; }],
      ['unsnapped-origin', () => { svg.style.transform = 'none'; }],
    ];
    try {
      for (const [name, change] of changes) {
        restore(); change(); await settle();
        const rect = target.getBoundingClientRect(), matrix = target.getScreenCTM();
        variants.push({ name, ...hitAt(point), bounds: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          matrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f } });
      }
    } finally { restore(); await settle(); }
    return { diagnosticOnly: true, pointUnchanged: point, grid, variants, restored: hitAt(point) };
  }, point);
}

async function settleSvgLayout(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function scrollSvgControl(page, control, requestedScrollTop) {
  // A real clear/select click can scroll the observations back into view.
  // Restore the diagram with the same scrollbar wheel input a player uses.
  const viewportId = await control.evaluate(node => node.closest('.pixel-scroll-area__viewport')?.id);
  assert.ok(viewportId, 'The diagram belongs to a known scroll viewport');
  const viewport = page.locator(`[id=${JSON.stringify(viewportId)}]`);
  await viewport.scrollIntoViewIfNeeded();
  const movement = await control.evaluate((node, requestedScrollTop) => {
    const viewport = node.closest('.pixel-scroll-area__viewport');
    const hitArea = node.querySelector('.station-slot-target, .station-slot-hit, .find-error-hit') || node.querySelector('rect') || node;
    const target = hitArea.getBoundingClientRect(), frame = viewport.getBoundingClientRect();
    const style = getComputedStyle(viewport);
    const padding = value => {
      const pixels = value.endsWith('px') ? Number.parseFloat(value) : NaN;
      return Number.isFinite(pixels) ? Math.max(8, pixels) : 8;
    };
    // Honor the production 96px top inset under the sticky blitz timer.
    // This prepares the viewport with real wheel input before any sample.
    const left = frame.left + viewport.clientLeft + padding(style.scrollPaddingLeft);
    const top = frame.top + viewport.clientTop + padding(style.scrollPaddingTop);
    const right = frame.left + viewport.clientLeft + viewport.clientWidth - padding(style.scrollPaddingRight);
    const bottom = frame.top + viewport.clientTop + viewport.clientHeight - padding(style.scrollPaddingBottom);
    const clamp = (value, maximum) => Math.max(0, Math.min(maximum, value));
    return {
      left: viewport.scrollLeft, top: viewport.scrollTop,
      x: clamp(viewport.scrollLeft + (target.left < left || target.right > right ? target.left + target.width / 2 - (left + right) / 2 : 0), viewport.scrollWidth - viewport.clientWidth),
      y: clamp(requestedScrollTop ?? (viewport.scrollTop + (target.top < top || target.bottom > bottom ? target.top + target.height / 2 - (top + bottom) / 2 : 0)), viewport.scrollHeight - viewport.clientHeight),
    };
  }, requestedScrollTop);
  for (const [axis, orientation, offset] of [['x', 'horizontal', 'left'], ['y', 'vertical', 'top']]) {
    const delta = movement[axis] - movement[offset];
    if (Math.abs(delta) <= (requestedScrollTop === undefined ? 1 : 0.02)) continue;
    const rail = viewport.locator('..').locator(`:scope > [role="scrollbar"][aria-orientation="${orientation}"]`);
    await rail.hover();
    await page.mouse.wheel(axis === 'x' ? delta : 0, axis === 'y' ? delta : 0);
    await page.waitForFunction(({ id, axis, target, tolerance }) => {
      const viewport = document.getElementById(id);
      return Math.abs((axis === 'x' ? viewport.scrollLeft : viewport.scrollTop) - target) <= tolerance;
    }, { id: viewportId, axis, target: movement[axis], tolerance: requestedScrollTop === undefined ? 2 : 0.03 }, { timeout: 3_000 });
  }
  await viewport.scrollIntoViewIfNeeded();
  await settleSvgLayout(page);
  return control.elementHandle();
}

async function stationPlotState(control) {
  return control.evaluate(node => {
    const workspace = node.closest('.station-plot-workspace');
    if (!workspace) return null;
    return {
      positions: [...workspace.querySelectorAll('.station-slot')].map(slot => ({
        id: slot.querySelector('.station-slot-target').getAttribute('data-slot-id'),
        label: slot.getAttribute('aria-label'), disabled: slot.getAttribute('aria-disabled'),
      })),
      observations: [...workspace.querySelectorAll('.station-observation')].map(button => ({
        label: button.querySelector('span').textContent, placed: button.classList.contains('is-placed'),
        selected: button.classList.contains('is-selected'), disabled: button.disabled,
      })),
    };
  });
}

async function recordNativeSvgClick(control) {
  return control.evaluateHandle(node => {
    const svg = node.ownerSVGElement;
    const trace = { events: [] };
    const listener = event => {
      const point = new DOMPoint(event.clientX, event.clientY);
      trace.events.push({
        isTrusted: event.isTrusted, clientX: event.clientX, clientY: event.clientY, button: event.button,
        targetIsSvg: event.target === svg, targetTag: event.target.tagName, targetClass: event.target.getAttribute('class'),
        targetSlotId: event.target.closest('.station-slot')?.querySelector('.station-slot-target')?.getAttribute('data-slot-id') ?? null,
        exactHits: [...svg.querySelectorAll('.station-slot-target')].filter(target => {
          const matrix = target.getScreenCTM();
          return matrix && target.isPointInFill(point.matrixTransform(matrix.inverse()));
        }).map(target => target.getAttribute('data-slot-id')),
      });
    };
    svg.addEventListener('click', listener, true);
    trace.stop = () => svg.removeEventListener('click', listener, true);
    return trace;
  });
}

async function clickSvgPosition(page, control, evidence, options = {}) {
  const stationPlot = await control.evaluate(node => Boolean(node.querySelector('.station-slot-target')));
  const indices = options.indices ?? (stationPlot ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [0]);
  const selected = page.locator('.station-observation.is-selected');
  const expectedLabel = stationPlot ? await selected.locator('span').textContent() : null;
  const actualClicks = [];
  for (const index of indices) {
    if (stationPlot && options.fresh !== false) {
      // Each edge must cause a new assignment; an already-filled slot would
      // let a dropped click pass unnoticed. Clearing uses the real UI control.
      const clear = selected.locator('..').getByRole('button', { name: `Снять ${expectedLabel}`, exact: true });
      if (await clear.count()) await clear.click();
      assert.equal(await selected.evaluate(node => node.classList.contains('is-placed')), false, 'The selected observation is unassigned before every fresh pointer sample');
    }
    const handle = await scrollSvgControl(page, control, options.scrollTop);
    const before = stationPlot ? await stationPlotState(control) : null;
    if (stationPlot && !options.disabled) {
      assert.equal(await control.getAttribute('aria-disabled'), 'false');
      assert.ok(!(await control.getAttribute('aria-label')).endsWith(`: ${expectedLabel}`), 'This click must change the target assignment');
    }
    if (options.disabled) {
      assert.equal(await control.getAttribute('aria-disabled'), 'true');
      assert.ok(!(await control.getAttribute('aria-label')).endsWith(`: ${expectedLabel}`), 'The disabled probe would change the assignment if its guard were broken');
    }
    const probe = await control.evaluate((node, index) => {
      const hitArea = node.querySelector('.station-slot-target, .station-slot-hit, .find-error-hit') || node.querySelector('rect') || node;
      const rect = hitArea.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const points = [center];
      if (hitArea.classList.contains('station-slot-target')) {
        points.push(
          { x: center.x, y: rect.top + 0.5 },
          { x: rect.right - 0.5, y: center.y },
          { x: center.x, y: rect.bottom - 0.5 },
          { x: rect.left + 0.5, y: center.y },
        );
        const matrix = hitArea.getScreenCTM();
        const scale = Math.hypot(matrix.a, matrix.b);
        const radius = hitArea.tagName === 'circle' ? rect.width / 2 : Number(hitArea.getAttribute('rx') || 0) * scale;
        const cornerInset = radius * (1 - Math.SQRT1_2) + 0.5;
        for (const x of [rect.left + cornerInset, rect.right - cornerInset]) {
          for (const y of [rect.top + cornerInset, rect.bottom - cornerInset]) points.push({ x, y });
        }
      }
      const point = points[index], svgNode = hitArea.ownerSVGElement;
      // Native Firefox MouseEvent coordinates in the measured CI path are
      // integer CSS pixels. Choose the nearest representable input once,
      // before dispatch, instead of letting truncation send an edge outside.
      // The nominal half-pixel sample and its exact-fill proof stay separate.
      const dispatchedPoint = { x: Math.round(point.x), y: Math.round(point.y) };
      const dispatchOffset = { x: dispatchedPoint.x - point.x, y: dispatchedPoint.y - point.y };
      const hit = document.elementFromPoint(point.x, point.y);
      const dispatchedHit = document.elementFromPoint(dispatchedPoint.x, dispatchedPoint.y);
      const matrix = hitArea.getScreenCTM();
      const local = new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse());
      const box = hitArea.getBBox(), svg = svgNode.getBoundingClientRect();
      const viewport = node.closest('.pixel-scroll-area__viewport'), frame = viewport.getBoundingClientRect();
      const style = getComputedStyle(hitArea);
      const viewportStyle = getComputedStyle(viewport);
      const scrollPadding = { left: viewportStyle.scrollPaddingLeft, top: viewportStyle.scrollPaddingTop,
        right: viewportStyle.scrollPaddingRight, bottom: viewportStyle.scrollPaddingBottom };
      const padding = value => {
        const pixels = value.endsWith('px') ? Number.parseFloat(value) : NaN;
        return Number.isFinite(pixels) ? Math.max(8, pixels) : 8;
      };
      const exactHitsAt = point => [...svgNode.querySelectorAll('.station-slot-target')].filter(target => {
        const matrix = target.getScreenCTM();
        return matrix && target.isPointInFill(new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse()));
      }).map(target => target.getAttribute('data-slot-id'));
      return {
        point, dispatchedPoint, dispatchOffset, inputGridCss: 1, devicePixelRatio,
        receivesPointer: node.contains(hit), queriedSvgRoot: hit === svgNode, exactHits: exactHitsAt(point),
        dispatchedReceivesPointer: node.contains(dispatchedHit), dispatchedQueriedSvgRoot: dispatchedHit === svgNode,
        dispatchedExactHits: exactHitsAt(dispatchedPoint),
        label: node.getAttribute('aria-label'), slotId: hitArea.getAttribute('data-slot-id'),
        targetIndex: [...svgNode.querySelectorAll('.station-slot')].indexOf(node),
        fill: style.fill, fillOpacity: style.fillOpacity, pointerEvents: style.pointerEvents,
        hitTag: hit?.tagName, hitClass: hit?.getAttribute('class'),
        bounds: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        localPoint: { x: local.x, y: local.y }, localBox: { x: box.x, y: box.y, width: box.width, height: box.height },
        isPointInFill: typeof hitArea.isPointInFill === 'function' ? hitArea.isPointInFill(local) : null,
        matrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f },
        svgBounds: { left: svg.left, top: svg.top, right: svg.right, bottom: svg.bottom },
        viewport: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom,
          clientWidth: viewport.clientWidth, clientHeight: viewport.clientHeight, scrollTop: viewport.scrollTop, scrollLeft: viewport.scrollLeft,
          scrollPadding, availableArea: {
            left: frame.left + viewport.clientLeft + padding(scrollPadding.left),
            top: frame.top + viewport.clientTop + padding(scrollPadding.top),
            right: frame.left + viewport.clientLeft + viewport.clientWidth - padding(scrollPadding.right),
            bottom: frame.top + viewport.clientTop + viewport.clientHeight - padding(scrollPadding.bottom),
          } },
      };
    }, index);
    assert.ok(Math.abs(probe.dispatchOffset.x) <= .5 && Math.abs(probe.dispatchOffset.y) <= .5, 'Nearest representable input differs by at most half a CSS pixel per axis');
    if (stationPlot) {
      assert.deepEqual(probe.exactHits, [probe.slotId], 'The unchanged nominal half-pixel point belongs to exactly this shape');
      assert.deepEqual(probe.dispatchedExactHits, [probe.slotId], 'The nearest representable pointer point stays inside exactly the original shape');
    }
    if (options.historicalGeometry) {
      const expected = options.historicalGeometry;
      if (evidence) evidence.report.cases.push({ name: `all-${evidence.phase}-svg-filled-regression-geometry-${page.viewportSize().width}`, before, probe, expected });
      for (const key of ['left', 'top', 'width', 'height']) assert.ok(Math.abs(probe.bounds[key] - expected.bounds[key]) < .03, `The original filled-slot regression preserves ${key}: ${JSON.stringify(probe.bounds)}`);
      assert.ok(Math.abs(probe.viewport.scrollTop - expected.scrollTop) < .03, 'The filled regression preserves the original fractional scroll');
    }
    // elementFromPoint is diagnostic, not proof that a click changes state.
    // Root hits are actionable only inside this one exact production shape.
    // The chosen representable point and original rectangle remain fixed
    // until mouse.click; no inward retry or larger target is allowed.
    await page.mouse.move(probe.dispatchedPoint.x, probe.dispatchedPoint.y);
    const ready = await page.waitForFunction(({ node, point, bounds }) => {
      const target = node.querySelector('.station-slot-target, .station-slot-hit, .find-error-hit') || node.querySelector('rect') || node;
      const rect = target.getBoundingClientRect();
      if (!['left', 'top', 'width', 'height'].every(key => Math.abs(rect[key] - bounds[key]) < 0.02)) return false;
      const svg = target.ownerSVGElement, hit = document.elementFromPoint(point.x, point.y);
      if (node.contains(hit)) return true;
      if (hit !== svg || !target.classList.contains('station-slot-target')) return false;
      const matches = [...svg.querySelectorAll('.station-slot-target')].filter(shape => {
        const matrix = shape.getScreenCTM();
        return matrix && shape.isPointInFill(new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse()));
      });
      return matches.length === 1 && matches[0] === target;
    }, { node: handle, point: probe.dispatchedPoint, bounds: probe.bounds }, { timeout: 1_500, polling: 'raf' }).then(() => true, () => false);
    if (!ready) {
      if (evidence) evidence.report.cases.push({ name: `all-${evidence.phase}-svg-unactionable-${page.viewportSize().width}-${index + 1}`, probe, before });
      if (evidence?.capture) await evidence.capture(page, `all-${evidence.phase}-svg-hit-failure-${page.viewportSize().width}-${index + 1}`);
      const diagnostic = await diagnoseSvgEdge(control, probe.dispatchedPoint);
      if (evidence) evidence.report.cases.push({ name: `all-${evidence.phase}-svg-failure-diagnostic-${page.viewportSize().width}`, ...diagnostic });
      assert.fail(`The unchanged SVG point is neither a native nor a unique exact-fill target: ${JSON.stringify(probe)}`);
    }
    const trace = await recordNativeSvgClick(control);
    let events;
    try {
      await page.mouse.click(probe.dispatchedPoint.x, probe.dispatchedPoint.y);
      await settleSvgLayout(page);
      events = await trace.evaluate(trace => trace.events);
    } finally {
      await trace.evaluate(trace => trace.stop());
      await trace.dispose();
    }
    const after = stationPlot ? await stationPlotState(control) : null;
    const result = { sample: index + 1, fresh: options.fresh !== false, disabled: Boolean(options.disabled), beforePointer: probe, nativeEvents: events, before, after };
    actualClicks.push(result);
    if (evidence && stationPlot) evidence.report.cases.push({ name: `all-${evidence.phase}-svg-assignment-${page.viewportSize().width}-${probe.targetIndex + 1}-${index + 1}${options.name ? `-${options.name}` : ''}`, ...result });
    assert.equal(events.length, 1, 'Exactly one native SVG click is received');
    assert.ok(events[0].isTrusted && events[0].button === 0, 'The probe uses a trusted primary-pointer click');
    assert.deepEqual({ x: events[0].clientX, y: events[0].clientY }, probe.dispatchedPoint, 'The actual native coordinates equal the explicitly dispatched representable point');
    if (stationPlot) {
      assert.deepEqual(events[0].exactHits, [probe.slotId], 'The actual native client coordinates belong to exactly this target');
      assert.ok(events[0].targetIsSvg || events[0].targetSlotId === probe.slotId, 'The actual event reaches this slot or the root geometry resolver');
      if (options.disabled) assert.deepEqual(after, before, 'A real click on a different disabled slot cannot move the selected observation');
      else {
        const placed = after.positions.find(position => position.id === probe.slotId);
        if (!placed.label.endsWith(`: ${expectedLabel}`)) {
          if (evidence?.capture) await evidence.capture(page, `all-${evidence.phase}-svg-assignment-failure-${page.viewportSize().width}-${index + 1}`);
          assert.fail(`The real pointer click did not assign ${expectedLabel}: ${JSON.stringify(result)}`);
        }
        assert.ok(after.observations.find(observation => observation.label === expectedLabel).placed, 'The source observation also reflects its new placement');
        assert.notDeepEqual(after.positions, before.positions, 'Every successful point changes the actual assignment');
      }
    }
  }
  return actualClicks;
}

async function checkStationPlotGap(page, control, evidence) {
  await scrollSvgControl(page, control);
  const before = await stationPlotState(control);
  assert.equal(before.observations.find(observation => observation.selected).placed, false, 'An unassigned observation makes a spurious gap assignment detectable');
  const probe = await control.evaluate(node => {
    const svg = node.ownerSVGElement;
    const point = new DOMPoint(500, 300).matrixTransform(svg.getScreenCTM());
    const hit = document.elementFromPoint(point.x, point.y);
    return { point: { x: point.x, y: point.y }, queriedSvgRoot: hit === svg,
      exactHits: [...svg.querySelectorAll('.station-slot-target')].filter(target => target.isPointInFill(point.matrixTransform(target.getScreenCTM().inverse()))).map(target => target.getAttribute('data-slot-id')) };
  });
  assert.deepEqual(probe.exactHits, [], 'The negative point lies in the real gap between all targets');
  assert.ok(probe.queriedSvgRoot, 'The visible gap is not covered by another UI element');
  const trace = await recordNativeSvgClick(control);
  let events;
  try {
    await page.mouse.move(probe.point.x, probe.point.y);
    await page.mouse.click(probe.point.x, probe.point.y);
    await settleSvgLayout(page);
    events = await trace.evaluate(trace => trace.events);
  } finally { await trace.evaluate(trace => trace.stop()); await trace.dispose(); }
  const after = await stationPlotState(control);
  if (evidence) evidence.report.cases.push({ name: `all-${evidence.phase}-svg-gap-${page.viewportSize().width}`, probe, nativeEvents: events, before, after });
  assert.equal(events.length, 1);
  assert.ok(events[0].isTrusted && events[0].targetIsSvg, 'The negative probe is a trusted native root SVG click');
  assert.deepEqual(events[0].exactHits, []);
  assert.deepEqual(after, before, 'An actual click between shapes leaves every placement unchanged');
}

async function checkStationPlotTargets(positions) {
  const targets = await positions.evaluateAll(nodes => nodes.map(node => {
    const target = node.querySelector('.station-slot-target');
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    const matrix = target.getScreenCTM();
    const scale = Math.hypot(matrix.a, matrix.b);
    const svg = target.ownerSVGElement.getBoundingClientRect();
    const style = getComputedStyle(target);
    const fillAlpha = style.fill.match(/^rgba\(.+,\s*([.\d]+)\)$/)?.[1] ?? '1';
    return {
      label: node.getAttribute('aria-label'), kind: target.tagName,
      left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
      width: rect.width, height: rect.height,
      radius: target.tagName === 'circle' ? rect.width / 2 : Number(target.getAttribute('rx') || 0) * scale,
      insideSvg: rect.left >= svg.left && rect.right <= svg.right && rect.top >= svg.top && rect.bottom <= svg.bottom,
      outerOrigin: { x: svg.left, y: svg.top },
      painted: style.fill !== 'none' && style.fill !== 'transparent' && Number(fillAlpha) > 0
        && Number(style.fillOpacity) > 0 && Number(style.opacity) > 0,
      fill: style.fill,
      soleHitArea: style.pointerEvents === 'all' && style.stroke === 'none' && Number.parseFloat(style.strokeWidth) === 0
        && [...node.querySelectorAll(':scope > :not(.station-slot-target)')].every(shape => getComputedStyle(shape).pointerEvents === 'none'),
    };
  }));
  for (const target of targets) {
    assert.ok(target, 'Every station plot position has an explicit hit area');
    assert.ok(target.width >= 44 - 0.01 && target.height >= 44 - 0.01, `Station plot target is at least 44 CSS px: ${JSON.stringify(target)}`);
    assert.ok(target.insideSvg, 'The entire hit area remains inside its SVG');
    assert.ok(target.painted, 'The explicit hit shape owns the visible slot fill');
    assert.ok(target.soleHitArea, 'Visible outlines and wind marks cannot extend the interactive target');
  }
  const center = shape => ({ x: (shape.left + shape.right) / 2, y: (shape.top + shape.bottom) / 2 });
  const circleRectGap = (circle, rect) => {
    const point = center(circle);
    const x = Math.max(rect.left + rect.radius - point.x, 0, point.x - rect.right + rect.radius);
    const y = Math.max(rect.top + rect.radius - point.y, 0, point.y - rect.bottom + rect.radius);
    return Math.hypot(x, y) - rect.radius - circle.radius;
  };
  const clearances = [];
  for (let first = 0; first < targets.length; first++) for (let second = first + 1; second < targets.length; second++) {
    const a = targets[first], b = targets[second];
    const gap = a.kind === 'circle' && b.kind === 'circle'
      ? Math.hypot(center(a).x - center(b).x, center(a).y - center(b).y) - a.radius - b.radius
      : a.kind === 'circle' ? circleRectGap(a, b)
        : b.kind === 'circle' ? circleRectGap(b, a)
          : Math.max(a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom);
    assert.ok(gap > 0, `Station plot positions ${first + 1} and ${second + 1} have separate hit areas: ${gap} CSS px`);
    clearances.push({ first: first + 1, second: second + 1, gap });
  }
  return {
    targets, clearances,
    minimumWidthCss: Math.min(...targets.map(target => target.width)),
    minimumHeightCss: Math.min(...targets.map(target => target.height)),
    minimumClearanceCss: Math.min(...clearances.map(pair => pair.gap)),
  };
}

async function checkMapTabVisibility(page, positions, evidence) {
  await positions.first().focus();
  for (let index = 0; index < await positions.count(); index++) {
    if (index) await page.keyboard.press('Tab');
    await settleSvgLayout(page);
    const focus = await positions.nth(index).evaluate(node => {
      const box = rect => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
      const rect = node.getBoundingClientRect(), frames = [];
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (!parent.classList.contains('pixel-scroll-area__viewport')) continue;
        const frame = parent.getBoundingClientRect();
        const left = frame.left + parent.clientLeft, top = frame.top + parent.clientTop;
        const right = left + parent.clientWidth, bottom = top + parent.clientHeight;
        frames.push({ id: parent.id, bounds: box(frame), client: { left, top, right, bottom },
          scrollTop: parent.scrollTop, scrollLeft: parent.scrollLeft,
          containsFocusedShape: rect.left >= left - 2 && rect.right <= right + 2 && rect.top >= top - 2 && rect.bottom <= bottom + 2 });
      }
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const target = node.querySelector('.station-slot-target');
      return {
        label: node.getAttribute('aria-label'), active: document.activeElement === node, focusVisible: node.matches(':focus-visible'),
        activeTag: document.activeElement?.tagName, activeClass: document.activeElement?.getAttribute('class'),
        activeLabel: document.activeElement?.getAttribute('aria-label'), bounds: box(rect),
        targetBounds: target ? box(target.getBoundingClientRect()) : null, frames,
        centerQuery: { belongsToPosition: node.contains(hit), tag: hit?.tagName, className: hit?.getAttribute('class') },
      };
    });
    const visible = focus.active && focus.frames.every(frame => frame.containsFocusedShape) && focus.centerQuery.belongsToPosition;
    if (evidence) evidence.report.cases.push({ name: `all-${evidence.phase}-map-tab-${page.viewportSize().width}-${index + 1}`, viewport: page.viewportSize(), ...focus, visible });
    if (!visible && evidence?.capture) await evidence.capture(page, `all-${evidence.phase}-map-tab-failure-${page.viewportSize().width}-${index + 1}`);
    assert.ok(visible, `Map position ${index + 1}: keyboard focus remains visible inside every scrolling frame: ${JSON.stringify(focus)}`);
  }
}

async function fillTask(page, task, evidence) {
  const kind = task.response.kind;
  if (kind === 'numeric') {
    await page.getByLabel('Числовой ответ', { exact: true }).fill('0');
  } else if (kind === 'choice') {
    const options = page.locator('.shift-options [role="radio"]');
    await options.first().focus(); await options.first().press('ArrowRight');
    assert.equal(await options.nth(1).getAttribute('aria-checked'), 'true', 'Radio arrows select and move focus');
    await options.nth(1).press('Home');
    assert.equal(await options.first().getAttribute('aria-checked'), 'true');
    await options.last().click(); assert.equal(await options.last().getAttribute('aria-checked'), 'true');
  } else if (kind === 'sequence' || kind === 'dependencySequence') {
    const rows = page.locator('.shift-sequence-row');
    const initial = await rows.locator('code').allTextContents();
    assert.ok(await rows.first().getByRole('button', { name: /^Поднять/ }).isDisabled());
    assert.ok(await rows.last().getByRole('button', { name: /^Опустить/ }).isDisabled());
    await rows.first().getByRole('button', { name: /^Опустить/ }).click();
    assert.equal(await rows.nth(1).locator('code').innerText(), initial[0]);
    await rows.nth(1).getByRole('button', { name: /^Поднять/ }).press('Space');
    assert.deepEqual(await rows.locator('code').allTextContents(), initial, 'Both sequence controls preserve a complete order');
  } else if (kind === 'stationPlot' || kind === 'stationBoard') {
    const board = kind === 'stationBoard';
    const observations = page.locator(board ? '.station-board-observations button' : '.station-observation');
    const positions = page.locator(board ? '.station-board-slot' : '.station-slot');
    assert.equal(await page.locator('button button, button [role="button"]').count(), 0, 'No nested interactive controls');
    const labels = await positions.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    assert.equal(new Set(labels).size, labels.length, 'Each position has a distinct geometrical name');
    for (let index = 0; index < task.payload.observations.length; index++) {
      await observations.nth(index).click();
      const position = positions.nth(index % task.payload.slots.length);
      if (index === 0) await pressWithoutPageScroll(page, position); else await clickSvgPosition(page, position, evidence);
      assert.ok((await position.getAttribute('aria-label')).endsWith(`: ${task.payload.observations[index].label}`), 'The intended position receives the selected observation');
      if (!board && index === 0) {
        const clear = page.locator('.station-observation-clear').first();
        await clear.press('Space');
        assert.ok(await observations.first().evaluate(node => node === document.activeElement), 'Removing a placement returns focus to its observation');
        await checkStationPlotGap(page, position, evidence);
        await clickSvgPosition(page, position, evidence);
        // Keep T assigned and its clear button present. Selecting the other
        // observation changes no placements; this reproduces the filled state
        // of the former Firefox failure, instead of replacing it with a reset.
        const originalState = await stationPlotState(position);
        await observations.nth(1).click();
        const selectedState = await stationPlotState(position);
        assert.deepEqual(selectedState.positions, originalState.positions, 'Selecting a replacement preserves the populated diagram');
        assert.ok(await observations.first().evaluate(node => node.classList.contains('is-placed')), 'The original observation remains placed before the regression click');
        assert.equal(await observations.first().locator('..').locator('.station-observation-clear').count(), 1, 'The original clear button remains in the layout');
        const historical = evidence?.phase === 'blitz' && page.viewportSize().width === 1366
          && page.context().browser().browserType().name() === 'firefox';
        const replacements = await clickSvgPosition(page, position, evidence, {
          indices: [3], fresh: false, name: 'filled-replacement',
          ...(historical ? {
            scrollTop: 158.51666259765625,
            historicalGeometry: { scrollTop: 158.51666259765625,
              bounds: { left: 889.4000244140625, top: 655.566650390625, width: 109.88334655761719, height: 53.55000305175781 } },
          } : {}),
        });
        assert.ok(!replacements[0].after.observations[0].placed && replacements[0].after.observations[1].placed, 'The real edge click replaces T with the other observation');
        await observations.first().click();
        await clickSvgPosition(page, position, evidence, { indices: [0], fresh: false, name: 'restore-original' });
      }
    }
    assert.equal(await page.locator(board ? '.station-board-observations .is-placed' : '.station-observation.is-placed').count(), task.payload.observations.length);
    if (board) await checkMapTabVisibility(page, positions, evidence);
    else {
      const geometry = await checkStationPlotTargets(positions);
      if (evidence) evidence.report.cases.push({
        name: `all-${evidence.phase}-station-plot-targets-${page.viewportSize().width}`,
        viewport: page.viewportSize(), task: task.definitionId,
        pointerSamplesPerTarget: 9, nominalEdgeInsetCss: .5, inputCoordinateGridCss: 1,
        actualFlatEdgeInsetCssRange: [0, 1], ...geometry,
      });
    }
  } else if (kind === 'findError') {
    const stations = page.locator('.find-error-station');
    assert.ok(await stations.count() >= 2, 'Physical control offers multiple stations');
    // A programmatic focus after pointer input does not establish keyboard
    // modality consistently. Traverse the actual tab order before checking
    // the keyboard-only ring, then preserve that focus through Space.
    await stations.nth(1).focus();
    await page.keyboard.press('Shift+Tab');
    const reachedByTab = await stations.first().evaluate(node => node === document.activeElement);
    assert.ok(reachedByTab, 'Shift+Tab reaches the preceding physical-control station');
    await pressWithoutPageScroll(page, stations.first());
    assert.equal(await stations.first().getAttribute('aria-pressed'), 'true');
    const focused = await stations.first().evaluate(node => {
      const style = getComputedStyle(node.querySelector('.find-error-hit'));
      const bounds = node.querySelector('.find-error-hit').getBoundingClientRect();
      return { keyboardFocus: node === document.activeElement && node.matches(':focus-visible'),
        activeTag: document.activeElement?.tagName, activeLabel: document.activeElement?.getAttribute('aria-label'),
        dashedFocus: style.strokeDasharray !== 'none', strokeDasharray: style.strokeDasharray,
        width: bounds.width, height: bounds.height };
    });
    if (evidence) evidence.report.cases.push({
      name: `all-${evidence.phase}-find-error-focus-${page.viewportSize().width}`,
      viewport: page.viewportSize(), reachedByTab, ...focused,
    });
    if (evidence?.capture) await evidence.capture(page, `all-${evidence.phase}-find-error-keyboard-${page.viewportSize().width}`);
    assert.ok(focused.keyboardFocus && focused.dashedFocus,
      `Keyboard focus is distinct from the selected station: ${JSON.stringify(focused)}`);
    assert.ok(focused.width >= 44 && focused.height >= 44, 'Physical-control targets remain large enough');
    await stations.last().click(); assert.equal(await stations.last().getAttribute('aria-pressed'), 'true');
  } else throw new Error(`Uncovered task kind: ${kind}`);
}
async function checkInventory({page, base, viewport, report, capture, token}) {
  await page.goto(base + '/profile/avatar');
  await page.getByRole('heading', { name: 'Персонаж и инвентарь', exact: true }).waitFor();
  await page.locator('canvas[data-avatar-renderer="editor-static"]').waitFor();
  const tabs = page.getByRole('tablist', { name: 'Раздел персонажа' });
  await tabs.getByRole('tab', { name: /^Инвентарь/ }).focus();
  await page.keyboard.press('End'); assert.equal(await page.getByRole('tab', { name: 'Внешность', exact: true }).getAttribute('aria-selected'), 'true');
  const appearance = page.locator('.inventory-appearance-option');
  for (let i = 0; i < await appearance.count(); i++) { await appearance.nth(i).click(); assert.equal(await appearance.nth(i).getAttribute('aria-pressed'), 'true'); }
  await capture(page, `all-inventory-appearance-${viewport.width}`);
  await page.getByRole('tab', { name: 'Внешность', exact: true }).press('Home');
  const categories = page.locator('.inventory-category');
  for (let i = 0; i < await categories.count(); i++) { await categories.nth(i).click(); assert.equal(await categories.nth(i).getAttribute('aria-pressed'), 'true'); assert.ok(await page.locator('.inventory-item').count()); }
  await categories.first().click();
  await exerciseScrollbar(page, page.locator('.inventory-item-scroll'), report, `all-inventory-catalog-scroll-${viewport.width}`);
  const items = page.locator('.inventory-item');
  if (viewport.width === 1366) for (let i = 0; i < await items.count(); i++) { await items.nth(i).click(); assert.equal(await items.nth(i).getAttribute('aria-pressed'), 'true'); }
  await page.getByLabel('Найти предмет', { exact: true }).fill('неттакогопредмета');
  await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
  await page.getByRole('checkbox', { name: 'На персонаже', exact: true }).check();
  assert.equal(await page.locator('.inventory-item:not(.is-equipped)').count(), 0);
  await page.getByRole('checkbox', { name: 'На персонаже', exact: true }).uncheck();
  await page.getByRole('tab', { name: 'Знаки отличия', exact: true }).click();
  await page.locator('.equipment-badge-grid').waitFor();
  const starter = page.locator('.equipment-badge').filter({ has: page.getByRole('heading', { name: 'На связи', exact: true }) }).getByRole('button');
  if (await starter.isEnabled()) await afterClick(page, starter, '/api/equipment/loadout', 'PATCH');
  await afterClick(page, page.getByRole('button', { name: 'Снять учебный знак', exact: true }), '/api/equipment/loadout', 'PATCH');
  await page.locator('.equipment-active-badge').getByText('Без значка', { exact: true }).waitFor();
  if (viewport.width === 1366) {
    let stalled;
    const stall = route => { stalled = route; };
    await page.route('**/api/equipment/loadout', stall);
    await starter.click();
    await page.getByRole('alert').filter({ hasText: 'Сервер не подтвердил выбор знака вовремя' }).waitFor({ timeout: 12_000 });
    assert.ok(await page.getByRole('button', { name: '← На станцию', exact: true }).isEnabled(), 'A timed-out badge request releases navigation');
    assert.ok(stalled, 'The actual badge write was held before transmission');
    await stalled.abort('timedout').catch(() => {}); await page.unroute('**/api/equipment/loadout', stall);
    await afterClick(page, page.getByRole('button', { name: 'Обновить', exact: true }), '/api/equipment', 'GET');
    await page.locator('.equipment-active-badge').getByText('Без значка', { exact: true }).waitFor();
    report.cases.push({ name: 'inventory-badge-timeout', deadlineMs: 8000, navigationReleased: true, actualReload: true, fabricatedResponse: false });
  }
  await afterClick(page, starter, '/api/equipment/loadout', 'PATCH');
  await capture(page, `all-inventory-badges-${viewport.width}`);
  await page.getByRole('tab', { name: /^Инвентарь/ }).click();
  const back = page.getByRole('button', { name: '← На станцию', exact: true });
  await page.getByRole('button', { name: 'На площадке', exact: true }).click();
  await back.click(); const dialog = page.getByRole('dialog', { name: 'Сохранить изменения?', exact: true });
  await dialog.waitFor(); await exerciseScrollbar(page, dialog.locator('.inventory-exit-scroll'), report, `all-inventory-exit-scroll-${viewport.width}`);
  await capture(page, `all-inventory-exit-${viewport.width}`);
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  assert.ok(await back.evaluate(node => node === document.activeElement));
  await back.click(); await dialog.getByRole('button', { name: 'Продолжить примерку', exact: true }).click();
  await page.getByRole('button', { name: 'Отменить изменения', exact: true }).click();
  // The real pencil and starter badge guarantee one retry and one reference.
  await page.getByRole('button', { name: 'На площадке', exact: true }).click();
  await page.getByRole('tab', { name: 'Внешность', exact: true }).click();
  await page.locator('.inventory-appearance-option[aria-pressed="false"]').first().click();
  await back.click();
  if (viewport.width === 1366) {
    let stalled;
    const stall = route => { if (route.request().method() === 'PATCH') stalled = route; else return route.continue(); };
    await page.route('**/api/identity/avatar', stall);
    await dialog.getByRole('button', { name: 'Сохранить и выйти', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Сервер не подтвердил сохранение вовремя' }).waitFor({ timeout: 12_000 });
    await dialog.waitFor({ state: 'hidden' });
    assert.ok(await back.isEnabled(), 'The timed-out save releases navigation');
    assert.equal(await page.locator('.inventory-fitting__stage').getAttribute('data-outfit-state'), 'draft');
    assert.ok(stalled, 'The real request was held before transmission');
    await stalled.abort('timedout').catch(() => {});
    await page.unroute('**/api/identity/avatar', stall);
    await capture(page, 'all-inventory-save-timeout');
    report.cases.push({ name: 'inventory-save-timeout', deadlineMs: 8000, preservedDraft: true, navigationReleased: true, fabricatedResponse: false });
    await back.click();
  }
  await afterClick(page, dialog.getByRole('button', { name: 'Сохранить и выйти', exact: true }), '/api/identity/avatar', 'PATCH');
  await page.locator('.hub-screen').waitFor();
  const readProfile = async () => {
    const response = await page.request.get(base + '/api/identity/me', { headers: { authorization: `Bearer ${token}` } });
    assert.ok(response.ok()); return (await response.json()).user;
  };
  const saved = await readProfile();
  let discardedWrites = 0;
  const countWrites = req => { if (req.method() === 'PATCH' && new URL(req.url()).pathname === '/api/identity/avatar') discardedWrites++; };
  page.on('request', countWrites);
  await page.goto(base + '/profile/avatar');
  await page.getByRole('heading', { name: 'Персонаж и инвентарь', exact: true }).waitFor();
  await page.getByRole('button', { name: 'После смены', exact: true }).click();
  await back.click(); await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Выйти без сохранения', exact: true }).click();
  await page.locator('.hub-screen').waitFor();
  const discarded = await readProfile();
  assert.deepEqual(discarded.avatar, saved.avatar); assert.deepEqual(discarded.avatarPortrait, saved.avatarPortrait);
  await page.goto(base + '/profile/avatar');
  await page.locator('.inventory-fitting__stage[data-outfit-state="saved"]').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Восстановить примерку', exact: true }).count(), 0, 'Discarded draft is not offered on reopening');
  assert.equal(discardedWrites, 0, 'Discarding makes no avatar write'); page.off('request', countWrites);
  await back.click(); await page.locator('.hub-screen').waitFor();
  report.cases.push({ name: `all-inventory-controls-${viewport.width}`, everyCategory: true, everyAppearanceOption: true, everyItemDescription: viewport.width === 1366, emptyReset: true, equippedFilter: true, tabArrows: true, unsavedExit: true, discardExit: true, discardedServerPortraitUnchanged: true });
}
async function checkShift({page, base, viewport, report, capture}) {
  if (viewport.width === 1366) {
    await page.goto(base + '/shift');
    let stalled;
    const stall = route => { if (route.request().method() === 'POST') stalled = route; else return route.continue(); };
    await page.route('**/api/shifts', stall);
    await page.getByRole('button', { name: 'Принять смену', exact: true }).click();
    await page.getByText('Готовим учебную смену…', { exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'На станцию', exact: true }).isEnabled(), 'Leaving is available while the shift starts');
    await page.getByText('Сервер не ответил вовремя. Вернитесь на станцию и откройте смену ещё раз.', { exact: true }).waitFor({ timeout: 12_000 });
    await capture(page, 'all-shift-start-timeout');
    await page.getByRole('button', { name: 'На станцию', exact: true }).click();
    await page.locator('.hub-screen').waitFor();
    assert.ok(stalled, 'The actual start request was held before transmission');
    await stalled.abort('timedout').catch(() => {}); await page.unroute('**/api/shifts', stall);
    report.cases.push({ name: 'shift-start-timeout', deadlineMs: 8000, exitAvailableWhileLoading: true, exitAfterTimeout: true, fabricatedResponse: false });
  }
  await page.goto(base + '/shift');
  await page.getByRole('heading', { name: 'Записка на краю стола', exact: true }).waitFor();
  await checkWorkroom(page, 'telegraph', report, 'handover');
  await capture(page, `all-shift-handover-${viewport.width}`);
  let state = await afterClick(page, page.getByRole('button', { name: 'Принять смену', exact: true }), '/api/shifts');
  const id = state.shiftId, kinds = new Set();
  await page.locator('.shift-card h1').waitFor();
  const mentor = page.getByRole('button', { name: /Спросить Ольхина/ });
  await mentor.click();
  const panel = page.locator('.shift-mentor-panel');
  const tabs = panel.getByRole('tab');
  for (let i = 0; i < await tabs.count(); i++) { await tabs.nth(i).click(); assert.equal(await tabs.nth(i).getAttribute('aria-selected'), 'true'); }
  await tabs.last().press('Home'); assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
  await tabs.first().press('End'); assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
  await exerciseScrollbar(page, panel.locator('.shift-mentor-scroll'), report, `all-mentor-scroll-${viewport.width}`);
  await capture(page, `all-mentor-${viewport.width}`);
  await panel.getByRole('button', { name: 'Закрыть тетрадь', exact: true }).focus(); await page.keyboard.press('Escape');
  assert.ok(await mentor.evaluate(node => node === document.activeElement));
  await page.getByRole('button', { name: 'Сдать смену', exact: true }).click();
  const early = page.getByRole('dialog', { name: 'Смена сдаётся досрочно', exact: true });
  await early.waitFor(); await exerciseScrollbar(page, early.locator('.shift-debrief-scroll'), report, `all-shift-early-scroll-${viewport.width}`);
  await capture(page, `all-shift-early-exit-${viewport.width}`);
  await early.getByRole('button', { name: 'Продолжить эту смену', exact: true }).click();
  assert.ok(state.equipment.charges.reference > 0 && state.equipment.charges.retry > 0, 'The actual saved equipment enables both assistance controls');
  let answered = 0, reference = false, retried = false, revealed = false, skippedRetry = false;
  while (state.task && answered++ < 15) {
    const task = state.task; kinds.add(task.response.kind);
    await page.getByRole('heading', { name: task.question, exact: true }).waitFor();
    const room = ['stationPlot', 'stationBoard', 'findError', 'dependencySequence'].includes(task.response.kind) ? 'synoptic' : 'telegraph';
    await checkWorkroom(page, room, report, `shift-${task.response.kind}-${answered}`);
    const instructions = page.locator('.shift-context > summary');
    await instructions.focus(); await instructions.press('Enter');
    assert.ok(await page.locator('.shift-context').evaluate(node => node.open), 'The task guide opens from keyboard');
    await instructions.click();
    assert.equal(await page.locator('.shift-context').evaluate(node => node.open), false, 'The task guide closes from pointer');
    const referenceButton = page.locator('.shift-assistance__button').filter({ hasText: 'Открыть справку' });
    if (!reference && await referenceButton.count() && await referenceButton.isEnabled()) {
      await afterClick(page, referenceButton, `/api/shifts/${id}/reference`); reference = true;
      await page.getByRole('heading', { name: 'Справка к заданию', exact: true }).waitFor();
    }
    await fillTask(page, task, { report, capture, phase: 'shift' });
    if (task.response.kind === 'stationPlot' && viewport.width === 390) {
      // Repeat the populated diagram across orientation and narrow-width changes.
      // Clear/reassign must still use the current layout, without extra server answers.
      for (const size of [{ width: 844, height: 390 }, { width: 320, height: 844 }, viewport]) {
        await page.setViewportSize(size);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await fillTask(page, task, { report, capture, phase: 'shift-resize' });
        await checkMapTabVisibility(page, page.locator('.station-slot'), { report, capture, phase: 'shift-resize' });
        await capture(page, `all-station-plot-resize-${size.width}`);
      }
    }
    if (task.response.kind === 'stationBoard') {
      const map = page.locator('.station-board-map');
      if (await map.count()) { await exerciseScrollbar(page, map, report, `all-board-x-${viewport.width}-${answered}`, 'horizontal'); await exerciseScrollbar(page, map, report, `all-board-y-${viewport.width}-${answered}`); }
    }
    await capture(page, `all-task-${task.response.kind}-${answered}-${viewport.width}`);
    let result = await afterClick(page, page.getByRole('button', { name: 'Проверить', exact: true }), `/api/tasks/${encodeURIComponent(task.instanceId)}/answer`);
    if (result.status === 'retry-offered') {
      if (!revealed) {
        result = await afterClick(page, page.getByRole('button', { name: 'Показать разбор', exact: true }), `/api/shifts/${id}/reveal`);
        revealed = true;
      } else {
        await page.getByRole('button', { name: 'Повторить ответ · 1 заряд', exact: true }).click();
        if (!skippedRetry) {
          result = await afterClick(page, page.getByRole('button', { name: 'Перейти к разбору', exact: true }), `/api/shifts/${id}/reveal`);
          assert.equal(result.equipment.remaining.retry, 1, 'Leaving the second attempt does not spend its charge');
          skippedRetry = true;
        } else {
          result = await afterClick(page, page.getByRole('button', { name: 'Проверить повторную попытку', exact: true }), `/api/tasks/${encodeURIComponent(task.instanceId)}/answer`);
          assert.equal(result.feedback.retried, true); assert.equal(result.equipment.remaining.retry, 0);
          retried = true;
        }
      }
    }
    await page.locator('.shift-feedback').waitFor();
    if (task.response.kind === 'stationPlot') {
      const disabledTarget = page.locator('.station-slot').first();
      await clickSvgPosition(page, disabledTarget, { report, capture, phase: 'shift-disabled' }, {
        indices: [3], fresh: false, disabled: true, name: 'guard',
      });
    }
    if (result.completed) { await page.getByRole('button', { name: /^Завершить смену ·/ }).click(); break; }
    assert.ok(result.nextTask, 'The authoritative answer contains the next task');
    await page.getByRole('button', { name: 'Следующее задание', exact: true }).click();
    state = { ...state, task: result.nextTask };
  }
  assert.deepEqual([...kinds].sort(), ['choice','dependencySequence','findError','numeric','sequence','stationBoard','stationPlot']);
  assert.ok(reference && retried && revealed && skippedRetry, 'Reference, reveal, leaving a retry and a second answer are all exercised against the actual server');
  const final = page.locator('.shift-debrief-overlay[open]'); await final.waitFor();
  await checkWorkroom(page, 'reading', report, 'shift-result');
  await exerciseScrollbar(page, final.locator('.shift-debrief-scroll'), report, `all-shift-result-scroll-${viewport.width}`);
  await capture(page, `all-shift-result-${viewport.width}`);
  await final.getByRole('button', { name: 'На станцию', exact: true }).click();
  report.cases.push({ name: `all-shift-controls-${viewport.width}`, actualAnswered: answered, kinds: [...kinds], reference, retried, revealed, skippedRetry, mentorTabs: true, earlyExitContinue: true, completed: true });
}
async function checkBlitz({page, base, viewport, report, capture}) {
  const pendingLobby = page.waitForResponse(response => pathOf(response) === '/api/blitz-practice' && response.request().method() === 'GET');
  await page.goto(base + '/blitz');
  const lobbyResponse = await pendingLobby;
  assert.ok(lobbyResponse.ok(), `GET /api/blitz-practice: ${lobbyResponse.status()}`);
  const lobby = await lobbyResponse.json();
  assert.ok(!lobby.session || lobby.session.status === 'completed', 'The previous test round finished before starting another');
  // Completed rounds are intentionally restored on entry, including between
  // viewport checks. Wait for the server-backed action, not the loading h1.
  const restored = lobby.session?.status === 'completed';
  const start = page.getByRole('button', { name: restored ? 'Новый блиц · 90 с' : 'Начать блиц · 90 с', exact: true });
  await start.waitFor();
  await checkWorkroom(page, restored ? 'reading' : 'telegraph', report, restored ? 'blitz-restored-result' : 'blitz-lobby');
  await page.locator('.blitz-profile summary').click();
  await capture(page, `all-blitz-lobby-${viewport.width}`);
  let state = await afterClick(page, start, '/api/blitz-practice');
  // The clock is the actual server clock; no time or response is substituted.
  let count = 0;
  while (state.status === 'active' && state.task && count++ < 8) {
    await page.getByRole('heading', { name: state.task.question, exact: true }).waitFor();
    await fillTask(page, state.task, { report, capture, phase: 'blitz' });
    const submit = page.getByRole('button', { name: 'Отправить ответ', exact: true });
    await submit.scrollIntoViewIfNeeded();
    const timedControls = await submit.evaluate(button => {
      const timer = document.querySelector('.blitz-timer'), clock = timer?.getBoundingClientRect(), action = button.getBoundingClientRect();
      return { clockVisible: Boolean(clock && clock.top >= 0 && clock.bottom <= innerHeight && timer.contains(document.elementFromPoint(clock.x + clock.width / 2, clock.y + clock.height / 2))),
        actionReachable: button.contains(document.elementFromPoint(action.x + action.width / 2, action.y + action.height / 2)) };
    });
    assert.deepEqual(timedControls, { clockVisible: true, actionReachable: true }, 'The running clock stays visible and does not cover the answer action');
    if (count === 1) await capture(page, `all-blitz-active-${viewport.width}`);
    const result = await afterClick(page, submit, `/api/blitz-practice/${state.id}/answer`);
    state = result.session;
  }
  assert.equal(state.status, 'completed'); assert.equal(state.progress.answered, 6, 'Six actual UI answers finish before the actual deadline');
  await page.locator('.blitz-result').waitFor();
  await checkWorkroom(page, 'reading', report, 'blitz-result');
  const reviews = page.locator('.blitz-review summary');
  for (let i = 0; i < await reviews.count(); i++) await reviews.nth(i).click();
  await exerciseScrollbar(page, page.locator('.app-page-scroll'), report, `all-blitz-result-scroll-${viewport.width}`);
  await capture(page, `all-blitz-result-${viewport.width}`);
  await page.getByRole('button', { name: 'Спокойная учебная смена', exact: true }).click();
  await page.getByRole('heading', { name: 'Записка на краю стола', exact: true }).waitFor();
  report.cases.push({ name: `all-blitz-controls-${viewport.width}`, actualAnswers: state.progress.answered, reviewAccordions: true, ordinaryShiftLink: true });
}
async function runGameControlChecks({base,browser,report,capture,fixture}) {
  for (const viewport of [{width:1366,height:768},{width:390,height:844},{width:844,height:390}]) {
    const context = await browser.newContext({ viewport, reducedMotion:'reduce', deviceScaleFactor:1 });
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push({ scenario:`game-${viewport.width}`,message:error.message }));
    const session = await login(page,base,fixture,fixture.users[1]);
    const args = {page,base,viewport,report,capture,token:session.token};
    await checkInventory(args); await checkShift(args); await checkBlitz(args);
    await context.close();
  }
}
module.exports = {runGameControlChecks};
