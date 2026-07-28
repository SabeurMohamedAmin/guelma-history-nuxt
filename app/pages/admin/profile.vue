<script setup lang="ts">
const { t, locale } = useI18n()
const {
  profile,
  pending,
  updateDisplayName,
  changeEmail,
  changePassword,
  uploadAvatar,
} = useAdminProfile()

const editingName = ref(false)
const nameDraft = ref('')
const savingName = ref(false)
const uploadingAvatar = ref(false)
const passwordDialog = ref(false)
const emailDialog = ref(false)
const snackbar = ref<{ show: boolean, text: string, color: 'success' | 'error' }>({
  show: false,
  text: '',
  color: 'success',
})

const localeCode = computed(() => (locale.value === 'ar' ? 'ar' : 'fr'))
const displayName = computed(() => profile.value?.displayName || profile.value?.username || '')
const passwordStatus = computed(() => {
  if (!profile.value?.passwordChangedAt) return t('profile.neverChanged')
  return t('profile.lastChanged', { date: formatDateTime(profile.value.passwordChangedAt, localeCode.value) })
})

function notify(text: string, color: 'success' | 'error' = 'success') {
  snackbar.value = { show: true, text, color }
}

function startEditName() {
  nameDraft.value = profile.value?.displayName ?? ''
  editingName.value = true
}

function cancelEditName() {
  editingName.value = false
  nameDraft.value = ''
}

async function saveName() {
  if (!nameDraft.value.trim()) {
    notify(t('profile.saveError'), 'error')
    return
  }

  savingName.value = true
  try {
    await updateDisplayName(nameDraft.value)
    editingName.value = false
    notify(t('profile.saved'))
  }
  catch (error) {
    notify(extractErrorMessage(error, t('profile.saveError')), 'error')
  }
  finally {
    savingName.value = false
  }
}

async function onAvatarChange(file: File) {
  uploadingAvatar.value = true
  try {
    await uploadAvatar(file)
    notify(t('profile.avatarUpdated'))
  }
  catch (error) {
    notify(extractErrorMessage(error, t('profile.avatarError')), 'error')
  }
  finally {
    uploadingAvatar.value = false
  }
}

async function onPasswordSubmit(current: string, next: string) {
  await changePassword(current, next)
  notify(t('profile.passwordUpdated'))
}

async function onEmailSubmit(email: string, current: string) {
  await changeEmail(email, current)
  notify(t('profile.emailUpdated'))
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})
</script>

<template>
  <section>
    <div class="mb-6">
      <p class="text-overline text-primary mb-1">
        {{ t('nav.admin') }}
      </p>
      <h1 class="text-headline-medium font-weight-bold">
        {{ t('profile.title') }}
      </h1>
    </div>

    <v-row
      v-if="profile"
      align="start"
    >
      <v-col
        cols="12"
        md="4"
      >
        <v-card
          rounded="xl"
          class="pa-4 text-center profile-card"
        >
          <admin-profile-avatar
            :display-name="profile.displayName"
            :username="profile.username"
            :has-avatar="profile.hasAvatar"
            :avatar-updated-at="profile.avatarUpdatedAt"
            :uploading="uploadingAvatar"
            @change="onAvatarChange"
          />

          <h2 class="text-headline-small font-weight-bold mt-4 mb-1">
            {{ displayName }}
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-3">
            {{ profile.email }}
          </p>
          <v-chip
            color="primary"
            size="small"
            variant="tonal"
            prepend-icon="mdi-shield-account"
          >
            {{ t('nav.admin') }}
          </v-chip>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="8"
      >
        <v-card
          rounded="xl"
          class="profile-card"
        >
          <v-list
            lines="two"
            class="py-0"
          >
            <v-list-item class="py-4">
              <template #prepend>
                <v-icon icon="mdi-account-outline" />
              </template>

              <v-list-item-subtitle>{{ t('profile.displayName') }}</v-list-item-subtitle>

              <div
                v-if="editingName"
                class="d-flex align-center ga-2 mt-2"
              >
                <v-text-field
                  v-model="nameDraft"
                  density="compact"
                  variant="outlined"
                  hide-details
                  autofocus
                  @keyup.enter="saveName"
                  @keyup.esc="cancelEditName"
                />
                <v-btn
                  icon="mdi-check"
                  color="primary"
                  size="small"
                  :loading="savingName"
                  @click="saveName"
                />
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  size="small"
                  @click="cancelEditName"
                />
              </div>

              <v-list-item-title
                v-else
                class="d-flex align-center ga-2 mt-1"
              >
                {{ profile.displayName || t('profile.noName') }}
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="x-small"
                  @click="startEditName"
                />
              </v-list-item-title>
            </v-list-item>

            <v-divider />

            <v-list-item class="py-4">
              <template #prepend>
                <v-icon icon="mdi-email-outline" />
              </template>
              <v-list-item-subtitle>{{ t('auth.email') }}</v-list-item-subtitle>
              <v-list-item-title>{{ profile.email }}</v-list-item-title>
              <template #append>
                <v-btn
                  variant="tonal"
                  size="small"
                  @click="emailDialog = true"
                >
                  {{ t('profile.changeEmail') }}
                </v-btn>
              </template>
            </v-list-item>

            <v-divider />

            <v-list-item class="py-4">
              <template #prepend>
                <v-icon icon="mdi-lock-outline" />
              </template>
              <v-list-item-subtitle>{{ t('auth.password') }}</v-list-item-subtitle>
              <v-list-item-title>{{ passwordStatus }}</v-list-item-title>
              <template #append>
                <v-btn
                  variant="tonal"
                  size="small"
                  @click="passwordDialog = true"
                >
                  {{ t('profile.changePassword') }}
                </v-btn>
              </template>
            </v-list-item>

            <v-divider />

            <v-list-item class="py-4">
              <template #prepend>
                <v-icon icon="mdi-clock-outline" />
              </template>
              <v-list-item-subtitle>{{ t('profile.loggedInAt') }}</v-list-item-subtitle>
              <v-list-item-title>
                {{ profile.loggedInAt ? formatDateTime(profile.loggedInAt, localeCode) : '—' }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-skeleton-loader
      v-else-if="pending"
      type="card, list-item-two-line, list-item-two-line"
    />

    <admin-change-password-dialog
      v-model:open="passwordDialog"
      :submit="onPasswordSubmit"
    />
    <admin-change-email-dialog
      v-if="profile"
      v-model:open="emailDialog"
      :current-email="profile.email"
      :submit="onEmailSubmit"
    />

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>

<style scoped>
.profile-card {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
}
</style>
