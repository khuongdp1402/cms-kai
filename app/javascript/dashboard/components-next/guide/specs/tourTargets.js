import { expect } from 'vitest';
import { findTour, tourSelector } from '../kaloTours';

// Shared by page specs: every step of `tourKey` whose target is listed in
// `targets` (default: all) must be rendered by `wrapper`. Guards tours against
// UI drift (guided UX spec §9).
export const tourTargets = tourKey =>
  findTour(tourKey).steps.map(step => step.target);

export const expectTourTargets = (wrapper, tourKey, targets) => {
  const expected = targets || tourTargets(tourKey);
  const missing = expected.filter(
    target => !wrapper.find(tourSelector(target)).exists()
  );
  expect(missing).toEqual([]);
};
