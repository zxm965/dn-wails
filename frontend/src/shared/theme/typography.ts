export const FONT_SIZE_PRESETS = {
  sm: {
    label: '小号',
    sizes: { micro: 8, caption: 9, secondary: 11, body: 12, subtitle: 14, title: 16, 'heading-offset': -2 },
  },
  md: {
    label: '标准',
    sizes: { micro: 9, caption: 10, secondary: 12, body: 14, subtitle: 16, title: 18, 'heading-offset': 0 },
  },
  lg: {
    label: '大号',
    sizes: { micro: 10, caption: 12, secondary: 14, body: 16, subtitle: 18, title: 20, 'heading-offset': 2 },
  },
} as const

export type FontSizePreset = keyof typeof FONT_SIZE_PRESETS
