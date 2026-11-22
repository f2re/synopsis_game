import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createR08PreviewGame, type R08PreviewHandle, type R08PreviewPreferences,
  type R08PreviewStatus, type R08PreviewTarget,
} from '@synopsis/world-engine';
import { usePresentationPreferences } from '../settings/settingsStore';
import './r08-preview.css';

interface R08PreviewScreenProps { onBack: () => void; onVisitArchive: () => void }

/** Explicit art inspection route. Preferences stay local to this preview. */
export function R08PreviewScreen({ onBack, onVisitArchive }: R08PreviewScreenProps) {
  const presentation = usePresentationPreferences();
  const [phase, setPhase] = useState<R08PreviewPreferences['phase']>('day');
  const [framing, setFraming] = useState<R08PreviewPreferences['framing']>('station');
  const [pose, setPose] = useState<R08PreviewPreferences['pose']>('walk');
  const [quiet, setQuiet] = useState(false);
  const [economy, setEconomy] = useState(false);
  const [status, setStatus] = useState<R08PreviewStatus>({ state: 'loading' });
  const [target, setTarget] = useState<R08PreviewTarget | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<R08PreviewHandle | null>(null);
  const visit = useRef(onVisitArchive);
  visit.current = onVisitArchive;
  const preferences = useMemo<R08PreviewPreferences>(() => ({
    phase, framing, pose, reducedMotion: quiet || presentation.reducedMotion,
    lowPower: economy || presentation.lowPower,
  }), [phase, framing, pose, quiet, economy, presentation.reducedMotion, presentation.lowPower]);
  const latest = useRef(preferences);
  latest.current = preferences;

  useEffect(() => {
    if (!host.current) return;
    let active = true;
    const game = createR08PreviewGame(host.current, {
      preferences: latest.current,
      onStatus: (next) => { if (active) setStatus(next); },
      onTarget: (next) => { if (active) setTarget(next); },
      onVisitArchive: () => { if (active) visit.current(); },
    });
    handle.current = game;
    game.setPreferences(latest.current);
    return () => { active = false; handle.current = null; game.destroy(); };
  }, []);

  useEffect(() => { handle.current?.setPreferences(preferences); }, [preferences]);

  const ready = status.state === 'ready';
  return <main className="r08-preview" aria-labelledby="r08-title">
    <header className="r08-preview__heading">
      <div><span className="r08-preview__eyebrow">ХУДОЖЕСТВЕННЫЙ ПИЛОТ</span><h1 id="r08-title">Станция · R08</h1></div>
      <button type="button" className="station-back" onClick={onBack}>← На станцию</button>
    </header>
    <p className="r08-preview__intro">Проверка общей земли, оснований и перекрытий у Архива. Геометрия рассмотрена; цвет, свет и итоговая пиксельная сетка ещё проходят приёмку.</p>
    <div className="r08-preview__toolbar" aria-label="Настройки предпросмотра">
      <fieldset><legend>Освещение</legend><div className="r08-preview__segments">
        <button type="button" aria-pressed={phase === 'day'} onClick={() => setPhase('day')}>День</button>
        <button type="button" aria-pressed={phase === 'twilight'} disabled={!ready || !status.twilightAvailable}
          aria-describedby={ready && !status.twilightAvailable ? 'r08-day-only' : undefined}
          onClick={() => setPhase('twilight')}>Сумерки</button>
      </div></fieldset>
      <fieldset><legend>Камера</legend><div className="r08-preview__segments">
        <button type="button" aria-pressed={framing === 'station'} onClick={() => setFraming('station')}>Вся станция</button>
        <button type="button" aria-pressed={framing === 'archive'} onClick={() => setFraming('archive')}>Архив крупно</button>
      </div></fieldset>
      <label className="r08-preview__select">Наблюдатель<select value={pose} onChange={(event) => setPose(event.target.value as R08PreviewPreferences['pose'])}>
        <option value="walk">Пройти по дорожке</option><option value="archive">Перед Архивом</option><option value="foreground">За кустом и оградой</option>
      </select></label>
    </div>
    <div className="r08-preview__motion">
      <label><input type="checkbox" checked={preferences.reducedMotion} disabled={presentation.reducedMotion} onChange={(event) => setQuiet(event.target.checked)} />Уменьшенное движение</label>
      <label><input type="checkbox" checked={preferences.lowPower} disabled={presentation.lowPower} onChange={(event) => setEconomy(event.target.checked)} />Экономия ресурсов</label>
      {presentation.reducedMotion && <span>Учитывается системная или игровая настройка движения.</span>}
      {ready && !status.twilightAvailable && <span id="r08-day-only">В этом режиме графики доступен день. Для сумеречного освещения нужен WebGL.</span>}
    </div>
    <section className="r08-preview__stage" aria-label="Предпросмотр площади и Архива" aria-describedby="r08-scene-help" data-status={status.state} data-phase={phase} data-framing={framing}>
      <div ref={host} className="r08-preview__canvas" aria-hidden="true" />
      {ready && target && <button type="button" className="r08-preview__archive" style={target}
        onClick={() => handle.current?.visitArchive()} aria-label="Войти в Архив — читальный зал"><span>Архив · войти</span></button>}
      {!ready && <p className="r08-preview__loading" role={status.state === 'error' ? 'alert' : 'status'}>
        {status.state === 'error' ? status.message : 'Собираем слои площади…'}
      </p>}
      <span className="r08-preview__candidate">Кандидат · приёмка открыта</span>
    </section>
    <div className="r08-preview__caption">
      <p id="r08-scene-help">Выберите Архив на сцене или нажмите кнопку. С клавиатуры: Tab, затем Enter или Пробел. Переключатель наблюдателя показывает проход перед фасадом и за передним планом.</p>
      <button type="button" className="r08-preview__enter" onClick={onVisitArchive}>В читальный зал →</button>
    </div>
    <details className="r08-preview__review"><summary>Что проверяет этот пилот</summary>
      <p>Исходная композиция 512×288 размещена в мире 960×540 одним преобразованием ×1,875. Наблюдатель сохраняет высоту 48 пикселей мира. Фасад, ступени, фонарь и передний план взяты из исходной сцены без самостоятельного подбора масштаба.</p>
      <p>Сумерки показывают настраиваемые световые области поверх дневных материалов. Производственная пиксельная сетка, окончательный свет и насыщенность пока не приняты. Это проверка сборки; оценка качества всей игры остаётся открытой.</p>
      <p aria-live="polite">{ready ? `Сцена загружена: ${status.assets ?? 0} слоёв; ${status.foregroundAvailable ? 'передний план подключён' : 'передний план пока отсутствует'}.` : status.state === 'error' ? 'Сборка не загружена; читальный зал доступен отдельно.' : 'Ресурсы загружаются.'}</p>
    </details>
  </main>;
}
