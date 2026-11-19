<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useShopAdmin } from './useShopAdmin';
import { useAccount } from 'dashboard/composables/useAccount';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import KaloDrawer from 'next/layout/KaloDrawer.vue';
import KaloIcon from 'next/icon/KaloIcon.vue';
import { KALO_TOURS, MOBILE_BREAKPOINT } from './kaloTours';
import { useKaloTourSeen } from './useKaloTour';
import { useKaloSetup } from './useKaloSetup';

// "Hướng dẫn": replay any module tour, and bring back a hidden setup list.
const emit = defineEmits(['close']);

const { t } = useI18n();
const router = useRouter();
const { isAdmin } = useShopAdmin();
const { accountScopedRoute } = useAccount();
const { isOn } = useKaloFeatures();
const { isSeen } = useKaloTourSeen();
const { isHidden, remaining, show } = useKaloSetup();

const tours = computed(() =>
  KALO_TOURS.filter(
    tour =>
      (!tour.flag || isOn(tour.flag)) && (!tour.adminOnly || isAdmin.value)
  )
);

// Tours without a short version (POS) need a wide screen.
const isNarrow = window.innerWidth < MOBILE_BREAKPOINT;
const isDesktopOnly = tour => isNarrow && !tour.mobileSteps.length;

const openTour = tour => {
  if (isDesktopOnly(tour)) return;
  emit('close');
  router.push(accountScopedRoute(tour.route, {}, { tour: tour.key }));
};

const openSetup = () => {
  if (isHidden.value) show();
  emit('close');
  router.push(accountScopedRoute('kalo_overview'));
};
</script>

<template>
  <KaloDrawer
    data-test-id="kalo-guide-drawer"
    :title="t('KALO_GUIDE.MENU.TITLE')"
    @close="emit('close')"
  >
    <p class="mb-4 text-sm text-n-slate-11">
      {{ t('KALO_GUIDE.MENU.DESC') }}
    </p>
    <ul class="flex flex-col gap-2 p-0 m-0 list-none">
      <li v-if="isAdmin" class="m-0">
        <button
          type="button"
          data-test-id="kalo-guide-setup"
          class="flex items-center w-full gap-3 p-3 text-start border rounded-xl border-n-weak bg-n-solid-1 hover:bg-n-alpha-1"
          @click="openSetup"
        >
          <span
            class="grid rounded-xl size-9 shrink-0 place-items-center bg-n-teal-3 text-n-teal-11"
          >
            <KaloIcon name="zap" class="size-5" />
          </span>
          <span class="flex flex-col flex-1 min-w-0">
            <span class="text-sm font-semibold text-n-slate-12">
              {{ t('KALO_GUIDE.SETUP.TITLE') }}
            </span>
            <span class="text-xs text-n-slate-11">
              <template v-if="isHidden">
                {{ t('KALO_GUIDE.MENU.SETUP_SHOW') }}
              </template>
              <template v-else>
                {{
                  remaining > 0
                    ? t('KALO_GUIDE.MENU.SETUP_LEFT', { count: remaining })
                    : t('KALO_GUIDE.MENU.SETUP_DONE')
                }}
              </template>
            </span>
          </span>
          <KaloIcon
            name="arrow"
            class="size-4 text-n-slate-10 rtl:rotate-180"
          />
        </button>
      </li>
      <li v-for="tour in tours" :key="tour.key" class="m-0">
        <button
          type="button"
          :data-test-id="`kalo-guide-tour-${tour.key}`"
          :disabled="isDesktopOnly(tour)"
          class="flex items-center w-full gap-3 p-3 text-start border rounded-xl border-n-weak bg-n-solid-1 hover:bg-n-alpha-1 disabled:opacity-60 disabled:cursor-not-allowed"
          @click="openTour(tour)"
        >
          <span
            class="grid rounded-xl size-9 shrink-0 place-items-center bg-n-blue-3 text-n-blue-11"
          >
            <KaloIcon :name="tour.icon" class="size-5" />
          </span>
          <span class="flex flex-col flex-1 min-w-0">
            <span class="text-sm font-semibold text-n-slate-12">
              {{ t(`KALO_GUIDE.TOUR.${tour.key.toUpperCase()}.NAME`) }}
            </span>
            <span class="text-xs text-n-slate-11">
              <template v-if="isDesktopOnly(tour)">
                {{ t('KALO_GUIDE.MENU.DESKTOP_ONLY') }}
              </template>
              <template v-else>
                {{
                  isSeen(tour.key)
                    ? t('KALO_GUIDE.MENU.SEEN')
                    : t('KALO_GUIDE.MENU.NEW')
                }}
              </template>
            </span>
          </span>
          <span
            v-if="!isDesktopOnly(tour)"
            class="text-xs font-semibold text-n-blue-11"
          >
            {{ t('KALO_GUIDE.MENU.PLAY') }}
          </span>
        </button>
      </li>
    </ul>
  </KaloDrawer>
</template>
