<script setup>
import { computed, watch, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  useMapGetter,
  useFunctionGetter,
  useStore,
} from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';

import AccordionItem from 'dashboard/components/Accordion/AccordionItem.vue';
import ContactConversations from './ContactConversations.vue';
import ConversationAction from './ConversationAction.vue';
import ConversationParticipant from './ConversationParticipant.vue';
import ContactInfo from './contact/ContactInfo.vue';
import ContactNotes from './contact/ContactNotes.vue';
import ConversationInfo from './ConversationInfo.vue';
import CustomAttributes from './customAttributes/CustomAttributes.vue';
import ConversationLabels from './labels/LabelBox.vue';
import SharedFiles from './SharedFiles.vue';
import Draggable from 'vuedraggable';
import MacrosList from './Macros/List.vue';
import ShopifyOrdersList from 'dashboard/components/widgets/conversation/ShopifyOrdersList.vue';
import SidebarActionsHeader from 'dashboard/components-next/SidebarActionsHeader.vue';
import LinearIssuesList from 'dashboard/components/widgets/conversation/linear/IssuesList.vue';
import LinearSetupCTA from 'dashboard/components/widgets/conversation/linear/LinearSetupCTA.vue';
import KaloContactOrders from './contact/KaloContactOrders.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import {
  KALO_MORE_DIVIDER,
  buildKaloSidebarOrder,
} from './kaloContactPanelOrder';

const props = defineProps({
  conversationId: {
    type: [Number, String],
    required: true,
  },
  inboxId: {
    type: Number,
    default: undefined,
  },
});

const { t } = useI18n();
const { uiSettings, updateUISettings, conversationSidebarItemsOrder } =
  useUISettings();

// Sections that matter most to a shop start open; the others keep the old default (closed).
const DEFAULT_OPEN_KEYS = [
  'is_conv_labels_open',
  'is_contact_notes_open',
  'is_conv_actions_open',
];
const isSectionOpen = key => {
  const value = uiSettings.value?.[key];
  return value === undefined ? DEFAULT_OPEN_KEYS.includes(key) : !!value;
};
const toggleSection = key => {
  updateUISettings({ [key]: !isSectionOpen(key) });
};

const SHOW_MORE_KEY = 'is_kalo_panel_more_open';
const showMore = computed(() => !!uiSettings.value?.[SHOW_MORE_KEY]);
const toggleShowMore = () => {
  updateUISettings({ [SHOW_MORE_KEY]: !showMore.value });
};

const dragging = ref(false);
const conversationSidebarItems = ref([]);

const dividerIndex = computed(() =>
  conversationSidebarItems.value.findIndex(
    item => item.name === KALO_MORE_DIVIDER
  )
);
const isBelowFold = index => index > dividerIndex.value;
const isItemVisible = index => !isBelowFold(index) || showMore.value;

const shopifyIntegration = useFunctionGetter(
  'integrations/getIntegration',
  'shopify'
);

const isShopifyFeatureEnabled = computed(
  () => shopifyIntegration.value.enabled
);

const { isCloudFeatureEnabled } = useAccount();

const isLinearFeatureEnabled = computed(() =>
  isCloudFeatureEnabled(FEATURE_FLAGS.LINEAR)
);

const linearIntegration = useFunctionGetter(
  'integrations/getIntegration',
  'linear'
);

const isLinearClientIdConfigured = computed(() => {
  return !!linearIntegration.value?.id;
});

const isLinearConnected = computed(
  () => linearIntegration.value?.enabled || false
);

const store = useStore();
const currentChat = useMapGetter('getSelectedChat');
const conversationId = computed(() => props.conversationId);
const conversationMetadataGetter = useMapGetter(
  'conversationMetadata/getConversationMetadata'
);
const currentConversationMetaData = computed(() =>
  conversationMetadataGetter.value(conversationId.value)
);
const conversationAdditionalAttributes = computed(
  () => currentConversationMetaData.value.additional_attributes || {}
);

const channelType = computed(() => currentChat.value.meta?.channel);

const contactGetter = useMapGetter('contacts/getContact');
const contactId = computed(() => currentChat.value.meta?.sender?.id);
const contact = computed(() => contactGetter.value(contactId.value));
const contactAdditionalAttributes = computed(
  () => contact.value.additional_attributes || {}
);

const getContactDetails = () => {
  if (contactId.value) {
    store.dispatch('contacts/show', { id: contactId.value });
  }
};

watch(contactId, (newContactId, prevContactId) => {
  if (newContactId && newContactId !== prevContactId) {
    getContactDetails();
  }
});

const onDragEnd = () => {
  dragging.value = false;
  updateUISettings({
    conversation_sidebar_items_order: conversationSidebarItems.value,
  });
};

const closeContactPanel = () => {
  updateUISettings({
    is_contact_sidebar_open: false,
    is_copilot_panel_open: false,
  });
};

onMounted(() => {
  conversationSidebarItems.value = buildKaloSidebarOrder(
    conversationSidebarItemsOrder.value
  );
  getContactDetails();
  store.dispatch('attributes/get', 0);
  // Load integrations to ensure linear integration state is available
  store.dispatch('integrations/get', 'linear');
});
</script>

<template>
  <div class="w-full">
    <SidebarActionsHeader
      :title="t('KALO_CHAT_THREAD.PANEL.TITLE')"
      @close="closeContactPanel"
    />
    <ContactInfo :contact="contact" :channel-type="channelType" />
    <KaloContactOrders
      :contact-id="contactId"
      class="mx-3 border-b border-n-weak"
    />
    <div class="px-3 pb-8 list-group">
      <Draggable
        :list="conversationSidebarItems"
        animation="200"
        ghost-class="ghost"
        handle=".drag-handle"
        item-key="name"
        class="flex flex-col"
        @start="dragging = true"
        @end="onDragEnd"
      >
        <template #item="{ element, index }">
          <div :data-section="element.name">
            <button
              v-if="element.name === KALO_MORE_DIVIDER"
              type="button"
              data-test="panel-show-more"
              :aria-expanded="showMore"
              class="flex items-center justify-center w-full gap-1 py-3 text-sm font-semibold text-n-blue-11 hover:text-n-blue-12"
              @click="toggleShowMore"
            >
              {{
                showMore
                  ? t('KALO_CHAT_THREAD.PANEL.SHOW_LESS')
                  : t('KALO_CHAT_THREAD.PANEL.SHOW_MORE')
              }}
              <KaloIcon
                name="chevron"
                class="size-4 transition-transform duration-150 motion-reduce:transition-none"
                :class="{ 'rotate-180': showMore }"
              />
            </button>
            <template v-else-if="isItemVisible(index)">
              <AccordionItem
                v-if="element.name === 'conversation_labels'"
                :title="t('KALO_CHAT_THREAD.PANEL.LABELS')"
                :is-open="isSectionOpen('is_conv_labels_open')"
                compact
                @toggle="toggleSection('is_conv_labels_open')"
              >
                <ConversationLabels :conversation-id="conversationId" />
              </AccordionItem>
              <AccordionItem
                v-else-if="element.name === 'conversation_actions'"
                class="conversation--actions"
                :title="t('KALO_CHAT_THREAD.PANEL.ASSIGN')"
                :is-open="isSectionOpen('is_conv_actions_open')"
                compact
                @toggle="toggleSection('is_conv_actions_open')"
              >
                <ConversationAction
                  :conversation-id="conversationId"
                  :inbox-id="inboxId"
                  :show-labels="false"
                />
              </AccordionItem>
              <AccordionItem
                v-else-if="element.name === 'conversation_participants'"
                class="conversation--actions"
                :title="t('KALO_CHAT_THREAD.PANEL.PARTICIPANTS')"
                :is-open="isSectionOpen('is_conv_participants_open')"
                @toggle="toggleSection('is_conv_participants_open')"
              >
                <ConversationParticipant
                  :conversation-id="conversationId"
                  :inbox-id="inboxId"
                />
              </AccordionItem>
              <AccordionItem
                v-else-if="element.name === 'conversation_info'"
                :title="t('KALO_CHAT_THREAD.PANEL.CONVERSATION_INFO')"
                :is-open="isSectionOpen('is_conv_details_open')"
                compact
                @toggle="toggleSection('is_conv_details_open')"
              >
                <ConversationInfo
                  :conversation-attributes="conversationAdditionalAttributes"
                  :contact-attributes="contactAdditionalAttributes"
                />
              </AccordionItem>
              <AccordionItem
                v-else-if="element.name === 'contact_attributes'"
                :title="t('KALO_CHAT_THREAD.PANEL.MORE_INFO')"
                :is-open="isSectionOpen('is_contact_attributes_open')"
                compact
                @toggle="toggleSection('is_contact_attributes_open')"
              >
                <CustomAttributes
                  attribute-type="contact_attribute"
                  attribute-from="conversation_contact_panel"
                  :contact-id="contact.id"
                  :empty-state-message="
                    t('KALO_CHAT_THREAD.PANEL.NO_ATTRIBUTES')
                  "
                />
              </AccordionItem>
              <AccordionItem
                v-else-if="
                  element.name === 'previous_conversation' && contact.id
                "
                :title="t('KALO_CHAT_THREAD.PANEL.PREVIOUS')"
                :is-open="isSectionOpen('is_previous_conv_open')"
                compact
                @toggle="toggleSection('is_previous_conv_open')"
              >
                <ContactConversations
                  :contact-id="contact.id"
                  :conversation-id="conversationId"
                />
              </AccordionItem>
              <woot-feature-toggle
                v-else-if="element.name === 'macros'"
                feature-key="macros"
              >
                <AccordionItem
                  :title="t('KALO_CHAT_THREAD.PANEL.MACROS')"
                  :is-open="isSectionOpen('is_macro_open')"
                  compact
                  @toggle="toggleSection('is_macro_open')"
                >
                  <MacrosList :conversation-id="conversationId" />
                </AccordionItem>
              </woot-feature-toggle>
              <AccordionItem
                v-else-if="
                  element.name === 'linear_issues' &&
                  isLinearFeatureEnabled &&
                  isLinearClientIdConfigured
                "
                :title="t('KALO_CHAT_THREAD.PANEL.LINEAR')"
                :is-open="isSectionOpen('is_linear_issues_open')"
                compact
                @toggle="toggleSection('is_linear_issues_open')"
              >
                <LinearSetupCTA v-if="!isLinearConnected" />
                <LinearIssuesList v-else :conversation-id="conversationId" />
              </AccordionItem>
              <AccordionItem
                v-else-if="
                  element.name === 'shopify_orders' && isShopifyFeatureEnabled
                "
                :title="t('KALO_CHAT_THREAD.PANEL.SHOPIFY')"
                :is-open="isSectionOpen('is_shopify_orders_open')"
                compact
                @toggle="toggleSection('is_shopify_orders_open')"
              >
                <ShopifyOrdersList :contact-id="contactId" />
              </AccordionItem>
              <AccordionItem
                v-else-if="element.name === 'contact_notes'"
                :title="t('KALO_CHAT_THREAD.PANEL.NOTES')"
                :is-open="isSectionOpen('is_contact_notes_open')"
                compact
                @toggle="toggleSection('is_contact_notes_open')"
              >
                <ContactNotes :contact-id="contactId" />
              </AccordionItem>
              <AccordionItem
                v-else-if="element.name === 'shared_files'"
                :title="t('KALO_CHAT_THREAD.PANEL.FILES')"
                :is-open="isSectionOpen('is_shared_files_open')"
                compact
                @toggle="toggleSection('is_shared_files_open')"
              >
                <SharedFiles />
              </AccordionItem>
            </template>
          </div>
        </template>
      </Draggable>
    </div>
  </div>
</template>
