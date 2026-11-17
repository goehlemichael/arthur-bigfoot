# Publish the reconstruction

The missing v0.4 ZIP is no longer an input. All replacement source is in this PR.

1. In repository Settings → Pages, set Source to **GitHub Actions**.
2. Let all PR checks pass. Review the reconstruction and its documented differences from v0.4.
3. Mark the draft ready when appropriate and merge it into `main`.
4. The `Validate and publish Arthur` workflow tests the game and uploads only `site/`.
5. Use the deployment job's returned page URL; do not treat an unverified URL as a live game.

A PR does not publish by itself. This work does not change Pages settings, merge the PR, or publish other repository content.

## Player installation

Open the resulting HTTPS website in Safari. Wait for **Offline ready** before disconnecting, then use Share → Add to Home Screen. Test opening from the Home Screen in airplane mode on a physical iPhone. Clearing website data or browser storage eviction can remove the game and save: export a save backup regularly.

Desktop users can use the same site or build the portable HTML using `tools/build_portable.py`. The portable file does not update automatically. Browser downloads inside chat are not an iPhone hosting method.

## Release discipline

- Bump VERSION in both `site/game.js` and `site/sw.js` whenever any shipped file changes.
- Add every required new runtime file to the service worker ASSETS list.
- Keep URLs relative to the project directory, not the account-wide hosting root.
- Never delete caches that do not belong to this exact game scope.
- Keep saved-state migrations separate from rendering changes.
- Run a full browser test, not only static file checks.
- Test real Safari and a physical iPhone before promising support.

The service worker waits before activation during an existing session. The player chooses **Save & update**. Save failure prevents that action. Browser lifecycle behavior can activate a waiting version after all old pages close; do not rely on the update button as the only possible activation path.

## Required device acceptance

Confirm portrait and landscape layout; verify no notch/home-indicator overlap; move and cancel a touch; complete the mission; export/import a save; close and reopen; enter airplane mode; reconnect and apply a release while keeping progress. A Chromium phone viewport is not an iPhone test.

Reference: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
