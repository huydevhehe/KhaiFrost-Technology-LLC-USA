// Return from a controller to get { data, meta } in the envelope
export class ResponseWithMeta<T, M extends object = Record<string, unknown>> {
  constructor(
    public readonly data: T,
    public readonly meta: M,
  ) {}
}
