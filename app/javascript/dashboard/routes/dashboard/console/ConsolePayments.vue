<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import consoleAPI from 'dashboard/api/kchat/console';
import ConsoleChip from './ConsoleChip.vue';
import ConsolePager from './ConsolePager.vue';
import { formatMoney, formatTime } from './formatMoney';

const { t } = useI18n();

const STATUS = {
  matched: { tone: 'ok', label: 'MATCHED' },
  applied: { tone: 'ok', label: 'APPLIED' },
  underpaid: { tone: 'warn', label: 'UNDERPAID' },
  unmatched: { tone: 'warn', label: 'UNMATCHED' },
};

const statusOf = status => ({
  tone: STATUS[status]?.tone ?? 'gray',
  text: STATUS[status]
    ? t(`KALO_CONSOLE.PAYMENTS.STATUS.${STATUS[status].label}`)
    : status,
});

const events = ref([]);
const meta = ref({ count: 0, current_page: 1, per_page: 25 });
const failed = ref(false);

const assigning = ref(null);
const search = ref('');
const options = ref([]);
const selected = ref(null);
const searched = ref(false);
const busy = ref(false);

const load = async (page = 1) => {
  failed.value = false;
  try {
    const { data } = await consoleAPI.paymentEvents({ page });
    events.value = data.payload;
    meta.value = data.meta;
  } catch {
    failed.value = true;
  }
};

const openAssign = event => {
  assigning.value = event.id;
  search.value = '';
  options.value = [];
  selected.value = null;
  searched.value = false;
};

const searchAccounts = async () => {
  try {
    const { data } = await consoleAPI.accounts({
      query: search.value,
      page: 1,
    });
    options.value = data.payload;
    searched.value = true;
  } catch {
    useAlert(t('KALO_CONSOLE.PAYMENTS.SEARCH_ERROR'));
  }
};

const assign = async event => {
  if (busy.value || !selected.value) return;
  busy.value = true;
  try {
    const { data } = await consoleAPI.assignPaymentEvent(
      event.id,
      selected.value
    );
    const index = events.value.findIndex(e => e.id === event.id);
    events.value.splice(index, 1, data);
    assigning.value = null;
    useAlert(t('KALO_CONSOLE.PAYMENTS.ASSIGN_DONE'));
  } catch (error) {
    if ([404, 422].includes(error.response?.status)) {
      assigning.value = null;
      useAlert(t('KALO_CONSOLE.PAYMENTS.ASSIGN_GONE'));
      await load(meta.value.current_page);
    } else {
      useAlert(t('KALO_CONSOLE.PAYMENTS.ASSIGN_ERROR'));
    }
  } finally {
    busy.value = false;
  }
};

onMounted(() => load(1));
</script>

<template>
  <section class="flex flex-col gap-4 p-6">
    <h1 class="text-xl font-extrabold">
      {{ t('KALO_CONSOLE.PAYMENTS.TITLE') }}
    </h1>

    <div v-if="failed" class="flex items-center gap-3 text-sm">
      {{ t('KALO_CONSOLE.COMMON.ERROR') }}
      <button
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
      <p v-if="!events.length" class="p-4 text-sm text-console-muted">
        {{ t('KALO_CONSOLE.PAYMENTS.EMPTY') }}
      </p>
      <table v-else class="w-full text-sm text-left">
        <thead class="text-console-muted">
          <tr>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.PAYMENTS.COLUMNS.SHOP') }}
            </th>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.PAYMENTS.COLUMNS.AMOUNT') }}
            </th>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.PAYMENTS.COLUMNS.TIME') }}
            </th>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.PAYMENTS.COLUMNS.STATUS') }}
            </th>
            <th class="px-4 py-3">
              {{ t('KALO_CONSOLE.PAYMENTS.COLUMNS.ACTIONS') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="event in events" :key="event.id">
            <tr class="border-t border-console-line">
              <td class="px-4 py-3">
                <b>{{
                  event.account_name || t('KALO_CONSOLE.PAYMENTS.UNKNOWN_SHOP')
                }}</b>
                <div class="text-xs text-console-muted">
                  {{ event.description }}
                </div>
              </td>
              <td class="px-4 py-3 font-semibold">
                {{ formatMoney(event.amount) }}
              </td>
              <td class="px-4 py-3">{{ formatTime(event.received_at) }}</td>
              <td class="px-4 py-3">
                <ConsoleChip :tone="statusOf(event.status).tone">
                  {{ statusOf(event.status).text }}
                </ConsoleChip>
                <p
                  v-if="event.status === 'underpaid'"
                  class="mt-1 text-xs text-console-muted"
                >
                  {{ t('KALO_CONSOLE.PAYMENTS.UNDERPAID_NOTE') }}
                </p>
              </td>
              <td class="px-4 py-3">
                <button
                  v-if="event.status === 'unmatched'"
                  data-testid="open-assign"
                  class="px-3 py-1 font-semibold text-white rounded-lg bg-console-accent"
                  @click="openAssign(event)"
                >
                  {{ t('KALO_CONSOLE.PAYMENTS.ASSIGN') }}
                </button>
              </td>
            </tr>
            <tr v-if="assigning === event.id" class="bg-console-bg">
              <td colspan="5" class="px-4 py-3">
                <form
                  data-testid="account-search-form"
                  class="flex gap-2"
                  @submit.prevent="searchAccounts"
                >
                  <input
                    v-model="search"
                    data-testid="account-search"
                    type="search"
                    class="w-64 px-3 py-2 bg-white border rounded-xl border-console-line"
                    :placeholder="t('KALO_CONSOLE.PAYMENTS.ASSIGN_SEARCH')"
                  />
                  <button
                    type="submit"
                    class="px-4 py-2 font-semibold border rounded-xl border-console-line text-console-accent"
                  >
                    {{ t('KALO_CONSOLE.COMMON.SEARCH') }}
                  </button>
                </form>
                <p
                  v-if="searched && !options.length"
                  class="mt-2 text-sm text-console-muted"
                >
                  {{ t('KALO_CONSOLE.PAYMENTS.ASSIGN_EMPTY') }}
                </p>
                <ul class="flex flex-wrap gap-2 mt-2">
                  <li v-for="account in options" :key="account.id">
                    <button
                      data-testid="account-option"
                      class="px-3 py-1 border rounded-lg"
                      :class="
                        selected === account.id
                          ? 'bg-console-accent text-white border-console-accent'
                          : 'bg-white border-console-line'
                      "
                      @click="selected = account.id"
                    >
                      {{ account.name }}
                    </button>
                  </li>
                </ul>
                <button
                  data-testid="assign"
                  class="px-4 py-2 mt-3 font-semibold text-white rounded-xl bg-console-accent disabled:opacity-40"
                  :disabled="!selected || busy"
                  @click="assign(event)"
                >
                  {{ t('KALO_CONSOLE.PAYMENTS.ASSIGN_SUBMIT') }}
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <ConsolePager :meta="meta" @change="load" />
    </div>
  </section>
</template>
