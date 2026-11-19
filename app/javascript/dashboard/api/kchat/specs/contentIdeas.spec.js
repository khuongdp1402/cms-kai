import contentIdeasAPI from '../contentIdeas';
import ApiClient from '../../ApiClient';

describe('#KchatContentIdeasAPI', () => {
  const originalAxios = window.axios;
  const axiosMock = {
    get: vi.fn(() => Promise.resolve()),
    post: vi.fn(() => Promise.resolve()),
    patch: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    window.axios = axiosMock;
  });
  afterEach(() => {
    window.axios = originalAxios;
    vi.clearAllMocks();
  });

  it('creates correct instance', () => {
    expect(contentIdeasAPI).toBeInstanceOf(ApiClient);
  });

  it('fetches overview and saves brand profile', () => {
    contentIdeasAPI.overview();
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1(\/accounts\/\d+)?\/brand_growth\/overview$/
      )
    );

    contentIdeasAPI.saveProfile({ brand_name: 'Kalo' });
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/brand_growth\/save_profile$/),
      { brand_name: 'Kalo' }
    );
  });

  it('posts the topic to repurpose', () => {
    contentIdeasAPI.repurpose('nến thơm');
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1(\/accounts\/\d+)?\/brand_growth\/repurpose$/
      ),
      { topic: 'nến thơm' }
    );
  });

  it('posts the approve and reject decision with optional angle_index', () => {
    contentIdeasAPI.decide(7, 'approve');
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/brand_growth\/approve_job$/),
      { job_id: 7, job_action: 'approve' }
    );

    contentIdeasAPI.decide(7, 'approve', 2);
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/brand_growth\/approve_job$/),
      { job_id: 7, job_action: 'approve', angle_index: 2 }
    );
  });

  it('updates angles and manages content calendar items', () => {
    contentIdeasAPI.updateAngle('job-1', 0, { hook: 'New hook' });
    expect(axiosMock.patch).toHaveBeenCalledWith(
      expect.stringMatching(/\/brand_growth\/update_angle$/),
      { job_id: 'job-1', angle_index: 0, hook: 'New hook' }
    );

    contentIdeasAPI.saveCalendarItem({ title: 'Bài 1', channel: 'tiktok' });
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/brand_growth\/save_calendar_item$/),
      { title: 'Bài 1', channel: 'tiktok' }
    );

    contentIdeasAPI.deleteCalendarItem('cal-1');
    expect(axiosMock.delete).toHaveBeenCalledWith(
      expect.stringMatching(/\/brand_growth\/delete_calendar_item$/),
      { params: { id: 'cal-1' } }
    );
  });
});
