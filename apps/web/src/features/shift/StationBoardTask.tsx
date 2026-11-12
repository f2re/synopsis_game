import { useMemo, useState } from 'react';
import { PixelScrollArea } from '../ui/PixelScrollArea';
import { stationPositionLabel } from './stationPositionLabel';
import type {
  StationBoardPayload,
  StationPlotComponentResult,
  StationPlotObservation,
  StationPlotSlot,
} from '../../api';
import './StationBoardTask.css';

interface Props {
  payload: StationBoardPayload;
  placements: Record<string, string>;
  onChange: (placements: Record<string, string>) => void;
  disabled?: boolean;
  results?: StationPlotComponentResult[];
}

function observationText(observation: StationPlotObservation): string {
  return observation.display ?? observation.value;
}

function assignedObservation(observations: StationPlotObservation[], placements: Record<string, string>, slotId: string) {
  return observations.find((observation) => placements[observation.id] === slotId);
}

function slotStatus(slot: StationPlotSlot, results?: StationPlotComponentResult[]): string {
  if (!results?.length) return '';
  const submitted = results.find((item) => item.submittedSlotId === slot.id);
  if (submitted) return submitted.correct ? 'is-correct' : 'is-wrong';
  return results.some((item) => !item.correct && item.expectedSlotId === slot.id) ? 'is-expected' : '';
}

function revealFocusedPosition(target: SVGGElement) {
  // Firefox does not reliably scroll SVG groups inside nested HTML viewports.
  // Apply the smallest movement after native focus scrolling has finished.
  requestAnimationFrame(() => {
    if (!target.isConnected || document.activeElement !== target) return;
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (!parent.classList.contains('pixel-scroll-area__viewport')) continue;
      const rect = target.getBoundingClientRect();
      const frame = parent.getBoundingClientRect();
      const left = frame.left + parent.clientLeft + 8;
      const top = frame.top + parent.clientTop + 8;
      const right = frame.left + parent.clientLeft + parent.clientWidth - 8;
      const bottom = frame.top + parent.clientTop + parent.clientHeight - 8;
      parent.scrollBy({
        left: rect.left < left ? rect.left - left : rect.right > right ? rect.right - right : 0,
        top: rect.top < top ? rect.top - top : rect.bottom > bottom ? rect.bottom - bottom : 0,
        behavior: 'instant',
      });
    }
  });
}

export function StationBoardTask({ payload, placements, onChange, disabled = false, results }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(payload.observations[0]?.id ?? null);
  const selected = useMemo(
    () => payload.observations.find((observation) => observation.id === selectedId) ?? null,
    [payload.observations, selectedId],
  );

  function assign(slotId: string) {
    if (disabled || !selected) return;
    const next = { ...placements };
    for (const [observationId, assignedSlot] of Object.entries(next)) {
      if (assignedSlot === slotId || observationId === selected.id) delete next[observationId];
    }
    next[selected.id] = slotId;
    onChange(next);
  }

  const placed = Object.keys(placements).length;
  const dense = payload.stations.length >= 7;

  return (
    <div className={`station-board-workspace ${dense ? 'is-dense' : ''}`}>
      <div className="station-board-toolbar">
        <div>
          <span>Наблюдения · {payload.stations.length} станций</span>
          <strong>Размещено {placed}/{payload.observations.length}</strong>
        </div>
        <p>Выберите значение и укажите его позицию около нужной станции.</p>
      </div>

      <div className="station-board-observations" aria-label={`Наблюдения ${payload.stations.length} станций`}>
        {payload.observations.map((observation) => (
          <button
            key={observation.id}
            type="button"
            className={`${selectedId === observation.id ? 'is-selected' : ''} ${placements[observation.id] ? 'is-placed' : ''}`}
            disabled={disabled}
            aria-pressed={selectedId === observation.id}
            onClick={() => setSelectedId(observation.id)}
          >
            <span>{observation.label}</span>
            <strong>{observation.value}</strong>
          </button>
        ))}
      </div>

      {!disabled && selected && (
        <div className="station-board-selected">Выбрано: <strong>{selected.label}</strong> — {selected.value}</div>
      )}
      <PixelScrollArea label="Карта наблюдений" className="station-board-map" orientation="both">
      <svg role="group" className="station-board-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" aria-label="Учебный метеорологический планшон">
        <rect className="station-board-paper" x="12" y="12" width="976" height="976" rx="24" />
        <path className="station-board-guide" d="M80 190 C260 120 430 170 560 110 S820 90 930 180" />
        <path className="station-board-guide secondary" d="M70 760 C240 650 350 720 490 650 S760 590 930 720" />

        {payload.stations.map((station) => (
          <g key={station.id} className="station-board-station">
            <circle cx={station.x} cy={station.y} r={dense ? 34 : 43} />
            <circle className="station-board-dot" cx={station.x} cy={station.y} r={dense ? 5 : 6} />
            <text x={station.x} y={station.y + (dense ? 100 : 118)} textAnchor="middle">{station.name}</text>
          </g>
        ))}

        {payload.slots.map((slot) => {
          const observation = assignedObservation(payload.observations, placements, slot.id);
          const station = payload.stations.find(item => item.id === slot.stationId);
          const position = stationPositionLabel(slot.x, slot.y, station?.x, station?.y);
          const status = slotStatus(slot, results);
          const width = dense ? 102 : 116;
          const height = dense ? 54 : 62;
          return (
            <g
              key={slot.id}
              className={`station-board-slot ${observation ? 'is-filled' : ''} ${status}`}
              role="button"
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              aria-label={`${station?.name ?? 'Станция'}, позиция ${position}${observation ? `: ${observation.label}` : ', свободна'}`}
              onFocus={(event) => revealFocusedPosition(event.currentTarget)}
              onClick={() => assign(slot.id)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); assign(slot.id); } }}
            >
              <rect x={slot.x - width / 2} y={slot.y - height / 2} width={width} height={height} rx="12" />
              <text x={slot.x} y={slot.y + 9} textAnchor="middle">
                {observation ? observationText(observation) : '···'}
              </text>
            </g>
          );
        })}
      </svg>
      </PixelScrollArea>


    </div>
  );
}
