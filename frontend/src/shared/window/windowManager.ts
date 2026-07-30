import { RequestWindowClose } from '@wails/go/application/App'
import {
  WindowCenter,
  WindowFullscreen,
  WindowGetPosition,
  WindowGetSize,
  WindowIsFullscreen,
  WindowIsMaximised,
  WindowMaximise,
  WindowMinimise,
  WindowSetAlwaysOnTop,
  WindowSetPosition,
  WindowSetSize,
  WindowSetTitle,
  WindowShow,
  WindowToggleMaximise,
  WindowUnfullscreen,
  WindowUnmaximise,
  WindowUnminimise,
} from '@wails/runtime/runtime'

export interface WindowSnapshot {
  x: number
  y: number
  width: number
  height: number
  maximised: boolean
  fullscreen: boolean
}

export const windowManager = {
  show: WindowShow,
  close: RequestWindowClose,
  minimise: WindowMinimise,
  unminimise: WindowUnminimise,
  maximise: WindowMaximise,
  unmaximise: WindowUnmaximise,
  toggleMaximise: WindowToggleMaximise,
  fullscreen: WindowFullscreen,
  unfullscreen: WindowUnfullscreen,
  center: WindowCenter,
  setAlwaysOnTop: WindowSetAlwaysOnTop,
  setTitle: WindowSetTitle,
  setPosition: WindowSetPosition,
  setSize: WindowSetSize,
  async snapshot(): Promise<WindowSnapshot> {
    const [position, size, maximised, fullscreen] = await Promise.all([
      WindowGetPosition(),
      WindowGetSize(),
      WindowIsMaximised(),
      WindowIsFullscreen(),
    ])
    return {
      x: position.x,
      y: position.y,
      width: size.w,
      height: size.h,
      maximised,
      fullscreen,
    }
  },
}
