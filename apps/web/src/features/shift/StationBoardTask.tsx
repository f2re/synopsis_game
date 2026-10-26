import { useMemo, useState } from 'react';
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

  return (
    <div className="station-board-workspace">
      <div className="station-board-toolbar">
        <div>
          <span>Планшет 1000×1000</span>
          <strong>Размещено {placed}/{payload.observations.length}</strong>
        </div>
        <p>Выберите значение и укажите его позицию около нужной станции.</p>
      </div>

      <div className="station-board-observations" aria-label="Наблюдения трёх станций">
        {payload.observations.map((observation) => (
          <button
            key={observation.id}
            type="button"
            className={`${selectedId === observation.id ? 'is-selected' : ''} ${placements[observation.id] ? 'is-placed' : ''}`}
            disabled={disabled}
            onClick={() => setSelectedId(observation.id)}
          >
            <span>{observation.label}</span>
            <strong>{observation.value}</strong>
          </button>
        ))}
      </div>

      <svg className="station-board-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" aria-label="Учебный метеорологический планшон">
        <rect className="station-board-paper" x="12" y="12" width="976" height="976" rx="24" />
        <path className="station-board-guide" d="M80 190 C260 120 430 170 560 110 S820 90 930 180" />
        <path className="station-board-guide secondary" d="M70 760 C240 650 350 720 490 650 S760 590 930 720" />

        {payload.stations.map((station) => (
          <g key={station.id} className="station-board-station">
            <circle cx={station.x} cy={station.y} r="43" />
            <circle className="station-board-dot" cx={station.x} cy={station.y} r="6" />
            <text x={station.x} y={station.y + 82} textAnchor="middle">{station.name}</text>
          </g>
        ))}

        {payload.slots.map((slot) => {
          const observation = assignedObservation(payload.observations, placements, slot.id);
          const status = slotStatus(slot, results);
          return (
            <g
              key={slot.id}
              className={`station-board-slot ${observation ? 'is-filled' : ''} ${status}`}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={observation ? `Размещено ${observation.label}` : 'Свободная позиция станционной модели'}
              onClick={() => assign(slot.id)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') assign(slot.id); }}
            >
              <rect x={slot.x - 58} y={slot.y - 31} width="116" height="62" rx="12" />
              <text x={slot.x} y={slot.y + 10} textAnchor="middle">
                {observation ? observationText(observation) : '···'}
              </text>
            </g>
          );
        })}
      </svg>

      {!disabled && selected && (
        <div className="station-board-selected">Выбрано: <strong>{selected.label}</strong> — {selected.value}</div>
      )}
    </div>
  );
}
