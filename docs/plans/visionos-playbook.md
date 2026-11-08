# visionOS component fidelity and playbook

Requested by Eitan, 2026-11-08. Continue the exact Figma replica first, including
dark materials and disabled states; then provide a visionOS playbook built with
the actual components, using the kit inventory to find omissions.

Source: visionOS 26 (Community), file `TE1ta1HNhtbwSZn3LztSL5`.
The source has 30 foundation/component pages. The detailed variant inventory for
16 previously missing families is in `../research/visionos-kit-inventory.json`.

## Selected work

- [x] Recover Claude's latest request and publish the handoff to Brain.
- [x] Reference scene, adapted Lucide symbols, exact specular-gradient properties.
- [x] Explicit dark scheme, including when the OS prefers light.
- [x] Disabled buttons, selected toggles, toolbar, tabs, sidebar and segments.
- [x] Keep material layers stationary while sidebar/toolbar content scrolls.
- [x] Replace estimated label vibrancy and inspect remaining material effects.
- [x] Complete inputs, secure/search fields, switches and checkboxes.
- [x] Complete sliders, progress/activity indicators, page controls and tokens.
- [x] Complete menu/dropdown, date/time and color pickers.
- [x] Complete alerts, notifications/notices, share sheets and SharePlay surfaces.
- [x] Include keyboards and original gesture/app-icon/background resources.
- [ ] Review existing list/navigation/sidebar/tab/toolbar/tooltip/window variants.
- [x] Build the navigable playbook and expose a source-based coverage matrix.
- [x] Check visual states, keyboard/disabled behavior, scroll surfaces and build.
- [x] Update repository records and Brain with evidence and remaining limitations.

## Acceptance

Every source family has a corresponding reusable component or an explicitly
identified platform illustration/resource, and a live playbook example. Real
controls support pointer, keyboard, labels and disabled behavior. No dummy
controls or screenshots substituted for interactive components. Reference assets
remain local, in keeping with the earlier agreement; no temporary asset URLs in
runtime code. Geometry and all visible material/label states are compared to
Figma. Do not label a family verified merely because it exists.

The scroll regression is checked in a real browser: material bounds remain at
the surface bounds after its inner content scrolls. Dark/light OS screenshots
must be identical because this playbook intentionally uses the dark appearance.

Keep `web/base`, preserve the previous work, and do not commit/push until Eitan
approves the complete result. Planning mock remains preserved in its component;
the home page currently shows the reference, as requested before adding data.

## Delivery checkpoint

The playbook implementation is available at `/design`: all 30 source families
have live examples or original resources, including search, disabled inspection,
hash navigation and a source index. The prior catalog is `/design/catalog`.
53 UI + 8 web tests, lint, types and production build pass. Chromium desktop/mobile
and isolated WebKit covered all 30 families with no horizontal overflow.

Full 1:1 acceptance remains open: the examples are not a visual certification of
every variant in the ~600-entry detailed inventory. Remaining review includes
list/navigation/sidebar/tab/toolbar variants, all hover/pinch combinations and
new native Safari verification. The earlier Safari sidebar fix was observed in
real Safari; CUA could not reconnect for the final playbook pass. Headless WebKit
blur differs and must not be used to claim material parity. No commit/push made.
