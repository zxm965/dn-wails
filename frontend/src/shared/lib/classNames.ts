export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function createScopedClassNames(styles: Readonly<Record<string, string>>) {
  return (...values: Array<string | false | null | undefined>): string =>
    values
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => value.split(/\s+/))
      .filter(Boolean)
      .map((value) => styles[value] ?? value)
      .join(' ')
}
