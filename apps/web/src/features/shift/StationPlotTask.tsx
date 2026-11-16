import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { stationPositionLabel } from './stationPositionLabel';
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

function revealKeyboardPosition(target: SVGGElement) {
  // Keep pointer focus({preventScroll:true}) still. Only keyboard focus needs
  // the nested-viewport correction after the browser's native focus scroll.
  if (!target.matches(':focus-visible')) return;
  requestAnimationFrame(() => {
    if (!target.isConnected || document.activeElement !== target || !target.matches(':focus-visible')) return;
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (!parent.classList.contains('pixel-scroll-area__viewport')) continue;
      const rect = target.getBoundingClientRect(), frame = parent.getBoundingClientRect();
      const style = getComputedStyle(parent);
      const padding = (value: string) => {
        const pixels = value.endsWith('px') ? Number.parseFloat(value) : NaN;
        return Number.isFinite(pixels) ? Math.max(8, pixels) : 8;
      };
      const left = frame.left + parent.clientLeft + padding(style.scrollPaddingLeft);
      const top = frame.top + parent.clientTop + padding(style.scrollPaddingTop);
      const right = frame.left + parent.clientLeft + parent.clientWidth - padding(style.scrollPaddingRight);
      const bottom = frame.top + parent.clientTop + parent.clientHeight - padding(style.scrollPaddingBottom);
      const x = rect.left < left ? rect.left - left : rect.right > right ? rect.right - right : 0;
      const y = rect.top < top ? rect.top - top : rect.bottom > bottom ? rect.bottom - bottom : 0;
      if (x || y) parent.scrollBy({ left: x, top: y, behavior: 'instant' });
    }
  });
}

export function StationPlotTask({ payload, placements, onChange, disabled = false, results }: StationPlotTaskProps) {
  const observations = payload.observations ?? [];
  const slots = payload.slots ?? [];
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(observations[0]?.id ?? null);
  const svgRef = useRef<SVGSVGElement>(null);
  const suppressFocusReveal = useRef(false);
  const [minimumHitSize, setMinimumHitSize] = useState(0);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const bounds = svg.getBoundingClientRect();
      // The square viewBox uses xMidYMid meet, so its scale follows the shorter side.
      const renderedSize = Math.min(bounds.width, bounds.height);
      if (renderedSize > 0) setMinimumHitSize(Math.ceil(44 * 1000 / renderedSize));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // Include the visible four-unit outline while keeping it out of hit testing.
  const targetWidth = Math.max(234, minimumHitSize);
  const targetHeight = Math.max(114, minimumHitSize);

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

  function assignUnclaimedSvgClick(event: MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    // Some SVG hit-test paths omit a fractional edge that is inside its fill.
    // Resolve only otherwise-unclaimed clicks using the existing exact shape.
    // Native group clicks and keyboard activation keep their normal handlers.
    if (disabled || !selected || event.target !== svg) return;
    const point = new DOMPoint(event.clientX, event.clientY);
    const matches = [...svg.querySelectorAll<SVGGeometryElement>('.station-slot-target')].filter(target => {
      const matrix = target.getScreenCTM();
      return matrix !== null && target.isPointInFill(point.matrixTransform(matrix.inverse()));
    });
    if (matches.length !== 1) return;
    const slotId = matches[0].getAttribute('data-slot-id');
    if (!slotId || !slots.some(slot => slot.id === slotId)) return;
    suppressFocusReveal.current = true;
    try {
      matches[0].closest<SVGGElement>('.station-slot')?.focus({ preventScroll: true });
    } finally {
      suppressFocusReveal.current = false;
    }
    assign(slotId);
  }

  return (
    <div className="station-plot-workspace">
      <div className="station-observations" aria-label="Исходные наблюдения">
        {observations.map((observation) => {
          const placed = placements[observation.id];
          return (
            <div className="station-observation-row" key={observation.id}>
            <button
              key={observation.id}
              type="button"
              className={`station-observation ${selectedObservationId === observation.id ? 'is-selected' : ''} ${placed ? 'is-placed' : ''}`}
              onClick={() => setSelectedObservationId(observation.id)}
              disabled={disabled}
              aria-pressed={selectedObservationId === observation.id}
            >
              <span>{observation.label}</span>
              <strong>{observation.value}</strong>
            </button>
              {placed && !disabled && (
                <button
                  type="button"
                  className="station-observation-clear"
                  aria-label={`Снять ${observation.label}`}
                  onClick={(event) => { (event.currentTarget.previousElementSibling as HTMLButtonElement | null)?.focus(); clearObservation(observation.id); }}
                >×</button>
              )}
            </div>
          );
        })}
      </div>

      <div className="station-plot-panel">
        <div className="station-plot-caption">
          <span>Станционная модель</span>
          <strong>{payload.station?.name ?? 'Учебная станция'}</strong>
        </div>
        <svg
          ref={svgRef}
          className="station-plot-svg"
          viewBox="0 0 1000 1000"
          role="group"
          aria-label="Интерактивная станционная модель"
          preserveAspectRatio="xMidYMid meet"
          onClick={assignUnclaimedSvgClick}
        >
          <circle className="station-center" cx="500" cy="500" r="56" />
          <circle className="station-center-dot" cx="500" cy="500" r="7" />

          {slots.map((slot) => {
            const observation = assignedObservation(observations, placements, slot.id);
            const position = stationPositionLabel(slot.x, slot.y);
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
                  aria-disabled={disabled}
                  tabIndex={disabled ? -1 : 0}
                  aria-label={`Позиция ${position}${observation ? `: ${observation.label}` : ', свободна'}`}
                  onFocus={(event) => { if (!suppressFocusReveal.current) revealKeyboardPosition(event.currentTarget); }}
                  onClick={() => assign(slot.id)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); assign(slot.id); } }}
                >
                  <circle className="station-slot-target" data-slot-id={slot.id} cx="500" cy="500" r={Math.max(127, minimumHitSize / 2)} stroke="none" strokeWidth="0" pointerEvents="all" aria-hidden="true" />
                  <circle className="station-slot-hit wind-hit" cx="500" cy="500" r="125" pointerEvents="none" />
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
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                aria-label={`Позиция ${position}${observation ? `: ${observation.label}` : ', свободна'}`}
                onFocus={(event) => { if (!suppressFocusReveal.current) revealKeyboardPosition(event.currentTarget); }}
                onClick={() => assign(slot.id)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); assign(slot.id); } }}
              >
                <rect className="station-slot-target" data-slot-id={slot.id} x={slot.x - targetWidth / 2} y={slot.y - targetHeight / 2} width={targetWidth} height={targetHeight} rx="24" stroke="none" strokeWidth="0" pointerEvents="all" aria-hidden="true" />
                <rect className="station-slot-hit" x={slot.x - 115} y={slot.y - 55} width="230" height="110" rx="22" pointerEvents="none" />
                <text className="station-slot-text" x={slot.x} y={slot.y + 12} textAnchor="middle">
                  {observation ? observationText(observation) : '· · ·'}
                </text>
              </g>
            );
          })}
        </svg>
        {!disabled && (
          <p className="station-plot-hint">
            Выберите наблюдение, затем укажите его место на станционной модели.
          </p>
        )}
      </div>
    </div>
  );
}
