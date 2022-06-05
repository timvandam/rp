/**
 * Get a random integer in range [min, max]
 */
export function randInt(min: number, max: number, random = Math.random.bind(Math)): number {
  if (!Number.isInteger(min)) throw new Error('Min is not an integer');
  if (!Number.isInteger(max)) throw new Error('Max is not an integer');

  return Math.floor(random() * (max - min + 1)) + min;
}

export function randChoice<T>(choices: T[]): T {
  if (choices.length === 0) {
    throw new Error('There must be at least one choice');
  }

  return choices[randInt(0, choices.length - 1)];
}

export function randChoiceWeighted<T>(
  choices: T[],
  weights: number[],
  random = Math.random.bind(Math),
): T {
  if (choices.length !== weights.length) {
    throw new Error('There must be the same number of choices and weights');
  }

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  const rand = random() * totalWeight;
  let weightSum = 0;

  for (let i = 0; i < weights.length; i++) {
    weightSum += weights[i];
    if (rand < weightSum) {
      return choices[i];
    }
  }

  throw new Error('This should never happen');
}

export function randChoices<T>(choices: T[], n: number, random = Math.random.bind(Math)): T[] {
  if (n > choices.length) {
    throw new Error('Can not choose more than the amount of choices');
  }

  return uniqueRandInts(n, 0, choices.length - 1, random).map((i) => choices[i]);
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
export function uniqueRandInts(
  n: number,
  min: number,
  max: number,
  random = Math.random.bind(Math),
): number[] {
  if (min > max) {
    throw new Error('Max must be greater than min');
  }

  if (n > max - min + 1) {
    throw new Error('Can not generate more unique random integers than possible in the range');
  }

  const result: number[] = [];
  while (result.length < n) {
    const value = randInt(min, max, random);
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
 * Zips two iterables. If one is longer than the other, the rest of the longer iterable is discarded.
 */
export function* zip<A, B>(as: Iterable<A>, bs: Iterable<B>): Iterable<[A, B]> {
  const itA = as[Symbol.iterator]();
  const itB = bs[Symbol.iterator]();

  let a: IteratorResult<A>;
  let b: IteratorResult<B>;
  while (!(a = itA.next()).done && !(b = itB.next()).done) {
    yield [a.value, b.value];
  }
}

export async function* zipAsync<A, B>(
  as: AsyncIterable<A>,
  bs: AsyncIterable<B>,
): AsyncIterable<[A, B]> {
  const itA = as[Symbol.asyncIterator]();
  const itB = bs[Symbol.asyncIterator]();

  let a: IteratorResult<A>;
  let b: IteratorResult<B>;
  while (!(a = await itA.next()).done && !(b = await itB.next()).done) {
    yield [a.value, b.value];
  }
}

export function* inf<A>(a: A): Iterable<A> {
  while (true) {
    yield a;
  }
}

export function zipOne<A, B>(a: A, bs: Iterable<B>): Iterable<[A, B]> {
  return zip(inf(a), bs);
}

export function* filter<T>(
  iterable: Iterable<T>,
  ...filters: ((value: T) => boolean)[]
): Generator<T> {
  for (const value of iterable) {
    if (filters.every((f) => f(value))) {
      yield value;
    }
  }
}

export function not<A extends readonly unknown[]>(
  fn: (...args: A) => boolean,
): (...args: A) => boolean {
  return (...args) => !fn(...args);
}

export function* concat<T>(...iterables: Iterable<T>[]): Iterable<T> {
  for (const it of iterables) {
    yield* it;
  }
}

export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of iterable) {
    result.push(value);
  }
  return result;
}
