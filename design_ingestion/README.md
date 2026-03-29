# Design Ingestion

This folder is the source of truth for the next Dravix UI redesign pass.

## Use

- Drop the `bolt.new` generated UI project into `design_ingestion/bolt_ui/`.
- Drop branding guides, style references, and visual direction documents into `design_ingestion/branding_guide/`.
- Drop reusable visual assets into `design_ingestion/assets/`.
- For versioned intake, place each new design drop into `design_ingestion/releases/YYYY-MM-DD/`.

## Asset Layout

- `design_ingestion/assets/logos/`
- `design_ingestion/assets/icons/`
- `design_ingestion/assets/images/`

## Dated Intake System

- `design_ingestion/releases/` is the canonical intake archive for dated UI drops.
- Each release folder should use `YYYY-MM-DD` so chronology stays sortable.
- Inside each dated folder, keep the same intake structure:
  - `bolt_ui/`
  - `branding_guide/`
  - `assets/logos/`
  - `assets/icons/`
  - `assets/images/`
- Add notes for each intake in `manifest.md` inside the dated folder.
- Keep `design_ingestion/bolt_ui/`, `design_ingestion/branding_guide/`, and `design_ingestion/assets/` as the current working staging area only.

## Notes

- Do not wire these files into the app directly during intake.
- Keep this folder as the staging area for future UI refactoring.
- When the redesign phase starts, this directory should be treated as the intake source for layouts, brand direction, and media assets.
