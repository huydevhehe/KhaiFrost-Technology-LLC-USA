import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789789467708 implements MigrationInterface {
  name = 'InitialSchema1789789467708';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media_assets" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "original_name" character varying(255) NOT NULL, "display_name" character varying(255), "storage_key" character varying(500) NOT NULL, "mime_type" character varying(150) NOT NULL, "size_bytes" bigint NOT NULL, "width" integer, "height" integer, "checksum_sha256" character(64) NOT NULL, "folder" character varying(255), "variants" jsonb NOT NULL DEFAULT '{}'::jsonb, "uploaded_by_id" uuid, CONSTRAINT "PK_ca47e9f67a5e5d8af1e75d66ee6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8519ae0d2926772a395d110a1a" ON "media_assets" ("storage_key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0ffe9a8b0a2d25bf71f7a0696c" ON "media_assets" ("checksum_sha256") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "full_name" character varying(150) NOT NULL, "email" character varying(254) NOT NULL, "phone" character varying(20) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'customer', "status" character varying(10) NOT NULL DEFAULT 'active', "must_change_password" boolean NOT NULL DEFAULT false, "avatar_id" uuid, "preferred_locale" character varying(5) NOT NULL DEFAULT 'vi', "failed_login_attempts" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, "email_verified_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `);
    await queryRunner.query(`CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON "users" ("status") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_phone_active" ON "users" ("phone") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email_active" ON "users" ("email") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "ui_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "namespace" character varying(60) NOT NULL, "key" character varying(200) NOT NULL, "value_vi" text, "value_en" text, "description" character varying(500), "is_system" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b67560fd05d872b4b424f8d5c4a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_ui_translations_namespace_key" ON "ui_translations" ("namespace", "key") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "testimonial_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "testimonial_id" uuid NOT NULL, "quote" character varying(1000) NOT NULL DEFAULT '', "author_role" character varying(200), CONSTRAINT "PK_f231f0a4495232083e0dd47ead3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_55465d8082b9d4c8a39b5967a4" ON "testimonial_translations" ("testimonial_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "testimonials" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "author_name" character varying(120) NOT NULL, "company" character varying(150), "location" character varying(150), "rating" smallint NOT NULL DEFAULT '5', "status" character varying(20) NOT NULL DEFAULT 'hidden', "sort_order" integer NOT NULL DEFAULT '0', "avatar_id" uuid, CONSTRAINT "PK_63b03c608bd258f115a0a4a1060" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fea2faa202f5f5690bcd5f5673" ON "testimonials" ("status", "sort_order") `,
    );
    await queryRunner.query(
      `CREATE TABLE "site_settings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "group" character varying(40) NOT NULL, "value" jsonb NOT NULL DEFAULT '{}'::jsonb, "is_public" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_e4290e8371a166d7e066d131f6e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_site_settings_group" ON "site_settings" ("group") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "site_setting_media" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "setting_id" uuid NOT NULL, "media_asset_id" uuid NOT NULL, "field_key" character varying(120) NOT NULL, CONSTRAINT "PK_183e4298247a67a54b395e13e88" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_15004cd816cb0f78986c844992" ON "site_setting_media" ("media_asset_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_site_setting_media" ON "site_setting_media" ("setting_id", "media_asset_id", "field_key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_highlights" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sort_order" integer NOT NULL DEFAULT '0', "icon_key" character varying(32) NOT NULL, CONSTRAINT "PK_73e4075eefd0b0b47d556192277" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_highlight_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "highlight_id" uuid NOT NULL, "title" character varying(200) NOT NULL DEFAULT '', "description" character varying(400) NOT NULL DEFAULT '', CONSTRAINT "PK_0b962c2b2673706af1d02f167cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fd8f70a25e06a012ad6d544662" ON "service_highlight_translations" ("highlight_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "seo_title" character varying(120), "seo_description" character varying(320), "seo_keywords" character varying(500), "canonical_url" character varying(500), "no_index" boolean NOT NULL DEFAULT false, "og_image_id" uuid, "category_id" uuid NOT NULL, "title" character varying(200) NOT NULL DEFAULT '', "category_name" character varying(200) NOT NULL DEFAULT '', "summary" character varying(500) NOT NULL DEFAULT '', "hero_title" character varying(300) NOT NULL DEFAULT '', "hero_subtitle" character varying(1000) NOT NULL DEFAULT '', "products_eyebrow" character varying(150), "products_heading" character varying(300), "products_intro" character varying(1000), CONSTRAINT "PK_f616795af07f57f0aadad1b4e42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6a6f31995718717512bde55b2c" ON "service_category_translations" ("category_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "slug" character varying(200) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "sort_order" integer NOT NULL DEFAULT '0', "icon_key" character varying(32) NOT NULL, "cover_image_id" uuid, "hero_image_id" uuid, "published_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_fe4da5476c4ffe5aa2d3524ae68" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_056800d900862090771be9941b" ON "service_categories" ("status", "sort_order") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_service_categories_slug_active" ON "service_categories" ("slug") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_why_us_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sort_order" integer NOT NULL DEFAULT '0', "category_id" uuid, "icon_key" character varying(32) NOT NULL, CONSTRAINT "PK_d1bc58057e0f1bc00d302a3e42c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c43ac09756caf4f61d96c0bacd" ON "service_category_why_us_items" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_testimonials" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sort_order" integer NOT NULL DEFAULT '0', "category_id" uuid, "author_name" character varying(120) NOT NULL, "avatar_id" uuid, CONSTRAINT "PK_c6984f58bfcd4e2f912ce50f214" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c59abb809f2145753bf18a1326" ON "service_category_testimonials" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_why_us_item_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "item_id" uuid NOT NULL, "title" character varying(200) NOT NULL DEFAULT '', "description" character varying(400) NOT NULL DEFAULT '', CONSTRAINT "PK_13339903201c766e44cc948c1b2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_77763d32daf055b84535e0aa1e" ON "service_category_why_us_item_translations" ("item_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_testimonial_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "testimonial_id" uuid NOT NULL, "quote" character varying(1000) NOT NULL DEFAULT '', "author_role" character varying(200), CONSTRAINT "PK_1047cd34fea7f5c8d1f80aae8ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dc87c28dda1b580de932389780" ON "service_category_testimonial_translations" ("testimonial_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_stats" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sort_order" integer NOT NULL DEFAULT '0', "category_id" uuid, "icon_key" character varying(32) NOT NULL, "value" character varying(40) NOT NULL, CONSTRAINT "PK_b9dfc344567d6f8356fce730a3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2680a6a426d681ef90ffe52bde" ON "service_category_stats" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_stat_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "stat_id" uuid NOT NULL, "label" character varying(150) NOT NULL DEFAULT '', "description" character varying(300) NOT NULL DEFAULT '', CONSTRAINT "PK_da42ce5e5d0dea59b6630abf2ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_99231b459ceb49e36d6a693a29" ON "service_category_stat_translations" ("stat_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_products" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sort_order" integer NOT NULL DEFAULT '0', "category_id" uuid, "image_id" uuid, "duration_label" character varying(10), "tags" text array NOT NULL DEFAULT '{}', "anchor" character varying(100), CONSTRAINT "PK_0168f1e0169fa6c665d3fec6487" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ff2c62712ccf7086b1815cc53f" ON "service_category_products" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_product_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "product_id" uuid NOT NULL, "name" character varying(200) NOT NULL DEFAULT '', "description" character varying(600) NOT NULL DEFAULT '', CONSTRAINT "PK_c32b3402142fbce43073828821e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_96191c2de30b2b399bcad18656" ON "service_category_product_translations" ("product_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_process_steps" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sort_order" integer NOT NULL DEFAULT '0', "category_id" uuid, "icon_key" character varying(32) NOT NULL, CONSTRAINT "PK_d2f289b86875137ed9abaf17e5b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_12385fffffc8c66ed9165969c3" ON "service_category_process_steps" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_partner_banners" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sort_order" integer NOT NULL DEFAULT '0', "category_id" uuid, "image_id" uuid, "cta_href" character varying(500) NOT NULL, CONSTRAINT "PK_f9a88c2caa53224d82f8a033b4a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5c770bcf9691471bea3a27ce6f" ON "service_category_partner_banners" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_process_step_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "step_id" uuid NOT NULL, "title" character varying(200) NOT NULL DEFAULT '', "description" character varying(400) NOT NULL DEFAULT '', CONSTRAINT "PK_f090e1376479177f14bd7f5ee8e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f7592cc2b089cb85f6a124d859" ON "service_category_process_step_translations" ("step_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_faq_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sort_order" integer NOT NULL DEFAULT '0', "category_id" uuid, CONSTRAINT "PK_dae77103dc3bc83ce2e7ab05686" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b176cfdea0bd452a6b7bef481b" ON "service_category_faq_items" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_faq_item_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "item_id" uuid NOT NULL, "question" character varying(300) NOT NULL DEFAULT '', "answer" character varying(2000) NOT NULL DEFAULT '', CONSTRAINT "PK_20ac51c36a8767a4a5baeb5e594" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6b87ae39ab9cf83ada701dcad0" ON "service_category_faq_item_translations" ("item_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_partner_banner_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "banner_id" uuid NOT NULL, "label" character varying(150) NOT NULL DEFAULT '', "heading" character varying(300) NOT NULL DEFAULT '', "text" character varying(1000) NOT NULL DEFAULT '', "cta_label" character varying(150) NOT NULL DEFAULT '', CONSTRAINT "PK_831a29b8f6509fe53f80962ee88" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3f0b34a5dec5aa0a16732b93ec" ON "service_category_partner_banner_translations" ("banner_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_case_studies" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sort_order" integer NOT NULL DEFAULT '0', "category_id" uuid, "image_id" uuid, "duration_label" character varying(10), "tags" text array NOT NULL DEFAULT '{}', CONSTRAINT "PK_f355626d8da0d9c057958847eaf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b170d3acdbfb0e14a47c086756" ON "service_category_case_studies" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_category_case_study_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "case_study_id" uuid NOT NULL, "name" character varying(200) NOT NULL DEFAULT '', "description" character varying(600) NOT NULL DEFAULT '', CONSTRAINT "PK_72bcfbc1eaa364820b301543ff8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2c920c0f72129ef8321a58e96c" ON "service_category_case_study_translations" ("case_study_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_category_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "category_id" uuid NOT NULL, "name" character varying(150) NOT NULL DEFAULT '', CONSTRAINT "PK_929da5ae47843716ddd3e85bdfd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_36deab11cfc771b72c572994b9" ON "project_category_translations" ("category_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "slug" character varying(200) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_03d7af35c2601369d030b3617bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_project_categories_slug_active" ON "project_categories" ("slug") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "seo_title" character varying(120), "seo_description" character varying(320), "seo_keywords" character varying(500), "canonical_url" character varying(500), "no_index" boolean NOT NULL DEFAULT false, "og_image_id" uuid, "project_id" uuid NOT NULL, "title" character varying(200) NOT NULL DEFAULT '', "summary" character varying(600) NOT NULL DEFAULT '', "description_html" text NOT NULL DEFAULT '', "industry" character varying(150), CONSTRAINT "PK_619a9179d3ebe007d8411674c2d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_01fd6b8a8eaaf62e9a9ca6af7e" ON "project_translations" ("project_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "slug" character varying(200) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "featured" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', "category_id" uuid, "thumbnail_id" uuid, "client_name" character varying(150), "technologies" text array NOT NULL DEFAULT '{}', "demo_url" character varying(500), "video_url" character varying(500), "has_video" boolean NOT NULL DEFAULT false, "video_duration" character varying(10), "completed_at" date, "published_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c1345700580c6c6b17200647bc" ON "projects" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f127e6cfe632501509c41d9c50" ON "projects" ("status", "sort_order") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_projects_slug_active" ON "projects" ("slug") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_sections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_cc36c24de62e9be3c82f7ce1519" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f5d3fbb18e0b2091120725dddc" ON "project_sections" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_section_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "section_id" uuid NOT NULL, "heading" character varying(200) NOT NULL DEFAULT '', "body_html" text NOT NULL DEFAULT '', CONSTRAINT "PK_04deebd687b9e92280a84aa63a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b42adbf7d8158e5ea0beaaea09" ON "project_section_translations" ("section_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_images" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL, "media_asset_id" uuid NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_7683abb57ed0c0fa8379f54692b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e81131c33ad63221e98cb351c4" ON "project_images" ("project_id", "media_asset_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "slug" character varying(200) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_7069dac60d88408eca56fdc9e0c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_product_categories_slug" ON "product_categories" ("slug") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "slug" character varying(200) NOT NULL, "type" character varying(20) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "published_at" TIMESTAMP WITH TIME ZONE, "is_featured" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', "sku" character varying(64), "category_id" uuid, "cover_image_id" uuid, "demo_url" character varying(500), "demo_mode" character varying(20) NOT NULL DEFAULT 'external', "tech_stack" text array NOT NULL DEFAULT '{}', "specifications" jsonb NOT NULL DEFAULT '{}'::jsonb, "price_on_request" boolean NOT NULL DEFAULT false, "author_id" uuid, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a5f6868c96e0069e699f33e12" ON "products" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7aa83b4e507fd880e677c6d0a" ON "products" ("author_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_public_listing" ON "products" ("status", "published_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_products_sku" ON "products" ("sku") WHERE "deleted_at" IS NULL AND "sku" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_products_slug" ON "products" ("slug") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "seo_title" character varying(120), "seo_description" character varying(320), "seo_keywords" character varying(500), "canonical_url" character varying(500), "no_index" boolean NOT NULL DEFAULT false, "og_image_id" uuid, "product_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "tagline" character varying(300), "description_html" text, "features" jsonb NOT NULL DEFAULT '[]'::jsonb, CONSTRAINT "PK_38feaa5884a6a0171d067cc9d15" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_product_translations_locale" ON "product_translations" ("product_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_prices" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "product_id" uuid NOT NULL, "currency" character varying(3) NOT NULL, "amount" numeric(14,2) NOT NULL, "billing_period" character varying(20) NOT NULL, "is_default" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_31c33ddacf759f7c0e5d327c4bb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_product_prices_default_per_currency" ON "product_prices" ("product_id", "currency") WHERE "is_default" = true`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_product_prices_key" ON "product_prices" ("product_id", "currency", "billing_period") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_images" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "product_id" uuid NOT NULL, "media_asset_id" uuid NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_587421660385b7d4517b87887a" ON "product_images" ("media_asset_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_product_images_asset" ON "product_images" ("product_id", "media_asset_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_category_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "category_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "description" character varying(1000), CONSTRAINT "PK_c128d40f9fc284e8ec5aefd0adb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_product_category_translations_locale" ON "product_category_translations" ("category_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "post_category_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "category_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "description" character varying(500), CONSTRAINT "PK_c49e0db4424fcabee43990272dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_post_category_translations_locale" ON "post_category_translations" ("category_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "post_categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "slug" character varying(200) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9c45c4e9fb6ebf296990e1d3972" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_post_categories_slug" ON "post_categories" ("slug") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "posts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "slug" character varying(200) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "published_at" TIMESTAMP WITH TIME ZONE, "is_featured" boolean NOT NULL DEFAULT false, "category_id" uuid, "cover_image_id" uuid, "author_id" uuid, "author_name" character varying(150) NOT NULL, CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_852f266adc5d67c40405c887b4" ON "posts" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_312c63be865c81b922e39c2475" ON "posts" ("author_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3cb61174373fe05492433f5811" ON "posts" ("status", "published_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_posts_slug" ON "posts" ("slug") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "post_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "seo_title" character varying(120), "seo_description" character varying(320), "seo_keywords" character varying(500), "canonical_url" character varying(500), "no_index" boolean NOT NULL DEFAULT false, "og_image_id" uuid, "post_id" uuid NOT NULL, "title" character varying(255) NOT NULL DEFAULT '', "excerpt" character varying(600) NOT NULL DEFAULT '', "content_html" text NOT NULL DEFAULT '', "tags" text array NOT NULL DEFAULT '{}', "reading_time_minutes" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_977f23a9a89bf4a1a9e2e29c136" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_post_translations_post_locale" ON "post_translations" ("post_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "pages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "path" character varying(200) NOT NULL, "template_key" character varying(60) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "is_system" boolean NOT NULL DEFAULT false, "published_at" TIMESTAMP WITH TIME ZONE, "current_revision_number" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_8f21ed625aa34c8391d636b7d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_aba05a4338b83bab7a04e0865f" ON "pages" ("status") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_pages_path" ON "pages" ("path") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "page_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "seo_title" character varying(120), "seo_description" character varying(320), "seo_keywords" character varying(500), "canonical_url" character varying(500), "no_index" boolean NOT NULL DEFAULT false, "og_image_id" uuid, "page_id" uuid NOT NULL, "title" character varying(200), CONSTRAINT "PK_cbd0b8990d151ff2b201cc104d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_page_translations_page_locale" ON "page_translations" ("page_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "page_sections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "page_id" uuid NOT NULL, "section_key" character varying(80) NOT NULL, "type" character varying(60) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "is_visible" boolean NOT NULL DEFAULT true, "is_system" boolean NOT NULL DEFAULT false, "draft_content" jsonb NOT NULL DEFAULT '{"shared":{},"translations":{}}'::jsonb, "published_content" jsonb, CONSTRAINT "PK_febb265da4ebfa7cf6bb0e732b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fd4e1044ed2cd7886b8b57954c" ON "page_sections" ("page_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_page_sections_page_key" ON "page_sections" ("page_id", "section_key") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "page_section_media" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "section_id" uuid NOT NULL, "media_asset_id" uuid NOT NULL, "field_key" character varying(120) NOT NULL, CONSTRAINT "PK_19c9b984d986e573efd40c24f32" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_36f4b98373610d54b3a4b1f955" ON "page_section_media" ("media_asset_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_page_section_media" ON "page_section_media" ("section_id", "media_asset_id", "field_key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "recipient_id" uuid NOT NULL, "type" character varying(60) NOT NULL, "title" jsonb NOT NULL, "body" jsonb NOT NULL, "entity_name" character varying(100), "entity_id" character varying(100), "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_inbox" ON "notifications" ("recipient_id", "read_at", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "navigation_menus" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "key" character varying(60) NOT NULL, CONSTRAINT "PK_cc28b3f55f02483595bb2f8cf50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_navigation_menus_key" ON "navigation_menus" ("key") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "page_revisions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "page_id" uuid NOT NULL, "revision_number" integer NOT NULL, "snapshot" jsonb NOT NULL, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "note" character varying(300), CONSTRAINT "PK_fe8d2a867b186dba64fcbc31b99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a6478166d4779e0aac30f057a1" ON "page_revisions" ("created_by_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_page_revisions_page_number" ON "page_revisions" ("page_id", "revision_number") `,
    );
    await queryRunner.query(
      `CREATE TABLE "navigation_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "menu_id" uuid NOT NULL, "parent_id" uuid, "sort_order" integer NOT NULL DEFAULT '0', "link_type" character varying(20) NOT NULL, "page_id" uuid, "url" character varying(500), "open_in_new_tab" boolean NOT NULL DEFAULT false, "is_visible" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_b2e93292f6312fafd3dbbf4a1bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ff86a3d97a69f57bf09f1024bf" ON "navigation_items" ("menu_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "navigation_item_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "item_id" uuid NOT NULL, "label" character varying(120) NOT NULL, CONSTRAINT "PK_cb6744c14bb7a153aeca400c260" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_navigation_item_translations_item_locale" ON "navigation_item_translations" ("item_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "media_asset_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "media_asset_id" uuid NOT NULL, "alt_text" character varying(300), "caption" character varying(500), CONSTRAINT "PK_258ca69890395b161b5c5df6b1f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_643cba515282f161b5c52646ff" ON "media_asset_translations" ("media_asset_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "favorites" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "product_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "idx_favorites_product" ON "favorites" ("product_id") `);
    await queryRunner.query(
      `CREATE INDEX "idx_favorites_user_created" ON "favorites" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_favorites_user_product" ON "favorites" ("user_id", "product_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "contacts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "full_name" character varying(150) NOT NULL, "email" character varying(254) NOT NULL, "phone" character varying(32), "subject" character varying(200), "message" text NOT NULL, "locale" character varying(5) NOT NULL DEFAULT 'vi', "source_page" character varying(300), "status" character varying(20) NOT NULL DEFAULT 'new', "assigned_to_id" uuid, "handled_at" TIMESTAMP WITH TIME ZONE, "ip_address" character varying(64), "user_agent" character varying(500), "is_spam" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4317b815c970dfb71c3561e19b" ON "contacts" ("assigned_to_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b01c9f8d9bcfafabc898c15bc" ON "contacts" ("email", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_625b2d8ddb702b0133bf42edf7" ON "contacts" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "contact_notes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "contact_id" uuid NOT NULL, "author_id" uuid, "note" text NOT NULL, CONSTRAINT "PK_263505a5e2d3aa2e4dde9a6bd04" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_073b47f6c912ee4b307c2aba3c" ON "contact_notes" ("contact_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a125fb7e39cc118a3c8890b321" ON "contact_notes" ("author_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "client_location_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(5) NOT NULL, "client_location_id" uuid NOT NULL, "quote" character varying(1000) NOT NULL DEFAULT '', "role" character varying(200) NOT NULL DEFAULT '', "country" character varying(120) NOT NULL DEFAULT '', CONSTRAINT "PK_dfc46c5a2ee495af4c59a84a1f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f7624619b309a2e2bf0c37e999" ON "client_location_translations" ("client_location_id", "locale") `,
    );
    await queryRunner.query(
      `CREATE TABLE "client_locations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, "name" character varying(120) NOT NULL, "x" numeric(5,2) NOT NULL, "y" numeric(5,2) NOT NULL, "latitude" numeric(9,6), "longitude" numeric(9,6), "status" character varying(20) NOT NULL DEFAULT 'hidden', "sort_order" integer NOT NULL DEFAULT '0', "avatar_id" uuid, "cover_image_id" uuid, CONSTRAINT "PK_4f50f42a541ade5171b3a535d53" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ef91acd0e8ff2b81a4fe9557d" ON "client_locations" ("status", "sort_order") `,
    );
    await queryRunner.query(
      `CREATE TABLE "carts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "currency" character varying(3), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_carts_user" ON "carts" ("user_id") `);
    await queryRunner.query(
      `CREATE TABLE "cart_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "cart_id" uuid NOT NULL, "product_id" uuid NOT NULL, "price_id" uuid NOT NULL, "quantity" integer NOT NULL, "unit_price_snapshot" numeric(14,2) NOT NULL, "currency_snapshot" character varying(3) NOT NULL, "billing_period" character varying(20) NOT NULL, "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_370ab62bb2f16b622bb7267d1c" CHECK ("quantity" BETWEEN 1 AND 99), CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cart_items_product" ON "cart_items" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_cart_items_line" ON "cart_items" ("cart_id", "product_id", "billing_period") `,
    );
    await queryRunner.query(
      `CREATE TABLE "password_reset_codes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "code_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f3a88f7bc4536c53f2b277a0b56" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_756e7aedffd312c673850a660b" ON "password_reset_codes" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_421ca49f5a7b180365035267ca" ON "password_reset_codes" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_sessions" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "family_id" uuid NOT NULL, "refresh_token_hash" character(64) NOT NULL, "previous_refresh_token_hash" character(64), "rotated_at" TIMESTAMP WITH TIME ZONE, "user_agent" character varying(400), "ip_address" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_used_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "revoked_reason" character varying(40), "remember_me" boolean NOT NULL DEFAULT false, "admin_session_ended_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_641507381f32580e8479efc36cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_50ccaa6440288a06f0ba693ccc" ON "auth_sessions" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c9278e30a7d85fc2977283c4d2" ON "auth_sessions" ("family_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a4a11809dcf8cdd5fcceec774e" ON "auth_sessions" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_log_entries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actor_id" uuid, "actor_name" character varying(150), "actor_role" character varying(20), "action" character varying(100) NOT NULL, "entity_name" character varying(100), "entity_id" character varying(100), "ip_address" character varying(64), "user_agent" character varying(400), "request_id" character varying(128), "status_code" integer, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "PK_4f2fbddaca7c6531577e79177a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_304a911bfc1c4119a6194bfe1c" ON "audit_log_entries" ("occurred_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c02c6017245e7b8caf9ec188b9" ON "audit_log_entries" ("actor_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c75796d990c79d87bc868b8e28" ON "audit_log_entries" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_819a540de7832126c570c95b4b" ON "audit_log_entries" ("entity_name", "entity_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_identities" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "provider" character varying(20) NOT NULL, "provider_user_id" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_63a29aebcddd09448dbeee4666b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f4e2d640d6834cbc3a473b897f" ON "auth_identities" ("user_id", "provider") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_aa609852756e5772a11b73f8d8" ON "auth_identities" ("provider", "provider_user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_c3401836efedec3bec459c8f818" FOREIGN KEY ("avatar_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonial_translations" ADD CONSTRAINT "FK_26e152a3cadd9fd698d3838892b" FOREIGN KEY ("testimonial_id") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonials" ADD CONSTRAINT "FK_11d8be49535a30f2df2f064c5a3" FOREIGN KEY ("avatar_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_setting_media" ADD CONSTRAINT "FK_850493431598d1f7c36d22277e7" FOREIGN KEY ("setting_id") REFERENCES "site_settings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_setting_media" ADD CONSTRAINT "FK_15004cd816cb0f78986c844992b" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_highlight_translations" ADD CONSTRAINT "FK_0d9bc7c8dbef3b3fd51044b0528" FOREIGN KEY ("highlight_id") REFERENCES "service_highlights"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_translations" ADD CONSTRAINT "FK_9cc893a2e506c758855b7e0e62f" FOREIGN KEY ("og_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_translations" ADD CONSTRAINT "FK_e77583c1343d371e68d48378fef" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_categories" ADD CONSTRAINT "FK_aaf9113edf63f2d285a3f89251c" FOREIGN KEY ("cover_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_categories" ADD CONSTRAINT "FK_a8441617c6edb2b7108b5ad2ca8" FOREIGN KEY ("hero_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_why_us_items" ADD CONSTRAINT "FK_c43ac09756caf4f61d96c0bacdd" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_testimonials" ADD CONSTRAINT "FK_c59abb809f2145753bf18a13260" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_testimonials" ADD CONSTRAINT "FK_c5795c0058395e5989735b77729" FOREIGN KEY ("avatar_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_why_us_item_translations" ADD CONSTRAINT "FK_bf48d276df89bd790440768c50a" FOREIGN KEY ("item_id") REFERENCES "service_category_why_us_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_testimonial_translations" ADD CONSTRAINT "FK_163596bb805b87d550ad76ca12c" FOREIGN KEY ("testimonial_id") REFERENCES "service_category_testimonials"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_stats" ADD CONSTRAINT "FK_2680a6a426d681ef90ffe52bdef" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_stat_translations" ADD CONSTRAINT "FK_4be21ed5c645cba9a55921109b4" FOREIGN KEY ("stat_id") REFERENCES "service_category_stats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_products" ADD CONSTRAINT "FK_ff2c62712ccf7086b1815cc53fb" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_products" ADD CONSTRAINT "FK_e8ef5ac49052aed58f70805fde7" FOREIGN KEY ("image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_product_translations" ADD CONSTRAINT "FK_7afa87a1c6815504562c8c556fa" FOREIGN KEY ("product_id") REFERENCES "service_category_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_process_steps" ADD CONSTRAINT "FK_12385fffffc8c66ed9165969c3f" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_partner_banners" ADD CONSTRAINT "FK_5c770bcf9691471bea3a27ce6ff" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_partner_banners" ADD CONSTRAINT "FK_afa06840095bf38dd39c68b8527" FOREIGN KEY ("image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_process_step_translations" ADD CONSTRAINT "FK_373d40052ca26d62061f49450af" FOREIGN KEY ("step_id") REFERENCES "service_category_process_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_faq_items" ADD CONSTRAINT "FK_b176cfdea0bd452a6b7bef481b1" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_faq_item_translations" ADD CONSTRAINT "FK_b7e1a8d48e4e29fe632e5db6667" FOREIGN KEY ("item_id") REFERENCES "service_category_faq_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_partner_banner_translations" ADD CONSTRAINT "FK_19dff35cb1632c6a699d5cc5cd8" FOREIGN KEY ("banner_id") REFERENCES "service_category_partner_banners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_case_studies" ADD CONSTRAINT "FK_b170d3acdbfb0e14a47c0867561" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_case_studies" ADD CONSTRAINT "FK_9b1f4b43ec3d306835b4e44d602" FOREIGN KEY ("image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_case_study_translations" ADD CONSTRAINT "FK_5a8c787b9aaa0eafeb72cb5996c" FOREIGN KEY ("case_study_id") REFERENCES "service_category_case_studies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_category_translations" ADD CONSTRAINT "FK_b3ce7bc73036e5770e9db41a3bb" FOREIGN KEY ("category_id") REFERENCES "project_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_translations" ADD CONSTRAINT "FK_3ab167d86ad598da64ffea33e61" FOREIGN KEY ("og_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_translations" ADD CONSTRAINT "FK_d2b99dca161a1e2ab40620781c9" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_c1345700580c6c6b17200647bcc" FOREIGN KEY ("category_id") REFERENCES "project_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_bea5e6def4b1c138a024800d8c3" FOREIGN KEY ("thumbnail_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_sections" ADD CONSTRAINT "FK_f5d3fbb18e0b2091120725dddc8" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_section_translations" ADD CONSTRAINT "FK_b90ee059a8c355de522b91f884d" FOREIGN KEY ("section_id") REFERENCES "project_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_images" ADD CONSTRAINT "FK_ed4e95a636a14f51e00f1f4c720" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_images" ADD CONSTRAINT "FK_eefb1e6ac017e3531382f13c520" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_49496f682f35afc92ceb8c3ba44" FOREIGN KEY ("cover_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_translations" ADD CONSTRAINT "FK_00b0b327ff39ffa1714f87f92fa" FOREIGN KEY ("og_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_translations" ADD CONSTRAINT "FK_1b7b07c6049367c6446c5ac5605" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_8218c69c7f5a3706662101fa788" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_587421660385b7d4517b87887ae" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_category_translations" ADD CONSTRAINT "FK_9f7ebd612f3211b42010d4bf3aa" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_category_translations" ADD CONSTRAINT "FK_e2abf10c78e5bed85d19fbb2c51" FOREIGN KEY ("category_id") REFERENCES "post_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "FK_852f266adc5d67c40405c887b49" FOREIGN KEY ("category_id") REFERENCES "post_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "FK_a96dc8608c6cd2d6f88b8602423" FOREIGN KEY ("cover_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_translations" ADD CONSTRAINT "FK_e60f9328f17b96a88c1c80608c0" FOREIGN KEY ("og_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_translations" ADD CONSTRAINT "FK_11f143c8b50a9ff60340edca475" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_translations" ADD CONSTRAINT "FK_0c39950a21be5f37e834ee85904" FOREIGN KEY ("og_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_translations" ADD CONSTRAINT "FK_6d1cec12d03e88227d4fa28b6c4" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_sections" ADD CONSTRAINT "FK_fd4e1044ed2cd7886b8b57954c1" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_section_media" ADD CONSTRAINT "FK_bf54e29e0b70411bee97ac9311d" FOREIGN KEY ("section_id") REFERENCES "page_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_section_media" ADD CONSTRAINT "FK_36f4b98373610d54b3a4b1f9554" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_revisions" ADD CONSTRAINT "FK_bb569d1c07aac2ea57cf7a62090" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "navigation_items" ADD CONSTRAINT "FK_ff86a3d97a69f57bf09f1024bf9" FOREIGN KEY ("menu_id") REFERENCES "navigation_menus"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "navigation_items" ADD CONSTRAINT "FK_ccf5fd7b1b260cc40d67ad3c043" FOREIGN KEY ("parent_id") REFERENCES "navigation_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "navigation_items" ADD CONSTRAINT "FK_43fd517b38e1204e3c67c8f33db" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "navigation_item_translations" ADD CONSTRAINT "FK_03da08a55cff6a7e1d6fc6f3a6a" FOREIGN KEY ("item_id") REFERENCES "navigation_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_asset_translations" ADD CONSTRAINT "FK_86c51b0c907ff4b12c8a1d74393" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_notes" ADD CONSTRAINT "FK_073b47f6c912ee4b307c2aba3cb" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_location_translations" ADD CONSTRAINT "FK_f6c3582710ea0777ee1bf42bc28" FOREIGN KEY ("client_location_id") REFERENCES "client_locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_locations" ADD CONSTRAINT "FK_002bd18f24f99cb1b5c51ae3104" FOREIGN KEY ("avatar_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_locations" ADD CONSTRAINT "FK_15d11928fd2b30407f6c95bf109" FOREIGN KEY ("cover_image_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_6385a745d9e12a89b859bb25623"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_locations" DROP CONSTRAINT "FK_15d11928fd2b30407f6c95bf109"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_locations" DROP CONSTRAINT "FK_002bd18f24f99cb1b5c51ae3104"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_location_translations" DROP CONSTRAINT "FK_f6c3582710ea0777ee1bf42bc28"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_notes" DROP CONSTRAINT "FK_073b47f6c912ee4b307c2aba3cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_asset_translations" DROP CONSTRAINT "FK_86c51b0c907ff4b12c8a1d74393"`,
    );
    await queryRunner.query(
      `ALTER TABLE "navigation_item_translations" DROP CONSTRAINT "FK_03da08a55cff6a7e1d6fc6f3a6a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "navigation_items" DROP CONSTRAINT "FK_43fd517b38e1204e3c67c8f33db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "navigation_items" DROP CONSTRAINT "FK_ccf5fd7b1b260cc40d67ad3c043"`,
    );
    await queryRunner.query(
      `ALTER TABLE "navigation_items" DROP CONSTRAINT "FK_ff86a3d97a69f57bf09f1024bf9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_revisions" DROP CONSTRAINT "FK_bb569d1c07aac2ea57cf7a62090"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_section_media" DROP CONSTRAINT "FK_36f4b98373610d54b3a4b1f9554"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_section_media" DROP CONSTRAINT "FK_bf54e29e0b70411bee97ac9311d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_sections" DROP CONSTRAINT "FK_fd4e1044ed2cd7886b8b57954c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_translations" DROP CONSTRAINT "FK_6d1cec12d03e88227d4fa28b6c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_translations" DROP CONSTRAINT "FK_0c39950a21be5f37e834ee85904"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_translations" DROP CONSTRAINT "FK_11f143c8b50a9ff60340edca475"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_translations" DROP CONSTRAINT "FK_e60f9328f17b96a88c1c80608c0"`,
    );
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_a96dc8608c6cd2d6f88b8602423"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_852f266adc5d67c40405c887b49"`);
    await queryRunner.query(
      `ALTER TABLE "post_category_translations" DROP CONSTRAINT "FK_e2abf10c78e5bed85d19fbb2c51"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_category_translations" DROP CONSTRAINT "FK_9f7ebd612f3211b42010d4bf3aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_587421660385b7d4517b87887ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "FK_8218c69c7f5a3706662101fa788"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_translations" DROP CONSTRAINT "FK_1b7b07c6049367c6446c5ac5605"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_translations" DROP CONSTRAINT "FK_00b0b327ff39ffa1714f87f92fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_49496f682f35afc92ceb8c3ba44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_images" DROP CONSTRAINT "FK_eefb1e6ac017e3531382f13c520"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_images" DROP CONSTRAINT "FK_ed4e95a636a14f51e00f1f4c720"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_section_translations" DROP CONSTRAINT "FK_b90ee059a8c355de522b91f884d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_sections" DROP CONSTRAINT "FK_f5d3fbb18e0b2091120725dddc8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_bea5e6def4b1c138a024800d8c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_c1345700580c6c6b17200647bcc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_translations" DROP CONSTRAINT "FK_d2b99dca161a1e2ab40620781c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_translations" DROP CONSTRAINT "FK_3ab167d86ad598da64ffea33e61"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_category_translations" DROP CONSTRAINT "FK_b3ce7bc73036e5770e9db41a3bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_case_study_translations" DROP CONSTRAINT "FK_5a8c787b9aaa0eafeb72cb5996c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_case_studies" DROP CONSTRAINT "FK_9b1f4b43ec3d306835b4e44d602"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_case_studies" DROP CONSTRAINT "FK_b170d3acdbfb0e14a47c0867561"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_partner_banner_translations" DROP CONSTRAINT "FK_19dff35cb1632c6a699d5cc5cd8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_faq_item_translations" DROP CONSTRAINT "FK_b7e1a8d48e4e29fe632e5db6667"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_faq_items" DROP CONSTRAINT "FK_b176cfdea0bd452a6b7bef481b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_process_step_translations" DROP CONSTRAINT "FK_373d40052ca26d62061f49450af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_partner_banners" DROP CONSTRAINT "FK_afa06840095bf38dd39c68b8527"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_partner_banners" DROP CONSTRAINT "FK_5c770bcf9691471bea3a27ce6ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_process_steps" DROP CONSTRAINT "FK_12385fffffc8c66ed9165969c3f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_product_translations" DROP CONSTRAINT "FK_7afa87a1c6815504562c8c556fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_products" DROP CONSTRAINT "FK_e8ef5ac49052aed58f70805fde7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_products" DROP CONSTRAINT "FK_ff2c62712ccf7086b1815cc53fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_stat_translations" DROP CONSTRAINT "FK_4be21ed5c645cba9a55921109b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_stats" DROP CONSTRAINT "FK_2680a6a426d681ef90ffe52bdef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_testimonial_translations" DROP CONSTRAINT "FK_163596bb805b87d550ad76ca12c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_why_us_item_translations" DROP CONSTRAINT "FK_bf48d276df89bd790440768c50a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_testimonials" DROP CONSTRAINT "FK_c5795c0058395e5989735b77729"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_testimonials" DROP CONSTRAINT "FK_c59abb809f2145753bf18a13260"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_why_us_items" DROP CONSTRAINT "FK_c43ac09756caf4f61d96c0bacdd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_categories" DROP CONSTRAINT "FK_a8441617c6edb2b7108b5ad2ca8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_categories" DROP CONSTRAINT "FK_aaf9113edf63f2d285a3f89251c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_translations" DROP CONSTRAINT "FK_e77583c1343d371e68d48378fef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category_translations" DROP CONSTRAINT "FK_9cc893a2e506c758855b7e0e62f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_highlight_translations" DROP CONSTRAINT "FK_0d9bc7c8dbef3b3fd51044b0528"`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_setting_media" DROP CONSTRAINT "FK_15004cd816cb0f78986c844992b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_setting_media" DROP CONSTRAINT "FK_850493431598d1f7c36d22277e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonials" DROP CONSTRAINT "FK_11d8be49535a30f2df2f064c5a3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonial_translations" DROP CONSTRAINT "FK_26e152a3cadd9fd698d3838892b"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_c3401836efedec3bec459c8f818"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aa609852756e5772a11b73f8d8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f4e2d640d6834cbc3a473b897f"`);
    await queryRunner.query(`DROP TABLE "auth_identities"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_819a540de7832126c570c95b4b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c75796d990c79d87bc868b8e28"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c02c6017245e7b8caf9ec188b9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_304a911bfc1c4119a6194bfe1c"`);
    await queryRunner.query(`DROP TABLE "audit_log_entries"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a4a11809dcf8cdd5fcceec774e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c9278e30a7d85fc2977283c4d2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_50ccaa6440288a06f0ba693ccc"`);
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_421ca49f5a7b180365035267ca"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_756e7aedffd312c673850a660b"`);
    await queryRunner.query(`DROP TABLE "password_reset_codes"`);
    await queryRunner.query(`DROP INDEX "public"."uq_cart_items_line"`);
    await queryRunner.query(`DROP INDEX "public"."idx_cart_items_product"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(`DROP INDEX "public"."uq_carts_user"`);
    await queryRunner.query(`DROP TABLE "carts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7ef91acd0e8ff2b81a4fe9557d"`);
    await queryRunner.query(`DROP TABLE "client_locations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f7624619b309a2e2bf0c37e999"`);
    await queryRunner.query(`DROP TABLE "client_location_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a125fb7e39cc118a3c8890b321"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_073b47f6c912ee4b307c2aba3c"`);
    await queryRunner.query(`DROP TABLE "contact_notes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_625b2d8ddb702b0133bf42edf7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4b01c9f8d9bcfafabc898c15bc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4317b815c970dfb71c3561e19b"`);
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(`DROP INDEX "public"."uq_favorites_user_product"`);
    await queryRunner.query(`DROP INDEX "public"."idx_favorites_user_created"`);
    await queryRunner.query(`DROP INDEX "public"."idx_favorites_product"`);
    await queryRunner.query(`DROP TABLE "favorites"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_643cba515282f161b5c52646ff"`);
    await queryRunner.query(`DROP TABLE "media_asset_translations"`);
    await queryRunner.query(`DROP INDEX "public"."uq_navigation_item_translations_item_locale"`);
    await queryRunner.query(`DROP TABLE "navigation_item_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ff86a3d97a69f57bf09f1024bf"`);
    await queryRunner.query(`DROP TABLE "navigation_items"`);
    await queryRunner.query(`DROP INDEX "public"."uq_page_revisions_page_number"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a6478166d4779e0aac30f057a1"`);
    await queryRunner.query(`DROP TABLE "page_revisions"`);
    await queryRunner.query(`DROP INDEX "public"."uq_navigation_menus_key"`);
    await queryRunner.query(`DROP TABLE "navigation_menus"`);
    await queryRunner.query(`DROP INDEX "public"."idx_notifications_inbox"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX "public"."uq_page_section_media"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_36f4b98373610d54b3a4b1f955"`);
    await queryRunner.query(`DROP TABLE "page_section_media"`);
    await queryRunner.query(`DROP INDEX "public"."uq_page_sections_page_key"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fd4e1044ed2cd7886b8b57954c"`);
    await queryRunner.query(`DROP TABLE "page_sections"`);
    await queryRunner.query(`DROP INDEX "public"."uq_page_translations_page_locale"`);
    await queryRunner.query(`DROP TABLE "page_translations"`);
    await queryRunner.query(`DROP INDEX "public"."uq_pages_path"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aba05a4338b83bab7a04e0865f"`);
    await queryRunner.query(`DROP TABLE "pages"`);
    await queryRunner.query(`DROP INDEX "public"."uq_post_translations_post_locale"`);
    await queryRunner.query(`DROP TABLE "post_translations"`);
    await queryRunner.query(`DROP INDEX "public"."uq_posts_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3cb61174373fe05492433f5811"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_312c63be865c81b922e39c2475"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_852f266adc5d67c40405c887b4"`);
    await queryRunner.query(`DROP TABLE "posts"`);
    await queryRunner.query(`DROP INDEX "public"."uq_post_categories_slug"`);
    await queryRunner.query(`DROP TABLE "post_categories"`);
    await queryRunner.query(`DROP INDEX "public"."uq_post_category_translations_locale"`);
    await queryRunner.query(`DROP TABLE "post_category_translations"`);
    await queryRunner.query(`DROP INDEX "public"."uq_product_category_translations_locale"`);
    await queryRunner.query(`DROP TABLE "product_category_translations"`);
    await queryRunner.query(`DROP INDEX "public"."uq_product_images_asset"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_587421660385b7d4517b87887a"`);
    await queryRunner.query(`DROP TABLE "product_images"`);
    await queryRunner.query(`DROP INDEX "public"."uq_product_prices_key"`);
    await queryRunner.query(`DROP INDEX "public"."uq_product_prices_default_per_currency"`);
    await queryRunner.query(`DROP TABLE "product_prices"`);
    await queryRunner.query(`DROP INDEX "public"."uq_product_translations_locale"`);
    await queryRunner.query(`DROP TABLE "product_translations"`);
    await queryRunner.query(`DROP INDEX "public"."uq_products_slug"`);
    await queryRunner.query(`DROP INDEX "public"."uq_products_sku"`);
    await queryRunner.query(`DROP INDEX "public"."idx_products_public_listing"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a7aa83b4e507fd880e677c6d0a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9a5f6868c96e0069e699f33e12"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP INDEX "public"."uq_product_categories_slug"`);
    await queryRunner.query(`DROP TABLE "product_categories"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e81131c33ad63221e98cb351c4"`);
    await queryRunner.query(`DROP TABLE "project_images"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b42adbf7d8158e5ea0beaaea09"`);
    await queryRunner.query(`DROP TABLE "project_section_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f5d3fbb18e0b2091120725dddc"`);
    await queryRunner.query(`DROP TABLE "project_sections"`);
    await queryRunner.query(`DROP INDEX "public"."uq_projects_slug_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f127e6cfe632501509c41d9c50"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c1345700580c6c6b17200647bc"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_01fd6b8a8eaaf62e9a9ca6af7e"`);
    await queryRunner.query(`DROP TABLE "project_translations"`);
    await queryRunner.query(`DROP INDEX "public"."uq_project_categories_slug_active"`);
    await queryRunner.query(`DROP TABLE "project_categories"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_36deab11cfc771b72c572994b9"`);
    await queryRunner.query(`DROP TABLE "project_category_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2c920c0f72129ef8321a58e96c"`);
    await queryRunner.query(`DROP TABLE "service_category_case_study_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b170d3acdbfb0e14a47c086756"`);
    await queryRunner.query(`DROP TABLE "service_category_case_studies"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3f0b34a5dec5aa0a16732b93ec"`);
    await queryRunner.query(`DROP TABLE "service_category_partner_banner_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6b87ae39ab9cf83ada701dcad0"`);
    await queryRunner.query(`DROP TABLE "service_category_faq_item_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b176cfdea0bd452a6b7bef481b"`);
    await queryRunner.query(`DROP TABLE "service_category_faq_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f7592cc2b089cb85f6a124d859"`);
    await queryRunner.query(`DROP TABLE "service_category_process_step_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5c770bcf9691471bea3a27ce6f"`);
    await queryRunner.query(`DROP TABLE "service_category_partner_banners"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_12385fffffc8c66ed9165969c3"`);
    await queryRunner.query(`DROP TABLE "service_category_process_steps"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_96191c2de30b2b399bcad18656"`);
    await queryRunner.query(`DROP TABLE "service_category_product_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ff2c62712ccf7086b1815cc53f"`);
    await queryRunner.query(`DROP TABLE "service_category_products"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_99231b459ceb49e36d6a693a29"`);
    await queryRunner.query(`DROP TABLE "service_category_stat_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2680a6a426d681ef90ffe52bde"`);
    await queryRunner.query(`DROP TABLE "service_category_stats"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dc87c28dda1b580de932389780"`);
    await queryRunner.query(`DROP TABLE "service_category_testimonial_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_77763d32daf055b84535e0aa1e"`);
    await queryRunner.query(`DROP TABLE "service_category_why_us_item_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c59abb809f2145753bf18a1326"`);
    await queryRunner.query(`DROP TABLE "service_category_testimonials"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c43ac09756caf4f61d96c0bacd"`);
    await queryRunner.query(`DROP TABLE "service_category_why_us_items"`);
    await queryRunner.query(`DROP INDEX "public"."uq_service_categories_slug_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_056800d900862090771be9941b"`);
    await queryRunner.query(`DROP TABLE "service_categories"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6a6f31995718717512bde55b2c"`);
    await queryRunner.query(`DROP TABLE "service_category_translations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fd8f70a25e06a012ad6d544662"`);
    await queryRunner.query(`DROP TABLE "service_highlight_translations"`);
    await queryRunner.query(`DROP TABLE "service_highlights"`);
    await queryRunner.query(`DROP INDEX "public"."uq_site_setting_media"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_15004cd816cb0f78986c844992"`);
    await queryRunner.query(`DROP TABLE "site_setting_media"`);
    await queryRunner.query(`DROP INDEX "public"."uq_site_settings_group"`);
    await queryRunner.query(`DROP TABLE "site_settings"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fea2faa202f5f5690bcd5f5673"`);
    await queryRunner.query(`DROP TABLE "testimonials"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_55465d8082b9d4c8a39b5967a4"`);
    await queryRunner.query(`DROP TABLE "testimonial_translations"`);
    await queryRunner.query(`DROP INDEX "public"."uq_ui_translations_namespace_key"`);
    await queryRunner.query(`DROP TABLE "ui_translations"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_email_active"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_phone_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3676155292d72c67cd4e090514"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0ffe9a8b0a2d25bf71f7a0696c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8519ae0d2926772a395d110a1a"`);
    await queryRunner.query(`DROP TABLE "media_assets"`);
  }
}
