import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { ClientLocationTranslation } from '../../../src/modules/client-locations/entities/client-location-translation.entity';
import { ClientLocation } from '../../../src/modules/client-locations/entities/client-location.entity';
import { ClientLocationsModule } from '../../../src/modules/client-locations/client-locations.module';
import { MediaAssetTranslation } from '../../../src/modules/media/entities/media-asset-translation.entity';
import { MediaAsset } from '../../../src/modules/media/entities/media-asset.entity';
import { MediaModule } from '../../../src/modules/media/media.module';
import { NavigationItemTranslation } from '../../../src/modules/navigation/entities/navigation-item-translation.entity';
import { NavigationItem } from '../../../src/modules/navigation/entities/navigation-item.entity';
import { NavigationMenu } from '../../../src/modules/navigation/entities/navigation-menu.entity';
import { NavigationModule } from '../../../src/modules/navigation/navigation.module';
import { PageRevision } from '../../../src/modules/pages/entities/page-revision.entity';
import { PageSectionMedia } from '../../../src/modules/pages/entities/page-section-media.entity';
import { PageSection } from '../../../src/modules/pages/entities/page-section.entity';
import { PageTranslation } from '../../../src/modules/pages/entities/page-translation.entity';
import { Page } from '../../../src/modules/pages/entities/page.entity';
import { PagesModule } from '../../../src/modules/pages/pages.module';
import { PostCategoryTranslation } from '../../../src/modules/posts/entities/post-category-translation.entity';
import { PostCategory } from '../../../src/modules/posts/entities/post-category.entity';
import { PostTranslation } from '../../../src/modules/posts/entities/post-translation.entity';
import { Post } from '../../../src/modules/posts/entities/post.entity';
import { PostsModule } from '../../../src/modules/posts/posts.module';
import { ProductCategoryTranslation } from '../../../src/modules/products/entities/product-category-translation.entity';
import { ProductCategory } from '../../../src/modules/products/entities/product-category.entity';
import { ProductImage } from '../../../src/modules/products/entities/product-image.entity';
import { ProductPrice } from '../../../src/modules/products/entities/product-price.entity';
import { ProductTranslation } from '../../../src/modules/products/entities/product-translation.entity';
import { Product } from '../../../src/modules/products/entities/product.entity';
import { ProductsModule } from '../../../src/modules/products/products.module';
import { ProjectsModule, PROJECT_ENTITIES } from '../../../src/modules/projects/projects.module';
import {
  ServiceCatalogModule,
  SERVICE_CATALOG_ENTITIES,
} from '../../../src/modules/service-catalog/service-catalog.module';
import { SiteSettingMedia } from '../../../src/modules/settings/entities/site-setting-media.entity';
import { SiteSetting } from '../../../src/modules/settings/entities/site-setting.entity';
import { SettingsModule } from '../../../src/modules/settings/settings.module';
import {
  TestimonialsModule,
  TESTIMONIAL_ENTITIES,
} from '../../../src/modules/testimonials/testimonials.module';
import { UiTranslation } from '../../../src/modules/ui-translations/entities/ui-translation.entity';
import { UiTranslationsModule } from '../../../src/modules/ui-translations/ui-translations.module';
import { User } from '../../../src/modules/users/entities/user.entity';
import { listFiles } from '../../../src/database/seeds/support/list-files';
import { resolveSeedOptions } from '../../../src/database/seeds/seed-runner';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../../support/create-module-testing-context';
import { createImage } from '../../media/support/image-fixtures';

export const SEED_TEST_OWNER = {
  email: 'seed-owner@example.com',
  phone: '+16502530000',
  fullName: 'Seed Owner',
  password: 'Str0ng!Passw0rd#2025',
};

// Every table the seeders write to, taken from the modules' own entity lists
export const SEED_TEST_ENTITIES = [
  MediaAsset,
  MediaAssetTranslation,
  User,
  UiTranslation,
  SiteSetting,
  SiteSettingMedia,
  NavigationMenu,
  NavigationItem,
  NavigationItemTranslation,
  Page,
  PageTranslation,
  PageSection,
  PageSectionMedia,
  PageRevision,
  ...SERVICE_CATALOG_ENTITIES,
  ...PROJECT_ENTITIES,
  ...TESTIMONIAL_ENTITIES,
  ClientLocation,
  ClientLocationTranslation,
  Post,
  PostTranslation,
  PostCategory,
  PostCategoryTranslation,
  Product,
  ProductTranslation,
  ProductPrice,
  ProductImage,
  ProductCategory,
  ProductCategoryTranslation,
];

export function createSeedTestContext(): Promise<ModuleTestingContext> {
  return createModuleTestingContext({
    entities: SEED_TEST_ENTITIES,
    imports: [
      MediaModule,
      UiTranslationsModule,
      SettingsModule,
      NavigationModule,
      ServiceCatalogModule,
      ProjectsModule,
      TestimonialsModule,
      ClientLocationsModule,
      PostsModule,
      PagesModule,
      ProductsModule,
    ],
  });
}

const RASTER_FORMATS: Record<string, 'jpeg' | 'png' | 'webp' | 'avif'> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
  '.avif': 'avif',
};

export interface ImageFixtures {
  directory: string;
  rasterCount: number;
  unsupportedCount: number;
  cleanup(): void;
}

// Mirrors the file tree of frontend/public/images with tiny generated files, so every "/images/..." reference
// in the content resolves while the import stays fast
export async function createImageFixtures(): Promise<ImageFixtures> {
  const realDirectory = resolveSeedOptions().imagesDirectory;
  const directory = mkdtempSync(join(tmpdir(), 'khaifrost-seed-images-'));
  let rasterCount = 0;
  let unsupportedCount = 0;
  for (const file of listFiles(realDirectory)) {
    const relativePath = relative(realDirectory, file);
    const target = join(directory, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    const format = RASTER_FORMATS[extname(file).toLowerCase()];
    if (format) {
      writeFileSync(target, await createImage({ width: 48, height: 32, format }));
      rasterCount += 1;
    } else {
      writeFileSync(target, readFileSync(file));
      unsupportedCount += 1;
    }
  }
  return {
    directory,
    rasterCount,
    unsupportedCount,
    cleanup: () => {
      // Only ever removes the temp directory created above
      if (resolve(directory).startsWith(resolve(tmpdir()))) {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}
