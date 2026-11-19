// Pure helpers of the campaign wizard (guided UX spec §5), kept out of the
// components so the rules that decide what is sent are unit tested.

export const GOALS = ['sales', 'retention', 'launch'];
export const AUDIENCE_MODES = ['all', 'segment', 'labels'];
export const STEPS = [
  'GOAL',
  'AUDIENCE',
  'CONTENT',
  'CHANNEL',
  'REVIEW',
  'RESULTS',
];
export const STATUSES = [
  'draft',
  'scheduled',
  'processing',
  'sending',
  'completed',
  'failed',
];
// provide/inject key shared by the wizard and its step components.
export const CAMPAIGN_FLOW_KEY = Symbol('kaloCampaignFlow');

const OK = 'bg-n-teal-3 text-n-teal-11';
const WARN = 'bg-n-amber-3 text-n-amber-11';
const GRAY = 'bg-n-alpha-2 text-n-slate-11';
const NEW = 'bg-woot-50 text-woot-600 dark:bg-n-blue-3 dark:text-n-blue-11';
const BAD = 'bg-n-ruby-3 text-n-ruby-11';

// The results view refreshes itself this often while a campaign is sending.
export const RESULTS_POLL_MS = 4000;
// Failed refreshes back off (8 s, 16 s, …) up to this.
export const RESULTS_POLL_MAX_MS = 30000;
export const SENDING_STATUSES = ['processing', 'sending'];

export const STATUS_TONES = {
  draft: GRAY,
  scheduled: WARN,
  processing: NEW,
  sending: NEW,
  completed: OK,
  failed: BAD,
};

export const channelKey = channelType =>
  [
    'zalo_personal',
    'facebook_page',
    'instagram',
    'web_widget',
    'whatsapp',
    'telegram',
    'email',
    'api',
    'line',
    'sms',
    'twilio_sms',
    'tiktok',
    'twitter_profile',
  ].includes(channelType)
    ? channelType
    : 'other';

export const MAX_TITLE_CHARS = 120;
export const MAX_MESSAGE_CHARS = 2000;
// Kchat::Broadcasts::Dispatcher::MAX_RECIPIENTS_PER_RUN
export const MAX_RECIPIENTS_PER_RUN = 500;
export const VIETNAM_OFFSET = '+07:00';
export const MESSAGE_VARIABLES = ['{{name}}', '{{shop_name}}'];

// Same slug as Kchat::Broadcasts::RecordBuilder.normalize_tag, so the UTM
// link built in the browser carries the tag the backend stores.
export const campaignTagFrom = title => {
  const slug = String(title || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
    .slice(0, 50);
  return slug || 'broadcast';
};

// Same as Kchat::Broadcasts::RecordBuilder#unique_tag: -2, -3… when taken.
export const uniqueTag = (base, taken = []) => {
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base.slice(0, 46)}-${n}`;
    if (!taken.includes(candidate)) return candidate;
  }
};

// Tag sent with the campaign: locked once a UTM link carrying it is in the
// message, otherwise derived from the title and unique among other campaigns.
export const effectiveTag = (campaign, taken = []) =>
  campaign.tagLocked && campaign.campaignTag
    ? campaign.campaignTag
    : uniqueTag(campaignTagFrom(campaign.title), taken);

// Appends utm_source/utm_medium/utm_campaign (Kchat::AttributionExtractor reads
// them from the web widget referer). Returns '' for anything not http(s).
export const buildUtmLink = (rawUrl, campaignTag) => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return '';
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname.includes('.')
  )
    return '';
  url.searchParams.set('utm_source', 'kalo');
  url.searchParams.set('utm_medium', 'broadcast');
  url.searchParams.set('utm_campaign', campaignTag);
  return url.toString();
};

// "YYYY-MM-DDTHH:mm" typed in Vietnam time -> ISO string with +07:00.
export const vietnamLocalToIso = local =>
  local ? `${local}:00${VIETNAM_OFFSET}` : null;

// ISO -> "YYYY-MM-DDTHH:mm" in Vietnam time (for the datetime-local input).
export const isoToVietnamLocal = iso => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
};

export const defaultScheduleLocal = (now = Date.now()) =>
  isoToVietnamLocal(new Date(now + 60 * 60 * 1000).toISOString());

export const formatVietnamTime = iso =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

// Minutes the Zalo bridge needs (burst first, then per_minute), null when the
// channel has no send rate limit. Mirrors zalo-personal-bridge rate-limiter.
export const estimateSendMinutes = (count, rateLimit) => {
  if (!rateLimit || !count) return null;
  const capped = Math.min(count, MAX_RECIPIENTS_PER_RUN);
  const afterBurst = Math.max(0, capped - rateLimit.burst);
  return Math.ceil(afterBurst / rateLimit.per_minute);
};

export const emptyCampaign = () => ({
  id: null,
  title: '',
  goal: '',
  audienceMode: 'all',
  segmentId: null,
  labels: [],
  message: '',
  inboxId: null,
  scheduleMode: 'now',
  scheduledLocal: '',
  only24h: false,
  campaignTag: '',
  tagLocked: false,
  confirmed: false,
});

export const campaignFromRecord = record => ({
  ...emptyCampaign(),
  id: record.id,
  title: record.title || '',
  goal: record.goal || '',
  audienceMode: (() => {
    if (record.segment_id) return 'segment';
    if ((record.labels || []).length) return 'labels';
    return 'all';
  })(),
  segmentId: record.segment_id || null,
  labels: record.labels || [],
  message: record.message || '',
  inboxId: record.inbox_id || null,
  scheduleMode: record.scheduled_at ? 'later' : 'now',
  scheduledLocal: isoToVietnamLocal(record.scheduled_at),
  only24h: Boolean(record.only_24h),
  campaignTag: record.campaign_tag || '',
  tagLocked: String(record.message || '').includes('utm_campaign='),
});

// Body for POST/PATCH kchat/broadcasts. Every field is sent so that editing a
// draft can also clear a choice (labels -> all, later -> now).
export const buildPayload = (campaign, { draft, takenTags = [] }) => ({
  title: campaign.title.trim(),
  goal: campaign.goal || null,
  campaign_tag: effectiveTag(campaign, takenTags),
  labels: campaign.audienceMode === 'labels' ? campaign.labels : [],
  segment_id:
    campaign.audienceMode === 'segment' ? campaign.segmentId || null : null,
  message: campaign.message.trim(),
  inbox_id: campaign.inboxId || null,
  scheduled_at:
    campaign.scheduleMode === 'later'
      ? vietnamLocalToIso(campaign.scheduledLocal)
      : null,
  only_24h: Boolean(campaign.only24h),
  draft,
});

export const reachableCount = audience =>
  (audience?.channels || []).reduce(
    (sum, row) => sum + (row.eligible_count || 0),
    0
  );

const scheduleProblem = (campaign, now) => {
  if (campaign.scheduleMode !== 'later') return '';
  const at = Date.parse(vietnamLocalToIso(campaign.scheduledLocal) || '');
  if (Number.isNaN(at)) return 'SCHEDULE_REQUIRED';
  if (at <= now) return 'SCHEDULE_PAST';
  return '';
};

// Returns the i18n key (under KALO_CAMPAIGN_FLOW.ERRORS) of the first problem
// blocking "Tiếp tục" on a step, or '' when the step is complete.
export const stepError = (
  step,
  campaign,
  { audience = null, now = Date.now() } = {}
) => {
  if (step === 'GOAL') {
    if (!campaign.title.trim()) return 'TITLE_REQUIRED';
    if (campaign.title.trim().length > MAX_TITLE_CHARS) return 'TITLE_TOO_LONG';
    if (!GOALS.includes(campaign.goal)) return 'GOAL_REQUIRED';
  }
  if (step === 'AUDIENCE') {
    if (campaign.audienceMode === 'segment' && !campaign.segmentId)
      return 'SEGMENT_REQUIRED';
    if (campaign.audienceMode === 'labels' && !campaign.labels.length)
      return 'LABELS_REQUIRED';
    if (!audience) return 'AUDIENCE_LOADING';
    if (!reachableCount(audience)) return 'NO_RECIPIENTS';
  }
  if (step === 'CONTENT') {
    if (!campaign.message.trim()) return 'MESSAGE_REQUIRED';
    if (campaign.message.trim().length > MAX_MESSAGE_CHARS)
      return 'MESSAGE_TOO_LONG';
  }
  if (step === 'CHANNEL') {
    const row = (audience?.channels || []).find(
      item => item.inbox_id === campaign.inboxId
    );
    if (!row) return 'CHANNEL_REQUIRED';
    if (!row.eligible_count) return 'CHANNEL_EMPTY';
    const scheduleError = scheduleProblem(campaign, now);
    if (scheduleError) return scheduleError;
  }
  if (step === 'REVIEW') {
    // Time passes while the shop reads the summary: check the schedule again.
    const scheduleError = scheduleProblem(campaign, now);
    if (scheduleError) return scheduleError;
    if (!campaign.confirmed) return 'CONFIRM_REQUIRED';
  }
  return '';
};

// Prompt for the brand chat endpoint (system prompt = brand profile + hard bans).
export const aiPrompt = ({ goalLabel, title, shopName }) =>
  [
    `Viết một tin nhắn chiến dịch gửi khách của shop ${shopName || ''}.`.trim(),
    `Mục tiêu: ${goalLabel}. Chủ đề: ${title}.`,
    'Viết 2-4 câu, thân mật, có lời kêu gọi rõ ràng.',
    'Mở đầu bằng "Chào {{name}}" (giữ nguyên {{name}} để hệ thống thay tên khách).',
    'Chỉ trả về nội dung tin nhắn, không giải thích.',
  ].join('\n');

// Name used for {{name}} in previews: the first recipient on the chosen channel
// (or the first channel that reaches anyone), as the API reports it in
// `sample_name` (Kchat::Broadcasts::Dispatcher.recipient_name). `fallback` when
// nobody is reached yet.
export const sampleRecipientName = (channels, inboxId, fallback) => {
  const reached = (channels || []).filter(row => row.eligible_count > 0);
  const row = reached.find(item => item.inbox_id === inboxId) || reached[0];
  return row?.sample_name || fallback;
};

export const personalize = (message, { name, shopName }) =>
  String(message || '')
    .replaceAll('{{name}}', name)
    .replaceAll('{{shop_name}}', shopName);
