import React, { useState } from 'react';
import {
  Panel,
  Button,
  PaperForm,
  Tape,
  KeyPad,
  ChoiceCard,
  Stamp,
  StreakLamps,
  MentorPortrait,
  SpeechBubble,
  Dialog,
  DigitAnatomy,
  type MentorEmotion,
} from '../features/ui';
import '../features/ui/design-system.css';

/**
 * UiShowcase — витрина компонентов дизайн-системы v2.
 * Доступна исключительно в режиме разработки (import.meta.env.DEV).
 */
export function UiShowcase() {
  // Витрина недоступна в рабочей сборке
  if (!import.meta.env.DEV) {
    return null;
  }

  const [keypadInput, setKeypadInput] = useState('10152');
  const [selectedGroup, setSelectedGroup] = useState(2);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [streak, setStreak] = useState(3);
  const [activeEmotion, setActiveEmotion] = useState<MentorEmotion>('neutral');

  const sampleGroups = ['ЩЭЗИС', '26063', '11475', '40102', '10152', '20084'];

  const anatomyItems = [
    { digit: '1', role: 'Опознаватель', description: 'Раздел 1: Температура воздуха' },
    { digit: '0', role: 'Знак sn', description: 'sn=0: положительная температура' },
    { digit: '152', role: 'TTT', description: 'Температура 15.2 °C' },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#070D1E', color: '#F4F7FA', minHeight: '100vh', fontFamily: 'PixCyrillic, monospace' }}>
      <header style={{ borderBottom: '2px solid #D47A2A', paddingBottom: '12px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#F4B98A' }}>
          26063: Позывной «Синоптик» — Витрина дизайн-системы v2 (DEV ONLY)
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#B9BDC2' }}>
          Компоненты интерфейсного набора: пиксельная сетка, WCAG AAA контрастность, состояния фокуса
        </p>
      </header>

      {/* 1. Panels */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', color: '#D47A2A' }}>1. Панели (9-slice)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <Panel variant="dark_teal">
            <h3 style={{ margin: '0 0 8px', fontSize: '12px' }}>Dark Teal</h3>
            <p style={{ margin: 0, fontSize: '9px' }}>Базовая информационная панель</p>
          </Panel>
          <Panel variant="raised_slate">
            <h3 style={{ margin: '0 0 8px', fontSize: '12px' }}>Raised Slate</h3>
            <p style={{ margin: 0, fontSize: '9px' }}>Приподнятая инструментальная панель</p>
          </Panel>
          <Panel variant="brass_dialog" focused>
            <h3 style={{ margin: '0 0 8px', fontSize: '12px' }}>Brass Dialog (Focused)</h3>
            <p style={{ margin: 0, fontSize: '9px' }}>Диалоговое окно с латунной каймой</p>
          </Panel>
        </div>
      </section>

      {/* 2. Buttons */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', color: '#D47A2A' }}>2. Кнопки (32px высота)</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary">Главное действие</Button>
          <Button variant="secondary">Вторичное действие</Button>
          <Button variant="ghost">Кнопка-призрак</Button>
          <Button variant="primary" disabled>Отключено</Button>
          <Button variant="secondary" isLoading>Загрузка</Button>
        </div>
      </section>

      {/* 3. Paper Forms & Tape */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', color: '#D47A2A' }}>3. Бланки и лента телеграммы</h2>
        <div style={{ marginBottom: '16px' }}>
          <Tape
            groups={sampleGroups}
            selectedIndex={selectedGroup}
            errorIndex={4}
            acceptedIndex={1}
            onSelectGroup={(idx) => setSelectedGroup(idx)}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <PaperForm variant="sheet">
            <strong>Бланк КН-01</strong>
            <p style={{ margin: '4px 0 0', fontSize: '9px' }}>Обычный лист для внесения групп</p>
          </PaperForm>
          <PaperForm variant="perforated" state="error_redline">
            <strong>Отрывная перфорация</strong>
            <p style={{ margin: '4px 0 0', fontSize: '9px' }}>С пометкой красным карандашом</p>
          </PaperForm>
          <PaperForm variant="clipboard">
            <strong>Планшет наблюдателя</strong>
            <p style={{ margin: '4px 0 0', fontSize: '9px' }}>Деревянная основа с зажимом</p>
          </PaperForm>
        </div>
      </section>

      {/* 4. KeyPad & Anatomy */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', color: '#D47A2A' }}>4. Клавиатура телетайпа и Анатомия цифр</h2>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#F2C75C' }}>
              Буфер ввода: <strong>{keypadInput || '—'}</strong>
            </div>
            <KeyPad
              onKeyPress={(k) => setKeypadInput((prev) => (prev.length < 5 ? prev + k : prev))}
              onBackspace={() => setKeypadInput((prev) => prev.slice(0, -1))}
              onSubmit={() => alert(`Введено: ${keypadInput}`)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <DigitAnatomy groupName="1snTTT (Группа температуры)" items={anatomyItems} />
          </div>
        </div>
      </section>

      {/* 5. Choice Cards, Streak Lamps, Stamps */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', color: '#D47A2A' }}>5. Карточки выбора, Лампы серии и Штампы</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <ChoiceCard letter="А" label="Температура воздуха" state="idle" />
          <ChoiceCard letter="Б" label="Точка росы" state="selected" />
          <ChoiceCard letter="В" label="Давление станции" state="correct" />
          <ChoiceCard letter="Г" label="Тенденция давления" state="incorrect" />
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '10px', display: 'block', marginBottom: '6px' }}>
              Лампы серии ({streak}/5):
            </span>
            <StreakLamps currentStreak={streak} />
            <div style={{ marginTop: '8px' }}>
              <Button variant="ghost" style={{ height: '24px', fontSize: '8px' }} onClick={() => setStreak((s) => (s < 5 ? s + 1 : 0))}>
                + Шаг серии
              </Button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Stamp type="ПРИНЯТО" />
            <Stamp type="ПРОВЕРИТЬ" />
            <Stamp type="ДОПУСК" />
          </div>
        </div>
      </section>

      {/* 6. Mentor Portrait & Speech Bubble */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', color: '#D47A2A' }}>6. Наставник и реплики</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <MentorPortrait emotion={activeEmotion} size={64} />
          <div style={{ flex: 1, minWidth: '260px' }}>
            <SpeechBubble tail="left" speaker="Вера Павловна Ладожская">
              «Внимание к третьей цифре группы: для отрицательных температур признак sn равен единице!»
            </SpeechBubble>
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['neutral', 'smile', 'thoughtful', 'surprised', 'approval', 'glasses_up'] as MentorEmotion[]).map((em) => (
                <button
                  key={em}
                  type="button"
                  style={{
                    fontSize: '8px',
                    fontFamily: 'PixCyrillic, monospace',
                    background: activeEmotion === em ? '#D47A2A' : '#143F4C',
                    color: '#F4F7FA',
                    border: '1px solid #367C8B',
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveEmotion(em)}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Dialog Trigger */}
      <section>
        <h2 style={{ fontSize: '14px', color: '#D47A2A' }}>7. Диалоговое окно</h2>
        <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
          Открыть модальный диалог
        </Button>
        <Dialog
          isOpen={isDialogOpen}
          title="Справка по коду КН-01"
          onClose={() => setIsDialogOpen(false)}
        >
          <p style={{ margin: '0 0 12px', fontSize: '10px' }}>
            Код КН-01 утверждён Федеральной службой по гидрометеорологии и мониторингу окружающей среды.
          </p>
          <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
            Понятно
          </Button>
        </Dialog>
      </section>
    </div>
  );
}

export default UiShowcase;
