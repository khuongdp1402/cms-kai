<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import consoleAPI from 'dashboard/api/kchat/console';
import ConsoleChip from './ConsoleChip.vue';
import ConsolePager from './ConsolePager.vue';
import { formatDate } from './formatMoney';

const { t } = useI18n();

const FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'trial', label: 'TRIAL' },
  { key: 'expiring', label: 'EXPIRING' },
  { key: 'locked', label: 'LOCKED' },
];
const MIN_DAYS = 1;
const MAX_DAYS = 365;

const shops = ref([]);
const meta = ref({ count: 0, current_page: 1, per_page: 25 });
const filter = ref('all');
const query = ref('');
const failed = ref(false);
const confirming = ref(null);
const busy = ref(null);
const days = reactive({});

const load = async (page = 1) => {
  failed.value = false;
  try {
    const { data } = await consoleAPI.accounts({
      query: query.value || undefined,
      filter: filter.value,
      page,
    });
    shops.value = data.payload;
    meta.value = data.meta;
    shops.value.forEach(shop => {
      days[shop.id] ??= 30;
    });
  } catch {
    failed.value = true;
  }
};

const setFilter = key => {
  filter.value = key;
  confirming.value = null;
  load(1);
};

const daysValid = shop => {
  const value = Number(days[shop.id]);
  return Number.isInteger(value) && value >= MIN_DAYS && value <= MAX_DAYS;
};

const planLabel = plan =>
  plan
    ? t(`KALO_CONSOLE.PLANS.${plan.toUpperCase()}`)
    : t('KALO_CONSOLE.PLANS.NONE');

const statusOf = shop => {
  if (shop.locked)
    return { tone: 'gray', text: t('KALO_CONSOLE.SHOPS.STATUS.LOCKED') };
  if (shop.status === 'expired')
    return { tone: 'warn', text: t('KALO_CONSOLE.SHOPS.STATUS.EXPIRED') };
  if (shop.status === 'trial')
    return { tone: 'new', text: t('KALO_CONSOLE.SHOPS.STATUS.TRIAL') };
  if (shop.days_left <= 7) {
    return {
      tone: 'warn',
      text: t('KALO_CONSOLE.SHOPS.STATUS.DAYS_LEFT', { days: shop.days_left }),
    };
  }
  return { tone: 'ok', text: t('KALO_CONSOLE.SHOPS.STATUS.ACTIVE') };
};

const patch = async (shop, payload, doneKey) => {
  busy.value = shop.id;
  try {
    const { data } = await consoleAPI.updateAccount(shop.id, payload);
    const index = shops.value.findIndex(s => s.id === shop.id);
    shops.value.splice(index, 1, data);
    useAlert(t(doneKey));
  } catch (error) {
    useAlert(t('KALO_CONSOLE.SHOPS.UPDATE_ERROR'));
    if ([404, 422].includes(error.response?.status))
      await load(meta.value.current_page);
  } finally {
    busy.value = null;
    confirming.value = null;
  }
};

const extend = shop =>
  patch(
    shop,
    { extend_days: Number(days[shop.id]) },
    'KALO_CONSOLE.SHOPS.EXTEND_DONE'
  );

const toggleLock = shop =>
  patch(
    shop,
    { locked: !shop.locked },
    shop.locked
      ? 'KALO_CONSOLE.SHOPS.UNLOCK_DONE'
      : 'KALO_CONSOLE.SHOPS.LOCK_DONE'
  );

const confirmText = shop =>
  t(
    shop.locked
      ? 'KALO_CONSOLE.SHOPS.CONFIRM_UNLOCK'
      : 'KALO_CONSOLE.SHOPS.CONFIRM_LOCK',
    {
      name: shop.name,
    }
  );

onMounted(() => load(1));
</script>

<template>
  <section class="flex flex-col w-full gap-4 p-6 mx-auto max-w-[1360px]">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-extrabold text-console-ink">
          {{ t('KALO_CONSOLE.SHOPS.TITLE') }}
        </h1>
        <p class="mt-0.5 text-sm text-console-muted">
          {{ t('KALO_CONSOLE.SHOPS.SUBTITLE') }}
        </p>
      </div>
      <form
        data-testid="search-form"
        class="flex gap-2"
        @submit.prevent="load(1)"
      >
        <input
          v-model="query"
          data-testid="search"
          type="search"
          class="w-64 px-3 py-2 text-sm border !bg-white !text-console-ink placeholder:!text-console-muted rounded-xl border-console-line focus:border-console-soft focus:outline-none"
          :placeholder="t('KALO_CONSOLE.SHOPS.SEARCH_PLACEHOLDER')"
        />
        <button
          type="submit"
          class="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-console-accent hover:bg-console-sidebar"
        >
          {{ t('KALO_CONSOLE.COMMON.SEARCH') }}
        </button>
      </form>
    </header>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in FILTERS"
        :key="tab.key"
        type="button"
        data-testid="filter-tab"
        class="px-3.5 py-1.5 text-sm font-semibold rounded-full transition-colors"
        :class="
          filter === tab.key
            ? 'bg-console-sidebar text-white'
            : 'bg-white text-console-muted border border-console-line hover:text-console-ink'
        "
        @click="setFilter(tab.key)"
      >
        {{ t(`KALO_CONSOLE.SHOPS.TABS.${tab.label}`) }}
      </button>
    </div>

    <div v-if="failed" class="flex items-center gap-3 text-sm">
      {{ t('KALO_CONSOLE.COMMON.ERROR') }}
      <button
        type="button"
        class="font-semibold text-console-accent"
        @click="load(meta.current_page)"
      >
        {{ t('KALO_CONSOLE.COMMON.RETRY') }}
      </button>
    </div>

    <div
      v-else
      class="overflow-x-auto bg-white border rounded-2xl border-console-line"
    >
      <p v-if="!shops.length" class="p-5 text-sm text-console-muted">
        {{ t('KALO_CONSOLE.SHOPS.EMPTY') }}
      </p>
      <table v-else class="w-full text-sm text-left">
        <thead
          class="text-xs font-semibold tracking-wider uppercase bg-console-bg/70 text-console-muted"
        >
          <tr>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.SHOPS.COLUMNS.SHOP') }}
            </th>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.SHOPS.COLUMNS.PLAN') }}
            </th>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.SHOPS.COLUMNS.VALID_UNTIL') }}
            </th>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.SHOPS.COLUMNS.STATUS') }}
            </th>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.SHOPS.COLUMNS.ACTIONS') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="shop in shops"
            :key="shop.id"
            class="transition-colors border-t border-console-line hover:bg-console-bg/50"
          >
            <td class="px-4 py-3">
              <b class="text-console-ink">{{ shop.name }}</b>
              <div class="text-xs text-console-muted tabular-nums">
                {{ t('KALO_CONSOLE.SHOPS.CODE', { id: shop.id }) }}
              </div>
            </td>
            <td class="px-4 py-3 text-console-ink">
              {{ planLabel(shop.plan) }}
            </td>
            <td class="px-4 py-3 text-console-ink tabular-nums">
              {{ formatDate(shop.valid_until) }}
            </td>
            <td class="px-4 py-3">
              <ConsoleChip :tone="statusOf(shop).tone">
                {{ statusOf(shop).text }}
              </ConsoleChip>
            </td>
            <td class="px-4 py-3">
              <div
                v-if="confirming === shop.id"
                class="flex flex-wrap items-center gap-2"
              >
                <span class="text-console-ink">{{ confirmText(shop) }}</span>
                <button
                  type="button"
                  data-testid="confirm-lock"
                  class="px-3 py-1 font-semibold text-white rounded-lg bg-console-accent disabled:opacity-40"
                  :disabled="busy === shop.id"
                  @click="toggleLock(shop)"
                >
                  {{ t('KALO_CONSOLE.SHOPS.CONFIRM') }}
                </button>
                <button
                  type="button"
                  class="px-3 py-1 font-semibold text-console-muted hover:text-console-ink"
                  @click="confirming = null"
                >
                  {{ t('KALO_CONSOLE.COMMON.CANCEL') }}
                </button>
              </div>
              <div v-else class="flex flex-wrap items-center gap-2">
                <input
                  v-model="days[shop.id]"
                  data-testid="extend-days"
                  type="number"
                  :min="MIN_DAYS"
                  :max="MAX_DAYS"
                  :aria-label="t('KALO_CONSOLE.SHOPS.EXTEND_DAYS')"
                  class="w-16 px-2 py-1 text-center border rounded-lg !bg-white !text-console-ink border-console-line focus:border-console-soft focus:outline-none tabular-nums"
                />
                <button
                  type="button"
                  class="px-3 py-1 font-semibold border rounded-lg border-console-line text-console-accent hover:bg-console-bg disabled:opacity-40"
                  :disabled="!daysValid(shop) || busy === shop.id"
                  @click="extend(shop)"
                >
                  {{ t('KALO_CONSOLE.SHOPS.EXTEND') }}
                </button>
                <button
                  type="button"
                  class="px-3 py-1 font-semibold text-console-muted hover:text-console-ink"
                  @click="confirming = shop.id"
                >
                  {{
                    shop.locked
                      ? t('KALO_CONSOLE.SHOPS.UNLOCK')
                      : t('KALO_CONSOLE.SHOPS.LOCK')
                  }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <ConsolePager :meta="meta" @change="load" />
    </div>
  </section>
</template>
