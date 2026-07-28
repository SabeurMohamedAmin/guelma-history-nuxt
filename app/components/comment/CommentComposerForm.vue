<script setup lang="ts">
/**
 * Reusable comment composer, used for new top-level comments, replies, and
 * edits. The parent decides the context via props and handles the submit.
 *
 * Direction: the textarea and preview use dir="auto" so an Arabic comment
 * renders RTL and a French one LTR, based on the content itself (Option A).
 */
const props = withDefaults(defineProps<{
  /** Prefill (used when editing an existing comment). */
  modelValue?: string
  /** Submitting state from the parent (disables the form). */
  loading?: boolean
  /** Compact styling for inline reply/edit boxes. */
  dense?: boolean
  /** Show a cancel button (reply/edit) and emit `cancel`. */
  cancelable?: boolean
  /** Override the submit button label. */
  submitLabel?: string
}>(), {
  modelValue: '',
  loading: false,
  dense: false,
  cancelable: false,
  submitLabel: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'submit': [value: string]
  'cancel': []
}>()

const { t } = useI18n()

const MAX_LENGTH = 1200
const text = ref(props.modelValue)
watch(() => props.modelValue, v => (text.value = v))
watch(text, v => emit('update:modelValue', v))

const trimmedLength = computed(() => text.value.trim().length)
const remaining = computed(() => MAX_LENGTH - text.value.length)
const canSubmit = computed(() =>
  !props.loading && trimmedLength.value > 0 && text.value.length <= MAX_LENGTH,
)

const defaultSubmitLabel = computed(() =>
  props.submitLabel || t('comments.publish'),
)

function submit() {
  if (!canSubmit.value) return
  emit('submit', text.value.trim())
}
</script>

<template>
  <v-form
    class="comment-form"
    @submit.prevent="submit"
  >
    <v-textarea
      v-model="text"
      dir="auto"
      :placeholder="t('comments.placeholder')"
      variant="outlined"
      :rows="dense ? 2 : 3"
      auto-grow
      hide-details
      :counter="MAX_LENGTH"
      :maxlength="MAX_LENGTH"
      class="comment-form__input"
      @keydown.ctrl.enter.prevent="submit"
      @keydown.meta.enter.prevent="submit"
    />

    <div class="comment-form__footer">
      <span
        class="comment-form__counter"
        :class="{ 'comment-form__counter--warn': remaining < 80 }"
      >
        {{ remaining }}
      </span>

      <div class="comment-form__actions">
        <v-btn
          v-if="cancelable"
          variant="text"
          size="small"
          :disabled="loading"
          @click="emit('cancel')"
        >
          {{ t('comments.cancel') }}
        </v-btn>
        <v-tooltip
          :text="t('comments.publishShortcut')"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              type="submit"
              color="primary"
              size="small"
              class="rounded-lg font-weight-bold"
              :loading="loading"
              :disabled="!canSubmit"
            >
              {{ defaultSubmitLabel }}
            </v-btn>
          </template>
        </v-tooltip>
      </div>
    </div>
  </v-form>
</template>

<style scoped>
.comment-form { display: grid; gap: 0.5rem; }
.comment-form__input :deep(textarea) { text-align: start; }
.comment-form__footer { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.comment-form__counter { font-size: 0.78rem; color: rgba(var(--v-theme-on-surface), 0.55); font-variant-numeric: tabular-nums; }
.comment-form__counter--warn { color: rgb(var(--v-theme-warning)); font-weight: 700; }
.comment-form__actions { display: flex; align-items: center; gap: 0.35rem; }
</style>
