import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { validationFailed } from '../../../common/exceptions/exception.factories';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import {
  getSectionTypeDefinition,
  SectionTypeDefinition,
} from '../constants/section-types.registry';
import { PageSectionMedia } from '../entities/page-section-media.entity';
import { PageSection, SectionContent } from '../entities/page-section.entity';
import {
  extractMediaReferences,
  MediaReference,
  validateSectionContent,
  ValidatedSectionContent,
} from '../utils/section-content.validator';

@Injectable()
export class SectionContentService {
  constructor(private readonly mediaReferences: MediaReferenceService) {}

  requireDefinition(type: string): SectionTypeDefinition {
    const definition = getSectionTypeDefinition(type);
    if (!definition) {
      throw validationFailed([{ field: 'type', messages: [`Unknown section type "${type}"`] }]);
    }
    return definition;
  }

  // Validates against the type schema, then checks that every referenced media asset exists
  async prepare(type: string, content: unknown): Promise<ValidatedSectionContent> {
    const validated = validateSectionContent(this.requireDefinition(type), content);
    await this.mediaReferences.assertAllExist(
      validated.mediaReferences.map((ref) => ref.mediaAssetId),
    );
    return validated;
  }

  // Draft and published content both keep their media protected, so the join rows are the union of the two
  async syncMedia(manager: EntityManager, section: PageSection): Promise<void> {
    const definition = this.requireDefinition(section.type);
    const references = new Map<string, MediaReference>();
    for (const content of [
      section.draftContent,
      section.publishedContent,
    ] as (SectionContent | null)[]) {
      for (const reference of extractMediaReferences(definition, content)) {
        references.set(`${reference.fieldKey}:${reference.mediaAssetId}`, reference);
      }
    }
    const repository = manager.getRepository(PageSectionMedia);
    await repository.delete({ sectionId: section.id });
    if (references.size > 0) {
      await repository.insert(
        [...references.values()].map((reference) => ({
          sectionId: section.id,
          mediaAssetId: reference.mediaAssetId,
          fieldKey: reference.fieldKey,
        })),
      );
    }
  }

  async releaseMedia(manager: EntityManager, sectionIds: string[]): Promise<void> {
    if (sectionIds.length === 0) return;
    await manager
      .createQueryBuilder()
      .delete()
      .from(PageSectionMedia)
      .where('section_id IN (:...sectionIds)', { sectionIds })
      .execute();
  }
}
