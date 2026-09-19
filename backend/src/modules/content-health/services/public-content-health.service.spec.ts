import { PUBLIC_HEALTH_CACHE_TTL_MS } from '../constants/content-health.constants';
import { PublicContentHealthResponseDto } from '../dto/content-health-response.dto';
import { ContentHealthService } from './content-health.service';
import { PublicContentHealthService } from './public-content-health.service';

const FLAGS: PublicContentHealthResponseDto = {
  hasPosts: true,
  hasProducts: false,
  hasProjects: false,
  hasServices: false,
  hasTestimonials: false,
};

describe('PublicContentHealthService', () => {
  let getPublicFlags: jest.Mock<Promise<PublicContentHealthResponseDto>, []>;
  let service: PublicContentHealthService;
  let now: number;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    getPublicFlags = jest.fn().mockResolvedValue(FLAGS);
    service = new PublicContentHealthService({
      getPublicFlags,
    } as unknown as ContentHealthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serves repeated calls from memory until the time to live passes', async () => {
    await service.getFlags();
    now += PUBLIC_HEALTH_CACHE_TTL_MS - 1;
    await service.getFlags();
    expect(getPublicFlags).toHaveBeenCalledTimes(1);

    now += 1;
    await service.getFlags();
    expect(getPublicFlags).toHaveBeenCalledTimes(2);
  });

  it('shares one lookup between simultaneous callers', async () => {
    await Promise.all([service.getFlags(), service.getFlags(), service.getFlags()]);
    expect(getPublicFlags).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed lookup', async () => {
    getPublicFlags.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.getFlags()).rejects.toThrow('database unavailable');

    await expect(service.getFlags()).resolves.toEqual(FLAGS);
    expect(getPublicFlags).toHaveBeenCalledTimes(2);
  });

  it('keeps the cache lifetime at 60 seconds', () => {
    expect(PUBLIC_HEALTH_CACHE_TTL_MS).toBe(60_000);
  });
});
