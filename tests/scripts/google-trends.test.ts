import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchInterestOverTime } from '../../scripts/lib/google-trends';

vi.mock('google-trends-api', () => ({
  default: {
    interestOverTime: vi.fn(),
  },
}));
import gt from 'google-trends-api';

describe('fetchInterestOverTime', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns monthly averaged scores for a keyword list', async () => {
    (gt.interestOverTime as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({
        default: {
          timelineData: [
            { formattedAxisTime: '2024-10-01', value: [40] },
            { formattedAxisTime: '2024-10-15', value: [60] },
            { formattedAxisTime: '2024-11-01', value: [80] },
          ],
        },
      }),
    );
    const out = await fetchInterestOverTime(['x'], { startDate: '2024-10-01', endDate: '2024-11-30' });
    expect(out).toEqual([
      { date: '2024-10', score: 50 },
      { date: '2024-11', score: 80 },
    ]);
  });

  it('retries on 429 then throws after max attempts', async () => {
    const err = new Error('429 Too Many Requests');
    (gt.interestOverTime as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    await expect(
      fetchInterestOverTime(['x'], { startDate: '2024-10-01', endDate: '2024-11-30', maxAttempts: 2, baseDelayMs: 1 }),
    ).rejects.toThrow();
    expect(gt.interestOverTime).toHaveBeenCalledTimes(2);
  });
});
