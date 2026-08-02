<script setup lang="ts">
import type { AdminSubscriber, SubscriberStatus } from '~/composables/useSubscribers'
import { formatDate } from '~/utils/date'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t, locale } = useI18n()
const { subscribers, pending, error, exportUrl, fetchAll, deleteSubscriber, updateSubscriberStatus } = useSubscribers()

// Local UI state
const search = ref('')
const statusFilter = ref<'all' | 'active' | 'pending' | 'unsubscribed'>('all')
const deleteDialog = ref(false)
const deleting = ref(false)
const updatingStatusId = ref<string | null>(null)
const toDelete = ref<AdminSubscriber | null>(null)
const snackbar = ref<{ show: boolean, text: string, color: string }>({ show: false, text: '', color: 'success' })

function notify(text: string, color: 'success' | 'error' = 'success') {
  snackbar.value = { show: true, text, color }
}

const dateLocale = computed(() => (locale.value === 'ar' ? 'ar' : 'fr'))

// Derived data
const stats = computed(() => {
  const total = subscribers.value.length
  const active = subscribers.value.filter(s => s.status === 'active').length
  const pending = subscribers.value.filter(s => s.status === 'pending').length
  const unsubscribed = subscribers.value.filter(s => s.status === 'unsubscribed').length
  return { total, active, pending, unsubscribed }
})

const statusOptions = computed(() => [
  { title: t('admin.subscribers.filterAll'), value: 'all' },
  { title: t('admin.subscribers.filterActive'), value: 'active' },
  { title: t('admin.subscribers.filterPending'), value: 'pending' },
  { title: t('admin.subscribers.filterUnsubscribed'), value: 'unsubscribed' },
])

// Status filter is applied client-side; v-data-table handles the text search.
const filteredItems = computed(() => {
  if (statusFilter.value === 'all') return subscribers.value
  return subscribers.value.filter(s => s.status === statusFilter.value)
})

const headers = computed(() => [
  { title: t('admin.subscribers.colEmail'), key: 'email' },
  { title: t('admin.subscribers.colStatus'), key: 'confirmed', align: 'center' as const, width: 140 },
  { title: t('admin.subscribers.colSubscribed'), key: 'createdAt', width: 200 },
  { title: t('admin.subscribers.colEmailDelivery'), key: 'delivery', align: 'center' as const, sortable: false, width: 180 },
  { title: '', key: 'actions', align: 'end' as const, sortable: false, width: 80 },
])

// Actions
function onExport() {
  // The endpoint sets Content-Disposition: attachment, so the browser downloads
  // rather than navigates. Opening in a new tab avoids losing the admin SPA.
  window.open(exportUrl, '_blank')
}

function askDelete(item: AdminSubscriber) {
  toDelete.value = item
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await deleteSubscriber(toDelete.value.id)
    notify(t('admin.subscribers.deleted'))
    await fetchAll()
    deleteDialog.value = false
    toDelete.value = null
  }
  catch {
    notify(error.value || t('admin.subscribers.deleteFailed'), 'error')
  }
  finally {
    deleting.value = false
  }
}

async function setEmailDelivery(item: AdminSubscriber, enabled: boolean) {
  const nextStatus: Extract<SubscriberStatus, 'active' | 'unsubscribed'> = enabled ? 'active' : 'unsubscribed'
  if (item.status === nextStatus || item.status === 'pending') return

  updatingStatusId.value = item.id
  try {
    await updateSubscriberStatus(item.id, nextStatus)
    notify(enabled ? t('admin.subscribers.deliveryEnabled') : t('admin.subscribers.deliveryDisabled'))
    await fetchAll()
  }
  catch {
    notify(error.value || t('admin.subscribers.deliveryUpdateFailed'), 'error')
  }
  finally {
    updatingStatusId.value = null
  }
}

onMounted(fetchAll)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div>
        <h1 class="text-headline-medium font-weight-bold">
          {{ t('admin.subscribers.title') }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
          {{ t('admin.subscribers.subtitle') }}
        </p>
      </div>
      <v-btn
        color="primary"
        rounded="lg"
        prepend-icon="mdi-download-outline"
        class="text-none"
        :disabled="!stats.active"
        @click="onExport"
      >
        {{ t('admin.subscribers.export') }}
      </v-btn>
    </div>

    <!-- Stats -->
    <v-row class="mb-2">
      <v-col
        cols="12"
        sm="6"
        md="3"
      >
        <v-card
          rounded="lg"
          variant="tonal"
          color="primary"
          class="pa-4 d-flex align-center ga-4"
        >
          <v-avatar
            color="primary"
            variant="flat"
            size="44"
          >
            <v-icon icon="mdi-email-multiple-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.total }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.subscribers.statTotal') }}
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        sm="6"
        md="3"
      >
        <v-card
          rounded="lg"
          variant="tonal"
          color="success"
          class="pa-4 d-flex align-center ga-4"
        >
          <v-avatar
            color="success"
            variant="flat"
            size="44"
          >
            <v-icon icon="mdi-email-check-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.active }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.subscribers.statActive') }}
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        sm="6"
        md="3"
      >
        <v-card
          rounded="lg"
          variant="tonal"
          color="warning"
          class="pa-4 d-flex align-center ga-4"
        >
          <v-avatar
            color="warning"
            variant="flat"
            size="44"
          >
            <v-icon icon="mdi-email-sync-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.pending }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.subscribers.statPending') }}
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        sm="6"
        md="3"
      >
        <v-card
          rounded="lg"
          variant="tonal"
          color="grey"
          class="pa-4 d-flex align-center ga-4"
        >
          <v-avatar
            color="grey"
            variant="flat"
            size="44"
          >
            <v-icon icon="mdi-email-remove-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.unsubscribed }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.subscribers.statUnsubscribed') }}
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
      rounded="lg"
    >
      {{ error }}
    </v-alert>

    <!-- Table -->
    <v-card rounded="lg">
      <div class="pa-4 d-flex flex-wrap ga-3">
        <v-text-field
          v-model="search"
          :placeholder="t('admin.subscribers.searchPlaceholder')"
          prepend-inner-icon="mdi-magnify"
          variant="solo-filled"
          flat
          density="comfortable"
          hide-details
          clearable
          rounded="lg"
          class="flex-grow-1"
          style="min-width: 220px;"
        />
        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          variant="solo-filled"
          flat
          density="comfortable"
          hide-details
          rounded="lg"
          prepend-inner-icon="mdi-filter-variant"
          style="max-width: 220px;"
        />
      </div>

      <v-divider />

      <v-data-table
        :headers="headers"
        :items="filteredItems"
        :search="search"
        :loading="pending"
        :no-data-text="t('admin.subscribers.empty')"
        :items-per-page="15"
      >
        <template #[`item.email`]="{ item }">
          <div class="d-flex align-center ga-3 py-1">
            <v-avatar
              size="36"
              :color="item.status === 'active' ? 'success' : item.status === 'pending' ? 'warning' : 'grey'"
              variant="tonal"
            >
              <v-icon
                :icon="item.status === 'active' ? 'mdi-email-check-outline' : item.status === 'pending' ? 'mdi-email-sync-outline' : 'mdi-email-remove-outline'"
                size="18"
              />
            </v-avatar>
            <span class="font-weight-medium">{{ item.email }}</span>
          </div>
        </template>

        <template #[`item.confirmed`]="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            :color="item.status === 'active' ? 'success' : item.status === 'pending' ? 'warning' : 'grey'"
          >
            {{ t(`admin.subscribers.status.${item.status}`) }}
          </v-chip>
        </template>

        <template #[`item.createdAt`]="{ item }">
          <span class="text-body-2 text-medium-emphasis">{{ formatDate(item.createdAt, dateLocale) }}</span>
        </template>

        <template #[`item.delivery`]="{ item }">
          <v-switch
            :model-value="item.status === 'active'"
            color="success"
            density="compact"
            hide-details
            inset
            :disabled="item.status === 'pending' || updatingStatusId === item.id"
            :loading="updatingStatusId === item.id"
            :aria-label="t('admin.subscribers.toggleDelivery')"
            @update:model-value="setEmailDelivery(item, Boolean($event))"
          />
        </template>

        <template #[`item.actions`]="{ item }">
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            :aria-label="t('common.delete')"
            @click="askDelete(item)"
          />
        </template>

        <template #no-data>
          <div class="py-12 text-center">
            <v-icon
              icon="mdi-email-off-outline"
              size="48"
              class="text-medium-emphasis mb-3"
            />
            <div class="text-subtitle-1 font-weight-medium">
              {{ t('admin.subscribers.empty') }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{ t('admin.subscribers.emptySubtitle') }}
            </div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Delete confirmation -->
    <v-dialog
      v-model="deleteDialog"
      max-width="440"
    >
      <v-card rounded="lg">
        <v-card-title class="text-headline-small pt-5 px-5">
          {{ t('admin.confirmDelete') }}
        </v-card-title>
        <v-card-text class="px-5">
          <i18n-t
            keypath="admin.subscribers.confirmDeleteText"
            tag="span"
          >
            <template #email>
              <strong>{{ toDelete ? toDelete.email : '' }}</strong>
            </template>
          </i18n-t>
        </v-card-text>
        <v-card-actions class="pb-4 px-4">
          <v-spacer />
          <v-btn
            variant="text"
            class="text-none"
            @click="deleteDialog = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            class="text-none"
            :loading="deleting"
            @click="confirmDelete"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="bottom"
      timeout="3000"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>
