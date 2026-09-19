import { Injectable } from '@nestjs/common';
import { PUBLIC_HEALTH_CACHE_TTL_MS } from '../constants/content-health.constants';
import { PublicContentHealthResponseDto } from '../dto/content-health-response.dto';
import { ContentHealthService } from './content-health.service';

interface CacheEntry {
  expiresAt: number;
  value: Promise<PublicContentHealthResponseDto>;
}

@Injectable()
export class PublicContentHealthService {
  private cache: CacheEntry | null = null;

  constructor(private readonly health: ContentHealthService) {}

  getFlags(): Promise<PublicContentHealthResponseDto> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) return this.cache.value;

    const value = this.health.getPublicFlags();
    const entry: CacheEntry = { expiresAt: now + PUBLIC_HEALTH_CACHE_TTL_MS, value };
    this.cache = entry;
    // A failed lookup must not stay cached for a whole minute
    value.catch(() => {
      if (this.cache === entry) this.cache = null;
    });
    return value;
  }
}
