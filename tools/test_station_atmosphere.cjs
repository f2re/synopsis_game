// Behavioral contracts: storage migration, presentation/audio policy and real
// production music scheduler against a deterministic Web Audio test double.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(path.join(process.cwd(), 'apps/web/node_modules/typescript'));
const root = 'apps/web/src/features/';
function transpile(file) { return ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; }
function storeRuntime(entries = {}, blocked = false, reduced = false) {
 const data = new Map(Object.entries(entries));
 const events = [];
 const handlers = new Map();
 const context = { exports: {}, require: () => ({ useSyncExternalStore() {} }),
  localStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => { if (blocked) throw Error('Storage blocked'); data.set(key, value); } },
  window: { matchMedia: () => ({ matches: reduced }), dispatchEvent: event => events.push(event), addEventListener: (type, fn) => handlers.set(type, fn), removeEventListener: type => handlers.delete(type) },
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
 };
 vm.runInNewContext(transpile(root + 'settings/settingsStore.ts'), context);
 return { store: context.exports, context, data, events, handlers };
}
const runtime = storeRuntime({ synopsis_26063_settings: '{malformed', 'synopsis.ui.preferences.v1': JSON.stringify({ soundEnabled: true, lowPower: true }) });
const s = runtime.store;
assert.equal(s.loadSettings().soundEnabled, true, 'Legacy Hub sound migrates even if old Settings JSON is malformed');
assert.equal(s.loadSettings().lowPower, true);
const safe = s.normalizeSettings({ masterVolume: 400, ambientVolume: -5, musicVolume: NaN, sfxVolume: '80', soundEnabled: 'true', weather: 'storm', highContrast: 1, extra: 'untrusted' });
assert.equal(safe.masterVolume, 100); assert.equal(safe.ambientVolume, 0); assert.equal(safe.musicVolume, 35); assert.equal(safe.sfxVolume, 65); assert.equal(safe.soundEnabled, false); assert.equal(safe.highContrast, false); assert.equal(safe.weather, 'auto'); assert.equal('extra' in safe, false);
assert.equal(s.normalizeSettings([]).soundEnabled, false);
assert.equal(s.normalizeSettings({ soundEnabled: false }, { soundEnabled: true }).soundEnabled, false, 'Canonical explicit false wins over migration');
assert.equal(s.updateSettings({ musicVolume: 42, weather: 'rain' }), true);
assert.equal(s.getSettings().musicVolume, 42);
assert.equal(JSON.parse(runtime.data.get(s.SETTINGS_KEY)).weather, 'rain');
assert.ok(runtime.events.some(x => x.type === 'hub:preferences-changed'), 'Existing campus receives settings changes');
const blocked = storeRuntime({}, true).store;
assert.equal(blocked.updateSettings({ musicEnabled: false }), false);
assert.equal(blocked.getSettings().musicEnabled, false, 'Blocked storage still permits an in-memory setting');
const system = storeRuntime({}, false, true).store;
assert.equal(system.getSettings().reducedMotion, false);
assert.equal(system.getPresentationPreferences().reducedMotion, true, 'System accessibility override must be effective without rewriting the user preference');
const policy = {};
vm.runInNewContext(transpile(root + 'atmosphere/ambientPolicy.ts'), { exports: policy });
const audible = { ...s.DEFAULT_SETTINGS, soundEnabled: true };
assert.equal(policy.atmospherePolicy(audible, 'home', true, false).audible, false, 'Persisted opt-in does not autoplay before a gesture');
assert.equal(policy.atmospherePolicy(audible, 'home', false, true).music, false, 'Hidden tabs have no music');
assert.equal(policy.atmospherePolicy(audible, 'silent', true, true).audible, false, 'Exit/shift surfaces are silent');
assert.equal(policy.atmospherePolicy(audible, 'study', true, true).audible, true, 'Study retains the educational effect bus');
assert.equal(policy.atmospherePolicy(audible, 'study', true, true).music, false, 'Study turns off music');
assert.equal(policy.atmospherePolicy(audible, 'study', true, true).indoorAmbient, false, 'Study does not start interior beds');
assert.equal(policy.atmospherePolicy(audible, 'campus', true, true).indoorAmbient, false, 'Only WorldCanvas owns campus ambience');
assert.equal(policy.atmospherePolicy({ ...audible, musicEnabled: false }, 'library', true, true).indoorAmbient, true, 'Music switch is independent of rain and room ambience');
assert.equal(policy.atmospherePolicy({ ...audible, masterVolume: 0 }, 'library', true, true).audible, false);
assert.equal(policy.ambientWeatherAt('auto', 0), 'clear');
assert.equal(policy.ambientWeatherAt('auto', 480_000), 'rain');
assert.equal(policy.ambientWeatherAt('auto', 660_000), 'clear');
assert.equal(policy.ambientWeatherAt('auto', 1_200_000), 'rain');
assert.equal(policy.ambientWeatherAt('rain', 0), 'rain');
assert.equal(policy.ambientWeatherAt('clear', 500_000), 'clear');
const gate = {}, dispatched = [];
vm.runInNewContext(transpile(root + 'atmosphere/audioGate.ts'), { exports: gate, window: { dispatchEvent: e => dispatched.push(e) }, CustomEvent: class { constructor(type) { this.type = type; } } });
gate.unlockAudioFromGesture({ isTrusted: false }); assert.equal(gate.isAudioUnlocked(), false);
gate.unlockAudioFromGesture({ isTrusted: true }); gate.unlockAudioFromGesture({ isTrusted: true });
assert.equal(gate.isAudioUnlocked(), true); assert.equal(dispatched.length, 1, 'Exactly one gesture unlock event per page lifetime');
let timerId = 0, graphReads = 0, oscillatorStarts = 0, peakVoices = 0;
const timers = new Map(), oscillators = new Set();
const param = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} });
const context = { currentTime: 0, state: 'running', createGain: () => ({ gain: param(), connect() {}, disconnect() {} }), createOscillator() { const voice = { frequency: param(), connect() {}, disconnect() {}, start() { oscillatorStarts++; }, stop(at) { this.endAt = at; } }; oscillators.add(voice); return voice; } };
const musicExports = {};
vm.runInNewContext(transpile(root + 'atmosphere/StationMusic.ts'), { exports: musicExports, setInterval: fn => { const id = ++timerId; timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id) });
const music = new musicExports.StationMusic(() => { graphReads++; return { context, output: {} }; });
assert.equal(graphReads, 0, 'Constructing the controller must not construct/unlock audio');
music.start(); music.start(); assert.equal(timers.size, 1); assert.equal(graphReads, 1);
for (let i = 0; i < 2000; i++) {
 context.currentTime += .25;
 for (const oscillator of oscillators) if (oscillator.endAt <= context.currentTime) { oscillator.onended?.(); oscillators.delete(oscillator); }
 for (const fn of timers.values()) fn();
 peakVoices = Math.max(peakVoices, music.activeVoiceCount);
 assert.ok(music.activeVoiceCount <= musicExports.MUSIC_MAX_VOICES, 'The authoring pattern must fit the hard voice budget');
}
assert.ok(oscillatorStarts > 100, 'The long-run scheduler actually produced musical voices');
const beforeDelay = oscillatorStarts; context.currentTime += 100; for (const fn of timers.values()) fn();
assert.ok(oscillatorStarts - beforeDelay <= 3, 'Late timers never catch up missed notes in a burst');
music.stop(); assert.equal(timers.size, 0); assert.equal(music.running, false);
for (let i = 0; i < 30; i++) { music.start(); music.stop(); assert.ok(music.activeVoiceCount <= musicExports.MUSIC_MAX_VOICES, 'Rapid repeated toggles also count fading voices toward the budget'); }
context.currentTime += .2;
for (const oscillator of oscillators) if (oscillator.endAt <= context.currentTime) { oscillator.onended?.(); oscillators.delete(oscillator); }
assert.equal(music.activeVoiceCount, 0, 'Faded voices disconnect and release within 120 ms');
const beforePause = oscillatorStarts; context.currentTime += 1; assert.equal(oscillatorStarts, beforePause);
music.start(true); assert.equal(timers.size, 1); music.stop(); assert.equal(timers.size, 0);
const unavailable = new musicExports.StationMusic(() => null); unavailable.start(); assert.equal(unavailable.running, false);
console.log(`PASS station atmosphere: typed storage migration/clamping, blocked storage, system reduced motion, gesture gate, hidden/exit policy, ambient ownership, decorative weather cycle; 500-second music scheduler, peak ${peakVoices}/${musicExports.MUSIC_MAX_VOICES} voices, singleton timer, stop/restart and delayed callback.`);
