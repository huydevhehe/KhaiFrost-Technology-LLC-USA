import { useMemo } from "react";
import { serviceCategoryDetails } from "@/content/serviceCategoryDetails";
import { servicesOverviewProcessSteps, servicesOverviewStats } from "@/content/servicesOverviewPageData";
import type {
  CategoryIcon,
  ServiceCategoryCaseStudy,
  ServiceCategoryDetail,
  ServiceCategoryFaqItem,
  ServiceCategoryPartnerBanner,
  ServiceCategoryProcessStep,
  ServiceCategoryProduct,
  ServiceCategoryStat,
  ServiceCategoryTestimonial,
  ServiceCategoryWhyUsItem,
} from "@/types";
import {
  asArray,
  localized,
  text,
  useContentLocale,
  usePublicData,
  usePublicDataState,
  type ContentLocale,
} from "./store";

const CATEGORY_ICONS: readonly CategoryIcon[] = [
  "rocket",
  "trendingUp",
  "clock",
  "users",
  "search",
  "lightbulb",
  "settings",
  "lineChart",
  "briefcase",
  "bolt",
  "shield",
  "headset",
  "eye",
  "target",
  "calendar",
  "globe",
  "heart",
];

export function categoryIcon(value: unknown, fallback: CategoryIcon): CategoryIcon {
  return CATEGORY_ICONS.find((i) => i === value) ?? fallback;
}

const EMPTY_LT = { en: "", vi: "" };

interface IconTextDto {
  iconKey?: string;
  title?: string;
  description?: string;
}
interface StatDto {
  iconKey?: string;
  value?: string;
  label?: string;
  description?: string;
}
interface ProcessDto extends IconTextDto {
  step?: string;
}
interface MediaItemDto {
  id?: string;
  durationLabel?: string | null;
  anchor?: string | null;
  tags?: string[];
  imageUrl?: string | null;
  name?: string;
  description?: string;
}
interface TestimonialDto {
  id?: string;
  authorName?: string;
  avatarUrl?: string | null;
  quote?: string;
  authorRole?: string | null;
}
interface FaqDto {
  question?: string;
  answer?: string;
}
interface PartnerBannerDto {
  ctaHref?: string;
  imageUrl?: string | null;
  label?: string;
  heading?: string;
  text?: string;
  ctaLabel?: string;
}

export interface ServiceDetailDto {
  slug?: string;
  categoryName?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string | null;
  productsEyebrow?: string;
  productsHeading?: string;
  productsIntro?: string;
  stats?: StatDto[];
  products?: MediaItemDto[];
  processSteps?: ProcessDto[];
  whyUs?: IconTextDto[];
  caseStudies?: MediaItemDto[];
  testimonials?: TestimonialDto[];
  faq?: FaqDto[];
  partnerBanner?: PartnerBannerDto | null;
}

export function mapStats(
  locale: ContentLocale,
  dtos: StatDto[] | undefined,
  fb: ServiceCategoryStat[],
): ServiceCategoryStat[] {
  const items = asArray<StatDto>(dtos);
  if (items.length === 0) return fb;
  return items.map((d, i) => ({
    icon: categoryIcon(d.iconKey, fb[i]?.icon ?? "rocket"),
    value: text(d.value, fb[i]?.value ?? ""),
    label: localized(locale, d.label, fb[i]?.label ?? EMPTY_LT),
    description: localized(locale, d.description, fb[i]?.description ?? EMPTY_LT),
  }));
}

export function mapProcess(
  locale: ContentLocale,
  dtos: ProcessDto[] | undefined,
  fb: ServiceCategoryProcessStep[],
): ServiceCategoryProcessStep[] {
  const items = asArray<ProcessDto>(dtos);
  if (items.length === 0) return fb;
  return items.map((d, i) => ({
    step: text(d.step, fb[i]?.step ?? String(i + 1).padStart(2, "0")),
    icon: categoryIcon(d.iconKey, fb[i]?.icon ?? "search"),
    title: localized(locale, d.title, fb[i]?.title ?? EMPTY_LT),
    description: localized(locale, d.description, fb[i]?.description ?? EMPTY_LT),
  }));
}

function mapDetail(
  locale: ContentLocale,
  slug: string,
  dto: ServiceDetailDto,
  fb: ServiceCategoryDetail | undefined,
): ServiceCategoryDetail {
  const products = asArray<MediaItemDto>(dto.products);
  const whyUs = asArray<IconTextDto>(dto.whyUs);
  const cases = asArray<MediaItemDto>(dto.caseStudies);
  const testimonials = asArray<TestimonialDto>(dto.testimonials);
  const faq = asArray<FaqDto>(dto.faq);
  const banner = dto.partnerBanner;

  const mappedProducts: ServiceCategoryProduct[] = products.map((p, i) => ({
    id: text(p.id, `product-${i}`),
    name: localized(locale, p.name, fb?.products[i]?.name ?? EMPTY_LT),
    description: localized(locale, p.description, fb?.products[i]?.description ?? EMPTY_LT),
    image: text(p.imageUrl, fb?.products[i]?.image ?? ""),
    duration: text(p.durationLabel, fb?.products[i]?.duration ?? ""),
    tags: asArray<string>(p.tags),
    href: p.anchor ? `/dich-vu/${slug}#${p.anchor}` : (fb?.products[i]?.href ?? `/dich-vu/${slug}`),
  }));
  const mappedWhyUs: ServiceCategoryWhyUsItem[] = whyUs.map((w, i) => ({
    icon: categoryIcon(w.iconKey, fb?.whyUs[i]?.icon ?? "briefcase"),
    title: localized(locale, w.title, fb?.whyUs[i]?.title ?? EMPTY_LT),
    description: localized(locale, w.description, fb?.whyUs[i]?.description ?? EMPTY_LT),
  }));
  const mappedCases: ServiceCategoryCaseStudy[] = cases.map((c, i) => ({
    id: text(c.id, `case-${i}`),
    name: localized(locale, c.name, fb?.caseStudies[i]?.name ?? EMPTY_LT),
    description: localized(locale, c.description, fb?.caseStudies[i]?.description ?? EMPTY_LT),
    image: text(c.imageUrl, fb?.caseStudies[i]?.image ?? ""),
    duration: text(c.durationLabel, fb?.caseStudies[i]?.duration ?? ""),
    tags: asArray<string>(c.tags),
  }));
  const mappedTestimonials: ServiceCategoryTestimonial[] = testimonials.map((t, i) => ({
    id: text(t.id, `testimonial-${i}`),
    quote: localized(locale, t.quote, fb?.testimonials[i]?.quote ?? EMPTY_LT),
    name: text(t.authorName, fb?.testimonials[i]?.name ?? ""),
    role: text(t.authorRole, fb?.testimonials[i]?.role ?? ""),
    avatar: text(t.avatarUrl, fb?.testimonials[i]?.avatar ?? ""),
  }));
  const mappedFaq: ServiceCategoryFaqItem[] = faq.map((f, i) => ({
    question: localized(locale, f.question, fb?.faq[i]?.question ?? EMPTY_LT),
    answer: localized(locale, f.answer, fb?.faq[i]?.answer ?? EMPTY_LT),
  }));

  let partnerBanner: ServiceCategoryPartnerBanner | undefined = fb?.partnerBanner;
  if (banner && (banner.heading || banner.text)) {
    const b = fb?.partnerBanner;
    partnerBanner = {
      label: localized(locale, banner.label, b?.label ?? EMPTY_LT),
      heading: localized(locale, banner.heading, b?.heading ?? EMPTY_LT),
      text: localized(locale, banner.text, b?.text ?? EMPTY_LT),
      ctaLabel: localized(locale, banner.ctaLabel, b?.ctaLabel ?? EMPTY_LT),
      ctaHref: text(banner.ctaHref, b?.ctaHref ?? "/lien-he"),
      image: text(banner.imageUrl, b?.image ?? ""),
    };
  } else if (banner === null) {
    partnerBanner = undefined;
  }

  return {
    slug,
    categoryName: localized(locale, dto.categoryName, fb?.categoryName ?? EMPTY_LT),
    heroTitle: localized(locale, dto.heroTitle, fb?.heroTitle ?? EMPTY_LT),
    heroSubtitle: localized(locale, dto.heroSubtitle, fb?.heroSubtitle ?? EMPTY_LT),
    heroImage: text(dto.heroImageUrl, fb?.heroImage ?? ""),
    stats: mapStats(locale, dto.stats, fb?.stats ?? []),
    productsEyebrow: localized(locale, dto.productsEyebrow, fb?.productsEyebrow ?? EMPTY_LT),
    productsHeading: localized(locale, dto.productsHeading, fb?.productsHeading ?? EMPTY_LT),
    productsIntro: localized(locale, dto.productsIntro, fb?.productsIntro ?? EMPTY_LT),
    products: mappedProducts.length > 0 ? mappedProducts : (fb?.products ?? []),
    process: mapProcess(locale, dto.processSteps, fb?.process ?? []),
    whyUs: mappedWhyUs.length > 0 ? mappedWhyUs : (fb?.whyUs ?? []),
    caseStudies: mappedCases.length > 0 ? mappedCases : (fb?.caseStudies ?? []),
    testimonials: mappedTestimonials.length > 0 ? mappedTestimonials : (fb?.testimonials ?? []),
    partnerBanner,
    faq: mappedFaq.length > 0 ? mappedFaq : (fb?.faq ?? []),
  };
}

export interface ServiceDetailResult {
  /** API detail merged over the static one; the static detail when the API has nothing; undefined for a new slug still loading. */
  category: ServiceCategoryDetail | undefined;
  /** True when the API request failed and there is no static detail for the slug (unknown service). */
  notFound: boolean;
}

export function useServiceDetail(slug: string): ServiceDetailResult {
  const locale = useContentLocale();
  const { data, failed } = usePublicDataState<ServiceDetailDto>(`/public/services/${encodeURIComponent(slug)}`);
  return useMemo(() => {
    const fb = serviceCategoryDetails.find((c) => c.slug === slug);
    if (!data) return { category: fb, notFound: !fb && failed };
    return { category: mapDetail(locale, slug, data, fb), notFound: false };
  }, [locale, slug, data, failed]);
}

// ---------------------------------------------------------------------------
// Overview (GET /public/services/overview): stats strip and process steps
// ---------------------------------------------------------------------------

interface OverviewDto {
  stats?: StatDto[];
  processSteps?: ProcessDto[];
}

export function useServicesOverview(): { stats: ServiceCategoryStat[]; steps: ServiceCategoryProcessStep[] } {
  const locale = useContentLocale();
  const dto = usePublicData<OverviewDto>("/public/services/overview");
  return useMemo(
    () => ({
      stats: mapStats(locale, dto?.stats, servicesOverviewStats),
      steps: mapProcess(locale, dto?.processSteps, servicesOverviewProcessSteps),
    }),
    [locale, dto],
  );
}
