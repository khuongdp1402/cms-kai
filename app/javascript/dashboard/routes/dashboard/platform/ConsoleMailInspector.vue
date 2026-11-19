<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import consoleAPI from 'dashboard/api/kchat/console';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import ConsoleChip from './ConsoleChip.vue';
import { formatTime } from './formatMoney';

const { t } = useI18n();

const CATEGORIES = {
  auth: { tone: 'new', label: 'AUTH' },
  billing: { tone: 'ok', label: 'BILLING' },
  system: { tone: 'gray', label: 'SYSTEM' },
};

const TABS = [
  { id: 'html', testId: 'mail-tab-html', label: 'HTML' },
  { id: 'text', testId: 'mail-tab-text', label: 'TEXT' },
  { id: 'headers', testId: 'mail-tab-headers', label: 'HEADERS' },
];

const query = ref('');
const state = ref(null);
const loading = ref(false);
const failed = ref(false);
const busy = ref(false);
const confirmingClear = ref(false);
const selectedId = ref(null);
const activeTab = ref('html');

const items = computed(() => state.value?.items || []);
const selected = computed(
  () => items.value.find(item => item.id === selectedId.value) || null
);
const safeActionLinks = computed(() =>
  (selected.value?.action_links || []).filter(url => /^https?:\/\//i.test(url))
);
const headerEntries = computed(() =>
  Object.entries(selected.value?.headers || {})
);

const categoryOf = category => {
  const entry = CATEGORIES[category] || CATEGORIES.system;
  return {
    tone: entry.tone,
    text: t(`KALO_CONSOLE.MAIL.CATEGORIES.${entry.label}`),
  };
};

const syncSelection = () => {
  if (!items.value.length) {
    selectedId.value = null;
    return;
  }
  const stillExists = items.value.some(item => item.id === selectedId.value);
  if (!stillExists) {
    selectedId.value = items.value[0].id;
  }
};

const load = async () => {
  loading.value = true;
  failed.value = false;
  try {
    const { data } = await consoleAPI.emails({
      query: query.value.trim() || undefined,
    });
    state.value = data;
    syncSelection();
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};

const selectEmail = item => {
  selectedId.value = item.id;
  activeTab.value = 'html';
};

const deleteSelected = async () => {
  if (!selected.value || busy.value) return;
  busy.value = true;
  try {
    await consoleAPI.deleteEmail(selected.value.id);
    useAlert(t('KALO_CONSOLE.MAIL.DELETED'));
    await load();
  } catch {
    useAlert(t('KALO_CONSOLE.MAIL.ACTION_ERROR'));
  } finally {
    busy.value = false;
  }
};

const clearAll = async () => {
  if (busy.value) return;
  busy.value = true;
  try {
    await consoleAPI.clearEmails();
    confirmingClear.value = false;
    useAlert(t('KALO_CONSOLE.MAIL.CLEARED'));
    await load();
  } catch {
    useAlert(t('KALO_CONSOLE.MAIL.ACTION_ERROR'));
  } finally {
    busy.value = false;
  }
};

const copyLink = async url => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      useAlert(t('KALO_CONSOLE.MAIL.COPIED'));
    }
  } catch {
    useAlert(t('KALO_CONSOLE.MAIL.ACTION_ERROR'));
  }
};

onMounted(load);
</script>

<template>
  <section
    class="flex flex-col w-full gap-4 p-6 mx-auto max-w-[1360px] lg:h-full lg:overflow-hidden"
  >
    <header class="flex flex-wrap items-start justify-between gap-3 shrink-0">
      <div class="min-w-0">
        <h1 class="text-xl font-extrabold text-console-ink">
          {{ t('KALO_CONSOLE.MAIL.TITLE') }}
        </h1>
        <p class="mt-0.5 text-sm text-console-muted">
          {{ t('KALO_CONSOLE.MAIL.SUBTITLE') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <form class="flex items-center gap-2" @submit.prevent="load">
          <div class="relative">
            <KaloIcon
              name="search"
              class="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2 size-4 text-console-muted"
            />
            <input
              v-model="query"
              data-testid="mail-search"
              type="search"
              class="mb-0 outline-none w-64 py-2 pr-3 text-sm border pl-9 !bg-white !text-console-ink placeholder:!text-console-muted rounded-xl border-console-line focus:border-console-soft focus:outline-none"
              :placeholder="t('KALO_CONSOLE.MAIL.SEARCH_PLACEHOLDER')"
            />
          </div>
          <button
            type="submit"
            class="px-3.5 py-2 text-sm font-semibold text-white rounded-xl bg-console-accent hover:bg-console-sidebar"
          >
            {{ t('KALO_CONSOLE.COMMON.SEARCH') }}
          </button>
        </form>

        <button
          type="button"
          data-testid="mail-refresh"
          class="px-3.5 py-2 text-sm font-semibold bg-white border rounded-xl border-console-line text-console-ink hover:bg-console-bg disabled:opacity-40"
          :disabled="loading"
          @click="load"
        >
          {{ t('KALO_CONSOLE.MAIL.REFRESH') }}
        </button>

        <div
          v-if="confirmingClear"
          class="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-xl border-console-line"
        >
          <span class="text-xs font-medium text-console-ink">
            {{ t('KALO_CONSOLE.MAIL.CONFIRM_CLEAR') }}
          </span>
          <button
            type="button"
            data-testid="mail-confirm-clear"
            class="px-2.5 py-1 text-xs font-semibold text-white rounded-lg bg-n-ruby-9 hover:bg-n-ruby-10 disabled:opacity-40"
            :disabled="busy"
            @click="clearAll"
          >
            {{ t('KALO_CONSOLE.MAIL.CONFIRM_YES') }}
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs font-semibold text-console-muted hover:text-console-ink"
            @click="confirmingClear = false"
          >
            {{ t('KALO_CONSOLE.COMMON.CANCEL') }}
          </button>
        </div>

        <button
          v-else
          type="button"
          data-testid="mail-clear"
          class="px-3.5 py-2 text-sm font-semibold bg-white border rounded-xl border-n-ruby-5 text-n-ruby-11 hover:bg-n-ruby-2 disabled:opacity-40"
          :disabled="busy || !items.length"
          @click="confirmingClear = true"
        >
          {{ t('KALO_CONSOLE.MAIL.CLEAR_ALL') }}
        </button>
      </div>
    </header>

    <p v-if="loading && !state" class="text-sm text-console-muted">
      {{ t('KALO_CONSOLE.COMMON.LOADING') }}
    </p>

    <div
      v-else-if="failed"
      class="flex items-center gap-3 p-4 text-sm bg-white border rounded-2xl border-console-line"
    >
      <span>{{ t('KALO_CONSOLE.COMMON.ERROR') }}</span>
      <button
        type="button"
        class="font-semibold text-console-accent"
        @click="load"
      >
        {{ t('KALO_CONSOLE.COMMON.RETRY') }}
      </button>
    </div>

    <div
      v-else-if="state && !state.enabled"
      data-testid="mail-disabled"
      class="p-6 text-sm bg-white border rounded-2xl border-console-line text-console-muted"
    >
      {{ t('KALO_CONSOLE.MAIL.DISABLED') }}
    </div>

    <div
      v-else-if="state && !state.reachable"
      data-testid="mail-unreachable"
      class="flex flex-wrap items-center gap-3 p-5 text-sm bg-white border rounded-2xl border-n-amber-6 text-console-ink"
    >
      <span>{{ t('KALO_CONSOLE.MAIL.UNREACHABLE') }}</span>
      <button
        type="button"
        class="px-3 py-1.5 text-xs font-semibold border rounded-lg border-console-line text-console-accent hover:bg-console-bg"
        @click="load"
      >
        {{ t('KALO_CONSOLE.COMMON.RETRY') }}
      </button>
    </div>

    <div
      v-else-if="state"
      class="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]"
    >
      <div
        class="flex flex-col min-h-[280px] overflow-hidden bg-white border lg:min-h-0 rounded-2xl border-console-line"
      >
        <div
          class="flex items-center justify-between px-4 py-3 text-xs font-semibold tracking-wider uppercase border-b shrink-0 bg-console-bg/60 border-console-line text-console-muted tabular-nums"
        >
          <span>{{
            t('KALO_CONSOLE.MAIL.COUNT', { count: items.length })
          }}</span>
        </div>

        <p v-if="!items.length" class="p-5 text-sm text-console-muted">
          {{ t('KALO_CONSOLE.MAIL.EMPTY') }}
        </p>

        <ul
          v-else
          class="flex-1 min-h-0 overflow-y-auto list-none divide-y divide-console-line"
        >
          <li v-for="item in items" :key="item.id">
            <button
              type="button"
              data-testid="mail-item"
              class="flex flex-col w-full gap-1.5 px-4 py-3.5 text-left transition-colors hover:bg-console-bg/60"
              :class="
                selectedId === item.id
                  ? 'bg-console-bg border-l-4 border-l-console-accent'
                  : ''
              "
              @click="selectEmail(item)"
            >
              <div class="flex items-center justify-between gap-2">
                <ConsoleChip :tone="categoryOf(item.category).tone">
                  {{ categoryOf(item.category).text }}
                </ConsoleChip>
                <span class="text-xs text-console-muted tabular-nums">
                  {{ formatTime(item.created_at) }}
                </span>
              </div>
              <b class="text-sm leading-snug truncate text-console-ink">
                {{ item.subject }}
              </b>
              <span class="text-xs truncate text-console-muted">
                {{ (item.to || []).join(', ') }}
              </span>
            </button>
          </li>
        </ul>
      </div>

      <div
        class="flex flex-col min-h-[420px] overflow-hidden bg-white border lg:min-h-0 rounded-2xl border-console-line"
      >
        <div
          v-if="!selected"
          class="flex items-center justify-center flex-1 p-8 text-sm text-center text-console-muted"
        >
          {{ t('KALO_CONSOLE.MAIL.EMPTY_SELECT') }}
        </div>

        <template v-else>
          <div class="p-5 border-b shrink-0 border-console-line">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <ConsoleChip :tone="categoryOf(selected.category).tone">
                  {{ categoryOf(selected.category).text }}
                </ConsoleChip>
                <h2 class="mt-2 text-lg font-bold break-words text-console-ink">
                  {{ selected.subject }}
                </h2>
              </div>
              <button
                type="button"
                data-testid="mail-delete"
                class="px-3 py-1.5 text-xs font-semibold border rounded-lg shrink-0 border-n-ruby-5 text-n-ruby-11 hover:bg-n-ruby-2 disabled:opacity-40"
                :disabled="busy"
                @click="deleteSelected"
              >
                {{ t('KALO_CONSOLE.MAIL.DELETE') }}
              </button>
            </div>

            <dl
              class="grid grid-cols-1 gap-1.5 mt-3 text-xs sm:grid-cols-[auto_1fr] sm:gap-x-3 text-console-muted"
            >
              <dt class="font-semibold text-console-ink">
                {{ t('KALO_CONSOLE.MAIL.FROM') }}
              </dt>
              <dd class="truncate">{{ selected.from }}</dd>
              <dt class="font-semibold text-console-ink">
                {{ t('KALO_CONSOLE.MAIL.TO') }}
              </dt>
              <dd class="truncate">{{ (selected.to || []).join(', ') }}</dd>
              <dt class="font-semibold text-console-ink">
                {{ t('KALO_CONSOLE.MAIL.TIME') }}
              </dt>
              <dd class="tabular-nums">
                {{ formatTime(selected.created_at) }}
              </dd>
            </dl>
          </div>

          <div
            v-if="safeActionLinks.length"
            data-testid="mail-action-links"
            class="flex flex-col gap-2 px-5 py-3 border-b shrink-0 bg-console-bg border-console-line"
          >
            <span
              class="text-xs font-semibold uppercase tracking-wide text-console-soft"
            >
              {{ t('KALO_CONSOLE.MAIL.ACTION_LINKS') }}
            </span>
            <ul class="flex flex-col gap-1.5 list-none">
              <li
                v-for="url in safeActionLinks"
                :key="url"
                class="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-white border rounded-lg border-console-line"
              >
                <code
                  class="flex-1 min-w-0 font-mono text-xs truncate text-console-ink"
                >
                  {{ url }}
                </code>
                <button
                  type="button"
                  data-testid="mail-copy-link"
                  class="px-2.5 py-1 text-xs font-semibold border rounded-md shrink-0 border-console-line text-console-accent hover:bg-console-bg"
                  @click="copyLink(url)"
                >
                  {{ t('KALO_CONSOLE.MAIL.COPY_LINK') }}
                </button>
                <a
                  :href="url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-2.5 py-1 text-xs font-semibold text-white rounded-md shrink-0 bg-console-accent hover:bg-console-sidebar"
                >
                  {{ t('KALO_CONSOLE.MAIL.OPEN_LINK') }}
                </a>
              </li>
            </ul>
          </div>

          <div
            class="flex items-center gap-1 px-5 pt-2.5 border-b shrink-0 border-console-line bg-white"
          >
            <button
              v-for="tab in TABS"
              :key="tab.id"
              type="button"
              :data-testid="tab.testId"
              class="px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors"
              :class="
                activeTab === tab.id
                  ? 'border-console-accent text-console-accent'
                  : 'border-transparent text-console-muted hover:text-console-ink'
              "
              @click="activeTab = tab.id"
            >
              {{ t(`KALO_CONSOLE.MAIL.TABS.${tab.label}`) }}
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-auto">
            <template v-if="activeTab === 'html'">
              <iframe
                v-if="selected.html_body"
                data-testid="mail-html-frame"
                sandbox=""
                :srcdoc="selected.html_body"
                :title="selected.subject"
                class="w-full h-full min-h-[380px] bg-white border-0"
              />
              <div v-else class="p-5">
                <p class="mb-3 text-xs font-medium text-console-muted">
                  {{ t('KALO_CONSOLE.MAIL.NO_HTML') }}
                </p>
                <pre
                  class="font-mono text-sm whitespace-pre-wrap text-console-ink"
                  >{{ selected.text_body }}</pre
                >
              </div>
            </template>

            <pre
              v-else-if="activeTab === 'text'"
              data-testid="mail-text-body"
              class="p-5 font-mono text-sm whitespace-pre-wrap text-console-ink"
              >{{ selected.text_body }}</pre
            >

            <table
              v-else
              data-testid="mail-headers-table"
              class="w-full text-xs text-left"
            >
              <tbody>
                <tr
                  v-for="[name, value] in headerEntries"
                  :key="name"
                  class="border-b border-console-line"
                >
                  <th
                    class="w-48 px-5 py-2.5 font-mono font-semibold align-top text-console-ink bg-console-bg/40"
                  >
                    {{ name }}
                  </th>
                  <td
                    class="px-5 py-2.5 font-mono break-all text-console-muted"
                  >
                    {{ value }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
