import { GAME_MARK } from '../../brand';
import { HubIcon } from '../hub/HubIcon';
import { PixelIcon } from '../ui/PixelIcon';
import '../title/station-screens.css';

interface HelpScreenProps {
  onBack: () => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenCampus: () => void;
  onStartShift: () => void;
}

const questions = [
  ['Как войти в игру?', 'Кампус, библиотека и помощь доступны без входа. Для учебной смены выберите свою группу и имя в журнале допуска, затем введите код, выданный преподавателем. Если вашего имени нет, обратитесь к преподавателю: самостоятельной регистрации здесь нет.'],
  ['Что сохраняется?', 'Сервер сохраняет профиль, внешний вид, принятые ответы и результаты учебных смен. Настройки звука и оформления, а также закладки библиотеки хранятся только в этом браузере. Если браузер запрещает запись, изменения действуют до закрытия страницы.'],
  ['Как закончить смену и выйти?', 'На рабочем месте выберите «Сдать смену» и посмотрите разбор. Из кампуса откройте главное меню и выберите «Выйти из игры». После подтверждения профиль закрывается, музыка останавливается. Вкладку браузера можно закрыть вручную. Неотправленный ответ при уходе со страницы не сохраняется.'],
  ['Почему не слышно музыку или дождь?', 'Звук впервые включается кнопкой «Включить звук» или в настройках. Проверьте общую громкость, отдельные уровни музыки и окружения, а также звук самой вкладки. В скрытой вкладке звуковое сопровождение приостанавливается. Дождь слышен, когда выбран дождливый фон.'],
  ['Дождь за окном — настоящая погода?', 'Это художественная атмосфера игрового мира. В настройках можно выбрать переменную погоду, ясный фон или дождь. Она не заменяет наблюдения и не меняет правильные ответы в заданиях.'],
  ['Если компьютер работает медленно?', 'Откройте настройки и включите экономию ресурсов. Уменьшенное движение успокоит фон. Учебные тексты и кнопки останутся доступны. Если изображение кампуса не загрузилось, библиотекой и помощью можно пользоваться из главного меню.'],
  ['Что делать при потере связи?', 'Библиотека и уже загруженные справочные тексты остаются доступны на открытой странице. Вход и проверка заданий требуют связи с сервером станции. Не считайте ответ сохранённым, пока не получено подтверждение; восстановите соединение и используйте доступное на экране действие повторного запроса.'],
  ['Какие занятия уже открыты?', 'Доступны обычная учебная смена, персонаж и инвентарь, кампус, читальный зал и библиотека. Модули радара, аэрологии, самостоятельного анализа карт и турниры в кампусе обозначены как будущие: их карточки объясняют текущую доступность.'],
] as const;

export function HelpScreen({ onBack, onOpenLibrary, onOpenSettings, onOpenCampus, onStartShift }: HelpScreenProps) {
  return (
    <main className="station-page station-help" aria-labelledby="help-title">
      <header className="station-page__header"><span className="station-page__brand">{GAME_MARK} · Бюро справок</span><button type="button" className="station-back" onClick={onBack}>← Назад</button></header>
      <span className="station-eyebrow">ОСВОИТЬСЯ НА СТАНЦИИ</span>
      <h1 id="help-title" tabIndex={-1}>Помощь и управление</h1>
      <p className="station-page__lead">Здесь — как начать, где искать нужное и что делать, если что-то не получается.</p>
      <div className="station-help-layout">
        <div>
          <section className="station-paper" aria-labelledby="help-start"><h2 id="help-start">Первое дежурство</h2><ol>
            <li><strong>Осмотритесь в кампусе</strong>Откройте площадь, выберите здание или воспользуйтесь нижней панелью. Библиотеку можно читать до входа в профиль.</li>
            <li><strong>Найдите себя в журнале</strong>Для учебных заданий выберите свою группу, имя и введите персональный код.</li>
            <li><strong>Примите смену</strong>Нажмите «Начать смену», прочтите записку на столе и переходите к заданиям.</li>
            <li><strong>Разберите ответы</strong>После проверки прочтите пояснение. Кнопка «Спросить Ольхина» открывает тетрадь наставника и разбор текущей смены.</li>
          </ol></section>
          <section className="station-help-shortcuts" aria-labelledby="help-keys"><h2 id="help-keys">Клавиатура и мышь</h2><dl>
            <div><dt><kbd>Tab</kbd> / <kbd>Shift + Tab</kbd></dt><dd>Перейти к следующей или предыдущей кнопке, ссылке либо полю.</dd></div>
            <div><dt><kbd>Enter</kbd> / <kbd>Пробел</kbd></dt><dd>Нажать выбранную кнопку. Для ссылок используйте Enter.</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>Закрыть открытое диалоговое окно. Фокус вернётся к вызвавшей его кнопке.</dd></div>
            <div><dt>Щелчок / касание</dt><dd>Выбрать помещение, статью или элемент задания. На телефоне доступны те же действия.</dd></div>
          </dl></section>
        </div>
        <aside className="station-help-aside" aria-label="Полезные разделы">
          <button type="button" className="station-menu-button station-menu-button--primary" onClick={onStartShift}><PixelIcon name="kn01" size={40} alt="" /><span><strong>К первой смене</strong><small>Начать с записки на столе</small></span></button>
          <button type="button" className="station-menu-button" onClick={onOpenLibrary}><HubIcon name="guide" size={40} /><span><strong>Библиотека понятий</strong><small>Найти термин, прочитать объяснение и проверить источник</small></span></button>
          <button type="button" className="station-menu-button" onClick={onOpenSettings}><HubIcon name="settings" size={40} /><span><strong>Настроить атмосферу</strong><small>Музыка, дождь, движение и читаемость</small></span></button>
          <button type="button" className="station-menu-button" onClick={onOpenCampus}><HubIcon name="map" size={40} /><span><strong>Посмотреть кампус</strong><small>Открыть площадь и помещения</small></span></button>
          <p className="station-notice">На учебном компьютере завершайте сеанс через «Выйти из игры», чтобы следующий наблюдатель вошёл в свой профиль.</p>
        </aside>
      </div>
      <section className="station-help-faq" aria-labelledby="help-faq-title"><h2 id="help-faq-title">Частые вопросы</h2>{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    </main>
  );
}
