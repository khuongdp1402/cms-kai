<script>
import { useAdmin } from 'dashboard/composables/useAdmin';
import BackButton from '../../../components/widgets/BackButton.vue';

export default {
  components: {
    BackButton,
  },
  props: {
    headerTitle: {
      default: '',
      type: String,
    },
    icon: {
      default: '',
      type: String,
    },
    showBackButton: { type: Boolean, default: false },
    backUrl: {
      type: [String, Object],
      default: '',
    },
    backButtonLabel: {
      type: String,
      default: '',
    },
  },
  setup() {
    const { isAdmin } = useAdmin();
    return {
      isAdmin,
    };
  },
  computed: {
    iconClass() {
      return `icon ${this.icon} header--icon`;
    },
  },
};
</script>

<template>
  <div
    class="flex items-center justify-between px-4 pt-4 pb-2 sm:px-6 sm:pt-6 bg-n-surface-1"
  >
    <h1
      class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-0 text-n-slate-12"
    >
      <BackButton
        v-if="showBackButton"
        :button-label="backButtonLabel"
        :back-url="backUrl"
        compact
      />

      <slot />
      <span class="text-xl font-extrabold text-n-slate-12">
        {{ headerTitle }}
      </span>
    </h1>
  </div>
</template>
