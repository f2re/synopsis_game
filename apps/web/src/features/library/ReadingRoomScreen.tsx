import { StationRoomArt } from '../atmosphere/StationRoomArt';
import { useAmbientWeather } from '../atmosphere/AtmosphereProvider';
import { usePresentationPreferences, useSettings, updateSettings } from '../settings/settingsStore';
import { PixelScrollArea } from '../ui/PixelScrollArea';
import './reading-room.css';

interface ReadingRoomScreenProps {
  onBack: () => void;
  onOpenLibrary: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
}

export function ReadingRoomScreen({ onBack, onOpenLibrary, onOpenHelp, onOpenSettings }: ReadingRoomScreenProps) {
  const weather = useAmbientWeather();
  const preferences = usePresentationPreferences();
  const settings = useSettings();
  return <main className="station-interior-screen station-reading-room" aria-labelledby="reading-room-title">
    <StationRoomArt presentation="scene" rain={weather === 'rain'} reducedMotion={preferences.reducedMotion || preferences.lowPower} />
    <nav className="station-interior-nav" aria-label="Читальный зал" data-scene-occluder>
      <button type="button" className="station-interior-button station-back" onClick={onBack}>← На площадь</button>
      <button type="button" className="station-interior-button station-sound-button" aria-pressed={settings.soundEnabled}
        onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}>
        {settings.soundEnabled ? 'Выключить звук' : 'Включить звук'}
      </button>
    </nav>
    <section className="station-interior-desk station-reading-room__desk" aria-label="Книга на столе" data-scene-occluder>
      <PixelScrollArea className="station-reading-room__desk-scroll" label="Читальный зал архива">
        <div className="station-reading-room__desk-content">
          <p className="station-reading-room__eyebrow">КНИГА НА СТОЛЕ</p>
          <h1 id="reading-room-title">Читальный зал архива</h1>
          <p>Найдите понятие, разберите обозначение или вернитесь к своей закладке.</p>
          <button type="button" className="station-reading-room__open" onClick={onOpenLibrary}>
            <strong>Открыть библиотеку</strong><span aria-hidden="true">→</span>
          </button>
        </div>
      </PixelScrollArea>
      <footer className="station-reading-room__actions">
        <button type="button" className="station-reading-room__link" onClick={onOpenHelp}>Помощь на станции</button>
        <button type="button" className="station-reading-room__link" onClick={onOpenSettings}>Атмосфера</button>
      </footer>
    </section>
  </main>;
}
