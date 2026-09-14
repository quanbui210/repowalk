export const CASE_STEPS = [
  {
    title: 'A small favor',
    objective: 'Meet Aino at the Lost & Found kiosk.',
    place: 'LOST & FOUND',
    x: -5,
    z: 12,
  },
  {
    title: 'Coffee leaves a trail',
    objective: 'Ask Mika at the little coffee cart.',
    place: 'KAHVILA',
    x: -8,
    z: 18,
  },
  {
    title: 'A very short suspect',
    objective: 'Find Toffee, the dachshund, by the dog park.',
    place: 'DOG PARK',
    x: 8,
    z: 16,
  },
  {
    title: 'Bring the story home',
    objective: 'Return the sketchbook to Aino.',
    place: 'LOST & FOUND',
    x: -5,
    z: 12,
  },
  {
    title: 'Every city needs a keeper',
    objective: 'The exhibition is open. Your first case is complete.',
    place: 'CASE CLOSED',
    x: -5,
    z: 12,
  },
] as const;
export function advanceCase(step: number, station: number) {
  return station === [0, 1, 2, 0][step] ? Math.min(4, step + 1) : step;
}
