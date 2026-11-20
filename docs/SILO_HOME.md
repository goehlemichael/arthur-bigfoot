# Home beneath the pines — 0.5.0-silo

Arthur now lives in a converted missile silo beneath the Canadian forest. New Tuesdays begin on the upper service landing. After the wardrobe screen, press **E** or tap **Interact** to climb down into the control room. WASD, arrows and the existing phone thumbstick move Arthur on the floor. The ladder and the moss-covered surface hatch provide a repeatable route between home and the forest.

## The residence

The cutaway cylindrical room includes concrete ribs, an upper service walkway, pipes, a long ladder, three large animated wall displays, computer consoles, a central planetary projection, server racks, a propulsion research bench, a microscope and specimen tubes, and a spacecraft prototype in its cradle. A rug, armchair, books, tea service and grooming mirror give the space Arthur's particular version of domestic comfort.

Walk up to a console and interact. Planetary command cycles the main wall display between Earth, orbital diagrams and a galaxy. Deep-space, forest-surveillance and prototype terminals provide Arthur's notes. Surveillance plots Gary's in-game patrol. The displays are stylised fictional simulations, not live astronomical data. Tea and grooming restore composure. The spacecraft is a display, not a flyable vehicle; recorded voice acting and new space travel are outside this update.

The original Tuesday mission remains available: leave home, retrieve the coil, remove the camera card, return down the ladder, calibrate the bench to 2 / 4 / 1, and have tea. Entering home early does not skip mission stages. Completed players can still leave and revisit.

## Saves and offline support

The existing storage key is retained. Schema-1 recovery saves migrate to schema 2 without resetting progress or appearance. Existing players continue where they were; use Help & saves / New Tuesday to see the opening. Export a backup first to retain the old playthrough.

Ladder transitions are transient. Saving or reloading midway restores the safe source position (upper landing, lab ladder foot or forest hatch), never an arbitrary height. Furniture collision and import-time position validation prevent spawning inside new equipment. All new modules and styles are in the versioned service-worker asset list. The portable builder includes the bunker modules and styling without external dependencies.

## Checks

- `npm test`: 54 gameplay, geometry, save and service-worker-model tests passed locally.
- `python tests/browser_smoke.py --fixture`: passed desktop and phone layouts, wardrobe controls, animated-climb/pause integration, two-way travel, every terminal, the original mission, calibration, saving, touch movement and touch cancellation. This restricted-runner mode uses an in-memory bundle, memory storage, CPU rendering and reduced rendering cadence. Fixture transitions are advanced by explicit simulation steps after live progress is checked.
- Default `python tests/browser_smoke.py` retains real HTTP, WebGL, offline reload and waiting-service-worker update acceptance checks for CI. These paths could not be run locally because the browser runner blocks local HTTP; no local WebGL or real service-worker pass is claimed.
- `python tools/build_portable.py arthur-silo-offline.html` builds the standalone desktop edition.

This change targets the main game and does not include or alter the separate draft forest-physics experiment.
