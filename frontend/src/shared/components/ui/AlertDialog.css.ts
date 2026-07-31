import { style } from '@vanilla-extract/css'

const uiAlertDialog = style({
  width: 'min(100%, 430px)',
})

export const styles = {
  'ui-alert-dialog': uiAlertDialog,
} as const
