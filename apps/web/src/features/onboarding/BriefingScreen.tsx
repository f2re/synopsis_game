import { useState } from 'react';
import type { SessionUser } from '../../api';
import { GAME_CALLSIGN, GAME_MARK } from '../../brand';
import { PixelCard, PixelIcon } from '../ui';

interface BriefingScreenProps {
  user: SessionUser;
  onComplete: () => void;
  onOpenWardrobe: () => void;
  onSkip: () => void;
}

interface DialogueStep {
  speaker: string;
  role: string;
  portrait: string;
  text: string;
  hint?: string;
}

const BRIEFING_STEPS: DialogueStep[] = [
  {
    speaker: 'Борис Сергеевич',
    role: 'Старший наставник станции',
    portrait: '/assets/characters/mentor_portrait.png',
    text: 'Здравия желаю, синоптик! Добро пожаловать на опорную гидрометеорологическую станцию 26063. Здесь мы ведём непрерывные приземные наблюдения за балтийскими циклонами и кодируем погоду по международному коду КН-01.',
    hint: 'Нажмите «Далее» для продолжения инструктажа',
  },
  {
    speaker: 'Борис Сергеевич',
    role: 'Старший наставник станции',
    portrait: '/assets/characters/mentor_portrait.png',
    text: 'Ваша главная задача на смене — безошибочно раскодировать поступающие телеграммы Раздела 0 и Раздела 1: определять координаты станции, скорость и направление ветра, облачность, температуру воздуха, точку росы и давление.',
    hint: 'За безошибочную серию телеграмм начисляется премия в очках опыта',
  },
  {
    speaker: 'Борис Сергеевич',
    role: 'Старший наставник станции',
    portrait: '/assets/characters/mentor_portrait.png',
    text: 'Перед тем как заступить на первый срок, вам положено получить служебную форму на вещевом складе. Штормовка, карго, уставная причёска и служебный знак — облик дежурного должен соответствовать регламенту УГМС.',
    hint: 'Вы можете настроить внешний вид сейчас или сразу перейти в хаб',
  },
];

export function BriefingScreen({ user, onComplete, onOpenWardrobe, onSkip }: BriefingScreenProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = BRIEFING_STEPS[currentStepIndex];
  const isLast = currentStepIndex === BRIEFING_STEPS.length - 1;

  function handleNext() {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }

  return (
    <main className="app-shell briefing-screen" aria-labelledby="briefing-title">
      <div style={{ maxWidth: 640, margin: '40px auto' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '24px 28px' }}>
            {/* Верхняя плашка */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ui-border-subtle)', paddingBottom: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--color-primary-cyan)', fontFamily: 'var(--font-pixel-ui)' }}>
                  {GAME_MARK} · СЛУЖЕБНЫЙ БРИФИНГ
                </span>
              </div>
              <button
                type="button"
                className="pixel-btn-secondary"
                style={{ padding: '4px 10px', fontSize: 11 }}
                onClick={onSkip}
              >
                Пропустить брифинг ⏭
              </button>
            </div>

            {/* Диалоговая зона */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', minHeight: 180 }}>
              {/* Портрет наставника */}
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 4,
                border: '2px solid var(--color-primary-cyan)',
                background: 'var(--color-surface-sunken, #0a1120)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden'
              }}>
                <img
                  src={step.portrait}
                  alt={step.speaker}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
                  onError={(e) => {
                    // Fallback to stylized text icon
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span style={{ fontSize: 28, display: 'block' }}>👨‍✈️</span>
              </div>

              {/* Текст реплики */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <h2 id="briefing-title" style={{ margin: 0, fontSize: 15, fontFamily: 'var(--font-pixel-ui)', color: 'var(--color-primary-cyan)' }}>
                    {step.speaker}
                  </h2>
                  <span style={{ fontSize: 11, color: 'var(--ui-text-muted)' }}>
                    [{step.role}]
                  </span>
                </div>

                <p style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--ui-text-primary)',
                  margin: '8px 0 12px',
                  fontFamily: 'inherit'
                }}>
                  {step.text}
                </p>

                {step.hint && (
                  <div style={{
                    fontSize: 11,
                    color: 'var(--color-accent-amber, #e67e22)',
                    background: 'rgba(230, 126, 34, 0.08)',
                    padding: '6px 10px',
                    borderRadius: 3,
                    display: 'inline-block'
                  }}>
                    💡 {step.hint}
                  </div>
                )}
              </div>
            </div>

            {/* Пагинатор и кнопки навигации */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid var(--ui-border-subtle)'
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {BRIEFING_STEPS.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: i === currentStepIndex ? 'var(--color-primary-cyan)' : 'var(--ui-border-subtle)',
                      display: 'inline-block'
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {isLast && (
                  <button
                    type="button"
                    className="pixel-btn-secondary"
                    onClick={onOpenWardrobe}
                  >
                    🧥 Выбрать форму
                  </button>
                )}
                <button
                  type="button"
                  className="pixel-btn-primary"
                  onClick={handleNext}
                >
                  {isLast ? 'Заступить на дежурство →' : 'Далее →'}
                </button>
              </div>
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
