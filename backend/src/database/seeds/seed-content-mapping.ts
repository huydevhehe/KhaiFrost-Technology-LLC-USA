// Mapping tables between the current frontend content and the API. The seeders read these constants, and the
// frontend can use the same tables later to swap its static content files for API calls.

export const SEEDER_NAMES = [
  'bootstrap-owner',
  'media',
  'ui-translations',
  'settings',
  'navigation',
  'service-catalog',
  'projects',
  'testimonials',
  'client-locations',
  'posts',
  'pages',
  'products',
] as const;

export type SeederName = (typeof SEEDER_NAMES)[number];

export interface SourceToApiMapping {
  sourceFile: string;
  exportName: string;
  seeder: SeederName;
  // Public endpoint that serves the same content after seeding (locale via ?locale=vi|en)
  publicEndpoint: string;
  naturalKey: string;
}

export const SOURCE_TO_API: readonly SourceToApiMapping[] = [
  {
    sourceFile: 'public/images/**',
    exportName: '(files)',
    seeder: 'media',
    publicEndpoint: '(media url on every entity)',
    naturalKey: 'sha256 of the file bytes',
  },
  {
    sourceFile: 'src/content/i18n/{vi,en}.json',
    exportName: '(whole file)',
    seeder: 'ui-translations',
    publicEndpoint: 'GET /api/v1/public/ui-translations/:locale',
    naturalKey: 'namespace "translation" + dotted key',
  },
  {
    sourceFile: 'src/content/admin/mockSettings.ts',
    exportName: 'mockCompanySettings',
    seeder: 'settings',
    publicEndpoint: 'GET /api/v1/public/settings (company)',
    naturalKey: 'setting group',
  },
  {
    sourceFile: 'src/content/siteConfig.ts',
    exportName: 'siteConfig',
    seeder: 'settings',
    publicEndpoint: 'GET /api/v1/public/settings (contact, social)',
    naturalKey: 'setting group',
  },
  {
    sourceFile: 'src/content/admin/mockSeo.ts',
    exportName: 'mockSeoSettings[trang-chu]',
    seeder: 'settings',
    publicEndpoint: 'GET /api/v1/public/settings (seoDefaults)',
    naturalKey: 'setting group',
  },
  {
    sourceFile: 'src/content/navLinks.ts',
    exportName: 'navLinks',
    seeder: 'navigation',
    publicEndpoint: 'GET /api/v1/public/navigation/header',
    naturalKey: 'menu key',
  },
  {
    sourceFile: 'src/content/services.ts + serviceCategoryDetails.ts',
    exportName: 'services, serviceCategoryDetails',
    seeder: 'service-catalog',
    publicEndpoint: 'GET /api/v1/public/services and /services/:slug',
    naturalKey: 'slug',
  },
  {
    sourceFile: 'src/content/servicesOverviewPageData.ts + whyUsItems.ts',
    exportName: 'servicesOverviewStats, servicesOverviewProcessSteps, whyUsItems',
    seeder: 'service-catalog',
    publicEndpoint: 'GET /api/v1/public/services/overview',
    naturalKey: 'overview is seeded only while it is empty',
  },
  {
    sourceFile: 'src/content/projects.ts',
    exportName: 'projects',
    seeder: 'projects',
    publicEndpoint: 'GET /api/v1/public/projects',
    naturalKey: 'slug',
  },
  {
    sourceFile: 'src/content/testimonials.ts',
    exportName: 'testimonials',
    seeder: 'testimonials',
    publicEndpoint: 'GET /api/v1/public/testimonials',
    naturalKey: 'authorName + location',
  },
  {
    sourceFile: 'src/content/clientLocations.ts',
    exportName: 'clientLocations',
    seeder: 'client-locations',
    publicEndpoint: 'GET /api/v1/public/client-locations',
    naturalKey: 'name + map position (x, y)',
  },
  {
    sourceFile: 'src/content/blogPosts.ts',
    exportName: 'blogPosts',
    seeder: 'posts',
    publicEndpoint: 'GET /api/v1/public/posts',
    naturalKey: 'slug',
  },
  {
    sourceFile: 'src/app/**/page.tsx + src/content/aboutPageData.ts + i18n',
    exportName: '(page compositions)',
    seeder: 'pages',
    publicEndpoint: 'GET /api/v1/public/pages/by-path?path=/...',
    naturalKey: 'path',
  },
];

export const SERVICE_ICON_BY_SOURCE_ICON: Readonly<Record<string, string>> = {
  ai: 'ai',
  cloud: 'cloud',
  security: 'security',
  code: 'code',
};

export const SOURCE_NAV_LABEL_KEY = (key: string): string => `nav.${key}`;

export interface PostCategoryMapping {
  sourceName: string;
  slug: string;
  vi: string;
  en: string;
}

// mockBlogPosts.ts lists categories by one display name; the missing language is translated
export const POST_CATEGORIES: readonly PostCategoryMapping[] = [
  {
    sourceName: 'AI & Automation',
    slug: 'ai-automation',
    vi: 'AI & Tự động hoá',
    en: 'AI & Automation',
  },
  {
    sourceName: 'Cloud & DevOps',
    slug: 'cloud-devops',
    vi: 'Cloud & DevOps',
    en: 'Cloud & DevOps',
  },
  { sourceName: 'Bảo mật', slug: 'bao-mat', vi: 'Bảo mật', en: 'Security' },
  { sourceName: 'Chuỗi lạnh', slug: 'chuoi-lanh', vi: 'Chuỗi lạnh', en: 'Cold Chain' },
  { sourceName: 'Doanh nghiệp', slug: 'doanh-nghiep', vi: 'Doanh nghiệp', en: 'Business' },
];

export interface PostMapping {
  sourceId: string;
  slug: string;
  categorySourceName: string;
  publishedAt: string;
}

// blogPosts.ts has no category or slug, so both are assigned here; dates come from the "date" field
export const POSTS: readonly PostMapping[] = [
  {
    sourceId: 'b1',
    slug: 'bat-dau-voi-nextjs-14-app-router',
    categorySourceName: 'Cloud & DevOps',
    publishedAt: '2025-08-29T09:00:00.000Z',
  },
  {
    sourceId: 'b2',
    slug: 'tuong-lai-cua-ai-trong-phat-trien-web',
    categorySourceName: 'AI & Automation',
    publishedAt: '2025-08-18T09:00:00.000Z',
  },
  {
    sourceId: 'b3',
    slug: 'thuc-hanh-clean-code-de-de-bao-tri-hon',
    categorySourceName: 'Doanh nghiệp',
    publishedAt: '2025-08-12T09:00:00.000Z',
  },
  {
    sourceId: 'b4',
    slug: 'xay-dung-he-thong-co-kha-nang-mo-rong-cho-doanh-nghiep-hien-dai',
    categorySourceName: 'Cloud & DevOps',
    publishedAt: '2025-08-05T09:00:00.000Z',
  },
];

export interface ProjectCategoryMapping {
  slug: string;
  vi: string;
  en: string;
  // Values of Project.categoryLabel.en in projects.ts that belong to this category
  sourceLabels: readonly string[];
}

// The admin mock names four categories; the public labels of projects.ts are folded onto them
export const PROJECT_CATEGORIES: readonly ProjectCategoryMapping[] = [
  {
    slug: 'ai-automation',
    vi: 'AI & Tự động hoá',
    en: 'AI & Automation',
    sourceLabels: ['AI & Automation'],
  },
  {
    slug: 'aws-cloud-devops',
    vi: 'AWS Cloud & DevOps',
    en: 'AWS Cloud & DevOps',
    sourceLabels: ['AWS Cloud & DevOps'],
  },
  {
    slug: 'security-operations',
    vi: 'Vận hành an ninh mạng',
    en: 'Security Operations',
    sourceLabels: ['Managed Infrastructure & Cybersecurity'],
  },
  {
    slug: 'software-development',
    vi: 'Phát triển phần mềm',
    en: 'Software Development',
    sourceLabels: ['Software & API Development'],
  },
];

export const PROJECT_SLUGS: Readonly<Record<string, string>> = {
  p1: 'ai-le-tan-salon-nha-khoa',
  p2: 'di-chuyen-ha-tang-len-cloud-cho-e-commerce',
  p3: 'trung-tam-giam-sat-an-ninh-mang-soc',
  p4: 'nen-tang-crm-tuy-chinh',
  p5: 'ai-chatbot-ho-tro-khach-hang',
  p6: 'tu-dong-hoa-ha-tang-iac',
};

// Only the projects listed here are featured on the home page and the services overview
export const FEATURED_PROJECT_IDS: readonly string[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

export interface ProductCategoryMapping {
  slug: string;
  vi: string;
  en: string;
  descriptionVi: string;
  descriptionEn: string;
}

// No product content exists in the frontend, so only the categories are created
export const PRODUCT_CATEGORIES: readonly ProductCategoryMapping[] = [
  {
    slug: 'source-code',
    vi: 'Source code',
    en: 'Source code',
    descriptionVi: 'Mã nguồn sẵn sàng triển khai kèm tài liệu hướng dẫn.',
    descriptionEn: 'Ready to deploy source code with documentation.',
  },
  {
    slug: 'hosting-vps',
    vi: 'Hosting & VPS',
    en: 'Hosting & VPS',
    descriptionVi: 'Gói hosting và máy chủ ảo cho website và ứng dụng.',
    descriptionEn: 'Hosting and virtual server plans for websites and applications.',
  },
  {
    slug: 'live-demos',
    vi: 'Live demos',
    en: 'Live demos',
    descriptionVi: 'Bản demo trực tiếp để trải nghiệm trước khi mua.',
    descriptionEn: 'Live demos to try before you buy.',
  },
];

export const NAVIGATION_MENUS = {
  header: 'header',
  footer: 'footer',
} as const;

// Footer columns: heading i18n key, then either nav links or the seeded services
export const FOOTER_COLUMNS = [
  { headingKey: 'footer.quickLinks', source: 'navLinks' },
  { headingKey: 'footer.ourServices', source: 'services' },
  { headingKey: 'footer.contactUs', source: 'contact' },
] as const;

// A link is only seeded when siteConfig holds a real http(s) profile URL for it
export const SOCIAL_NETWORK_BY_LABEL: Readonly<Record<string, string>> = {
  GitHub: 'github',
  LinkedIn: 'linkedin',
  X: 'x',
};

export interface SystemPageMapping {
  path: string;
  templateKey: string;
  // Title i18n key (nav.*) used for both locales
  titleKey: string;
  // mockSeo.ts pageId whose SEO texts apply, if any
  seoPageId: string | null;
  seoOgImage: string;
}

export const SYSTEM_PAGES: readonly SystemPageMapping[] = [
  {
    path: '/',
    templateKey: 'home',
    titleKey: 'nav.home',
    seoPageId: 'trang-chu',
    seoOgImage: '/images/hero/hero-banner.jpg',
  },
  {
    path: '/dich-vu',
    templateKey: 'services',
    titleKey: 'nav.service',
    seoPageId: 'dich-vu',
    seoOgImage: '/images/services-overview/hero.jpg',
  },
  {
    path: '/du-an',
    templateKey: 'projects',
    titleKey: 'nav.discover',
    seoPageId: null,
    seoOgImage: '/images/projects-page/hero.jpg',
  },
  {
    path: '/ve-chung-toi',
    templateKey: 'about',
    titleKey: 'nav.about',
    seoPageId: 've-chung-toi',
    seoOgImage: '/images/about/hero.jpg',
  },
  {
    path: '/lien-he',
    templateKey: 'contact',
    titleKey: 'nav.contact',
    seoPageId: 'lien-he',
    seoOgImage: '/images/map/global-reach.jpg',
  },
];

export const ADMIN_MOCK_CONTENT_NOT_SEEDED = [
  'mockBlogPosts.mockBlogPosts (placeholder bodies, different topics from the public blog)',
  'mockProjects.mockProjects (placeholder gallery entries)',
  'mockServices, mockTestimonials, mockMedia, mockContacts, mockUsers, mockAuditLog, mockDashboard (admin demo data)',
] as const;
