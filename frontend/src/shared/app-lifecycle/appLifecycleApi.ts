import { GetLifecycleStatus } from '@wails/go/application/App'
import { EventsOn } from '@wails/runtime/runtime'

const SECOND_INSTANCE_EVENT = 'app:second-instance'

export interface LifecycleStatus {
  startedAt: string
  ready: boolean
  secondInstanceCount: number
}

export interface SecondInstanceLaunch {
  arguments: string[]
  workingDirectory: string
}

function isSecondInstanceLaunch(value: unknown): value is SecondInstanceLaunch {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const launch = value as Record<string, unknown>
  return (
    Array.isArray(launch.arguments) &&
    launch.arguments.every((argument) => typeof argument === 'string') &&
    typeof launch.workingDirectory === 'string'
  )
}

export async function getLifecycleStatus(): Promise<LifecycleStatus> {
  const status = await GetLifecycleStatus()
  return {
    startedAt: status.startedAt,
    ready: status.ready,
    secondInstanceCount: status.secondInstanceCount,
  }
}

export function onSecondInstanceLaunch(callback: (launch: SecondInstanceLaunch) => void): () => void {
  return EventsOn(SECOND_INSTANCE_EVENT, (payload: unknown) => {
    if (isSecondInstanceLaunch(payload)) {
      callback(payload)
    }
  })
}
