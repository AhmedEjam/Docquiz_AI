/**
 * Generic bounded-concurrency async task queue.
 * Used by both OCR and MCQ pipelines.
 */
export class AsyncQueue {
  constructor(concurrency = 2) {
    this._max = concurrency;
    this._active = 0;
    this._pending = [];
  }

  /**
   * Enqueue an async task function. Returns a promise that resolves
   * when the task completes (respecting concurrency limits).
   * @param {() => Promise<T>} taskFn - Zero-arg async function
   * @returns {Promise<T>}
   */
  enqueue(taskFn) {
    return new Promise((resolve, reject) => {
      this._pending.push({ taskFn, resolve, reject });
      this._drain();
    });
  }

  _drain() {
    while (this._active < this._max && this._pending.length > 0) {
      this._active++;
      const { taskFn, resolve, reject } = this._pending.shift();
      taskFn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this._active--;
          this._drain();
        });
    }
  }
}
