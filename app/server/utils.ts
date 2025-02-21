export function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Timeout"));
    }, timeout);

    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}
