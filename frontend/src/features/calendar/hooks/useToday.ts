import { useEffect, useState } from 'react'

import { toDateKey } from '../model/calendar'

export function useToday() {
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function update() {
      clearTimeout(timer)
      const now = new Date()
      setToday((current) => (toDateKey(current) === toDateKey(now) ? current : now))
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = setTimeout(update, midnight.getTime() - now.getTime() + 50)
    }
    function onVisible() {
      if (!document.hidden) update()
    }
    update()
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return today
}
