import { CONTENT_TYPES, MESSAGE_STATUS } from './constants';

/**
 * Whether a (camelCased) message produces a bubble. Shared by Message.vue (renders
 * nothing otherwise) and MessageList.vue (no day separator for a day without bubbles).
 * @param {Object} message - message props in camelCase
 * @returns {boolean}
 */
export const isRenderableMessage = ({
  attachments,
  content,
  contentType,
  contentAttributes,
  status,
} = {}) => {
  const hasAttachments = !!(attachments && attachments.length > 0);
  // Zalo stickers are sent with no content and no attachment (stickers_controller).
  const isSticker =
    contentType === CONTENT_TYPES.STICKER || !!contentAttributes?.sticker;

  return !!(
    hasAttachments ||
    isSticker ||
    content ||
    contentType === CONTENT_TYPES.INCOMING_EMAIL ||
    contentAttributes?.isUnsupported ||
    contentType === CONTENT_TYPES.INTEGRATIONS ||
    status === MESSAGE_STATUS.FAILED ||
    contentAttributes?.externalError
  );
};
