import { UiTranslationResponseDto } from '../dto/ui-translation-response.dto';
import { UiTranslation } from '../entities/ui-translation.entity';

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === '';
}

export function toUiTranslationResponse(entity: UiTranslation): UiTranslationResponseDto {
  const missingLocales: string[] = [];
  if (isBlank(entity.valueVi)) missingLocales.push('vi');
  if (isBlank(entity.valueEn)) missingLocales.push('en');
  return {
    id: entity.id,
    namespace: entity.namespace,
    key: entity.key,
    valueVi: entity.valueVi,
    valueEn: entity.valueEn,
    description: entity.description,
    isSystem: entity.isSystem,
    missingLocales,
    version: entity.version,
    updatedAt: entity.updatedAt,
  };
}
