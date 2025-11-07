export function promiseAndResolver<T = void>() {
  let resolve: (value: T | Promise<T>) => void, reject: (reason?: any) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve: resolve!, reject: reject! };
}
