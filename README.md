# Arthur — A perfectly manageable Tuesday

**0.4.1-rebuilt** is a new, dependency-free reconstruction of the browser game described in the development conversation. It is **not a recovered copy of the lost v0.4 archive**. No download from that conversation is needed to build or edit this version.

Arthur is an immensely shy, unfailingly polite Bigfoot scientist. He builds advanced propulsion systems, treasures privacy, worries about his grooming, and would much rather be having tea than becoming Gary's next photograph.

## Included

- Interactive 3D wardrobe: 28 scarf, hair, glasses, drink and equipment choices.
- Articulated procedural character with idle, shy, walk, sneak and sip previews.
- Forest mission: retrieve a field coil, recover Gary's photographs, return home.
- Second playable laboratory area: calibrate propulsion, then make tea.
- Keyboard and touch controls, portrait/landscape layouts, pause, local saves and backup export/import.
- Self-contained WebGL2 renderer, plus reduced-detail CPU/Canvas fallback.
- Versioned, path-scoped offline caching and user-approved updates. No runtime CDN.

## Run

From the repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/site/`. For iPhone, use the deployed HTTPS website; do not try to install a ZIP as an app.

WASD/arrows move; Shift sneaks; E interacts; Escape pauses. On touch devices use the thumbstick, Sneak and Interact. Follow the gold objective beacon. Fern cover works while sneaking; trunks block Gary's view.

## Test

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 tools/validate_site.py site
python3 -m pip install playwright==1.57.0
python3 -m playwright install --with-deps chromium
python3 tests/browser_smoke.py
```

The full browser test starts its own temporary HTTP server beneath `/arthur-bigfoot/`, exercises real WebGL2, offline reload and a waiting-worker update, and never modifies the checked-in site. Use a Python virtual environment when needed.

`python3 tools/build_portable.py arthur-offline.html` produces a standalone desktop edition. It has no automatic update or install mechanism.

## Source map

`site/game.js`: pure mission, visibility, movement and save rules. `site/world.js`: procedural art and attachment transforms. `site/engine.js`: rendering. `site/main.js`: UI and input. `site/offline.js` and `site/sw.js`: install and update lifecycle.

GitHub is the source of truth. Develop on branches, run the checks, review a PR, then merge. Only `site/` is published; source, tests and documentation remain in the repository.

## Honest limits

This character is a new low-poly articulated-parts model, not the prior skinned GLB. The original GLB, nine animation clips, WebAssembly module and old test suite were not recovered. No British voice recordings, production fur, cloth simulation, gamepad support or arbitrary GLB importer are included. CPU fallback has simpler geometry and imperfect painter sorting. Physical iPhone/Safari performance, Home Screen installation and airplane-mode play still need device testing.

See [deployment](docs/DEPLOYMENT.md) and [verification](docs/RECOVERY_REPORT.md). The earlier missing-archive instructions are superseded: the repository now contains a complete replacement implementation.
