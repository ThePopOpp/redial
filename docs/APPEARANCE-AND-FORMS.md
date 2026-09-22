# Appearance and shared forms

The requested form and appearance update applies to the public website, seven-step onboarding, member workspace and operations dashboard. The original build kit remains unchanged; this is local M1 review work.

## Behavior

- The sun/moon header button switches light/dark appearance. Dark remains the initial default. `next-themes` applies the saved class before hydration and keeps the browser preference in `redial-appearance`, including across routes and tabs.
- Website and dashboard top bars stay visible when scrolling, including the theme button. Landing content reserves the fixed navigation height; public/dashboard content retains its natural header spacing and anchor clearance.
- Graphite and violet remain the dark palette; light mode uses warm white, soft lavender surfaces and deep violet actions. The Three.js phone keeps its intentional dark device display. The surrounding journey, navigation and actual form follow the selected theme.
- Inputs, textareas, selects, radios, checkboxes, dialogs, popovers and calendar controls share semantic colors, borders, focus rings, validation colors and disabled states. Mobile text inputs use 16px text. No native date/time picker is rendered.
- Callback scheduling offers a single-date calendar, month navigation, Today/Tomorrow shortcuts, and separate hour/minute/AM–PM menus. Past days are disabled. Missing dates, past instants and daylight-saving skipped times are rejected before the existing callback command runs. Times are interpreted in the browser timezone, saved as UTC and displayed in the workspace timezone, preserving the existing contract.
- Review editors use Radix dialogs so portaled selects and calendars remain operable with modal focus management. Escape closes the innermost menu first and returns focus to its trigger; closing the dialog restores its trigger.
- Onboarding identity information remains separate from synthetic review records. Theme changes do not send information to a provider or activate service.

## Implementation and references

Shared components live in `src/components/ui/`, with form styles in `src/app/forms.css`. Semantic palettes live in `globals.css`; the landing and review styles use those same tokens. `ThemeProvider` is mounted once in the root layout.

The composition follows official [shadcn date picker](https://ui.shadcn.com/docs/components/radix/date-picker) and [Next.js dark mode](https://ui.shadcn.com/docs/dark-mode/next) guidance. Radix supplies Select, RadioGroup, Checkbox, Dialog and Popover interaction behavior; React DayPicker 9.14.0 supplies calendar navigation and selection. Dependencies are exact-pinned in the lockfile. The existing shadcn button and its MIT attribution remain intact.

## Verification

`tests/appearance.spec.ts` covers persistent appearance across public/member/staff routes, mobile calendar bounds, required date validation, month navigation and keyboard day selection, selected-day contrast, keyboard time selection, saved callback persistence, nested Escape/focus restoration, and light-mode layout/automated WCAG checks at 390px and 1440px.

Existing onboarding, local workflow, permission boundary, API and responsive checks remain in place. Browser evidence is captured under `test-results/`; retained appearance results and screenshots are in `docs/evidence/appearance/`. These checks are local browser evidence, not provider or native-client acceptance.

Verified September 19, 2026: lint and typecheck passed; optimized build passed; all 44 browser/domain/API tests and 75 build-kit reference tests passed. All 92 original kit files match the M0 SHA-256 baseline. The refreshed local server uses port 4317.
