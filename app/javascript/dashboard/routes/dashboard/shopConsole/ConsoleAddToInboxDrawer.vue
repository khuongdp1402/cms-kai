<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import InboxMembersAPI from 'dashboard/api/inboxMembers';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import { primaryButtonClass, secondaryButtonClass } from './consoleStyles';

// "Thêm vào kênh": adds one agent to the chosen inboxes through the inbox
// members API (POST inbox_members only adds; it never removes anyone).
const props = defineProps({
  agent: { type: Object, required: true },
});
const emit = defineEmits(['close', 'added']);

const { t } = useI18n();
const inboxes = useMapGetter('inboxes/getInboxes');

const memberOf = ref(new Set());
const selected = ref([]);
const state = ref('loading');
const isSaving = ref(false);

const isMember = inboxId => memberOf.value.has(inboxId);
const toggle = inboxId => {
  selected.value = selected.value.includes(inboxId)
    ? selected.value.filter(id => id !== inboxId)
    : [...selected.value, inboxId];
};
const canSave = computed(() => selected.value.length > 0 && !isSaving.value);

// Memberships are read per inbox; re-read when the inbox list (re)loads so a
// drawer opened before inboxes/get finished still marks existing channels.
let latestLoad = 0;
const loadMemberships = async list => {
  latestLoad += 1;
  const request = latestLoad;
  state.value = 'loading';
  try {
    const results = await Promise.all(
      list.map(inbox => InboxMembersAPI.show(inbox.id))
    );
    if (request !== latestLoad) return;
    const ids = new Set();
    results.forEach(({ data }, index) => {
      if ((data?.payload || []).some(member => member.id === props.agent.id))
        ids.add(list[index].id);
    });
    memberOf.value = ids;
    // A shop with a single channel: preselect it (nothing else to choose).
    if (list.length === 1 && !ids.has(list[0].id)) {
      selected.value = [list[0].id];
    }
    state.value = 'ready';
  } catch {
    if (request === latestLoad) state.value = 'error';
  }
};

watch(
  () => inboxes.value.map(inbox => inbox.id).join(','),
  () => loadMemberships(inboxes.value),
  { immediate: true }
);

const save = async () => {
  if (!canSave.value) return;
  isSaving.value = true;
  try {
    await Promise.all(
      selected.value.map(inboxId =>
        InboxMembersAPI.create({
          inbox_id: inboxId,
          user_ids: [props.agent.id],
        })
      )
    );
    useAlert(
      t('KALO_CONSOLE_SHOP.INBOXES.SUCCESS', { count: selected.value.length })
    );
    emit('added', [...selected.value]);
  } catch {
    useAlert(t('KALO_CONSOLE_SHOP.INBOXES.ERROR'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <KaloDrawer
    data-test="console-add-to-inbox-drawer"
    :title="t('KALO_CONSOLE_SHOP.TEAM.ADD_TO_INBOX_FOR', { name: agent.name })"
    :description="t('KALO_CONSOLE_SHOP.INBOXES.DESC')"
    @close="emit('close')"
  >
    <p v-if="!inboxes.length" class="text-sm text-n-slate-11">
      {{ t('KALO_CONSOLE_SHOP.INBOXES.EMPTY') }}
    </p>
    <p v-else-if="state === 'loading'" class="text-sm text-n-slate-11">
      {{ t('KALO_CONSOLE_SHOP.INBOXES.LOADING') }}
    </p>
    <p v-else-if="state === 'error'" class="text-sm text-n-ruby-11">
      {{ t('KALO_CONSOLE_SHOP.INBOXES.LOAD_ERROR') }}
    </p>
    <ul v-else class="flex flex-col gap-2 list-none">
      <li v-for="inbox in inboxes" :key="inbox.id">
        <label
          class="flex items-center gap-3 px-3 py-2.5 border rounded-xl border-n-weak"
          :class="
            isMember(inbox.id)
              ? 'bg-n-solid-2 cursor-default'
              : 'cursor-pointer hover:bg-n-alpha-1'
          "
        >
          <input
            type="checkbox"
            :data-test="`console-inbox-${inbox.id}`"
            :checked="isMember(inbox.id) || selected.includes(inbox.id)"
            :disabled="isMember(inbox.id)"
            class="mb-0 size-4 accent-n-brand"
            @change="toggle(inbox.id)"
          />
          <ChannelIcon :inbox="inbox" class="size-4 text-n-slate-11" />
          <span
            class="flex-1 min-w-0 text-sm font-medium truncate text-n-slate-12"
          >
            {{ inbox.name }}
          </span>
          <span
            v-if="isMember(inbox.id)"
            class="text-xs font-medium text-n-teal-11 shrink-0"
          >
            {{ t('KALO_CONSOLE_SHOP.INBOXES.ALREADY') }}
          </span>
        </label>
      </li>
    </ul>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          :class="secondaryButtonClass"
          class="!h-9"
          @click="emit('close')"
        >
          {{ t('KALO_CONSOLE_SHOP.INBOXES.SKIP') }}
        </button>
        <button
          type="button"
          data-test="console-inbox-save"
          :disabled="!canSave"
          :class="primaryButtonClass"
          @click="save"
        >
          {{ t('KALO_CONSOLE_SHOP.INBOXES.SAVE') }}
        </button>
      </div>
    </template>
  </KaloDrawer>
</template>
