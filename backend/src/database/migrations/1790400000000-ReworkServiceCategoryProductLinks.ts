import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReworkServiceCategoryProductLinks1790400000000 implements MigrationInterface {
  name = 'ReworkServiceCategoryProductLinks1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service_category_products" DROP COLUMN "duration_label"`);
    await queryRunner.query(`ALTER TABLE "service_category_products" DROP COLUMN "anchor"`);
    await queryRunner.query(`ALTER TABLE "service_category_products" ADD "video_url" text`);
    await queryRunner.query(
      `ALTER TABLE "service_category_products" ADD "video_duration_seconds" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_products" ADD "link_type" character varying(20) NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(`ALTER TABLE "service_category_products" ADD "link_product_id" uuid`);
    await queryRunner.query(`ALTER TABLE "service_category_products" ADD "link_post_id" uuid`);
    await queryRunner.query(`ALTER TABLE "service_category_products" ADD "link_external_url" text`);
    await queryRunner.query(
      `ALTER TABLE "service_category_products" ADD CONSTRAINT "FK_scp_link_product" FOREIGN KEY ("link_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_products" ADD CONSTRAINT "FK_scp_link_post" FOREIGN KEY ("link_post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_category_products" DROP CONSTRAINT "FK_scp_link_post"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_products" DROP CONSTRAINT "FK_scp_link_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_products" DROP COLUMN "link_external_url"`,
    );
    await queryRunner.query(`ALTER TABLE "service_category_products" DROP COLUMN "link_post_id"`);
    await queryRunner.query(
      `ALTER TABLE "service_category_products" DROP COLUMN "link_product_id"`,
    );
    await queryRunner.query(`ALTER TABLE "service_category_products" DROP COLUMN "link_type"`);
    await queryRunner.query(
      `ALTER TABLE "service_category_products" DROP COLUMN "video_duration_seconds"`,
    );
    await queryRunner.query(`ALTER TABLE "service_category_products" DROP COLUMN "video_url"`);
    await queryRunner.query(
      `ALTER TABLE "service_category_products" ADD "anchor" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_products" ADD "duration_label" character varying(10)`,
    );
  }
}
