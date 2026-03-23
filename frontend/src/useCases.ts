export const USE_CASES = [
  'EV battery enclosure',
  'Fire-resistant building polymers',
  'Aerospace interior materials',
  'Industrial manufacturing materials',
] as const;

export type UseCaseOption = (typeof USE_CASES)[number];
