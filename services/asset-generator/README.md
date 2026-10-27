# Фабрика игровых ассетов «Синоптик» (synopsis-assets-mcp)

Специализированный сервер генерации, нормализации и валидации пиксельной графики для проекта **«26063: Позывной «Синоптик»»**, развёрнутый на удалённом GPU-сервере с 2× NVIDIA GeForce RTX 4090 (24 ГБ VRAM).

## 1. Архитектура системы

```
    Codex / Claude / Gemini / Cursor / Web UI
                         │
                         ▼ Streamable HTTP (:9200/mcp) & REST API (:9200/api/v1/...)
    ┌────────────────────────────────────────────────────────┐
    │                 synopsis-assets-mcp                    │
    │                                                        │
    │  • Реестр kn01_level1.image-spec.json (206 ассетов)    │
    │  • Компилятор STYLE LOCK и негативных промптов         │
    │  • Нормализатор: block majority, #FF00FF, палитра      │
    │  • Валидатор: строгая сетка, бинарная альфа, лимиты    │
    │  • Контроль геометрии силуэта Day/Night (ControlNet)   │
    │  • Сборщик спрайт-листов и выравнивание опорных точек  │
    └───────────────────────────┬────────────────────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
    ┌─────────────────────┐           ┌─────────────────────┐
    │  ComfyUI (:8188)    │           │    PixelLab API     │
    │  Local Dual RTX 4090│           │  (внешний fallback) │
    │                     │           │                     │
    │  • Z-Image Turbo    │           │  • Wang tiles       │
    │  • Z-Image Base 6B  │           │  • 4/8-way chars    │
    │  • FLUX.2 Klein 4B  │           │  • Complex anims    │
    │  • SDXL ControlNet  │           └─────────────────────┘
    │  • Project LoRA     │
    └──────────┬──────────┘
               │ raw candidates (×4/×8)
               ▼
    ┌────────────────────────────────────────────────────────┐
    │         Конвейер нормализации и приёмки                │
    │  1. Блочное уменьшение (block_majority_downsample)     │
    │  2. Удаление хромакея (#FF00FF -> альфа 0)             │
    │  3. Приведение к палитре (master / people GPL)         │
    │  4. Проверка критериев (validate_pixel_asset)          │
    │  5. Сохранение кандидата -> accept в assets/source/... │
    └────────────────────────────────────────────────────────┘
```

## 2. Развёртывание на сервере 10.7.88.12

Сервер: `astra-26884` (Astra Linux SE 1.8), 2× RTX 4090 24 ГБ.

- **ComfyUI**: `127.0.0.1:8188` (GPU 0, изоляция через `comfy-venv`)
- **synopsis-assets-mcp**: `0.0.0.0:9200` (Python 3.11, `mcp-venv`)
- **Каталог данных**: `/home/user/synopsis-ai/`

### Управление службами
```bash
# Запуск сервисов в фоне
/home/user/synopsis-ai/start_services.sh

# Остановка сервисов
/home/user/synopsis-ai/stop_services.sh

# Статус портов и процессов
/home/user/synopsis-ai/status_services.sh
```

## 3. Набор инструментов MCP (MCP Tools)

Сервер предоставляет полный контракт для ИИ-агентов:

| Инструмент | Описание |
|---|---|
| `asset_spec(asset_id)` | Метаданные, размеры, лимит цветов, скомпилированные промпты из `image-spec.json`. |
| `list_missing_assets()` | Список отсутствующих файлов первого уровня КН-01. |
| `list_failed_assets()` | Кандидаты, не прошедшие валидацию. |
| `generate_asset(asset_id, backend, candidates, seed)` | Запуск генерации кандидатов (ComfyUI / PixelLab), автонормализация и валидация. |
| `generate_tileset(asset_id, ...)` | Специализированный воркфлоу для тайлсетов и текстур. |
| `generate_sprite_frames(asset_id, ...)` | Генерация отдельных кадров с фиксированной анатомией и сборкой спрайт-листа. |
| `generate_day_night_pair(day_id, night_id, ...)` | Генерация пары день/ночь с совпадением силуэта пиксель-в-пиксель. |
| `normalize_candidate(asset_id, candidate_path)` | Блочное уменьшение, вырезание фона #FF00FF, квантование по палитре. |
| `validate_candidate(asset_id, candidate_path)` | Проверка PNG: размер, альфа 0/255, лимит цветов, соответствие палитре. |
| `compare_candidates(asset_id)` | Ранжирование кандидатов по качеству и количеству цветов. |
| `accept_candidate(asset_id, candidate_path)` | Перенос утверждённого кандидата в `assets/source/...`. |
| `regenerate_failed(asset_id)` | Повторная генерация с изменением сида и параметров. |
| `build_sprite_sheet(asset_id, frame_paths)` | Сборка анимационного листа из нормализованных кадров. |
| `pixel_palette(asset_id)` | Список доступных цветов палитры (HEX/RGB). |
| `gpu_status()` | Загрузка, память и температура NVIDIA RTX 4090. |
| `queue_status()` | Состояние очереди задач ComfyUI. |
| `train_style_lora(...)` | Формирование датасета из исходников и обучение LoRA `synopsis_26063_style_v1`. |
| `dataset_status()` | Количество подготовленных изображений и пар описаний. |

## 4. Конфигурация клиента MCP

Для подключения в IDE / Agent CLI добавьте в настройки MCP:

```json
{
  "mcpServers": {
    "synopsis-assets": {
      "url": "http://10.7.88.12:9200/mcp"
    }
  }
}
```

## 5. REST API эндпоинты

- `GET /health` — проверка доступности сервера
- `GET /api/v1/gpu/status` — телеметрия GPU
- `GET /api/v1/queue/status` — очередь генераций
- `GET /api/v1/assets` — полный реестр ассетов
- `GET /api/v1/assets/missing` — отсутствующие ассеты
- `GET /api/v1/assets/{asset_id}` — параметры ассета
- `POST /api/v1/assets/{asset_id}/generate` — генерация
- `POST /api/v1/assets/{asset_id}/accept` — приёмка
- `POST /api/v1/lora/build_dataset` — сборка датасета
