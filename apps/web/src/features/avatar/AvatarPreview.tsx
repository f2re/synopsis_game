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
  hairstyleThumbnail?: boolean;
  onRigLoaded?: (revision: string) => void;
}

/** Static fitting only. Gameplay must import SavedAvatarPortrait instead. */
export function AvatarPreview({ avatar, direction = 'down', hairstyleThumbnail = false, onRigLoaded }: AvatarPreviewProps) {
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
      onRigLoaded?.(acquired.value.manifest.revision);
    }).catch(() => {
      if (active) setFailure(key);
    });
    return () => { active = false; lease?.release(); };
  }, [key, onRigLoaded]);

  if ((!loaded || loaded.key !== key) && hairstyleThumbnail) return <span className="inventory-hairstyle-thumbnail" aria-hidden="true" />;
  if (!loaded || loaded.key !== key) return <div className="inventory-preview-placeholder" role="status">
    {failure === key ? 'Примерка недоступна. Выбранные вещи можно сохранить; портрет появится после ответа сервера.' : 'Открываем примерку…'}
  </div>;
  return <StaticAvatarCanvas composite={loaded.value} hairstyleThumbnail={hairstyleThumbnail} />;
}

function StaticAvatarCanvas({ composite, hairstyleThumbnail }: { composite: AvatarComposite; hairstyleThumbnail: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bounds = avatarPreviewBounds(composite);
  useEffect(() => {
    const context = ref.current?.getContext('2d');
    if (!context) return;
    if (hairstyleThumbnail) {
      const { width, height } = context.canvas;
      context.clearRect(0, 0, width, height);
      context.drawImage(composite.body.canvas, composite.body.frame.pivot[0] - width / 2, 0, width, height, 0, 0, width, height);
    } else {
      drawAvatarComposite(context, composite, 0);
    }
  }, [composite, hairstyleThumbnail]);
  if (hairstyleThumbnail) return <canvas ref={ref} className="inventory-hairstyle-thumbnail" width={44} height={44} aria-hidden="true" />;
  const footX = bounds.bodyAt[0] + composite.body.frame.pivot[0];
  const footY = bounds.bodyAt[1] + composite.body.frame.pivot[1];
  return <canvas ref={ref} className="avatar-preview" width={bounds.width} height={bounds.height}
    role="img" aria-label="Неподвижная примерка одежды" data-avatar-renderer="editor-static"
    data-avatar-direction={composite.direction} data-avatar-frame="0" data-avatar-key={composite.key}
    style={{ width: bounds.width * 2, height: bounds.height * 2,
      left: `calc(50% - ${footX * 2}px)`, top: `calc(var(--fitting-rug-y) - ${footY * 2}px)` }} />;
}
