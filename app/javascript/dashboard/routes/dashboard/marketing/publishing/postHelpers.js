// Shared helpers for the "Đăng bài" pages (ADR-031): statuses, formats, month grid, form data.

export const POST_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'publishing',
  'published',
  'failed',
];

export const POST_FORMATS = ['text', 'photo', 'album', 'video', 'reel'];

// Must match Kchat::Post::EDITABLE_STATUSES.
export const EDITABLE_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'failed',
];

export const STATUS_TONES = {
  draft: 'bg-n-alpha-2 text-n-slate-11',
  pending_approval: 'bg-n-amber-3 text-n-amber-11',
  approved: 'bg-n-blue-3 text-n-blue-11',
  publishing: 'bg-n-blue-3 text-n-blue-11',
  published: 'bg-n-teal-3 text-n-teal-11',
  failed: 'bg-n-ruby-3 text-n-ruby-11',
};

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

export const acceptFor = format => {
  if (format === 'text') return '';
  if (format === 'video' || format === 'reel') return VIDEO_TYPES.join(',');
  return IMAGE_TYPES.join(',');
};

export const allowsMultipleMedia = format => format === 'album';

export const statusKey = status => status.toUpperCase();

const pad = n => String(n).padStart(2, '0');

// Local "YYYY-MM-DD" of a Date (the calendar works in the viewer's time zone).
export const dayKey = date =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Value for <input type="datetime-local"> from an ISO string, in local time.
export const toLocalInput = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ISO string (with offset) from a datetime-local value; '' when empty or invalid.
export const fromLocalInput = value => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

// 6 weeks x 7 days starting on Monday, covering the month of `anchor`.
export const monthGrid = anchor => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      key: dayKey(d),
      date: d,
      inMonth: d.getMonth() === anchor.getMonth(),
    };
  });
};

// [from, to) of the visible grid, as ISO strings for the API.
export const gridRange = anchor => {
  const days = monthGrid(anchor);
  const from = new Date(days[0].date);
  const to = new Date(days[days.length - 1].date);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
};

export const groupByDay = posts =>
  posts.reduce((acc, post) => {
    if (!post.scheduled_at) return acc;
    const key = dayKey(new Date(post.scheduled_at));
    (acc[key] ||= []).push(post);
    return acc;
  }, {});

// Multipart body for create/update. Empty strings are sent so a field can be cleared.
export const buildPostFormData = (form, { files = [], removeMediaIds = [] }) => {
  const data = new FormData();
  [
    'inbox_id',
    'post_format',
    'caption',
    'link_url',
    'pillar',
    'media_brief',
  ].forEach(key => data.append(key, form[key] ?? ''));
  data.append('scheduled_at', fromLocalInput(form.scheduled_local));
  files.forEach(file => data.append('media[]', file));
  removeMediaIds.forEach(id => data.append('remove_media_ids[]', id));
  return data;
};

// Error code from an API failure (`{ error, blockers }`), for i18n lookups.
export const apiError = error => {
  const body = error?.response?.data || {};
  return { code: body.error || 'unknown', blockers: body.blockers || [] };
};
