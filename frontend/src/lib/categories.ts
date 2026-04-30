export type PrayerCategory = 'HEALTH' | 'FAMILY' | 'WORK' | 'GRIEF' | 'THANKSGIVING' | 'OTHER'

export type PrayerCategoryOption = {
  value: PrayerCategory
  emoji: string
  label: string
  hint: string
}

export const prayerCategoryOptions: PrayerCategoryOption[] = [
  { value: 'HEALTH', emoji: '🩺', label: 'Saúde', hint: 'Doenças, tratamentos, recuperação' },
  { value: 'FAMILY', emoji: '👨‍👩‍👧', label: 'Família', hint: 'Casa, filhos, relacionamentos' },
  { value: 'WORK', emoji: '💼', label: 'Trabalho', hint: 'Emprego, projetos, finanças' },
  { value: 'GRIEF', emoji: '🕯️', label: 'Luto', hint: 'Perdas e despedidas' },
  { value: 'THANKSGIVING', emoji: '🙏', label: 'Ação de graças', hint: 'Gratidão por bênçãos recebidas' },
  { value: 'OTHER', emoji: '✨', label: 'Outro', hint: 'Qualquer outra intenção' }
]

const byValue = new Map(prayerCategoryOptions.map((o) => [o.value, o]))

export function categoryLabel(value: string): string {
  return byValue.get(value as PrayerCategory)?.label ?? value
}

export function categoryEmoji(value: string): string {
  return byValue.get(value as PrayerCategory)?.emoji ?? '✨'
}
