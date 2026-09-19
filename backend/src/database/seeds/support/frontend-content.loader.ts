import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';
import type {
  ResourceBundleJson,
  SourceAboutImageBlock,
  SourceAboutTeamMember,
  SourceAdminBlogPost,
  SourceBlogPost,
  SourceCategoryWhyUsItem,
  SourceClientLocation,
  SourceCompanySettings,
  SourceLocalizedText,
  SourceNavLink,
  SourcePageSeo,
  SourceProcessStep,
  SourceProject,
  SourceService,
  SourceServiceCategoryDetail,
  SourceSiteConfig,
  SourceStat,
  SourceTestimonial,
  SourceWhyUsItem,
} from './source-content.types';

// The content files only import types from "@/types", so that aliased import is answered with an empty module
function evaluateTypeScriptModule(source: string, fileName: string): Record<string, unknown> {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName,
  });
  const module = { exports: {} as Record<string, unknown> };
  const requireStub = (specifier: string): unknown => {
    if (specifier === '@/types') return {};
    throw new Error(`${fileName}: unsupported import "${specifier}" in a content file`);
  };
  new Function('exports', 'require', 'module', outputText)(module.exports, requireStub, module);
  return module.exports;
}

// Read only access to frontend/src/content; nothing here ever writes to the frontend folder
export class FrontendContentLoader {
  private readonly cache = new Map<string, Record<string, unknown>>();
  private readonly bundles = new Map<string, ResourceBundleJson>();

  constructor(readonly frontendDirectory: string) {}

  private load(relativePath: string): Record<string, unknown> {
    const cached = this.cache.get(relativePath);
    if (cached) return cached;
    const absolute = join(this.frontendDirectory, 'src', 'content', relativePath);
    const exports = evaluateTypeScriptModule(readFileSync(absolute, 'utf8'), absolute);
    this.cache.set(relativePath, exports);
    return exports;
  }

  private pick<T>(relativePath: string, exportName: string): T {
    const value = this.load(relativePath)[exportName];
    if (value === undefined) throw new Error(`${relativePath} does not export "${exportName}"`);
    return value as T;
  }

  services(): SourceService[] {
    return this.pick('services.ts', 'services');
  }
  whyUsItems(): SourceWhyUsItem[] {
    return this.pick('whyUsItems.ts', 'whyUsItems');
  }
  serviceCategoryDetails(): SourceServiceCategoryDetail[] {
    return this.pick('serviceCategoryDetails.ts', 'serviceCategoryDetails');
  }
  servicesOverviewStats(): SourceStat[] {
    return this.pick('servicesOverviewPageData.ts', 'servicesOverviewStats');
  }
  servicesOverviewProcessSteps(): SourceProcessStep[] {
    return this.pick('servicesOverviewPageData.ts', 'servicesOverviewProcessSteps');
  }
  projects(): SourceProject[] {
    return this.pick('projects.ts', 'projects');
  }
  projectsPageStats(): SourceStat[] {
    return this.pick('projectsPageData.ts', 'projectsPageStats');
  }
  blogPosts(): SourceBlogPost[] {
    return this.pick('blogPosts.ts', 'blogPosts');
  }
  testimonials(): SourceTestimonial[] {
    return this.pick('testimonials.ts', 'testimonials');
  }
  clientLocations(): SourceClientLocation[] {
    return this.pick('clientLocations.ts', 'clientLocations');
  }
  siteConfig(): SourceSiteConfig {
    return this.pick('siteConfig.ts', 'siteConfig');
  }
  navLinks(): SourceNavLink[] {
    return this.pick('navLinks.ts', 'navLinks');
  }
  companySettings(): SourceCompanySettings {
    return this.pick('admin/mockSettings.ts', 'mockCompanySettings');
  }
  seoSettings(): SourcePageSeo[] {
    return this.pick('admin/mockSeo.ts', 'mockSeoSettings');
  }
  adminBlogCategories(): string[] {
    return this.pick('admin/mockBlogPosts.ts', 'blogCategories');
  }
  adminBlogPosts(): SourceAdminBlogPost[] {
    return this.pick('admin/mockBlogPosts.ts', 'mockBlogPosts');
  }
  adminProjectCategories(): string[] {
    return this.pick('admin/mockProjects.ts', 'projectCategories');
  }
  aboutStory(): SourceLocalizedText[] {
    return this.pick('aboutPageData.ts', 'aboutStoryParagraphs');
  }
  aboutStats(): SourceStat[] {
    return this.pick('aboutPageData.ts', 'aboutStats');
  }
  aboutVision(): SourceAboutImageBlock {
    return this.pick('aboutPageData.ts', 'aboutVision');
  }
  aboutMission(): SourceAboutImageBlock {
    return this.pick('aboutPageData.ts', 'aboutMission');
  }
  aboutValues(): SourceCategoryWhyUsItem[] {
    return this.pick('aboutPageData.ts', 'aboutValues');
  }
  aboutTeamMembers(): SourceAboutTeamMember[] {
    return this.pick('aboutPageData.ts', 'aboutTeamMembers');
  }
  aboutOfficeImages(): Record<string, string> {
    return this.pick('aboutPageData.ts', 'aboutOfficeImages');
  }

  // Nested i18next JSON, one file per locale
  uiBundle(locale: 'vi' | 'en'): ResourceBundleJson {
    const cached = this.bundles.get(locale);
    if (cached) return cached;
    const file = join(this.frontendDirectory, 'src', 'content', 'i18n', `${locale}.json`);
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as ResourceBundleJson;
    this.bundles.set(locale, parsed);
    return parsed;
  }

  // Looks a key such as "hero.headline" up in both bundles
  text(key: string): SourceLocalizedText {
    const read = (locale: 'vi' | 'en'): string => {
      let node: string | ResourceBundleJson = this.uiBundle(locale);
      for (const part of key.split('.')) {
        if (typeof node === 'string' || node[part] === undefined) {
          throw new Error(`Missing UI text "${key}" in ${locale}.json`);
        }
        node = node[part];
      }
      if (typeof node !== 'string') throw new Error(`UI text "${key}" is not a string`);
      return node;
    };
    return { vi: read('vi'), en: read('en') };
  }
}
