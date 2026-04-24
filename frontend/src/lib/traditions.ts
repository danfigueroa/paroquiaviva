export type Tradition = 'CATHOLIC' | 'EVANGELICAL'

export type PrayerAction = {
  type: string
  emoji: string
  label: string
}

const catholicActions: PrayerAction[] = [
  { type: 'HAIL_MARY', emoji: '🙏', label: 'Ave Maria' },
  { type: 'OUR_FATHER', emoji: '✝️', label: 'Pai Nosso' },
  { type: 'GLORY_BE', emoji: '✨', label: 'Glória' },
  { type: 'ROSARY_DECADE', emoji: '📿', label: 'Terço' },
  { type: 'ROSARY_FULL', emoji: '🕊️', label: 'Rosário' }
]

const evangelicalActions: PrayerAction[] = [
  { type: 'I_PRAYED', emoji: '🙏', label: 'Orei' },
  { type: 'INTERCESSION', emoji: '✝️', label: 'Intercedi' },
  { type: 'FASTING', emoji: '🕊️', label: 'Jejum' },
  { type: 'GRATITUDE', emoji: '✨', label: 'Gratidão' },
  { type: 'CRYING_OUT', emoji: '🔥', label: 'Clamor' }
]

export function prayerActionsFor(tradition: Tradition | undefined | null): PrayerAction[] {
  return tradition === 'EVANGELICAL' ? evangelicalActions : catholicActions
}

export const traditionLabel: Record<Tradition, string> = {
  CATHOLIC: 'Católico(a)',
  EVANGELICAL: 'Evangélico(a)'
}

export type TraditionOption = {
  value: Tradition
  label: string
  description: string
  emoji: string
}

export const traditionOptions: TraditionOption[] = [
  {
    value: 'CATHOLIC',
    label: 'Católico(a)',
    description: 'Ave Maria, Pai Nosso, Terço e Rosário no feed',
    emoji: '📿'
  },
  {
    value: 'EVANGELICAL',
    label: 'Evangélico(a)',
    description: 'Orei, Intercessão, Jejum, Gratidão e Clamor no feed',
    emoji: '🕊️'
  }
]
