# Curated external expertise (cross-provider)

The project deliberately imports **six MIT-licensed upstream Three.js skills** verbatim, with license notice under `licenses/` and exact upstream blob SHA in `agents/capability-catalog.json`. Additional Phaser, pixel-art, geometry and project-policy skills are **new project-specific adaptations**, not verbatim upstream content. GameStudio and 3d-web-pack references are transformed into minimal project-scoped capability agents; their upstream operating rules (R3F recommendation, user confirmation before each file write, fixed performance targets) are not imported.

The external agent templates have no ownership authority; internal `agents/registry.yaml` remains authoritative. Neither metadata nor GitHub links authorize running remote code. No MCP server, network credential, model, or new package is automatically installed.

Licensing: original Three.js skills and profiling worksheet: copyright Three.js Skills contributors (MIT); external agent concepts: GameStudio (MIT) and 3d-web-pack (MIT). Phaser and ProkStudio material is cited only as reference and has not been redistributed. All original source links and pinned blob SHA are in the catalog. Before updating upstream, review diffs, license, safety and project architecture.
