import type { FetchParams, FetchResult, CountParams } from '../types';

export interface DataAdapter<T> {
  fetch(params: FetchParams): Promise<FetchResult<T>>;
  count?(params: CountParams): Promise<number>;
}
