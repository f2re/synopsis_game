import React from 'react';

/**
 * 24 эталонных пиктограммы «26063: Позывной «Синоптик»» (Sheet 2)
 * Каталогизированы в assets/manifests/ui.icons.v2.json.
 */

export type PixelIconSemanticName =
  | 'weather'
  | 'radar'
  | 'archive'
  | 'library'
  | 'manuals'
  | 'cartography'
  | 'map'
  | 'shift'
  | 'kn01'
  | 'doc'
  | 'settings'
  | 'logout'
  | 'exit'
  | 'trend'
  | 'analytics'
  | 'trophy'
  | 'trophy-gold'
  | 'trophy-star'
  | 'calendar'
  | 'schedule'
  | 'bell'
  | 'alert'
  | 'help'
  | 'guide'
  | 'roster'
  | 'team'
  | 'student'
  | 'observer'
  | 'officer'
  | 'chart'
  | 'tile'
  | 'rank-up'
  | 'gear'
  | 'gear-active'
  | 'gear-dark'
  | 'gear-disabled'
  | 'telegram'
  | 'dispatch';

export type PixelIconRawName =
  | 'icon_profile_student'
  | 'icon_profile_observer'
  | 'icon_doc_kn01_code'
  | 'icon_trophy_gold'
  | 'icon_settings_system'
  | 'icon_sys_logout'
  | 'icon_map_cartography'
  | 'icon_weather_variable'
  | 'icon_analytics_trend'
  | 'icon_library_manuals'
  | 'icon_roster_team'
  | 'icon_trophy_star'
  | 'icon_telegram_dispatch'
  | 'icon_schedule_calendar'
  | 'icon_alert_bell'
  | 'icon_guide_help'
  | 'icon_radar_dish'
  | 'icon_archive_drawer'
  | 'icon_synoptic_chart_tile'
  | 'icon_rank_promote_up'
  | 'icon_gear_default'
  | 'icon_gear_active'
  | 'icon_gear_dark'
  | 'icon_gear_disabled'
  | 'icon.profile.student'
  | 'icon.profile.observer'
  | 'icon.doc.kn01.code'
  | 'icon.trophy.gold'
  | 'icon.settings.system'
  | 'icon.sys.logout'
  | 'icon.map.cartography'
  | 'icon.weather.variable'
  | 'icon.analytics.trend'
  | 'icon.library.manuals'
  | 'icon.roster.team'
  | 'icon.trophy.star'
  | 'icon.telegram.dispatch'
  | 'icon.schedule.calendar'
  | 'icon.alert.bell'
  | 'icon.guide.help'
  | 'icon.radar.dish'
  | 'icon.archive.drawer'
  | 'icon.synoptic.chart.tile'
  | 'icon.rank.promote.up'
  | 'icon.gear.default'
  | 'icon.gear.active'
  | 'icon.gear.dark'
  | 'icon.gear.disabled';

export type PixelIconName = PixelIconSemanticName | PixelIconRawName | string;

export type PixelIconSize = 'sm' | 'md' | 'lg' | 'xl' | number;

interface IconMetadata {
  fileBase: string;
  defaultLabel: string;
}

const ICON_REGISTRY: Record<string, IconMetadata> = {
  // Профили
  'student': { fileBase: 'icon_profile_student', defaultLabel: 'Слушатель курсов синоптиков' },
  'icon.profile.student': { fileBase: 'icon_profile_student', defaultLabel: 'Слушатель курсов синоптиков' },
  'icon_profile_student': { fileBase: 'icon_profile_student', defaultLabel: 'Слушатель курсов синоптиков' },

  'observer': { fileBase: 'icon_profile_observer', defaultLabel: 'Дежурный наблюдатель станции' },
  'officer': { fileBase: 'icon_profile_observer', defaultLabel: 'Дежурный наблюдатель станции' },
  'icon.profile.observer': { fileBase: 'icon_profile_observer', defaultLabel: 'Дежурный наблюдатель станции' },
  'icon_profile_observer': { fileBase: 'icon_profile_observer', defaultLabel: 'Дежурный наблюдатель станции' },

  // Документы и КН-01
  'kn01': { fileBase: 'icon_doc_kn01_code', defaultLabel: 'Синоптическая телеграмма КН-01' },
  'shift': { fileBase: 'icon_doc_kn01_code', defaultLabel: 'Синоптическая телеграмма КН-01' },
  'doc': { fileBase: 'icon_doc_kn01_code', defaultLabel: 'Синоптическая телеграмма КН-01' },
  'icon.doc.kn01.code': { fileBase: 'icon_doc_kn01_code', defaultLabel: 'Синоптическая телеграмма КН-01' },
  'icon_doc_kn01_code': { fileBase: 'icon_doc_kn01_code', defaultLabel: 'Синоптическая телеграмма КН-01' },

  // Награды
  'trophy': { fileBase: 'icon_trophy_gold', defaultLabel: 'Золотой кубок победителя' },
  'trophy-gold': { fileBase: 'icon_trophy_gold', defaultLabel: 'Золотой кубок победителя' },
  'icon.trophy.gold': { fileBase: 'icon_trophy_gold', defaultLabel: 'Золотой кубок победителя' },
  'icon_trophy_gold': { fileBase: 'icon_trophy_gold', defaultLabel: 'Золотой кубок победителя' },

  'trophy-star': { fileBase: 'icon_trophy_star', defaultLabel: 'Рейтинговый кубок со звездой' },
  'icon.trophy.star': { fileBase: 'icon_trophy_star', defaultLabel: 'Рейтинговый кубок со звездой' },
  'icon_trophy_star': { fileBase: 'icon_trophy_star', defaultLabel: 'Рейтинговый кубок со звездой' },

  // Системные действия
  'settings': { fileBase: 'icon_settings_system', defaultLabel: 'Системные настройки' },
  'icon.settings.system': { fileBase: 'icon_settings_system', defaultLabel: 'Системные настройки' },
  'icon_settings_system': { fileBase: 'icon_settings_system', defaultLabel: 'Системные настройки' },

  'logout': { fileBase: 'icon_sys_logout', defaultLabel: 'Выход со станции' },
  'exit': { fileBase: 'icon_sys_logout', defaultLabel: 'Выход со станции' },
  'icon.sys.logout': { fileBase: 'icon_sys_logout', defaultLabel: 'Выход со станции' },
  'icon_sys_logout': { fileBase: 'icon_sys_logout', defaultLabel: 'Выход со станции' },

  // Картография и погода
  'cartography': { fileBase: 'icon_map_cartography', defaultLabel: 'Синоптическая карта' },
  'map': { fileBase: 'icon_map_cartography', defaultLabel: 'Синоптическая карта' },
  'icon.map.cartography': { fileBase: 'icon_map_cartography', defaultLabel: 'Синоптическая карта' },
  'icon_map_cartography': { fileBase: 'icon_map_cartography', defaultLabel: 'Синоптическая карта' },

  'weather': { fileBase: 'icon_weather_variable', defaultLabel: 'Переменная облачность' },
  'icon.weather.variable': { fileBase: 'icon_weather_variable', defaultLabel: 'Переменная облачность' },
  'icon_weather_variable': { fileBase: 'icon_weather_variable', defaultLabel: 'Переменная облачность' },

  // Аналитика и тенденция
  'trend': { fileBase: 'icon_analytics_trend', defaultLabel: 'Барическая тенденция' },
  'analytics': { fileBase: 'icon_analytics_trend', defaultLabel: 'Барическая тенденция' },
  'icon.analytics.trend': { fileBase: 'icon_analytics_trend', defaultLabel: 'Барическая тенденция' },
  'icon_analytics_trend': { fileBase: 'icon_analytics_trend', defaultLabel: 'Барическая тенденция' },

  // Библиотека и архив
  'library': { fileBase: 'icon_library_manuals', defaultLabel: 'Наставления гидрометеослужбы' },
  'manuals': { fileBase: 'icon_library_manuals', defaultLabel: 'Наставления гидрометеослужбы' },
  'icon.library.manuals': { fileBase: 'icon_library_manuals', defaultLabel: 'Наставления гидрометеослужбы' },
  'icon_library_manuals': { fileBase: 'icon_library_manuals', defaultLabel: 'Наставления гидрометеослужбы' },

  'archive': { fileBase: 'icon_archive_drawer', defaultLabel: 'Картотека наблюдений' },
  'icon.archive.drawer': { fileBase: 'icon_archive_drawer', defaultLabel: 'Картотека наблюдений' },
  'icon_archive_drawer': { fileBase: 'icon_archive_drawer', defaultLabel: 'Картотека наблюдений' },

  // Смена и расписание
  'roster': { fileBase: 'icon_roster_team', defaultLabel: 'Смена синоптиков' },
  'team': { fileBase: 'icon_roster_team', defaultLabel: 'Смена синоптиков' },
  'icon.roster.team': { fileBase: 'icon_roster_team', defaultLabel: 'Смена синоптиков' },
  'icon_roster_team': { fileBase: 'icon_roster_team', defaultLabel: 'Смена синоптиков' },

  'calendar': { fileBase: 'icon_schedule_calendar', defaultLabel: 'График наблюдений' },
  'schedule': { fileBase: 'icon_schedule_calendar', defaultLabel: 'График наблюдений' },
  'icon.schedule.calendar': { fileBase: 'icon_schedule_calendar', defaultLabel: 'График наблюдений' },
  'icon_schedule_calendar': { fileBase: 'icon_schedule_calendar', defaultLabel: 'График наблюдений' },

  // Оповещения и консультации
  'bell': { fileBase: 'icon_alert_bell', defaultLabel: 'Штормовое оповещение' },
  'alert': { fileBase: 'icon_alert_bell', defaultLabel: 'Штормовое оповещение' },
  'icon.alert.bell': { fileBase: 'icon_alert_bell', defaultLabel: 'Штормовое оповещение' },
  'icon_alert_bell': { fileBase: 'icon_alert_bell', defaultLabel: 'Штормовое оповещение' },

  'help': { fileBase: 'icon_guide_help', defaultLabel: 'Справочник и консультации' },
  'guide': { fileBase: 'icon_guide_help', defaultLabel: 'Справочник и консультации' },
  'icon.guide.help': { fileBase: 'icon_guide_help', defaultLabel: 'Справочник и консультации' },
  'icon_guide_help': { fileBase: 'icon_guide_help', defaultLabel: 'Справочник и консультации' },

  // Радиолокатор и планшет
  'radar': { fileBase: 'icon_radar_dish', defaultLabel: 'Метеорологический радиолокатор' },
  'icon.radar.dish': { fileBase: 'icon_radar_dish', defaultLabel: 'Метеорологический радиолокатор' },
  'icon_radar_dish': { fileBase: 'icon_radar_dish', defaultLabel: 'Метеорологический радиолокатор' },

  'chart': { fileBase: 'icon_synoptic_chart_tile', defaultLabel: 'Синоптический планшет' },
  'tile': { fileBase: 'icon_synoptic_chart_tile', defaultLabel: 'Синоптический планшет' },
  'icon.synoptic.chart.tile': { fileBase: 'icon_synoptic_chart_tile', defaultLabel: 'Синоптический планшет' },
  'icon_synoptic_chart_tile': { fileBase: 'icon_synoptic_chart_tile', defaultLabel: 'Синоптический планшет' },

  'rank-up': { fileBase: 'icon_rank_promote_up', defaultLabel: 'Повышение разряда' },
  'rank': { fileBase: 'icon_rank_promote_up', defaultLabel: 'Повышение разряда' },
  'promote': { fileBase: 'icon_rank_promote_up', defaultLabel: 'Повышение разряда' },
  'icon.rank.promote.up': { fileBase: 'icon_rank_promote_up', defaultLabel: 'Повышение разряда' },
  'icon_rank_promote_up': { fileBase: 'icon_rank_promote_up', defaultLabel: 'Повышение разряда' },

  // Телеграммы
  'telegram': { fileBase: 'icon_telegram_dispatch', defaultLabel: 'Телеграмма-сводка' },
  'dispatch': { fileBase: 'icon_telegram_dispatch', defaultLabel: 'Телеграмма-сводка' },
  'icon.telegram.dispatch': { fileBase: 'icon_telegram_dispatch', defaultLabel: 'Телеграмма-сводка' },
  'icon_telegram_dispatch': { fileBase: 'icon_telegram_dispatch', defaultLabel: 'Телеграмма-сводка' },

  // Шестерни
  'gear': { fileBase: 'icon_gear_default', defaultLabel: 'Шестерня механизма' },
  'icon.gear.default': { fileBase: 'icon_gear_default', defaultLabel: 'Шестерня механизма (сталь)' },
  'icon_gear_default': { fileBase: 'icon_gear_default', defaultLabel: 'Шестерня механизма (сталь)' },

  'gear-active': { fileBase: 'icon_gear_active', defaultLabel: 'Шестерня механизма (активная)' },
  'icon.gear.active': { fileBase: 'icon_gear_active', defaultLabel: 'Шестерня механизма (активная)' },
  'icon_gear_active': { fileBase: 'icon_gear_active', defaultLabel: 'Шестерня механизма (активная)' },

  'gear-dark': { fileBase: 'icon_gear_dark', defaultLabel: 'Шестерня механизма (индиго)' },
  'icon.gear.dark': { fileBase: 'icon_gear_dark', defaultLabel: 'Шестерня механизма (индиго)' },
  'icon_gear_dark': { fileBase: 'icon_gear_dark', defaultLabel: 'Шестерня механизма (индиго)' },

  'gear-disabled': { fileBase: 'icon_gear_disabled', defaultLabel: 'Шестерня механизма (неактивная)' },
  'icon.gear.disabled': { fileBase: 'icon_gear_disabled', defaultLabel: 'Шестерня механизма (неактивная)' },
  'icon_gear_disabled': { fileBase: 'icon_gear_disabled', defaultLabel: 'Шестерня механизма (неактивная)' },
};

export interface PixelIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  name: PixelIconName;
  size?: PixelIconSize;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PixelIcon — отображает 24 эталонных пиктограммы станции 26063
 * с nearest-neighbor масштабированием и поддержкой семантических алиасов.
 */
export function PixelIcon({
  name,
  size = 'md',
  alt,
  ariaLabel,
  className = '',
  style,
  ...props
}: PixelIconProps) {
  const meta = ICON_REGISTRY[name] || {
    fileBase: name.replace(/^icon[._]/, 'icon_'),
    defaultLabel: 'Пиктограмма',
  };

  let pixelSize: number;
  let assetResolution: '32' | '64' | '128';

  if (typeof size === 'number') {
    pixelSize = size;
    if (pixelSize <= 32) assetResolution = '32';
    else if (pixelSize <= 64) assetResolution = '64';
    else assetResolution = '128';
  } else {
    switch (size) {
      case 'sm':
        pixelSize = 24;
        assetResolution = '32';
        break;
      case 'md':
        pixelSize = 32;
        assetResolution = '32';
        break;
      case 'lg':
        pixelSize = 64;
        assetResolution = '64';
        break;
      case 'xl':
        pixelSize = 128;
        assetResolution = '128';
        break;
      default:
        pixelSize = 32;
        assetResolution = '32';
    }
  }

  const src = `/ui/icons/${meta.fileBase}_${assetResolution}.png`;
  const resolvedAlt = alt !== undefined ? alt : ariaLabel || meta.defaultLabel;

  const combinedStyle: React.CSSProperties = {
    width: pixelSize,
    height: pixelSize,
    imageRendering: 'pixelated',
    verticalAlign: 'middle',
    flexShrink: 0,
    userSelect: 'none',
    display: 'inline-block',
    ...style,
  };

  return (
    <img
      src={src}
      alt={resolvedAlt}
      aria-label={ariaLabel}
      className={`pixel-icon pixel-icon-${typeof size === 'string' ? size : 'custom'} ${className}`.trim()}
      style={combinedStyle}
      loading="lazy"
      draggable={false}
      {...props}
    />
  );
}
