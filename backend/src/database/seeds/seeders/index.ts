import { Seeder } from '../seed.types';
import { BootstrapOwnerSeeder } from './bootstrap-owner.seeder';
import { ClientLocationsSeeder } from './client-locations.seeder';
import { MediaSeeder } from './media.seeder';
import { NavigationSeeder } from './navigation.seeder';
import { PagesSeeder } from './pages.seeder';
import { PostsSeeder } from './posts.seeder';
import { ProductsSeeder } from './products.seeder';
import { ProjectsSeeder } from './projects.seeder';
import { ServiceCatalogSeeder } from './service-catalog.seeder';
import { SettingsSeeder } from './settings.seeder';
import { TestimonialsSeeder } from './testimonials.seeder';
import { UiTranslationsSeeder } from './ui-translations.seeder';

// Execution order: later seeders may rely on the media and the owner created by earlier ones
export function createSeeders(): Seeder[] {
  return [
    new BootstrapOwnerSeeder(),
    new MediaSeeder(),
    new UiTranslationsSeeder(),
    new SettingsSeeder(),
    new NavigationSeeder(),
    new ServiceCatalogSeeder(),
    new ProjectsSeeder(),
    new TestimonialsSeeder(),
    new ClientLocationsSeeder(),
    new PostsSeeder(),
    new PagesSeeder(),
    new ProductsSeeder(),
  ];
}
