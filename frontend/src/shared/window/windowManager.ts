import { RequestWindowClose } from '@bindings/dn-wails/internal/application/app'
import { Window } from '@wailsio/runtime'

export interface WindowSnapshot {
  x: number
  y: number
  width: number
  height: number
  maximised: boolean
  fullscreen: boolean
}

export const windowManager = {
  show: Window.Show,
  close: RequestWindowClose,
  minimise: Window.Minimise,
  unminimise: Window.UnMinimise,
  maximise: Window.Maximise,
  unmaximise: Window.UnMaximise,
  toggleMaximise: Window.ToggleMaximise,
  fullscreen: Window.Fullscreen,
  unfullscreen: Window.UnFullscreen,
  center: Window.Center,
  setAlwaysOnTop: Window.SetAlwaysOnTop,
  setTitle: Window.SetTitle,
  setPosition: Window.SetPosition,
  setSize: Window.SetSize,
  async snapshot(): Promise<WindowSnapshot> {
    const [position, size, maximised, fullscreen] = await Promise.all([
      Window.Position(),
      Window.Size(),
      Window.IsMaximised(),
      Window.IsFullscreen(),
    ])
    return {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      maximised,
      fullscreen,
    }
  },
}
