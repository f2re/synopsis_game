# Формат очереди генерации

Каждая строка JSONL, создаваемая `scripts/build_hub_generation_queue.py`, является одним независимым заданием и должна порождать ровно одно изображение.

Обязательные поля job: `job_id`, `adapter`, `trigger`, `prompt`, `negative_prompt`, `num_images`, `seed`, `output_path`, `metadata`. Поле `num_images` всегда равно `1`.

`metadata` переносит `scene_id`, `lineage_id`, `split`, `time_of_day`, `weather`, `season`, `logical_grid`, `min_long_edge` и `independent_render`. Эти поля являются provenance-контрактом и не должны теряться при передаче в конкретный backend генерации.

Backend может добавлять свои параметры исполнения, но не должен менять prompt, split, lineage, число изображений или output identity без выпуска новой версии manifest.
