# Dravix Dataset Layout

This directory separates material datasets from coating datasets so each can be versioned independently.

## Directory Structure

- Materials datasets go in `data/materials/`.
- Coatings datasets go in `data/coatings/`.
- Each dataset version lives in its own folder, for example `data/materials/v0.3/` or `data/coatings/v0.4/`.
- The canonical filenames are `materials_dataset.csv` for materials data and `coatings_dataset.csv` for coatings data.

## Upload Workflow

- New datasets should be uploaded manually into the correct version folder.
- Create a new version folder when a dataset changes, instead of overwriting an existing released version.
- Keep prior versions unchanged so retraining and production comparisons remain reproducible.

## Current Examples

- `data/materials/v0.3/materials_dataset.csv` contains the current versioned materials dataset that was moved from the previous shared location.
- `data/coatings/v0.3/coatings_dataset.csv` contains the current versioned coatings dataset that was moved from the previous shared location.
- Later version folders may contain empty placeholder CSVs until a spreadsheet is uploaded manually.
