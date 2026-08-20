export type CallSignal<P, R> = {
  __type: 'call'
  func: (p: P) => Promise<R>
  args: [P]
}

export const call = <P, R>(
  func: (p: P) => Promise<R>,
  payload: P
): CallSignal<P, R> => {
  return { __type: 'call', func, args: [payload] }
}
