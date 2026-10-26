# Архив — исходники первого семейства

Этот каталог предназначен для первых производственных `.aseprite`-источников локации Архив.

Текущий Phaser-срез использует процедурные прототипы с теми же семантическими именами. После ручной отрисовки художник заменяет геометрию на следующие исходники без изменения ID:

- `archive_facade_base.aseprite` → `archive.facade.base`;
- `archive_door.aseprite` → `archive.door.closed`, `archive.door.open`;
- `archive_window.aseprite` → `archive.window.dark`, `archive.window.warm`;
- `archive_bookshelf_tall.aseprite` → `archive.bookshelf.tall`;
- `archive_bookshelf_low.aseprite` → `archive.bookshelf.low`;
- `archive_box.aseprite` → `archive.box.closed`, `archive.box.open`;
- `archive_catalog_cabinet.aseprite` → `archive.catalog.cabinet`;
- `archive_table.aseprite` → `archive.table`;
- `archive_lamp.aseprite` → `archive.lamp.off`, `archive.lamp.on`;
- `archive_folder_stack.aseprite` → `archive.folder.stack`;
- `archive_magnifier.aseprite` → `archive.magnifier`;
- `archive_book_sign.aseprite` → `archive.sign.book`.

Правила:

- крупный пиксель и сетка из `PIXEL_ART_BASELINE_COZY_SCIENCE.md`;
- фасад не содержит вшитого текста;
- профессиональные метеорологические символы не рисуются внутрь декоративных рамок;
- свет окна/лампы хранится отдельным состоянием или маской;
- точки опоры между состояниями двери/лампы не меняются;
- после появления `.aseprite` каждый источник получает запись в `assets/manifests/` и проходит обычный конвейер сборки.
