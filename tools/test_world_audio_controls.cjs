const ts = require(require('node:path').join(process.cwd(), 'apps/web/node_modules/typescript'));
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = 'packages/world-engine/src/audio/';
const definitions = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root + 'audioDefinitions.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {exports:definitions});
const source = ts.transpileModule(fs.readFileSync(root + 'WorldAudioManager.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function createRuntime(withContext) {
 const elements = [], frames = new Map(), listeners = new Map();
 let frameId = 0, starts = 0, contexts = 0;
 const param = () => ({value:0,setValueAtTime(value){this.value=value;},setTargetAtTime(value){this.value=value;}});
 const node = () => ({connect(){},disconnect(){}});
 class AudioMock { constructor(){this.paused=true;elements.push(this);} play(){this.paused=false;return Promise.resolve();} pause(){this.paused=true;} addEventListener(){} }
 class ContextMock { constructor(){contexts++;this.state='running';this.currentTime=0;this.destination={};} createGain(){return {...node(),gain:param()};} createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};} createBiquadFilter(){return {...node(),frequency:param(),Q:param()};} createBufferSource(){return {...node(),detune:param(),start(){starts++;},stop(){}};} }
 const exports = {};
 vm.runInNewContext(source, {
  exports, require: () => definitions, console, Audio:AudioMock,
  window:{AudioContext:withContext?ContextMock:undefined,addEventListener(type,callback){listeners.set(type,callback);},removeEventListener(type){listeners.delete(type);},setTimeout(){return 1;}},
  performance, setTimeout(){return 1;},clearTimeout(){},
  requestAnimationFrame(fn){const id=++frameId;frames.set(id,fn);return id;},
  cancelAnimationFrame(id){frames.delete(id);},
 });
 return {audio:exports.worldAudio,elements,frames,listeners,get starts(){return starts;},get contexts(){return contexts;}};
}
(async () => {
 const unlockRuntime=createRuntime(true), unlock=unlockRuntime.listeners.get('pointerdown');
 unlock({isTrusted:false}); assert.equal(unlockRuntime.contexts,0,'Synthetic gesture cannot create the legacy Web Audio context');
 assert.ok(unlockRuntime.listeners.has('pointerdown'),'Ignored synthetic input must not consume the unlock listener');
 unlockRuntime.audio.setMuted(true); unlock({isTrusted:true}); assert.equal(unlockRuntime.contexts,0,'Even a trusted gesture does not create audio while muted');
 unlockRuntime.audio.setMuted(false); unlock({isTrusted:true}); assert.equal(unlockRuntime.contexts,1,'Trusted audible input unlocks the shared context');
 assert.equal(unlockRuntime.listeners.size,0,'Both gesture listeners are removed after the real unlock');
 const fallback=createRuntime(false), a=fallback.audio;
 a.setMuted(true); a.play('audio.ui.click-soft'); assert.equal(fallback.elements.length,0,'Muted fallback must not create a player');
 a.setMuted(false); a.play('audio.ui.click-soft'); assert.equal(fallback.elements[0].paused,false);
 a.setVolume('master',0); assert.equal(fallback.elements[0].volume,0,'Master volume applies immediately to an active fallback effect');
 a.setVolume('master',1); assert.ok(fallback.elements[0].volume>0);
 a.setMuted(true); assert.equal(fallback.elements[0].paused,true,'Muting must stop a currently playing fallback effect'); assert.equal(fallback.elements[0].muted,true);
 a.setMuted(false); a.playHubOutdoorAmbient(false,0); const loops=fallback.elements.slice(1); assert.equal(loops.length,2,'Hub must activate both canonical ambient beds');
 a.setVolume('ambient',0); assert.ok(loops.every(x=>x.volume===0),'Ambient slider applies immediately to HTMLAudio beds');
 a.setMuted(true); a.stopAmbient(0); assert.ok(loops.every(x=>x.paused&&x.muted),'Ambient fallback must stop and mute');
 const web=createRuntime(true), b=web.audio, resolvers=[];
 b.loadBuffer=()=>new Promise(resolve=>resolvers.push(resolve));
 b.addAmbientLayer('audio.ambient.wind-trees',.4,0,0); assert.equal(web.frames.size,1,'Active full-motion ambience has one LFO callback');
 b.setLowPower(true); assert.equal(web.frames.size,0,'Low power cancels audio RAF');
 b.setLowPower(false); assert.equal(web.frames.size,1);
 b.setReducedSensory(true); assert.equal(web.frames.size,0,'Reduced sensory cancels audio RAF');
 b.setReducedSensory(false); assert.equal(web.frames.size,1);
 b.setMuted(true); assert.equal(web.frames.size,0,'Muted audio cancels RAF');
 b.stopAmbient(0); resolvers.shift()({}); await Promise.resolve(); assert.equal(web.starts,0,'Late decoded ambience must not start after mute/removal');
 b.setMuted(false); b.addAmbientLayer('audio.ambient.wind-trees',.4,0,0);
 b.stopAmbient(0); b.addAmbientLayer('audio.ambient.wind-trees',.4,0,0);
 resolvers.shift()({}); await Promise.resolve(); assert.equal(web.starts,0,'Stale generation must not start replacement layer');
 resolvers.shift()({}); await Promise.resolve(); assert.equal(web.starts,1,'Only current layer starts after unmute');
 b.stopAmbient(0); assert.equal(web.frames.size,0,'Removing final ambient layer cancels RAF');
 const music=b.getMusicOutput(), again=b.getMusicOutput(); assert.ok(music); assert.equal(music.context,again.context); assert.equal(web.contexts,1,'Music reuses the ambient/effect context');
 b.setVolume('music',.42); assert.equal(music.output.gain.value,.42,'Music has an independently controlled bus');
 assert.equal(b.getVolume('ambient'),.65,'Music volume does not overwrite ambience');
 b.setMuted(true); assert.equal(b.getMusicOutput(),null,'Muted music never acquires a playable output');
 console.log('PASS: HTMLAudio fallback mute/live-volume, active-effect stop, both canonical ambient beds, ambient stop; Web Audio low-power/reduced-motion RAF suspension, late-decode cancellation, stale-layer replacement, return from mute, final-layer cleanup; music shares one context and has an independent muted bus.');
})().catch(error=>{console.error(error);process.exitCode=1;});
