import { useState } from 'react';
import { PixelCard } from '../ui';

export interface DiscoveryItem {
  id: string;
  name: string;
  category: 'fauna' | 'flora' | 'equipment';
  icon: string;
  image?: string;
  location: string;
  desc: string;
  discovered: boolean;
  discoveredAt?: string;
}

const LEVEL1_DISCOVERIES: DiscoveryItem[] = [
  {
    id: 'tit',
    name: 'Синичка-лазоревка',
    category: 'fauna',
    icon: '🐦',
    image: '/assets/items/companion_tit.png',
    location: 'Ветви берёзы у Метеобудки №1',
    desc: 'Чуткая птица балтийского побережья. Реагирует на резкое падение барометрического давления перед циклоном.',
    discovered: true,
    discoveredAt: '27.10.2026, 00:22',
  },
  {
    id: 'squirrel',
    name: 'Кампусная белка',
    category: 'fauna',
    icon: '🐿️',
    image: '/assets/items/companion_squirrel.png',
    location: 'Крыша архива станции',
    desc: 'Храбрая жительница пристанционных сосен. Часто прячет кедровые шишки за ветрозащитными щитами флюгера.',
    discovered: true,
    discoveredAt: '27.10.2026, 00:41',
  },
  {
    id: 'seagull',
    name: 'Балтийская чайка',
    category: 'fauna',
    icon: '🕊️',
    location: 'Пирс залива Станции 26063',
    desc: 'Кружит над заливом при приближении штормового фронта. Индикатор устойчивого морского бриза.',
    discovered: true,
    discoveredAt: '27.10.2026, 01:10',
  },
  {
    id: 'crow',
    name: 'Ворон архивариуса',
    category: 'fauna',
    icon: '🦅',
    location: 'Флюгер Вильда',
    desc: 'Старейший пернатый обитатель площадки. Любит наблюдать за вращением чашек анемометра.',
    discovered: false,
  },
  {
    id: 'mallard',
    name: 'Кряква залива',
    category: 'fauna',
    icon: '🦆',
    location: 'Тростники у водного поста',
    desc: 'Обитает в прибрежных камышах гидрологического створа.',
    discovered: false,
  },
  {
    id: 'bullfinch',
    name: 'Снегирь зимний',
    category: 'fauna',
    icon: '🐤',
    location: 'Рябина у здания Кодового поста',
    desc: 'Появляется при отрицательных температурах воздуха (sn=1).',
    discovered: false,
  },
  {
    id: 'swallow',
    name: 'Береговая ласточка',
    category: 'fauna',
    icon: '🪶',
    location: 'Карниз радиорубки',
    desc: 'Летает низко над грунтом при высокой влажности и скором дожде.',
    discovered: false,
  },
  {
    id: 'dove',
    name: 'Горлица кольчатая',
    category: 'fauna',
    icon: '🕊️',
    location: 'Ограда метеоплощадки',
    desc: 'Мирная птица, греющаяся на деревянных перилах при антициклоне.',
    discovered: false,
  },
];

interface DiscoveriesProps {
  onClose: () => void;
  onSelectDiscovery?: (id: string) => void;
}

export function Discoveries({ onClose, onSelectDiscovery }: DiscoveriesProps) {
  const [selectedId, setSelectedId] = useState<string>('tit');

  const selected = LEVEL1_DISCOVERIES.find((d) => d.id === selectedId) || LEVEL1_DISCOVERIES[0];
  const discoveredCount = LEVEL1_DISCOVERIES.filter((d) => d.discovered).length;

  return (
    <main className="app-shell discoveries-screen" aria-labelledby="discoveries-title">
      <div style={{ maxWidth: 740, margin: '32px auto' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '24px 28px' }}>
            {/* Шапка */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--ui-border-subtle)',
              paddingBottom: 14,
              marginBottom: 20
            }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-primary-cyan)', fontFamily: 'var(--font-pixel-ui)' }}>
                  ЖИВОЙ МИР ХАБА · СТАНЦИЯ 26063
                </span>
                <h1 id="discoveries-title" style={{ margin: '4px 0 0', fontSize: 18, fontFamily: 'var(--font-pixel-display)' }}>
                  Полевой дневник находок и фауны
                </h1>
              </div>
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={onClose}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                ✕ В хаб
              </button>
            </div>

            {/* Контент: сетка слева, детали справа */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Сетка списка */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {LEVEL1_DISCOVERIES.map((d) => {
                  const isSelected = d.id === selectedId;

                  return (
                    <div
                      key={d.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedId(d.id);
                        if (onSelectDiscovery) onSelectDiscovery(d.id);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(d.id); }}
                      style={{
                        background: isSelected ? 'rgba(78, 205, 196, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                        border: isSelected ? '2px solid var(--color-primary-cyan)' : '1px solid var(--ui-border-subtle)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        opacity: d.discovered ? 1 : 0.5
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{d.discovered ? d.icon : '❓'}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 'bold', color: d.discovered ? 'var(--ui-text-primary)' : 'var(--ui-text-muted)' }}>
                          {d.discovered ? d.name : 'Не открыто'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ui-text-muted)' }}>
                          {d.discovered ? 'Открыто' : 'Ищите в хабе'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Детальная карточка */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--ui-border-subtle)',
                borderRadius: 4,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 54,
                      height: 54,
                      borderRadius: 4,
                      background: 'rgba(78, 205, 196, 0.1)',
                      border: '1px solid var(--color-primary-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32
                    }}>
                      {selected.discovered ? selected.icon : '❓'}
                    </div>

                    <div>
                      <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--ui-text-primary)' }}>
                        {selected.discovered ? selected.name : 'Неизвестный обитатель'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-primary-cyan)' }}>
                        {selected.discovered ? selected.location : 'Местоположение скрыто'}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ui-text-secondary)', margin: '0 0 12px' }}>
                    {selected.discovered ? selected.desc : 'Исследуйте территорию метеостанции 26063 в разное время суток, чтобы обнаружить скрытых птиц и прибрежную фауну.'}
                  </p>

                  {selected.discovered && selected.discoveredAt && (
                    <div style={{ fontSize: 11, color: 'var(--ui-text-muted)' }}>
                      Впервые замечено: {selected.discoveredAt}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 10, color: 'var(--ui-text-muted)', paddingTop: 12, borderTop: '1px dashed var(--ui-border-subtle)' }}>
                  Фауна станции 26063 реагирует на барометрическую тенденцию и время суток.
                </div>
              </div>
            </div>

            {/* Подвал */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
              borderTop: '1px solid var(--ui-border-subtle)',
              fontSize: 12,
              color: 'var(--ui-text-muted)'
            }}>
              <span>Найдено обитателей: {discoveredCount} из {LEVEL1_DISCOVERIES.length}</span>
              <span>Станция 26063 · Северо-Западное УГМС</span>
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
