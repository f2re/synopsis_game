/* Existing hook tests exclude drawing. Keep the actual task→room mapping. */
'use strict';
const { load } = require('./ui_test_harness.cjs');
module.exports = load('apps/web/src/features/shift/WorkroomBackdrop.tsx', {
  '../atmosphere/StationRoomArt': { StationRoomArt: 'StationRoomArt' },
  '../atmosphere/AtmosphereProvider': { useAmbientWeather: () => 'clear' },
  '../settings/settingsStore': { usePresentationPreferences: () => ({ reducedMotion: true, lowPower: false }) },
  './workrooms.css': {},
});
