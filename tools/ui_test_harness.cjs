/* Deterministic hook/event doubles for real component handlers.
 * These are contract/lifecycle tests, never browser, accessibility or artwork acceptance. */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('../apps/web/node_modules/typescript');
let owner;
const jsx = (type, props, key) => ({ type, props, key });
const react = {
  useRef(value) { const hook = owner.hooks[owner.cursor++] ??= { kind: 'ref', value: { current: value } }; return hook.value; },
  useState(value) {
    const runner = owner;
    const hook = runner.hooks[runner.cursor++] ??= { kind: 'state', value: typeof value === 'function' ? value() : value };
    return [hook.value, (next) => {
      if (!runner.live) runner.lateWrites++;
      const result = typeof next === 'function' ? next(hook.value) : next;
      if (!Object.is(result, hook.value)) { hook.value = result; runner.dirty = true; }
    }];
  },
  useEffect(fn, deps) {
    const hook = owner.hooks[owner.cursor++] ??= { kind: 'effect' };
    if (!hook.deps || !deps || deps.some((value, index) => !Object.is(value, hook.deps[index]))) owner.effects.push({ hook, fn, deps });
  },
  useMemo(fn) { owner.cursor++; return fn(); },
  useCallback(fn) { owner.cursor++; return fn; },
  lazy: () => 'LazyComponent', Suspense: 'Suspense',
};
function load(file, dependencies = {}, globals = {}, append = '') {
  const exported = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const deps = { react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, ...dependencies };
  vm.runInNewContext(code + append, { exports: exported, Error, ...globals, require(id) { assert(id in deps, `Unexpected dependency ${id} in ${file}`); return deps[id]; } });
  return exported;
}
class Runner {
  hooks = []; effects = []; cursor = 0; dirty = true; live = true; lateWrites = 0;
  constructor(component, props = {}, { effects = true } = {}) { this.component = component; this.props = props; this.runEffects = effects; this.render(); }
  render(props) {
    if (props) this.props = { ...this.props, ...props };
    let turns = 0;
    do {
      assert(++turns < 30, 'Unexpected component update loop');
      this.dirty = false; this.cursor = 0; this.effects = []; owner = this;
      this.output = this.component(this.props);
      if (this.runEffects) for (const { hook, fn, deps } of this.effects) { hook.cleanup?.(); hook.deps = deps ? [...deps] : undefined; hook.cleanup = fn(); }
    } while (this.dirty && this.runEffects);
  }
  strictRemount() { for (const hook of this.hooks) if (hook?.kind === 'effect') { hook.cleanup?.(); hook.cleanup = undefined; hook.deps = undefined; } this.render(); }
  unmount() { for (const hook of this.hooks) if (hook?.kind === 'effect') hook.cleanup?.(); this.live = false; }
}
class Events {
  listeners = new Map();
  addEventListener(key, fn) { const entries = this.listeners.get(key) ?? []; entries.push(fn); this.listeners.set(key, entries); }
  removeEventListener(key, fn) { this.listeners.set(key, (this.listeners.get(key) ?? []).filter((item) => item !== fn)); }
  emit(key, value) { for (const fn of [...this.listeners.get(key) ?? []]) fn(value); }
  count() { return [...this.listeners.values()].reduce((sum, entries) => sum + entries.length, 0); }
}
function deferred() { let resolve, reject; const promise = new Promise((ok, no) => { resolve = ok; reject = no; }); return { promise, resolve, reject }; }
async function flush(runner) { for (let i = 0; i < 8; i++) await Promise.resolve(); if (runner.live && runner.dirty) runner.render(); }
function nodes(value) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(nodes); return [value, ...nodes(value.props?.children)]; }
function text(value) { if (typeof value === 'string' || typeof value === 'number') return String(value); if (Array.isArray(value)) return value.map(text).join(' '); return value?.props ? text(value.props.children) : ''; }
module.exports = { load, Runner, Events, deferred, flush, nodes, text };
