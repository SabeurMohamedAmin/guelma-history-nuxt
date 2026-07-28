import { useLocale } from 'vuetify'

export const useRtlIcons = () => {
  const { isRtl } = useLocale()

  const iconArrowRight = computed(() =>
    isRtl.value ? 'mdi-arrow-left' : 'mdi-arrow-right',
  )
  const iconArrowLeft = computed(() =>
    isRtl.value ? 'mdi-arrow-right' : 'mdi-arrow-left',
  )
  const iconChevronRight = computed(() =>
    isRtl.value ? 'mdi-chevron-left' : 'mdi-chevron-right',
  )
  const iconChevronLeft = computed(() =>
    isRtl.value ? 'mdi-chevron-right' : 'mdi-chevron-left',
  )

  return { iconArrowRight, iconArrowLeft, iconChevronRight, iconChevronLeft, isRtl }
}
