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
      storageKey: `test/service-catalog/image-${mediaCounter}-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      checksumSha256: 'a'.repeat(64),
    }),
  );
}

export function bilingual<T extends Record<string, unknown>>(vi: T, en: T) {
  return { vi, en };
}

export function completeCategoryPayload(mediaId: string, title = 'AI & Tự động hoá') {
  return {
    iconKey: 'ai',
    coverImageId: mediaId,
    heroImageId: mediaId,
    translations: bilingual(
      {
        title,
        categoryName: 'AI & Automation',
        summary: 'Công cụ AI tự động hoá quy trình.',
        heroTitle: 'Tự động hoá doanh nghiệp bằng AI',
        heroSubtitle: 'Ứng dụng trí tuệ nhân tạo.',
        productsEyebrow: 'Dịch vụ của chúng tôi',
        seoTitle: 'AI & Tự động hoá',
      },
      {
        title: 'AI & Automation',
        categoryName: 'AI & Automation',
        summary: 'AI tools that automate workflows.',
        heroTitle: 'Automate Your Business With AI',
        heroSubtitle: 'Apply artificial intelligence.',
        productsEyebrow: 'Our Services',
        seoTitle: 'AI & Automation',
      },
    ),
    stats: [
      {
        iconKey: 'rocket',
        value: '50+',
        translations: bilingual(
          { label: 'Dự án AI', description: 'Từ startup đến doanh nghiệp lớn' },
          { label: 'AI Projects', description: 'From startups to enterprises' },
        ),
      },
    ],
    products: [
      {
        imageId: mediaId,
        videoUrl: 'https://videos.example.com/ai-receptionist.mp4',
        tags: ['NLP', 'Voice AI'],
        linkType: 'external',
        linkExternalUrl: '/dich-vu/ai-automation',
        translations: bilingual(
          { name: 'AI Lễ tân', description: 'Trả lời điện thoại tự động.' },
          { name: 'AI Receptionist', description: 'Answers calls automatically.' },
        ),
      },
      {
        tags: ['LLM'],
        linkType: 'none',
        translations: bilingual(
          { name: 'AI Nhân viên', description: 'Tự động hoá quy trình nội bộ.' },
          { name: 'AI Employee', description: 'Automates back-office work.' },
        ),
      },
    ],
    processSteps: [
      {
        iconKey: 'search',
        translations: bilingual(
          { title: 'Khảo sát nhu cầu', description: 'Tìm hiểu mục tiêu.' },
          { title: 'Needs Assessment', description: 'Understand your goals.' },
        ),
      },
      {
        iconKey: 'lightbulb',
        translations: bilingual(
          { title: 'Thiết kế giải pháp', description: 'Đề xuất kiến trúc.' },
          { title: 'Solution Design', description: 'Propose an architecture.' },
        ),
      },
    ],
    whyUs: [
      {
        iconKey: 'shield',
        translations: bilingual(
          { title: 'Bảo mật', description: 'Mã hoá dữ liệu.' },
          { title: 'Security', description: 'Encrypted data.' },
        ),
      },
    ],
    caseStudies: [
      {
        imageId: mediaId,
        durationLabel: '02:12',
        tags: ['CRM'],
        translations: bilingual(
          { name: 'Nha khoa SmilePlus', description: 'Tự động đặt lịch.' },
          { name: 'SmilePlus Dental', description: 'Automated booking.' },
        ),
      },
    ],
    testimonials: [
      {
        authorName: 'Nguyễn Thị Mai',
        avatarId: mediaId,
        translations: bilingual(
          { quote: 'Giảm 80% cuộc gọi nhỡ.', authorRole: 'Chủ phòng khám' },
          { quote: 'Missed calls dropped by 80%.', authorRole: 'Clinic owner' },
        ),
      },
    ],
    faq: [
      {
        translations: bilingual(
          { question: 'Mất bao lâu để triển khai?', answer: 'Từ 1 đến 3 tuần.' },
          { question: 'How long does it take?', answer: 'One to three weeks.' },
        ),
      },
    ],
    partnerBanner: {
      imageId: mediaId,
      ctaHref: '/lien-he',
      translations: bilingual(
        {
          label: 'Hợp tác',
          heading: 'Trở thành đối tác',
          text: 'Hoa hồng recurring.',
          ctaLabel: 'Tìm hiểu',
        },
        {
          label: 'Partnership',
          heading: 'Become a partner',
          text: 'Recurring commission.',
          ctaLabel: 'Learn more',
        },
      ),
    },
  };
}
