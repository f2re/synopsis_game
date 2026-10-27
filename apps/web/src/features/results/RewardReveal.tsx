import { useState, useEffect } from 'react';
import { worldAudio } from '@synopsis/world-engine';
import { PixelCard } from '../ui';

export interface RewardItem {
  id: string;
  title: string;
  category: 'badge' | 'wardrobe' | 'item' | 'building';
  image?: string;
  icon?: string;
  lore: string;
  rarity?: 'common' | 'rare' | 'special';
}

interface RewardRevealProps {
  reward: RewardItem;
  onConfirm: () => void;
  onSkip?: () => void;
}

export function RewardReveal({ reward, onConfirm, onSkip }: RewardRevealProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    try {
      worldAudio.play('audio.reward.fanfare-short');
    } catch {}

    const timer = setTimeout(() => {
      setRevealed(true);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="app-shell reward-reveal-screen" aria-labelledby="reward-title">
      <div style={{ maxWidth: 540, margin: '48px auto', textAlign: 'center' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '28px 24px', position: 'relative' }}>
            {/* Кнопка быстрого пропуска */}
            {onSkip && (
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={onSkip}
                style={{ position: 'absolute', top: 16, right: 16, fontSize: 11, padding: '3px 8px' }}
              >
                Пропустить ⏭
              </button>
            )}

            <div style={{ fontSize: 11, color: 'var(--color-primary-cyan)', fontFamily: 'var(--font-pixel-ui)', marginBottom: 8 }}>
              ★ НАГРАДА ЗА ДЕЖУРСТВО · СТАНЦИЯ 26063
            </div>

            <h1 id="reward-title" style={{ margin: '0 0 16px', fontSize: 20, fontFamily: 'var(--font-pixel-display)' }}>
              Новое достижение синоптика!
            </h1>

            {/* Визуальная витрина награды */}
            <div style={{
              width: 120,
              height: 120,
              margin: '0 auto 16px',
              background: 'radial-gradient(circle, rgba(78, 205, 196, 0.25) 0%, rgba(7, 13, 30, 0.8) 70%)',
              border: '2px solid var(--color-primary-cyan)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: revealed ? '0 0 20px rgba(78, 205, 196, 0.4)' : 'none',
              transform: revealed ? 'scale(1)' : 'scale(0.85)',
              transition: 'transform 0.4s ease-out, box-shadow 0.4s ease-out'
            }}>
              {reward.image ? (
                <img
                  src={reward.image}
                  alt={reward.title}
                  style={{ width: 80, height: 80, imageRendering: 'pixelated' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span style={{ fontSize: 48 }}>{reward.icon || '🏅'}</span>
              )}
            </div>

            <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--ui-text-primary)', marginBottom: 6 }}>
              {reward.title}
            </div>

            <span style={{
              fontSize: 10,
              color: 'var(--color-accent-amber)',
              background: 'rgba(243, 156, 18, 0.1)',
              border: '1px solid var(--color-accent-amber)',
              padding: '2px 8px',
              borderRadius: 2,
              display: 'inline-block',
              marginBottom: 12
            }}>
              {reward.category === 'badge' ? 'Нагрудный знак' : reward.category === 'wardrobe' ? 'Элемент формы' : reward.category === 'building' ? 'Объект кампуса' : 'Инструмент'}
            </span>

            <p style={{
              fontSize: 12,
              color: 'var(--ui-text-secondary)',
              lineHeight: 1.5,
              maxWidth: 420,
              margin: '0 auto 24px'
            }}>
              {reward.lore}
            </p>

            <button
              type="button"
              className="pixel-btn-primary"
              onClick={onConfirm}
              style={{ padding: '10px 28px', fontSize: 13 }}
            >
              Принять награду →
            </button>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
