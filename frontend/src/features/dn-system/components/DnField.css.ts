import { style } from '@vanilla-extract/css'

import { styles as formStyles } from '@/shared/components/ui/FormControls.css'

export const styles = {
  root: style({ minWidth: '0', display: 'grid', gap: '7px' }),
  label: style([formStyles['ui-label']]),
}
