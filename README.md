# Arthur Bigfoot

Arthur is an exceptionally polite, intensely shy Bigfoot aerospace engineer.
He would prefer to repair his propulsion system, avoid the hunters, and have tea.

## Current status: deployment preparation only

**The playable game and 3D assets are not in this repository yet.**
The previous v0.4 project archive could not be retrieved from the conversation's
file service. This draft must not be described as a playable release.

This change prepares GitHub Pages hosting without fabricating a replacement game.
No deployment can run until the actual website files have been imported into
`site/` and the checks pass. Pull requests never publish the live site.

## Next step

Reattach `arthur-github-v0.4.0.zip` in the development conversation. The source,
models and built website can then be inspected, tested, and added to this same
pull request. A website-only archive can restore hosting, but cannot substitute
for the full editable source project.

See [deployment and import checklist](docs/DEPLOYMENT.md).

## Check the deployment tooling

```sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 tools/validate_site.py site
```

The unit tests use temporary fixtures, not Arthur's game. The second command
intentionally fails while the real game is missing. Passing it later is only
a static preflight, not evidence that gameplay or offline installation works.
