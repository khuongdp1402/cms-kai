import {
  aiPrompt,
  buildPayload,
  buildUtmLink,
  campaignFromRecord,
  campaignTagFrom,
  emptyCampaign,
  estimateSendMinutes,
  isoToVietnamLocal,
  personalize,
  stepError,
  vietnamLocalToIso,
} from '../campaignFlowHelpers';

const audience = {
  audience_count: 3,
  channels: [
    {
      inbox_id: 1,
      eligible_count: 2,
      rate_limit: { per_minute: 30, burst: 10 },
    },
    { inbox_id: 2, eligible_count: 0, rate_limit: null },
  ],
};

const campaign = overrides => ({ ...emptyCampaign(), ...overrides });

describe('campaignFlowHelpers', () => {
  it('builds the same campaign tag as the backend', () => {
    expect(campaignTagFrom('Ưu đãi Tết 2027')).toBe('uu_dai_tet_2027');
    expect(campaignTagFrom('  Đồ  mới!! ')).toBe('do_moi');
    expect(campaignTagFrom('!!!')).toBe('broadcast');
  });

  describe('buildUtmLink', () => {
    it('appends the UTM parameters and keeps existing query', () => {
      expect(buildUtmLink('shop.vn/nen?sp=1', 'tet_2027')).toBe(
        'https://shop.vn/nen?sp=1&utm_source=kalo&utm_medium=broadcast&utm_campaign=tet_2027'
      );
    });

    it('replaces older UTM values instead of duplicating them', () => {
      const link = buildUtmLink(
        'https://shop.vn/?utm_campaign=old&utm_source=fb',
        'moi'
      );
      expect(new URL(link).searchParams.getAll('utm_campaign')).toEqual([
        'moi',
      ]);
      expect(new URL(link).searchParams.get('utm_source')).toBe('kalo');
    });

    it('rejects things that are not web links', () => {
      expect(buildUtmLink('', 'x')).toBe('');
      expect(buildUtmLink(['javascript', 'alert(1)'].join(':'), 'x')).toBe('');
      expect(buildUtmLink('not a link', 'x')).toBe('');
    });
  });

  it('converts Vietnam local time both ways', () => {
    expect(vietnamLocalToIso('2026-12-01T09:30')).toBe(
      '2026-12-01T09:30:00+07:00'
    );
    expect(isoToVietnamLocal('2026-12-01T02:30:00Z')).toBe('2026-12-01T09:30');
    expect(vietnamLocalToIso('')).toBeNull();
  });

  it('estimates Zalo send time from burst and rate, capped at 500', () => {
    const rate = { per_minute: 30, burst: 10 };
    expect(estimateSendMinutes(8, rate)).toBe(0);
    expect(estimateSendMinutes(70, rate)).toBe(2);
    expect(estimateSendMinutes(5000, rate)).toBe(17);
    expect(estimateSendMinutes(70, null)).toBeNull();
  });

  describe('stepError', () => {
    it('validates the goal step', () => {
      expect(stepError('GOAL', campaign({ goal: 'sales' }))).toBe(
        'TITLE_REQUIRED'
      );
      expect(stepError('GOAL', campaign({ title: 'Tết' }))).toBe(
        'GOAL_REQUIRED'
      );
      expect(
        stepError('GOAL', campaign({ title: 'x'.repeat(121), goal: 'sales' }))
      ).toBe('TITLE_TOO_LONG');
      expect(stepError('GOAL', campaign({ title: 'Tết', goal: 'sales' }))).toBe(
        ''
      );
    });

    it('needs a segment or labels for those modes and someone reachable', () => {
      expect(
        stepError('AUDIENCE', campaign({ audienceMode: 'segment' }), {
          audience,
        })
      ).toBe('SEGMENT_REQUIRED');
      expect(
        stepError('AUDIENCE', campaign({ audienceMode: 'labels' }), {
          audience,
        })
      ).toBe('LABELS_REQUIRED');
      expect(stepError('AUDIENCE', campaign({}), {})).toBe('AUDIENCE_LOADING');
      expect(
        stepError('AUDIENCE', campaign({}), {
          audience: {
            audience_count: 2,
            channels: [{ inbox_id: 1, eligible_count: 0 }],
          },
        })
      ).toBe('NO_RECIPIENTS');
      expect(stepError('AUDIENCE', campaign({}), { audience })).toBe('');
    });

    it('validates content length', () => {
      expect(stepError('CONTENT', campaign({ message: '  ' }))).toBe(
        'MESSAGE_REQUIRED'
      );
      expect(
        stepError('CONTENT', campaign({ message: 'x'.repeat(2001) }))
      ).toBe('MESSAGE_TOO_LONG');
    });

    it('requires a reachable channel and a future Vietnam time', () => {
      const now = Date.parse('2026-12-01T09:00:00+07:00');
      expect(stepError('CHANNEL', campaign({}), { audience, now })).toBe(
        'CHANNEL_REQUIRED'
      );
      expect(
        stepError('CHANNEL', campaign({ inboxId: 2 }), { audience, now })
      ).toBe('CHANNEL_EMPTY');
      const later = { inboxId: 1, scheduleMode: 'later' };
      expect(stepError('CHANNEL', campaign(later), { audience, now })).toBe(
        'SCHEDULE_REQUIRED'
      );
      expect(
        stepError(
          'CHANNEL',
          campaign({ ...later, scheduledLocal: '2026-12-01T08:59' }),
          {
            audience,
            now,
          }
        )
      ).toBe('SCHEDULE_PAST');
      expect(
        stepError(
          'CHANNEL',
          campaign({ ...later, scheduledLocal: '2026-12-01T10:00' }),
          {
            audience,
            now,
          }
        )
      ).toBe('');
    });

    it('asks for confirmation before sending', () => {
      expect(stepError('REVIEW', campaign({}))).toBe('CONFIRM_REQUIRED');
      expect(stepError('REVIEW', campaign({ confirmed: true }))).toBe('');
    });
  });

  describe('buildPayload', () => {
    it('sends only the chosen audience and the schedule in Vietnam time', () => {
      const payload = buildPayload(
        campaign({
          title: ' Tết 2027 ',
          goal: 'sales',
          audienceMode: 'labels',
          labels: ['vip'],
          segmentId: 9,
          message: ' Chào {{name}} ',
          inboxId: 3,
          scheduleMode: 'later',
          scheduledLocal: '2026-12-01T09:30',
        }),
        { draft: false }
      );
      expect(payload).toEqual({
        title: 'Tết 2027',
        goal: 'sales',
        campaign_tag: 'tet_2027',
        labels: ['vip'],
        segment_id: null,
        message: 'Chào {{name}}',
        inbox_id: 3,
        scheduled_at: '2026-12-01T09:30:00+07:00',
        draft: false,
      });
    });

    it('clears labels and schedule when the shop switches back', () => {
      const payload = buildPayload(
        campaign({
          title: 'A',
          audienceMode: 'segment',
          segmentId: 4,
          labels: ['vip'],
        }),
        { draft: true }
      );
      expect(payload).toMatchObject({
        labels: [],
        segment_id: 4,
        scheduled_at: null,
        inbox_id: null,
        draft: true,
      });
    });
  });

  it('restores a saved draft into the wizard state', () => {
    expect(
      campaignFromRecord({
        id: 'b1',
        title: 'Nháp',
        goal: 'launch',
        labels: ['vip'],
        message: 'Hi',
        inbox_id: 2,
        scheduled_at: '2026-12-01T02:30:00Z',
      })
    ).toMatchObject({
      id: 'b1',
      audienceMode: 'labels',
      scheduleMode: 'later',
      scheduledLocal: '2026-12-01T09:30',
    });
  });

  it('builds the AI prompt and the preview text', () => {
    const prompt = aiPrompt({
      goalLabel: 'Bán hàng',
      title: 'Tết',
      shopName: 'Hoa Mai',
    });
    expect(prompt).toContain('Hoa Mai');
    expect(prompt).toContain('Bán hàng');
    expect(prompt).toContain('{{name}}');
    expect(
      personalize('Chào {{name}}, {{shop_name}} gửi bạn', {
        name: 'Lan',
        shopName: 'Hoa Mai',
      })
    ).toBe('Chào Lan, Hoa Mai gửi bạn');
  });
});
