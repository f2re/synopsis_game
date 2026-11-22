import { useState } from 'react';
import type { RewardView, SessionUser } from '../../api';
import { SavedAvatarPortrait } from '../avatar/SavedAvatarPortrait';
import { WorkroomBackdrop } from '../shift/WorkroomBackdrop';
import { PixelScrollArea } from '../ui/PixelScrollArea';
import { useRewards } from './useRewards';
import { RewardArt } from './RewardArt';
import './rewards.css';

interface RewardsScreenProps {
  user: SessionUser;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

const FILTERS = [{ id: 'all', title: 'Все' }, { id: 'earned', title: 'Полученные' }, { id: 'locked', title: 'Закрытые' }] as const;

function earnedDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
}

export function RewardCard({ reward, onNavigate }: { reward: RewardView; onNavigate: (path: string) => void }) {
  const earned = reward.status === 'earned';
  const available = reward.status !== 'unavailable';
  const current = Math.max(0, Math.min(reward.progress.current, reward.progress.target));
  const date = reward.earnedAt ? earnedDate(reward.earnedAt) : '';
  return <article className={`reward-card reward-card--${reward.status}`} data-reward-id={reward.id} data-reward-status={reward.status} aria-labelledby={`reward-${reward.id}`}>
    <div className="reward-card__top">
      <div className="reward-card__art" aria-hidden="true"><RewardArt reward={reward} /></div>
      <span className="reward-card__state">{earned ? '✓ Получено' : available ? 'Ещё не получено' : 'Следующая глава'}</span>
    </div>
    <h2 id={`reward-${reward.id}`}>{reward.title}</h2>
    <p className="reward-card__description">{reward.description}</p>
    <div className="reward-card__condition"><span>{earned ? 'За что получено' : 'Как получить'}</span><p>{reward.condition}</p></div>
    {available && !earned && <div className="reward-card__progress"><span>Прогресс <strong>{current} / {reward.progress.target}</strong></span><progress value={current} max={Math.max(1, reward.progress.target)} aria-label={`${reward.title}: ${current} из ${reward.progress.target}`} /></div>}
    {!available && <p className="reward-card__future">Задание ещё не открыто</p>}
    {earned && date && <p className="reward-card__date">Получено {date}</p>}
    {reward.action && available && <button type="button" className="rewards-button reward-card__action" onClick={() => onNavigate(reward.action!.href)}>{reward.action.label}<span aria-hidden="true"> →</span></button>}
  </article>;
}

export function RewardsScreen({ user, onBack, onNavigate }: RewardsScreenProps) {
  const { data, loading, error, reload } = useRewards(user.id);
  const [filter, setFilter] = useState<typeof FILTERS[number]['id']>('all');
  const visible = data?.catalog.filter(reward => filter === 'all' || (filter === 'earned' ? reward.status === 'earned' : reward.status !== 'earned')) ?? [];
  return <main className="workroom-screen rewards-screen" aria-labelledby="rewards-title">
    <WorkroomBackdrop room="synoptic" />
    <div className="rewards-room-caption" aria-hidden="true"><span>26063 · комната дежурного</span><p>Каждая вещь<br />хранит свою историю.</p></div>
    <section className="rewards-cabinet">
      <header className="rewards-header">
        <div className="rewards-header__account"><SavedAvatarPortrait portrait={user.avatarPortrait} size={40} /><span>{user.displayName}<small>Личная коллекция станции</small></span></div>
        <button type="button" className="rewards-button" onClick={onBack}>← На станцию</button>
        <div className="rewards-heading"><h1 id="rewards-title">Награды</h1><p>{data ? <><strong>{data.earnedCount}</strong> из {data.total} получено</> : loading ? 'Открываем вашу коллекцию…' : 'Коллекция не загружена'}</p></div>
        <p className="rewards-intro">Выполняйте задания — силуэты станут вашими наградами.</p>
        <div className="rewards-filters" aria-label="Показать награды">{FILTERS.map(item => <button type="button" key={item.id} className="rewards-filter" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.title}</button>)}</div>
      </header>
      <PixelScrollArea label="Коллекция наград" className="rewards-scroll" viewportClassName="rewards-viewport" key={filter}>
        {error && <div className="rewards-message" role="alert"><h2>Не удалось обновить коллекцию</h2><p>{error}</p><button type="button" className="rewards-button" onClick={reload} disabled={loading}>Повторить загрузку</button></div>}
        {loading && !data && <div className="rewards-message" role="status" aria-busy="true"><h2>Проверяем ваши достижения…</h2><p>Загружаем награды и условия их получения.</p></div>}
        {data && <><div className="rewards-grid" aria-busy={loading}>{visible.map(reward => <RewardCard key={reward.id} reward={reward} onNavigate={onNavigate} />)}</div>
          {visible.length === 0 && <div className="rewards-message" role="status"><h2>{filter === 'earned' ? 'Первая награда впереди' : 'Все награды этой коллекции получены'}</h2><p>{filter === 'earned' ? 'Начните с первого бланка. Условия каждого достижения видны во вкладке «Все».' : 'Полученные вещи остаются в вашем профиле.'}</p><button type="button" className="rewards-button" onClick={() => setFilter('all')}>Показать все награды</button></div>}
          <p className="rewards-footnote">Награды сохраняются в профиле автоматически. Инструменты, знаки и спутников можно выбрать в инвентаре; памятные вещи остаются в коллекции.</p></>}
      </PixelScrollArea>
      <footer className="rewards-footer"><span>{loading && data ? 'Обновляем коллекцию…' : 'Достижения вашей станции'}</span><button type="button" className="rewards-button" onClick={() => onNavigate('/profile/avatar')}>Персонаж и инвентарь →</button></footer>
    </section>
  </main>;
}
