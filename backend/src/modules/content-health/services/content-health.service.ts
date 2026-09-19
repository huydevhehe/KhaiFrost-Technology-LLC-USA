import { Injectable } from '@nestjs/common';
import {
  ContentHealthResponseDto,
  PublicContentHealthResponseDto,
  PublishedCountsDto,
} from '../dto/content-health-response.dto';
import { ContentHealthRepository } from '../repositories/content-health.repository';

@Injectable()
export class ContentHealthService {
  constructor(private readonly repository: ContentHealthRepository) {}

  async getReport(): Promise<ContentHealthResponseDto> {
    const [counts, findings] = await Promise.all([
      this.repository.countPublished(),
      this.repository.findIssues(),
    ]);
    return {
      hasPublishedPosts: counts.posts > 0,
      hasPublishedProducts: counts.products > 0,
      hasPublishedProjects: counts.projects > 0,
      hasPublishedServices: counts.services > 0,
      hasPublishedTestimonials: counts.testimonials > 0,
      counts,
      issues: findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        entity: finding.entity,
        count: finding.count,
        sampleIds: finding.ids,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async getPublicFlags(): Promise<PublicContentHealthResponseDto> {
    return toPublicFlags(await this.repository.countPublished());
  }
}

export function toPublicFlags(counts: PublishedCountsDto): PublicContentHealthResponseDto {
  return {
    hasPosts: counts.posts > 0,
    hasProducts: counts.products > 0,
    hasProjects: counts.projects > 0,
    hasServices: counts.services > 0,
    hasTestimonials: counts.testimonials > 0,
  };
}
