/* Actual identity component handlers with controllable network completion.
 * These checks cover request ownership and duplicate submissions, not browser artwork. */
'use strict';
const assert = require('node:assert/strict');
const { load, Runner, deferred, flush, nodes, text } = require('./ui_test_harness.cjs');
const requests = [];
let cancellations = 0;
let sessionToken = 'original-test-session';
const api = Object.fromEntries(['groups', 'roster', 'login', 'adminLogin', 'setCode', 'adminUsers', 'setUserStatus', 'resetCode', 'createUser', 'batchCreateUsers'].map(method => [method, (...args) => {
  const request = { method, args, ...deferred() };
  requests.push(request);
  return request.promise;
}]));
const timers = new Set();
const window = {
  setTimeout(fn, delay) { const id = setTimeout(fn, delay); timers.add(id); return id; },
  clearTimeout(id) { clearTimeout(id); timers.delete(id); },
};
const identity = load('apps/web/src/features/identity/IdentityScreens.tsx', {
  '../../api': { api, ApiError: Error, getSessionToken: () => sessionToken, cancelPendingLogin() { cancellations++; } },
  '../ui/PixelSwitch': { PixelSwitch: 'PixelSwitch' },
  '../hub/HubModalLayer': { HubModalLayer: 'HubModalLayer' },
  '../ui/PixelScrollArea': { PixelScrollArea: 'PixelScrollArea' },
}, { window, AbortController });
const recent = method => requests.filter(item => item.method === method).at(-1);
const list = (runner, type) => nodes(runner.output).filter(item => item.type === type);
const button = (runner, label) => list(runner, 'button').find(item => text(item) === label);
const form = runner => list(runner, 'form')[0];
const event = { preventDefault() {} };
const profile = { id: 'observer-b', displayName: 'Наблюдатель Б', groupId: 'Б', codeSet: true, roles: ['student'], status: 'active' };

(async () => {
  const accepted = [];
  const runner = new Runner(identity.LoginScreen, { onLogin: user => accepted.push(user), onClose() {} });
  recent('groups').resolve(['А', 'Б']); await flush(runner);
  const oldRoster = recent('roster');
  assert.equal(oldRoster.args[0], 'А');
  list(runner, 'select')[0].props.onChange({ target: { value: 'Б' } }); runner.render();
  assert.equal(oldRoster.args[1].aborted, true, 'Changing group aborts its previous request');
  const freshRoster = recent('roster');
  freshRoster.resolve([{ ...profile, hasCode: false }]); await flush(runner);
  oldRoster.resolve([{ id: 'observer-a', displayName: 'Наблюдатель А', groupId: 'А', hasCode: false }]); await flush(runner);
  assert.equal(list(runner, 'select')[1].props.value, 'observer-b', 'Late group response cannot replace the selected roster');
  assert.doesNotMatch(text(runner.output), /Наблюдатель А/);
  const loginStart = requests.filter(item => item.method === 'login').length;
  const submit = form(runner).props.onSubmit;
  const firstLogin = submit(event); const duplicateLogin = submit(event); runner.render();
  assert.equal(requests.filter(item => item.method === 'login').length, loginStart + 1, 'Two input events create only one login');
  assert.ok(button(runner, 'Входим…').props.disabled);
  assert.ok(list(runner, 'select').every(item => item.props.disabled), 'The pending login owns its selected identity');
  const cancelBefore = cancellations;
  runner.unmount();
  assert.equal(cancellations, cancelBefore + 1, 'Closing a pending login cancels authentication ownership');
  recent('login').resolve(profile); await firstLogin; await duplicateLogin;
  assert.equal(accepted.length, 0, 'A closed form cannot install a late profile');
  assert.equal(runner.lateWrites, 0);

  const retry = new Runner(identity.LoginScreen, { onLogin() {} });
  recent('groups').reject(new Error('Disconnected')); await flush(retry);
  assert.ok(button(retry, 'Повторить загрузку списка'));
  button(retry, 'Повторить загрузку списка').props.onClick(); retry.render();
  recent('groups').resolve(['Б']); await flush(retry);
  recent('roster').resolve([{ ...profile, hasCode: true }]); await flush(retry);
  assert.equal(list(retry, 'select')[1].props.value, profile.id);
  assert.doesNotMatch(text(retry.output), /Не удалось загрузить/);
  retry.unmount();

  const admin = new Runner(identity.AdminLoginScreen, { currentUser: null, onLogin: user => accepted.push(user), onBack() {} });
  list(admin, 'input')[0].props.onChange({ target: { value: 'test-only-code' } }); admin.render();
  const adminStart = requests.filter(item => item.method === 'adminLogin').length;
  const adminSubmit = form(admin).props.onSubmit;
  const entering = adminSubmit(event); void adminSubmit(event);
  assert.equal(requests.filter(item => item.method === 'adminLogin').length, adminStart + 1);
  admin.unmount(); recent('adminLogin').resolve(profile); await entering;
  assert.equal(accepted.length, 0); assert.equal(admin.lateWrites, 0);

  let closed = 0, updated = 0;
  const code = new Runner(identity.SetCodeModal, { user: { ...profile, codeSet: false }, onClose() { closed++; }, onSuccess(next) { assert.equal(next.codeSet, true); updated++; } });
  list(code, 'input').forEach(item => item.props.onChange({ target: { value: 'test-only-code' } })); code.render();
  const codeSubmit = form(code).props.onSubmit;
  const saving = codeSubmit(event); void codeSubmit(event);
  assert.equal(requests.filter(item => item.method === 'setCode').length, 1);
  code.unmount(); recent('setCode').resolve(profile); await saving;
  assert.equal(closed, 0, 'Late save cannot close a subsequently opened dialog');
  assert.equal(updated, 1, 'A confirmed first code updates its owning profile even after the form closes');
  assert.equal(code.lateWrites, 0);

  const oldSessionCode = new Runner(identity.SetCodeModal, { user: profile, onClose() { closed++; }, onSuccess() { updated++; } });
  list(oldSessionCode, 'input').forEach(item => item.props.onChange({ target: { value: 'test-only-code' } })); oldSessionCode.render();
  const savingOldSession = form(oldSessionCode).props.onSubmit(event);
  oldSessionCode.unmount(); sessionToken = 'replacement-test-session';
  recent('setCode').resolve(profile); await savingOldSession;
  assert.equal(updated, 1, 'A previous session cannot install a late profile after another login');
  assert.equal(closed, 0); assert.equal(oldSessionCode.lateWrites, 0);

  const adminProfile = { ...profile, id: 'admin', roles: ['admin'] };
  const management = new Runner(identity.AdminScreen, { currentUser: adminProfile, onBack() {} });
  recent('adminUsers').resolve([adminProfile, profile]); await flush(management);
  const toggle = nodes(management.output).find(item => item.type === 'PixelSwitch');
  toggle.props.onChange(false); toggle.props.onChange(false); management.render();
  assert.equal(requests.filter(item => item.method === 'setUserStatus').length, 1);
  assert.ok(nodes(management.output).find(item => item.type === 'PixelSwitch').props.disabled);
  recent('setUserStatus').resolve({}); await flush(management);
  recent('adminUsers').resolve([adminProfile, { ...profile, status: 'disabled' }]); await flush(management);
  button(management, '↺ Сброс').props.onClick(); management.render();
  assert.ok(nodes(management.output).find(item => item.type === 'HubModalLayer' && item.props.label === 'Сброс кода доступа'));
  const reset = button(management, 'Подтвердить сброс').props.onClick;
  reset(); reset(); management.render();
  assert.equal(requests.filter(item => item.method === 'resetCode').length, 1);
  recent('resetCode').reject(new Error('Не удалось сбросить код')); await flush(management);
  assert.match(text(nodes(management.output).find(item => item.type === 'HubModalLayer')), /Не удалось сбросить код/, 'Mutation error stays inside the open dialog');
  management.unmount();
  assert.equal(management.lateWrites, 0);
  assert.equal(timers.size, 0, 'Every roster deadline is cleared');
  console.log('PASS: real identity handlers; out-of-order roster results; abort on group change; retry after offline; duplicate login/admin/code/status/reset suppression; confirmed code updates only its owning session; closed forms cannot dismiss new dialogs; admin error remains in modal.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { for (const id of timers) clearTimeout(id); });
