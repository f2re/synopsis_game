import { StationRoomArt } from '../atmosphere/StationRoomArt';
import { useAmbientWeather } from '../atmosphere/AtmosphereProvider';
import { usePresentationPreferences } from '../settings/settingsStore';
import type { ShiftTask } from '../../api';
import './workrooms.css';

export type Workroom = 'reading' | 'telegraph' | 'synoptic';

/** Appearance follows the existing task contract; answers and map geometry do not. */
export function taskWorkroom(kind?: ShiftTask['response']['kind']): Workroom {
  return kind === 'stationPlot' || kind === 'stationBoard' || kind === 'findError' || kind === 'dependencySequence'
    ? 'synoptic' : 'telegraph';
}

export function WorkroomBackdrop({ room = 'telegraph' }: { room?: Workroom }) {
  const weather = useAmbientWeather();
  const preferences = usePresentationPreferences();
  return <StationRoomArt room={room} presentation="scene" className="workroom-backdrop"
    rain={weather === 'rain'} reducedMotion={preferences.reducedMotion || preferences.lowPower} />;
}
