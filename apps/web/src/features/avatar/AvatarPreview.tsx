import { useEffect, useRef, useState } from 'react';
import {
  avatarPreviewBounds, avatarProfileKey, drawAvatarComposite, modularAvatarCompositor,
  type AvatarComposite, type AvatarDirection, type AvatarLease,
} from '@synopsis/world-engine/avatar';
import type { AvatarProfile } from '../../api';

export type { AvatarDirection } from '@synopsis/world-engine/avatar';

export interface AvatarPreviewProps {
  avatar: AvatarProfile;
  direction?: AvatarDirection;
}

/** Static fitting only. Gameplay must import SavedAvatarPortrait instead. */
export function AvatarPreview({ avatar, direction = 'down' }: AvatarPreviewProps) {
  const key = `${avatarProfileKey(avatar)}:${direction}`;
  const [loaded, setLoaded] = useState<{ key: string; value: AvatarComposite } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let lease: AvatarLease<AvatarComposite> | undefined;
    setFailure(null);
    void modularAvatarCompositor.acquireStatic(avatar, direction).then((acquired) => {
      if (!active) { acquired.release(); return; }
      lease = acquired;
      setLoaded({ key, value: acquired.value });
    }).catch(() => {
      if (active) setFailure(key);
    });
    return () => { active = false; lease?.release(); };
  }, [key]);

  if (!loaded || loaded.key !== key) return <div className="inventory-preview-placeholder" role="status">
    {failure === key ? 'Примерка недоступна. Выбранные вещи можно сохранить; портрет появится после ответа сервера.' : 'Открываем примерку…'}
  </div>;
  return <StaticAvatarCanvas composite={loaded.value} />;
}

function StaticAvatarCanvas({ composite }: { composite: AvatarComposite }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bounds = avatarPreviewBounds(composite);
  useEffect(() => {
    const context = ref.current?.getContext('2d');
    if (context) drawAvatarComposite(context, composite, 0);
  }, [composite]);
  return <canvas ref={ref} className="avatar-preview" width={bounds.width} height={bounds.height}
    role="img" aria-label="Неподвижная примерка одежды" data-avatar-renderer="editor-static"
    data-avatar-direction={composite.direction} data-avatar-frame="0" data-avatar-key={composite.key}
    style={{ display: 'block', width: bounds.width * 2, height: bounds.height * 2, imageRendering: 'pixelated' }} />;
}
