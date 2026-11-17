<script setup>
import { computed, useSlots } from 'vue';
import { useRoute } from 'vue-router';
import CustomBrandPolicyWrapper from 'dashboard/components/CustomBrandPolicyWrapper.vue';
import { getHelpUrlForFeature } from '../../../../helper/featureHelper';
import BackButton from '../../../../components/widgets/BackButton.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import Input from 'dashboard/components-next/input/Input.vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  linkText: {
    type: String,
    default: '',
  },
  featureName: {
    type: String,
    default: '',
  },
  backButtonLabel: {
    type: String,
    default: '',
  },
  searchPlaceholder: {
    type: String,
    default: '',
  },
});

const slots = useSlots();
const route = useRoute();

const searchQuery = defineModel('searchQuery', { type: String, default: '' });

const helpURL = getHelpUrlForFeature(props.featureName);

// Pages without their own back target return to the settings hub.
const hubRoute = computed(() => ({
  name: 'kalo_settings_hub',
  params: { accountId: route?.params?.accountId },
}));
</script>

<template>
  <div class="flex flex-col items-start w-full gap-1">
    <BackButton
      v-if="backButtonLabel"
      compact
      :button-label="backButtonLabel"
      class="my-1"
    />
    <router-link
      v-else-if="route?.params?.accountId"
      :to="hubRoute"
      data-test="settings-back-to-hub"
      class="inline-flex items-center gap-1 py-1 -ms-1 text-sm font-medium rounded-lg text-n-slate-11 hover:text-n-slate-12"
    >
      <KaloIcon name="back" class="size-4 rtl:rotate-180" />
      {{ $t('KALO_SETTINGS_UI.BACK_TO_HUB') }}
    </router-link>
    <div
      v-if="title"
      class="flex flex-wrap items-center justify-between w-full gap-3 min-h-9"
    >
      <slot name="title">
        <h1 class="text-xl font-extrabold text-n-slate-12">
          {{ title }}
        </h1>
      </slot>
      <div v-if="slots.actions" class="flex items-center gap-2 ms-auto">
        <slot name="actions" />
      </div>
    </div>
    <div
      v-if="description || $slots.description || linkText || helpURL"
      class="flex flex-col w-full gap-1 text-n-slate-11"
    >
      <p
        v-if="description || $slots.description"
        class="max-w-3xl mb-0 text-sm line-clamp-2"
      >
        <slot name="description">{{ description }}</slot>
      </p>
      <CustomBrandPolicyWrapper :show-on-custom-branded-instance="false">
        <a
          v-if="helpURL && linkText"
          :href="helpURL"
          target="_blank"
          rel="noopener noreferrer"
          class="items-center hidden gap-1 mb-2 text-sm font-medium sm:inline-flex w-fit text-n-blue-11 hover:underline"
        >
          {{ linkText }}
          <Icon
            icon="i-lucide-chevron-right"
            class="flex-shrink-0 text-n-blue-11 size-4"
          />
        </a>
      </CustomBrandPolicyWrapper>
    </div>
  </div>
  <div
    v-if="searchPlaceholder || slots.tabs || slots.count"
    class="flex flex-wrap items-center justify-between min-w-0 gap-3 mt-4"
  >
    <div
      v-if="slots.tabs || searchPlaceholder"
      class="flex items-center min-w-0 gap-3"
    >
      <slot name="tabs" />
      <Input
        v-if="searchPlaceholder"
        v-model="searchQuery"
        :placeholder="searchPlaceholder"
        class="group w-full sm:w-64 min-w-0 [&>input]:ltr:!pl-8 [&>input]:rtl:!pr-8 [&>input]:!rounded-[0.625rem]"
        size="sm"
        type="search"
      >
        <template #prefix>
          <KaloIcon
            name="search"
            class="absolute top-1/2 -translate-y-1/2 text-n-slate-11 group-focus-within:text-n-brand size-3.5 ltr:left-2.5 rtl:right-2.5"
          />
        </template>
      </Input>
    </div>
    <div v-if="slots.count" class="flex items-center min-w-0 gap-3 ms-auto">
      <slot name="count" />
    </div>
  </div>
</template>
