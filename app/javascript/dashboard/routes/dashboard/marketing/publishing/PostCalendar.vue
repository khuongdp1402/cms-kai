<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'dashboard/components-next/button/Button.vue';
import {
  STATUS_TONES,
  dayKey,
  groupByDay,
  monthGrid,
  statusKey,
} from './postHelpers';

const props = defineProps({
  posts: { type: Array, default: () => [] },
  anchor: { type: Date, required: true },
  isLoading: { type: Boolean, default: false },
});

const emit = defineEmits(['open', 'create', 'move']);

const { t, locale } = useI18n();

// Matches the default per-Page daily cap suggested in the plan; the rest are in the lists.
const MAX_PER_DAY = 4;
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const days = computed(() => monthGrid(props.anchor));
const byDay = computed(() => groupByDay(props.posts));
const todayKey = dayKey(new Date());

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    year: 'numeric',
  }).format(props.anchor)
);

const timeOf = post =>
  new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(post.scheduled_at));

const shiftMonth = delta =>
  emit(
    'move',
    new Date(props.anchor.getFullYear(), props.anchor.getMonth() + delta, 1)
  );
</script>

<template>
  <section data-test="post-calendar" class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="text-base font-bold capitalize text-n-slate-12">
        {{ monthLabel }}
      </h3>
      <div class="flex gap-1 ltr:ml-auto rtl:mr-auto">
        <Button
          data-test="calendar-prev"
          variant="outline"
          color="slate"
          size="sm"
          :label="t('KALO_PUBLISHING.CALENDAR.PREV')"
          @click="shiftMonth(-1)"
        />
        <Button
          data-test="calendar-today"
          variant="outline"
          color="slate"
          size="sm"
          :label="t('KALO_PUBLISHING.CALENDAR.TODAY')"
          @click="emit('move', new Date())"
        />
        <Button
          data-test="calendar-next"
          variant="outline"
          color="slate"
          size="sm"
          :label="t('KALO_PUBLISHING.CALENDAR.NEXT')"
          @click="shiftMonth(1)"
        />
      </div>
    </div>

    <div class="overflow-x-auto">
      <div
        class="grid grid-cols-7 min-w-[720px] border rounded-2xl overflow-hidden border-n-weak bg-n-solid-1"
        :class="{ 'opacity-60': isLoading }"
      >
        <div
          v-for="day in WEEKDAYS"
          :key="day"
          class="px-2 py-2 text-xs font-semibold text-center border-b border-n-weak text-n-slate-10 bg-n-solid-2"
        >
          {{ t(`KALO_PUBLISHING.CALENDAR.WEEKDAYS.${day}`) }}
        </div>
        <div
          v-for="day in days"
          :key="day.key"
          :data-test="`calendar-day-${day.key}`"
          class="flex flex-col gap-1 p-1.5 min-h-[112px] border-b ltr:border-r rtl:border-l border-n-weak"
          :class="day.inMonth ? '' : 'bg-n-solid-2'"
        >
          <div class="flex items-center justify-between">
            <span
              class="grid text-xs font-semibold rounded-full size-6 place-content-center"
              :class="
                day.key === todayKey
                  ? 'bg-n-brand text-white'
                  : day.inMonth
                    ? 'text-n-slate-12'
                    : 'text-n-slate-9'
              "
            >
              {{ day.date.getDate() }}
            </span>
            <button
              type="button"
              :data-test="`calendar-add-${day.key}`"
              :aria-label="t('KALO_PUBLISHING.CALENDAR.ADD_ON_DAY')"
              :title="t('KALO_PUBLISHING.CALENDAR.ADD_ON_DAY')"
              class="grid text-sm rounded size-6 place-content-center text-n-slate-10 hover:bg-n-alpha-2 hover:text-n-slate-12"
              @click="emit('create', day.key)"
            >
              +
            </button>
          </div>
          <button
            v-for="post in (byDay[day.key] || []).slice(0, MAX_PER_DAY)"
            :key="post.id"
            type="button"
            :data-test="`calendar-post-${post.id}`"
            class="flex flex-col w-full gap-0.5 px-1.5 py-1 text-start rounded-md"
            :class="STATUS_TONES[post.status]"
            @click="emit('open', post)"
          >
            <span class="text-[11px] font-semibold">
              {{ timeOf(post) }} ·
              {{ t(`KALO_PUBLISHING.FORMAT.${statusKey(post.post_format)}`) }}
            </span>
            <span class="text-[11px] truncate">
              {{
                post.caption ||
                post.media_brief ||
                t('KALO_PUBLISHING.EDITOR.PREVIEW_EMPTY')
              }}
            </span>
          </button>
          <span
            v-if="(byDay[day.key] || []).length > MAX_PER_DAY"
            class="px-1 text-[11px] text-n-slate-10"
          >
            {{
              t('KALO_PUBLISHING.CALENDAR.MORE', {
                count: byDay[day.key].length - MAX_PER_DAY,
              })
            }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
