<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloRailTooltip from 'next/sidebar/KaloRailTooltip.vue';
import KaloGuideDrawer from './KaloGuideDrawer.vue';
import { useKaloSetup } from './useKaloSetup';
import { useKaloTrial } from './useKaloTrial';

/**
 * Guided UX entries for the rail footer and the mobile "Thêm" sheet (spec §3):
 * trial banner, setup progress badge and the "Hướng dẫn" menu. Self-contained
 * (LESSONS B93): nav files only add one tag.
 */
const props = defineProps({
  variant: {
    type: String,
    default: 'rail',
    validator: value => ['rail', 'sheet'].includes(value),
  },
  isExpanded: { type: Boolean, default: false },
});

const { t } = useI18n();
const { accountScopedRoute } = useAccount();
const { showBadge, remaining } = useKaloSetup();
const trial = useKaloTrial();
const isGuideOpen = ref(false);

const isRail = computed(() => props.variant === 'rail');
const isCollapsed = computed(() => isRail.value && !props.isExpanded);

const trialText = computed(() =>
  trial.isExpired.value
    ? t('KALO_GUIDE.TRIAL.EXPIRED')
    : t('KALO_GUIDE.TRIAL.DAYS_LEFT', { count: trial.daysLeft.value })
);
const trialTone = computed(() =>
  trial.isUrgent.value
    ? 'bg-n-ruby-3 text-n-ruby-11 border-n-ruby-6'
    : 'bg-n-amber-3 text-n-amber-11 border-n-amber-6'
);
const setupLabel = computed(() =>
  t('KALO_GUIDE.SETUP.BADGE_TOOLTIP', { count: remaining.value })
);

const sheetRowClass =
  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl';
const sheetIconClass = 'grid size-8 shrink-0 place-content-center';
const railItemClass = computed(() =>
  isCollapsed.value
    ? 'relative grid size-11 [@media(max-height:800px)]:size-10 place-content-center rounded-xl'
    : 'relative flex items-center w-full gap-2.5 px-3 py-2 text-sm font-semibold rounded-xl'
);
</script>

<template>
  <div
    data-test-id="kalo-guide-nav"
    class="flex flex-col gap-1"
    :class="isCollapsed ? 'items-center' : 'w-full items-stretch'"
  >
    <!-- Trial banner: "Còn X ngày dùng thử · Xem gói" -->
    <template v-if="trial.isVisible.value">
      <KaloRailTooltip
        v-if="isRail"
        :label="`${trialText} · ${t('KALO_GUIDE.TRIAL.VIEW_PLANS')}`"
        :enabled="isCollapsed"
        :class="{ 'w-full': !isCollapsed }"
      >
        <router-link
          :to="trial.billingRoute.value"
          data-test-id="kalo-trial-banner"
          :data-urgent="trial.isUrgent.value ? 'true' : 'false'"
          :aria-label="
            isCollapsed
              ? `${trialText} · ${t('KALO_GUIDE.TRIAL.VIEW_PLANS')}`
              : undefined
          "
          class="border focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
          :class="[
            trialTone,
            isCollapsed
              ? 'grid size-11 [@media(max-height:800px)]:size-10 place-content-center rounded-xl'
              : 'flex flex-col gap-0.5 px-3 py-2 rounded-xl text-xs',
          ]"
        >
          <KaloIcon v-if="isCollapsed" name="wallet" class="size-5" />
          <template v-else>
            <span class="font-semibold">{{ trialText }}</span>
            <span class="font-bold underline underline-offset-2">
              {{ t('KALO_GUIDE.TRIAL.VIEW_PLANS') }}
            </span>
          </template>
        </router-link>
      </KaloRailTooltip>
      <router-link
        v-else
        :to="trial.billingRoute.value"
        data-test-id="kalo-trial-banner"
        :data-urgent="trial.isUrgent.value ? 'true' : 'false'"
        class="border"
        :class="[sheetRowClass, trialTone]"
      >
        <span :class="sheetIconClass">
          <KaloIcon name="wallet" class="size-5" />
        </span>
        <span class="flex-1 font-semibold">{{ trialText }}</span>
        <span class="text-xs font-bold underline underline-offset-2">
          {{ t('KALO_GUIDE.TRIAL.VIEW_PLANS') }}
        </span>
      </router-link>
    </template>

    <!-- Setup progress: remaining steps until done or hidden. -->
    <template v-if="showBadge">
      <KaloRailTooltip
        v-if="isRail"
        :label="setupLabel"
        :enabled="isCollapsed"
        :class="{ 'w-full': !isCollapsed }"
      >
        <router-link
          :to="accountScopedRoute('kalo_overview')"
          data-test-id="kalo-setup-badge"
          :aria-label="isCollapsed ? setupLabel : undefined"
          class="text-n-slate-10 hover:bg-n-alpha-2 hover:text-n-slate-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
          :class="railItemClass"
        >
          <KaloIcon name="zap" :class="isCollapsed ? 'size-6' : 'size-5'" />
          <span v-if="!isCollapsed" class="flex-1 truncate">
            {{ t('KALO_GUIDE.SETUP.TITLE') }}
          </span>
          <span
            data-test-id="kalo-setup-badge-count"
            class="px-1.5 text-[10px] font-bold leading-4 text-white rounded-full bg-n-blue-9 tabular-nums"
            :class="{
              'absolute -top-0.5 ltr:-right-1 rtl:-left-1': isCollapsed,
            }"
          >
            {{ remaining }}
          </span>
        </router-link>
      </KaloRailTooltip>
      <router-link
        v-else
        :to="accountScopedRoute('kalo_overview')"
        data-test-id="kalo-setup-badge"
        class="text-n-slate-12 hover:bg-n-alpha-2"
        :class="sheetRowClass"
      >
        <span :class="sheetIconClass">
          <KaloIcon name="zap" class="size-5" />
        </span>
        <span class="flex-1">{{ t('KALO_GUIDE.SETUP.TITLE') }}</span>
        <span
          data-test-id="kalo-setup-badge-count"
          class="px-1.5 text-[10px] font-bold leading-4 text-white rounded-full bg-n-blue-9 tabular-nums"
        >
          {{ remaining }}
        </span>
      </router-link>
    </template>

    <!-- "Hướng dẫn": replay tours. -->
    <KaloRailTooltip
      v-if="isRail"
      :label="t('KALO_GUIDE.MENU.TITLE')"
      :enabled="isCollapsed"
      :class="{ 'w-full': !isCollapsed }"
    >
      <button
        type="button"
        data-test-id="kalo-guide-open"
        :aria-label="isCollapsed ? t('KALO_GUIDE.MENU.TITLE') : undefined"
        :aria-expanded="isGuideOpen"
        class="text-n-slate-10 hover:bg-n-alpha-2 hover:text-n-slate-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
        :class="railItemClass"
        @click="isGuideOpen = true"
      >
        <KaloIcon name="book" :class="isCollapsed ? 'size-6' : 'size-5'" />
        <span v-if="!isCollapsed" class="truncate">
          {{ t('KALO_GUIDE.MENU.TITLE') }}
        </span>
      </button>
    </KaloRailTooltip>
    <button
      v-else
      type="button"
      data-test-id="kalo-guide-open"
      :aria-expanded="isGuideOpen"
      class="w-full text-start text-n-slate-12 hover:bg-n-alpha-2"
      :class="sheetRowClass"
      @click="isGuideOpen = true"
    >
      <span :class="sheetIconClass">
        <KaloIcon name="book" class="size-5" />
      </span>
      {{ t('KALO_GUIDE.MENU.TITLE') }}
    </button>
    <KaloGuideDrawer v-if="isGuideOpen" @close="isGuideOpen = false" />
  </div>
</template>
