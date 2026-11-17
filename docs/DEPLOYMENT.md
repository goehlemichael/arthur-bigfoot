# Import and GitHub Pages deployment

## Blocker

The game archive is unavailable to the current working environment. The repository
contains deployment tooling only, not the previously described v0.4 game.
Do not merge or announce a playable URL until the real build has been restored.

## Import into this draft PR

1. Recover and inspect `arthur-github-v0.4.0.zip`; do not overwrite these files blindly.
2. Commit its editable source, asset-generation code, models, licenses and tests.
3. Run the recovered project's documented build/test commands. Add those exact
   commands to the validation job after checking them; they are not known yet.
4. Put the built website in `site/`, preserving relative directory structure.
   The current validator expects `index.html`, `manifest.webmanifest`, and `sw.js`.
   Adapt those filenames to the verified build rather than inventing placeholder files.
5. Check the base path `/arthur-bigfoot/`: HTML, JavaScript module imports, CSS
   resource URLs, model loads, service-worker registration, manifest scope and
   start URL. Root-absolute paths such as `/assets/model.glb` target the wrong place.
6. Verify all offline dependencies are included locally. Inspect the actual cache
   list and version/update strategy; this preparation PR implements no service worker.
7. Run the game's tests and a complete browser playthrough before marking this PR ready.

Only `site/` is published. The workflow does not upload the repository root,
source tooling, archives, or documentation as part of the website artifact.

## One-time repository setting

In GitHub: Settings > Pages > Build and deployment > Source > GitHub Actions.
The developer must confirm this setting in the account; it has not been changed
or verified by this PR. No personal access token is required by this workflow.

Official setup guide:
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Release flow

- Pull request: run the deployment-tool tests and static website preflight only.
- Push to `main` after review/merge: validate, then publish the website artifact.
- Manual run on `main`: the same checks and deployment; another branch cannot deploy.
- Missing files or failed checks: stop before publication.

The deployment job uses the `github-pages` environment. Configure its deployment
branch policy to allow only `main` if the account does not already enforce that.
A successful deploy job reports the actual Pages URL. Until then, no URL is
claimed to host the game.

## Scope of the automated checks

The validator checks required entry files, symlinks, resource URLs directly listed
in `index.html`, and manifest URLs/icons. It rejects root-absolute or remote core
resource URLs for this repository-path, offline-first build. It does not crawl
JavaScript imports, CSS URLs, dynamically loaded models, cache entries, or test
animations, save migration, gameplay, security, or browser performance.

The unit tests exercise the validator with fabricated temporary fixtures.
They are not game tests. A failed preflight is expected until the archive is imported.

## Release acceptance checklist

- [ ] Actual source project and binary assets recovered and committed.
- [ ] Source build and original game tests run, with real results recorded.
- [ ] Desktop and iPhone Safari can load the hosted game without missing assets.
- [ ] Customization persists and follows Arthur into gameplay.
- [ ] Full mission is completable with keyboard and touch controls.
- [ ] First online installation reports offline readiness only after caching succeeds.
- [ ] Home Screen launch in airplane mode works on a physical iPhone.
- [ ] Updating preserves progress; importing/exporting a save works.
- [ ] Incomplete downloads leave the previous installed version usable.
- [ ] No credentials, private files, or unlicensed assets are in the public repository.

GitHub Actions references in the workflow follow the official Pages examples
checked when this preparation was written. Review dependency updates separately.
