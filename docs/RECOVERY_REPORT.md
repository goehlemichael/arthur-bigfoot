# Reconstruction and verification — 0.4.1-rebuilt

## Provenance

The previous v0.4 archive, standalone file and GLB had file records, but their backing bytes could not be retrieved. They were not recovered. This implementation was rebuilt from the agreed concept and gameplay requirements. It must not be described as the exact previous version or use the previous 78-check result as evidence.

## Local results

- **35 Node tests passed**: mission sequencing and distance gates, fresh evidence, calibration, visibility, collision, appearance options, geometry transforms, validation, save recovery and nine service-worker/cache checks.
- **Browser fixture test passed** in Chromium: every wardrobe option, movement, pause, the complete mission through real interaction handlers, calibration, save calls using memory storage, phone portrait/landscape layout and native touch cancellation.
- Local browser policy blocked both HTTP/file navigation and WebGL. The UI test therefore used in-memory HTML, a substituted base path, memory-backed storage, and the actual shipped CPU/Canvas rendering fallback. This is not a hosted/offline-installation test or WebGL-driver test.
- The mission browser test places Arthur beside objectives as explicit test fixtures. It does not establish natural navigation, difficulty, or human playability quality.
- Existing deployment-validator tests remain unchanged in the repository.

## GitHub CI coverage added

`tests/browser_smoke.py` without `--fixture` starts an HTTP server under `/arthur-bigfoot/`, requires the real WebGL2 path to initialize, tests actual persistent local storage, reloads with networking disabled, and applies a real waiting service-worker update using a temporary copy. Its result must be read from the current GitHub Actions run; it is not inferred from local fixture success.

## Not yet qualified

Physical iPhone/Safari installation, actual device frame rates and thermal behavior, real airplane-mode play, accessibility beyond labeled controls, and a human end-to-end playtest. No deployed GitHub Pages URL or successful production deployment is claimed by this report.

## Visual scope

28 customization options; 5 procedural motion previews; rigid articulated parts, not skinning. WebGL2 is primary; the CPU fallback is lower-detail and can show sorting artifacts. No recovered GLB, full animation rig, voice, WebAssembly module or cinematic fur is present.
