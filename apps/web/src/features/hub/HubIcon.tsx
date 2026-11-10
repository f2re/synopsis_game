import { PixelIcon } from '../ui/PixelIcon';

const icons: Readonly<Record<string, string>> = {
  weather: 'icon-weather',
  settings: 'icon-settings',
  archive: 'icon-archive',
  guide: 'icon-book',
  cartography: 'icon-route',
  map: 'icon-route',
  observer: 'icon-observer',
  student: 'icon-observer',
};

/** SpriteCook R01 artwork; labels and control semantics remain in the DOM. */
export function HubIcon({ name, size = 40 }: { name: string; size?: number }) {
  const asset = icons[name];
  if (!asset) return <PixelIcon name={name} size={size} alt="" />;
  return <img className="pixel-icon hub-art-icon" src={`/assets/ui/hub-r01/${asset}.png`} width={size} height={size} alt="" draggable={false} style={{ width: size, height: size }} />;
}
