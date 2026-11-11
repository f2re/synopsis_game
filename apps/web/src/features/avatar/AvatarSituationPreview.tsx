import type { KeyboardEventHandler } from 'react';
import type { AvatarContext } from '@synopsis/world-engine/avatar';
import type { AvatarProfile } from '../../api';
import { AvatarPreview, type AvatarAnimation, type AvatarDirection } from './AvatarPreview';

interface Situation {
  id: AvatarContext;
  label: string;
  title: string;
  description: string;
  size: number;
}

const SITUATIONS: readonly Situation[] = [
  { id: 'wardrobe', label: 'Гардероб', title: 'Примерочная', size: 192,
    description: 'Полный рост. Поверните персонажа, чтобы проверить одежду, обувь и рюкзак.' },
  { id: 'campus', label: 'Кампус', title: 'Площадь кампуса', size: 96,
    description: 'На площади виден весь комплект и спутник. Сохраните образ, чтобы выйти в нём в кампус.' },
  { id: 'shift', label: 'Рабочее место', title: 'За рабочим столом', size: 192,
    description: 'Проверьте верх и инструмент за столом. В начатой смене инструмент сохраняется до её завершения.' },
  { id: 'blitz-preview', label: 'Блиц', title: 'Макет сцены', size: 192,
    description: 'Образ для быстрой работы. Игровой режим блица пока не подключён.' },
];

interface AvatarSituationPreviewProps {
  avatar: AvatarProfile;
  context: AvatarContext;
  direction: AvatarDirection;
  animation: AvatarAnimation;
  dirty: boolean;
  keyboardLabel: string;
  onContextChange: (context: AvatarContext) => void;
  onPreviewKeys: KeyboardEventHandler<HTMLDivElement>;
  onAnimationComplete: () => void;
  onAvailableAnimations: (actions: readonly AvatarAnimation[]) => void;
}

/** One live composite; changing the setting never changes the fitting draft. */
export function AvatarSituationPreview({ avatar, context, direction, animation, dirty, keyboardLabel,
  onContextChange, onPreviewKeys, onAnimationComplete, onAvailableAnimations }: AvatarSituationPreviewProps) {
  const situation = SITUATIONS.find((entry) => entry.id === context)!;
  const atDesk = context === 'shift' || context === 'blitz-preview';

  return <section className="inventory-situation" aria-labelledby="inventory-situation-title">
    <h2 id="inventory-situation-title" className="inventory-situation__label">Где примерить образ</h2>
    <div className="inventory-situation__choices" role="group" aria-label="Ситуация примерки">
      {SITUATIONS.map((entry) => <button key={entry.id} type="button" className="inventory-segment"
        aria-pressed={context === entry.id} onClick={() => onContextChange(entry.id)}>{entry.label}</button>)}
    </div>

    <div className={`inventory-situation__stage inventory-situation__stage--${context}`} tabIndex={0} role="group"
      aria-label={`${situation.title}. ${keyboardLabel}`} aria-describedby="inventory-situation-description"
      onKeyDown={onPreviewKeys} data-avatar-situation={context} data-outfit-state={dirty ? 'draft' : 'saved'}>
      {context === 'campus' && <div className="inventory-situation__campus" aria-hidden="true">
        <img className="inventory-situation__ground" src="/hub/r01/campus-ground.png" alt="" />
        <img className="inventory-situation__building" src="/hub/r01/building-codepost.png" alt="" />
        <img className="inventory-situation__tree" src="/hub/r01/prop-tree.png" alt="" />
      </div>}
      <div className="inventory-situation__scene-title" aria-hidden="true">{situation.title}</div>
      <div className="inventory-situation__figure">
        <AvatarPreview avatar={avatar} context={context} direction={direction} animation={animation}
          size={situation.size} showBackdrop={false} onAnimationComplete={onAnimationComplete}
          onAvailableAnimations={onAvailableAnimations} />
      </div>
      {atDesk && <div className="inventory-situation__desk" aria-hidden="true">
        <img className="inventory-situation__desk-folder" src="/assets/items/held_map_folder.png" alt="" />
        <span className="inventory-situation__desk-drawer" />
      </div>}
      <span className="inventory-situation__outfit-state">{dirty ? 'Примерка' : 'Сохранённый образ'}</span>
    </div>
    <p id="inventory-situation-description" className="inventory-situation__description" aria-live="polite">{situation.description}</p>
  </section>;
}
