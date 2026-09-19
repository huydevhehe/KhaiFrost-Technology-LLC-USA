import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { DataSource } from 'typeorm';
import { Role } from '../../src/common/enums/role.enum';
import { asTestUser } from '../support/test-authentication.guard';

export const ADMIN_ID = '00000000-0000-4000-8000-0000000000a1';
export const STAFF_ID = '00000000-0000-4000-8000-0000000000b1';
export const CUSTOMER_ID = '00000000-0000-4000-8000-0000000000c1';

export const asAdmin = () => asTestUser({ id: ADMIN_ID, role: Role.ADMIN });
export const asStaff = () => asTestUser({ id: STAFF_ID, role: Role.STAFF });
export const asCustomer = () => asTestUser({ id: CUSTOMER_ID, role: Role.CUSTOMER });

let mediaCounter = 0;

export async function createMediaAsset(dataSource: DataSource): Promise<MediaAsset> {
  mediaCounter += 1;
  const repository = dataSource.getRepository(MediaAsset);
  return repository.save(
    repository.create({
      originalName: `image-${mediaCounter}.jpg`,
      storageKey: `test/content/image-${mediaCounter}-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      checksumSha256: 'a'.repeat(64),
    }),
  );
}
