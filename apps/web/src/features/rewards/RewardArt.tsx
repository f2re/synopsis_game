import type { RewardView } from '../../api';

/** Small UI symbols use the same coarse pixel grid as the existing controls. */
export function RewardArt({ reward, size = 96 }: { reward: Pick<RewardView, 'image' | 'icon'>; size?: number }) {
  if (reward.image) return <img src={reward.image} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false} />;
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" shapeRendering="crispEdges" className="reward-symbol">
    {reward.icon === 'lamp' ? <>
      <path fill="#253d36" d="M15 14h3v13h-3zM9 26h15v3H9zM11 25h11v2H11z" />
      <path fill="#d9b56b" d="M10 6h12v3H10zM7 9h18v4H7zM5 13h22v4H5z" />
      <path fill="#ffe7a0" d="M8 15h16v3H8zM12 18h8v2h-8z" /><path fill="#b88626" d="M15 4h4v3h-4zM11 27h11v2H11z" />
    </> : reward.icon === 'thermometer' ? <>
      <path fill="#d9d6c7" d="M13 3h6v2h2v15h2v3h2v5h-2v2H9v-2H7v-5h2v-3h2V5h2z" />
      <path fill="#6e9799" d="M14 7h4v16h3v4H11v-4h3z" /><path fill="#fff0c6" d="M20 8h5v2h-5zM20 13h4v2h-4zM20 18h5v2h-5z" />
    </> : reward.icon === 'barometer' ? <>
      <path fill="#c89c58" d="M10 4h12v2h4v4h2v12h-2v4h-4v2H10v-2H6v-4H4V10h2V6h4z" />
      <path fill="#e2d6b6" d="M11 8h10v2h3v12h-3v2H11v-2H8V10h3z" />
      <path fill="#2d4143" d="M15 10h2v3h-2zM10 15h3v2h-3zM20 15h3v2h-3zM15 15h3v3h-3zM18 12h3v3h-3zM14 21h6v2h-6z" />
    </> : reward.icon === 'weathervane' ? <>
      <path fill="#c9b579" d="M15 7h3v21h-3zM5 12h23v3H5zM25 9h3v9h-3zM28 11h2v5h-2zM3 10h3v8H3zM10 26h13v3H10z" />
      <path fill="#8cafaa" d="M15 3h3v4h-3zM8 20h17v2H8zM8 18h2v6H8zM23 18h2v6h-2z" />
    </> : reward.icon === 'certificate' ? <>
      <path fill="#e2d6b6" d="M5 4h19v4h4v20H5z" /><path fill="#bfae88" d="M24 4v4h4zM5 26h23v2H5z" />
      <path fill="#546d68" d="M9 9h11v2H9zM9 14h14v2H9zM9 18h8v2H9z" />
      <path fill="#bd9550" d="M19 19h6v6h-6zM20 25h2v5h-2zM23 25h2v5h-2z" />
    </> : <>
      <path fill="#c8a55b" d="M10 3h12v2h5v5h2v12h-2v5h-5v2H10v-2H5v-5H3V10h2V5h5z" />
      <path fill="#eed6a0" d="M11 7h10v2h3v14h-3v2H11v-2H8V9h3z" /><path fill="#7e6948" d="M14 11h5v3h-3v3h4v3h-8v-3h2z" />
    </>}
  </svg>;
}
