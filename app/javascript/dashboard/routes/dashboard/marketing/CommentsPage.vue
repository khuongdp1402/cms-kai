<script setup>
import { useI18n } from 'vue-i18n';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import CommentAutomationSettings from './CommentAutomationSettings.vue';

const { t } = useI18n();
</script>

<template>
  <KaloPage
    data-test="kalo-comments-page"
    :title="t('KALO_CONSOLE_SHOP.PAGES.COMMENTS.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.PAGES.COMMENTS.DESC')"
  >
    <CommentAutomationSettings data-tour="comments-rules" />
  </KaloPage>
</template>
