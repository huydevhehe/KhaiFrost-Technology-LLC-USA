import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNavigationItemFeatured1790319541536 implements MigrationInterface {
  name = 'AddNavigationItemFeatured1790319541536';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "navigation_items" ADD "is_featured" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "navigation_items" DROP COLUMN "is_featured"`);
  }
}
