import { Greet } from '@wails/go/application/App'

export function requestGreeting(name: string): Promise<string> {
  return Greet(name)
}
