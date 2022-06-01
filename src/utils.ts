/**
 * Get a random integer in range [min, max]
 */
export function randInt(min: number, max: number): number {
  if (!Number.isInteger(min)) throw new Error('Min is not an integer');
  if (!Number.isInteger(max)) throw new Error('Max is not an integer');

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randChoice<T>(choices: T[]): T {
  if (choices.length === 0) {
    throw new Error('There must be at least one choice');
  }

  return choices[randInt(0, choices.length - 1)];
}

export function randChoices<T>(choices: T[], n: number): T[] {
  if (n > choices.length) {
    throw new Error('Can not choose more than the amount of choices');
  }

  return uniqueRandInts(n, 0, choices.length - 1).map((i) => choices[i]);
}

export function range(from: number, to: number) {
  if (from > to) {
    throw new Error('To must be greater than from');
  }

  return Array.from({ length: to - from }, (_, i) => from + i);
}

export function batchBySize<T>(jobs: T[], batchSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < jobs.length; i += batchSize) {
    result.push(jobs.slice(i, i + batchSize));
  }
  return result;
}

export function batchByAmount<T>(jobs: T[], batchCount: number): T[][] {
  return batchBySize(jobs, Math.ceil(jobs.length / batchCount));
}

export function* map<T, R>(iterable: Iterable<T>, mapper: (value: T) => R): Generator<R> {
  for (const value of iterable) {
    yield mapper(value);
  }
}

export function reduce<T, R>(
  iterable: Iterable<T>,
  reducer: (accumulator: R, value: T) => R,
  initialValue: R,
): R {
  let accumulator = initialValue;
  for (const value of iterable) {
    accumulator = reducer(accumulator, value);
  }
  return accumulator;
}

export function findIndexRight<T>(values: T[], predicate: (value: T) => boolean): number {
  for (let i = values.length - 1; i >= 0; i--) {
    if (predicate(values[i])) {
      return i;
    }
  }
  throw new Error(`No index found`);
}

/**
 * Generate N unique random integers in range [min, max]
 * O(n^2), so do not use with a large N
 */
export function uniqueRandInts(n: number, min: number, max: number): number[] {
  if (min > max) {
    throw new Error('Max must be greater than min');
  }

  if (n > max - min + 1) {
    throw new Error('Can not generate more unique random integers than possible in the range');
  }

  const result: number[] = [];
  while (result.length < n) {
    const value = randInt(min, max);
    if (!result.includes(value)) {
      result.push(value);
    }
  }

  return result;
}

/**
 * Get a list of indices where some predicate is true
 */
export function getIndicesWhere<T>(values: T[], predicate: (value: T) => boolean): number[] {
  return range(0, values.length).filter((i) => predicate(values[i]));
}

export function* enumerate<T>(iterable: Iterable<T>): Iterable<[number, T]> {
  let i = 0;
  for (const value of iterable) {
    yield [i++, value];
  }
}

/**
 * Zips two arrays. If one is longer than the other, the rest of the longer array is discarded.
 */
export function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  return range(0, Math.min(as.length, bs.length)).map((i) => [as[i], bs[i]]);
}
