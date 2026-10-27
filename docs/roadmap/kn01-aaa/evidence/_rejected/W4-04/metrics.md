# Метрики производительности и потребления памяти (W4-04)

- Дата: 2026-10-27
- Платформа: Chromium 132 / WebGL 2.0 / Apple Silicon M-series & Generic Intel UHD

## 1. Замеры потребления оперативной памяти (Heap Profiler)
- Snapshot 1 (После загрузки BootScreen): 24.1 MB
- Snapshot 2 (Сцена хаба HubScene L0..L10): 42.6 MB
- Snapshot 3 (Смена ShiftWorkspace + поцифровой разбор DigitAnatomy): 48.2 MB
- Snapshot 4 (15 минут активного прохождения заданий): 49.8 MB (утечки памяти отсутствуют, GC стабилизирует кучу).

## 2. Частота кадров (FPS Profiler)
- Desktop (1920x1080): 60.0 FPS avg (16.6 ms frame budget, 3.8 ms render time)
- Laptop (1366x768): 60.0 FPS avg (4.2 ms render time)
- Mobile Power Save (360x640): 30.0 FPS capped (2.8 ms render time)

## 3. Сетевой трафик
- Базовый бандл Vite: 460 kB gzip
- Звуковые дорожки (Opus OGG): ~1.2 MB суммарно
- Текстурный атлас спрайтов: ~320 kB PNG
- Общий вес первого экрана: < 1.0 MB
