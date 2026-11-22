import type { RewardGrant } from '../../api';
import { RewardArt } from './RewardArt';
import './rewards.css';

/** Only a saved server receipt can announce an award. Reopening a result shows that same receipt. */
export function RewardGrants({ rewards, onOpenRewards }: { rewards: RewardGrant[] | undefined; onOpenRewards?: () => void }) {
  if (!rewards?.length) return null;
  return <section className="reward-grants" aria-label="Полученные награды">
    <h2>{rewards.length === 1 ? 'Награда получена' : 'Награды получены'}</h2>
    {rewards.map(reward => <div className="reward-earned-notice" data-granted-reward-id={reward.id} key={reward.id}><span aria-hidden="true"><RewardArt reward={reward} size={72} /></span><div><strong>{reward.title}</strong><p>Сохранено в вашей коллекции.</p></div></div>)}
    {onOpenRewards && <button type="button" className="rewards-button" onClick={onOpenRewards}>Открыть награды →</button>}
  </section>;
}
