import {
  acceptFor,
  apiError,
  buildPostFormData,
  fromLocalInput,
  groupByDay,
  monthGrid,
  toLocalInput,
} from '../postHelpers';

describe('postHelpers', () => {
  it('builds a 6 week grid starting on Monday that covers the month', () => {
    const days = monthGrid(new Date(2026, 10, 15)); // November 2026, 1st is a Sunday
    expect(days).toHaveLength(42);
    expect(days[0].key).toBe('2026-10-26');
    expect(days[0].date.getDay()).toBe(1);
    expect(days.find(d => d.key === '2026-11-01').inMonth).toBe(true);
    expect(days[0].inMonth).toBe(false);
  });

  it('round-trips datetime-local values through ISO', () => {
    const iso = fromLocalInput('2026-12-01T09:30');
    expect(toLocalInput(iso)).toBe('2026-12-01T09:30');
    expect(fromLocalInput('')).toBe('');
    expect(toLocalInput(null)).toBe('');
  });

  it('groups posts by local day and skips unscheduled ones', () => {
    const at = fromLocalInput('2026-12-01T20:00');
    const grouped = groupByDay([
      { id: 1, scheduled_at: at },
      { id: 2, scheduled_at: null },
    ]);
    expect(grouped['2026-12-01'].map(p => p.id)).toEqual([1]);
    expect(Object.keys(grouped)).toEqual(['2026-12-01']);
  });

  it('accepts videos for video/reel and images otherwise', () => {
    expect(acceptFor('reel')).toContain('video/mp4');
    expect(acceptFor('album')).toContain('image/png');
    expect(acceptFor('text')).toBe('');
  });

  it('builds the multipart body with files and removed media ids', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const data = buildPostFormData(
      {
        inbox_id: 3,
        post_format: 'photo',
        caption: 'Xin chào',
        link_url: '',
        pillar: '',
        media_brief: '',
        scheduled_local: '2026-12-01T09:30',
      },
      { files: [file], removeMediaIds: [7] }
    );
    expect(data.get('inbox_id')).toBe('3');
    expect(data.get('caption')).toBe('Xin chào');
    expect(data.get('scheduled_at')).toBe(fromLocalInput('2026-12-01T09:30'));
    expect(data.getAll('media[]')).toHaveLength(1);
    expect(data.getAll('remove_media_ids[]')).toEqual(['7']);
  });

  it('reads the API error code and blockers', () => {
    expect(
      apiError({
        response: {
          data: { error: 'not_publishable', blockers: ['inbox_required'] },
        },
      })
    ).toEqual({ code: 'not_publishable', blockers: ['inbox_required'] });
    expect(apiError(new Error('x'))).toEqual({ code: 'unknown', blockers: [] });
  });
});
