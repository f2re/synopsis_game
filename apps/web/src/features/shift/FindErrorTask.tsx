import type { FindErrorPayload, ShiftFeedbackDetails, StationPlotObservation } from '../../api';
import './FindErrorTask.css';

interface Props {
  payload: FindErrorPayload;
  selectedStationId: string | null;
  onSelect: (stationId: string) => void;
  disabled?: boolean;
  feedback?: ShiftFeedbackDetails | null;
}

function observation(payload: FindErrorPayload, stationId: string, field: string): StationPlotObservation | undefined {
  return payload.observations.find((item) => item.stationId === stationId && item.field === field);
}

export function FindErrorTask({ payload, selectedStationId, onSelect, disabled = false, feedback }: Props) {
  const expected = feedback?.expectedStationId;
  const submitted = feedback?.selectedStationId;

  return (
    <div className="find-error-workspace">
      {payload.rule && <div className="find-error-rule"><strong>Физический контроль</strong><span>{payload.rule}</span></div>}
      <svg className="find-error-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" aria-label="Планшет контроля наблюдений">
        <rect className="find-error-paper" x="12" y="12" width="976" height="976" rx="24" />
        <path className="find-error-guide" d="M70 190 C250 120 430 165 570 115 S820 95 935 185" />
        <path className="find-error-guide secondary" d="M65 770 C250 655 365 725 500 650 S760 600 935 730" />

        {payload.stations.map((station) => {
          const t = observation(payload, station.id, 'T');
          const td = observation(payload, station.id, 'Td');
          const isSelected = selectedStationId === station.id;
          const isExpected = expected === station.id;
          const isWrongSubmitted = Boolean(feedback && submitted === station.id && submitted !== expected);
          const className = [
            'find-error-station',
            isSelected ? 'is-selected' : '',
            isExpected ? 'is-correct' : '',
            isWrongSubmitted ? 'is-wrong' : '',
          ].filter(Boolean).join(' ');
          return (
            <g
              key={station.id}
              className={className}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Станция ${station.name}: T ${t?.value ?? '—'}, Td ${td?.value ?? '—'}`}
              onClick={() => !disabled && onSelect(station.id)}
              onKeyDown={(event) => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) onSelect(station.id);
              }}
            >
              <circle className="find-error-hit" cx={station.x} cy={station.y} r="92" />
              <circle className="find-error-center" cx={station.x} cy={station.y} r="34" />
              <circle className="find-error-dot" cx={station.x} cy={station.y} r="5" />
              <text className="find-error-value" x={station.x - 72} y={station.y - 48} textAnchor="middle">{t?.display ?? '—'}</text>
              <text className="find-error-value" x={station.x - 72} y={station.y + 64} textAnchor="middle">{td?.display ?? '—'}</text>
              <text className="find-error-name" x={station.x} y={station.y + 104} textAnchor="middle">{station.name}</text>
            </g>
          );
        })}
      </svg>
      <div className="find-error-legend">
        <span><b>T</b> — слева сверху</span>
        <span><b>Td</b> — слева снизу</span>
        {!disabled && <strong>{selectedStationId ? `Выбрана станция ${payload.stations.find((item) => item.id === selectedStationId)?.name ?? selectedStationId}` : 'Выберите подозрительную станцию'}</strong>}
      </div>
    </div>
  );
}
