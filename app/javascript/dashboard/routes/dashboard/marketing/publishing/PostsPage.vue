<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useMapGetter } from 'dashboard/composables/store';
import postsAPI from 'dashboard/api/kchat/posts';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import PostCalendar from './PostCalendar.vue';
import PostList from './PostList.vue';
import PostEditorDrawer from './PostEditorDrawer.vue';
import { apiError, gridRange } from './postHelpers';

// Đăng bài (ADR-031/032): month calendar, review queue, published/failed posts, editor drawer.
const { t } = useI18n();
const { isAdmin } = useAdmin();
const inboxes = useMapGetter('inboxes/getInboxes');

const TABS = [
  { value: 'calendar', labelKey: 'KALO_PUBLISHING.TABS.CALENDAR' },
  { value: 'queue', labelKey: 'KALO_PUBLISHING.TABS.QUEUE' },
  { value: 'results', labelKey: 'KALO_PUBLISHING.TABS.RESULTS' },
];
const DEFAULT_TIME = '09:00';

const activeTab = ref('calendar');
const anchor = ref(new Date());
const posts = ref([]);
const isLoading = ref(false);
const loadError = ref('');
const editor = ref(null); // { post, defaultSchedule }
const busyId = ref(null);

const pages = computed(() =>
  (inboxes.value || [])
    .filter(inbox => inbox.channel_type === 'Channel::FacebookPage')
    .map(inbox => ({ id: inbox.id, name: inbox.name }))
);

const byNewest = (a, b) =>
  new Date(b.published_at || b.scheduled_at || 0) -
  new Date(a.published_at || a.scheduled_at || 0);

const fetchPosts = async () => {
  if (activeTab.value === 'calendar') {
    const { data } = await postsAPI.list(gridRange(anchor.value));
    return data.payload;
  }
  if (activeTab.value === 'queue') {
    const { data } = await postsAPI.list({ status: 'pending_approval' });
    return data.payload;
  }
  const [published, failed] = await Promise.all([
    postsAPI.list({ status: 'published' }),
    postsAPI.list({ status: 'failed' }),
  ]);
  return [...failed.data.payload, ...published.data.payload].sort(byNewest);
};

let loadToken = 0;
const load = async () => {
  loadToken += 1;
  const token = loadToken;
  isLoading.value = true;
  loadError.value = '';
  try {
    const result = await fetchPosts();
    // A slower answer for an older tab/month must not overwrite the current one.
    if (token === loadToken) posts.value = result;
  } catch (e) {
    if (token !== loadToken) return;
    const { code } = apiError(e);
    const key = `KALO_PUBLISHING.ERRORS.${code.toUpperCase()}`;
    const translated = t(key);
    loadError.value =
      translated === key ? t('KALO_PUBLISHING.ERRORS.LOAD') : translated;
  } finally {
    if (token === loadToken) isLoading.value = false;
  }
};

watch([activeTab, anchor], load);
onMounted(load);

const openPost = post => {
  editor.value = { post, defaultSchedule: '' };
};
const createOn = key => {
  editor.value = { post: null, defaultSchedule: `${key}T${DEFAULT_TIME}` };
};
const createNew = () => {
  editor.value = { post: null, defaultSchedule: '' };
};
const closeEditor = () => {
  editor.value = null;
  load();
};

const quickApprove = async post => {
  busyId.value = post.id;
  try {
    await postsAPI.approve(post.id);
    useAlert(t('KALO_PUBLISHING.TOASTS.APPROVED'));
    await load();
  } catch {
    // The drawer shows why (blockers, schedule in the past).
    openPost(post);
  } finally {
    busyId.value = null;
  }
};

const approvable = computed(() =>
  posts.value.filter(
    post => post.status === 'pending_approval' && !post.blockers?.length
  )
);

const approveAll = async () => {
  busyId.value = -1;
  let ok = 0;
  // Sequential on purpose: each approval schedules its publish job.
  // eslint-disable-next-line no-restricted-syntax
  for (const post of approvable.value) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await postsAPI.approve(post.id);
      ok += 1;
    } catch {
      // left in the queue; the admin opens it to see why
    }
  }
  busyId.value = null;
  useAlert(
    t('KALO_PUBLISHING.TOASTS.APPROVED_MANY', {
      ok,
      total: approvable.value.length,
    })
  );
  await load();
};
</script>

<template>
  <KaloPage
    data-test="kalo-posts-page"
    :title="t('KALO_PUBLISHING.TITLE')"
    :description="t('KALO_PUBLISHING.DESC')"
  >
    <template #actions>
      <Button
        data-test="posts-new"
        size="sm"
        :label="t('KALO_PUBLISHING.NEW_POST')"
        @click="createNew"
      />
    </template>
    <template #tabs>
      <div
        role="tablist"
        :aria-label="t('KALO_PUBLISHING.TABS.LABEL')"
        class="inline-flex flex-wrap gap-1 p-1 border rounded-xl bg-n-solid-2 border-n-weak"
      >
        <button
          v-for="tab in TABS"
          :key="tab.value"
          type="button"
          role="tab"
          :data-test="`posts-tab-${tab.value}`"
          :aria-selected="activeTab === tab.value"
          class="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          :class="
            activeTab === tab.value
              ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
              : 'text-n-slate-10 hover:text-n-slate-12'
          "
          @click="activeTab = tab.value"
        >
          {{ t(tab.labelKey) }}
        </button>
      </div>
    </template>

    <div class="flex flex-col min-w-0 gap-4">
      <p
        v-if="!pages.length"
        data-test="posts-no-page"
        class="p-3 mb-0 text-sm rounded-xl bg-n-amber-2 text-n-amber-12"
      >
        {{ t('KALO_PUBLISHING.EDITOR.NO_PAGE') }}
      </p>
      <p
        v-if="loadError"
        role="alert"
        data-test="posts-load-error"
        class="mb-0 text-sm font-medium text-n-ruby-11"
      >
        {{ loadError }}
      </p>

      <PostCalendar
        v-if="activeTab === 'calendar'"
        :posts="posts"
        :anchor="anchor"
        :is-loading="isLoading"
        @open="openPost"
        @create="createOn"
        @move="anchor = $event"
      />

      <template v-else-if="activeTab === 'queue'">
        <div
          v-if="isAdmin && approvable.length > 1"
          class="flex justify-end"
        >
          <Button
            data-test="posts-approve-all"
            size="sm"
            :label="
              t('KALO_PUBLISHING.ACTIONS.APPROVE_ALL', {
                count: approvable.length,
              })
            "
            :is-loading="busyId === -1"
            @click="approveAll"
          />
        </div>
        <p v-if="!isAdmin" class="mb-0 text-xs text-n-slate-11">
          {{ t('KALO_PUBLISHING.LIST.ADMIN_ONLY') }}
        </p>
        <PostList
          :posts="posts"
          :empty-text="t('KALO_PUBLISHING.LIST.QUEUE_EMPTY')"
          :can-approve="isAdmin"
          :busy-id="busyId"
          @open="openPost"
          @approve="quickApprove"
        />
      </template>

      <PostList
        v-else
        :posts="posts"
        :empty-text="t('KALO_PUBLISHING.LIST.RESULTS_EMPTY')"
        @open="openPost"
      />
    </div>

    <PostEditorDrawer
      v-if="editor"
      :post="editor.post"
      :pages="pages"
      :default-schedule="editor.defaultSchedule"
      @close="closeEditor"
    />
  </KaloPage>
</template>
