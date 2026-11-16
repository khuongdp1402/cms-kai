import contentIdeasAPI from '../contentIdeas';
import ApiClient from '../../ApiClient';

describe('#KchatContentIdeasAPI', () => {
  const originalAxios = window.axios;
  const axiosMock = { post: vi.fn(() => Promise.resolve()) };

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

  it('posts the topic to repurpose', () => {
    contentIdeasAPI.repurpose('nến thơm');
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1(\/accounts\/\d+)?\/brand_growth\/repurpose$/
      ),
      { topic: 'nến thơm' }
    );
  });

  it('posts the approve and reject decision', () => {
    contentIdeasAPI.decide(7, 'approve');
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/brand_growth\/approve_job$/),
      { job_id: 7, job_action: 'approve' }
    );
  });
});
