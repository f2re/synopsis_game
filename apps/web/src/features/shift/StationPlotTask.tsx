import { useMemo, useState } from 'react';
import type {
  StationPlotComponentResult,
  StationPlotObservation,
  StationPlotPayload,
  StationPlotSlot,
} from '../../api';
import './StationPlotTask.css';

export interface StationPlotTaskProps {
  payload: StationPlotPayload;
  placements: Record<string, string>;
  onChange: (placements: Record<string, string>) => void;
  disabled?: boolean;
  results?: StationPlotComponentResult[];
}

function observationText(observation: StationPlotObservation): string {
  return observation.display ?? observation.value;
}

function assignedObservation(
  observations: StationPlotObservation[],
  placements: Record<string, string>,
  slotId: string,
): StationPlotObservation | undefined {
  return observations.find((observation) => placements[observation.id] === slotId);
}

function windEnd(directionDeg: number, length = 250): { x: number; y: number } {
  const radians = (directionDeg * Math.PI) / 180;
  return {
    x: 500 + length * Math.sin(radians),
    y: 500 - length * Math.cos(radians),
  };
}

function statusForSlot(
  slot: StationPlotSlot,
  placements: Record<string, string>,
  results: StationPlotComponentResult[] | undefined,
): 'correct' | 'wrong' | 'expected' | undefined {
  if (!results?.length) return undefined;
  const submitted = results.find((item) => item.submittedSlotId === slot.id);
  if (submitted) return submitted.correct ? 'correct' : 'wrong';
  const expected = results.find((item) => !item.correct && item.expectedSlotId === slot.id);
  return expected ? 'expected' : undefined;
}

export function StationPlotTask({ payload, placements, onChange, disabled = false, results }: StationPlotTaskProps) {
  const observations = payload.observations ?? [];
  const slots = payload.slots ?? [];
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(observations[0]?.id ?? null);

  const selected = useMemo(
    () => observations.find((observation) => observation.id === selectedObservationId) ?? null,
    [observations, selectedObservationId],
  );

  function assign(slotId: string) {
    if (disabled || !selected) return;
    const next = { ...placements };
    for (const observationId of Object.keys(next)) {
      if (next[observationId] === slotId || observationId === selected.id) delete next[observationId];
    }
    next[selected.id] = slotId;
    onChange(next);
  }

  function clearObservation(observationId: string) {
    if (disabled) return;
    const next = { ...placements };
    delete next[observationId];
    onChange(next);
  }

  return (
    <div className="station-plot-workspace">
      <div className="station-observations" aria-label="Исходные наблюдения">
        {observations.map((observation) => {
          const placed = placements[observation.id];
          return (
            <button
              key={observation.id}
              type="button"
              className={`station-observation ${selectedObservationId === observation.id ? 'is-selected' : ''} ${placed ? 'is-placed' : ''}`}
              onClick={() => setSelectedObservationId(observation.id)}
              disabled={disabled}
            >
              <span>{observation.label}</span>
              <strong>{observation.value}</strong>
              {placed && !disabled && (
                <i
                  role="button"
                  tabIndex={0}
                  aria-label={`Снять ${observation.label}`}
                  onClick={(event) => { event.stopPropagation(); clearObservation(observation.id); }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') clearObservation(observation.id); }}
                >×</i>
              )}
            </button>
          );
        })}
      </div>

      <div className="station-plot-panel">
        <div className="station-plot-caption">
          <span>{payload.profile ?? 'RUS_SURFACE_STATION_V1'}</span>
          <strong>{payload.station?.name ?? 'Учебная станция'}</strong>
        </div>
        <svg
          className="station-plot-svg"
          viewBox="0 0 1000 1000"
          role="img"
          aria-label="Интерактивная станционная модель"
          preserveAspectRatio="xMidYMid meet"
        >
          <circle className="station-center" cx="500" cy="500" r="56" />
          <circle className="station-center-dot" cx="500" cy="500" r="7" />

          {slots.map((slot) => {
            const observation = assignedObservation(observations, placements, slot.id);
            const status = statusForSlot(slot, placements, results);
            const className = ['station-slot', observation ? 'is-filled' : '', status ? `is-${status}` : ''].filter(Boolean).join(' ');

            if (slot.kind === 'wind') {
              const wind = observation?.wind;
              const end = wind ? windEnd(wind.directionDeg) : { x: 690, y: 310 };
              return (
                <g
                  key={slot.id}
                  className={className}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={observation ? `Размещено: ${observation.label}` : 'Позиция станционной модели'}
                  onClick={() => assign(slot.id)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') assign(slot.id); }}
                >
                  <circle className="station-slot-hit wind-hit" cx="500" cy="500" r="125" />
                  <line className="station-wind-line" x1="500" y1="500" x2={end.x} y2={end.y} />
                  {wind && (
                    <>
                      <circle className="station-wind-end" cx={end.x} cy={end.y} r="7" />
                      <text className="station-wind-speed" x={end.x + 18} y={end.y - 18}>{wind.speedMs} м/с</text>
                    </>
                  )}
                </g>
              );
            }

            return (
              <g
                key={slot.id}
                className={className}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={observation ? `Размещено: ${observation.label}` : 'Позиция станционной модели'}
                onClick={() => assign(slot.id)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') assign(slot.id); }}
              >
                <rect className="station-slot-hit" x={slot.x - 115} y={slot.y - 55} width="230" height="110" rx="22" />
                <text className="station-slot-text" x={slot.x} y={slot.y + 12} textAnchor="middle">
                  {observation ? observationText(observation) : '· · ·'}
                </text>
              </g>
            );
          })}
        </svg>
        {!disabled && (
          <p className="station-plot-hint">
            Выберите наблюдение слева, затем укажите его место на станционной модели. Координаты модели не зависят от размера экрана.
          </p>
        )}
      </div>
    </div>
  );
}
