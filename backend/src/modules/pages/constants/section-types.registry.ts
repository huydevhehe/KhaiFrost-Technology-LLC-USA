export type FieldKind =
  'text' | 'textarea' | 'richtext' | 'url' | 'media' | 'number' | 'boolean' | 'select' | 'list';

export interface LocalizedLabel {
  vi: string;
  en: string;
}

export interface FieldDefinition {
  key: string;
  kind: FieldKind;
  label: LocalizedLabel;
  // Only text, textarea and richtext can be translated; everything else lives in `shared`
  translatable: boolean;
  // Must be filled (in both locales when translatable) before a visible section can be published
  required: boolean;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  options?: string[];
  urlPolicy?: 'web' | 'https-video';
  // For media fields: sibling translatable text field used as alt text
  altFieldKey?: string;
  itemFields?: FieldDefinition[];
  minItems?: number;
  maxItems?: number;
}

export interface SectionTypeDefinition {
  type: string;
  label: LocalizedLabel;
  description: LocalizedLabel;
  fields: FieldDefinition[];
}

export const VIDEO_HOST_ALLOW_LIST: readonly string[] = [
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'vimeo.com',
];

export const FEATURED_COLLECTIONS = [
  'posts',
  'products',
  'projects',
  'services',
  'testimonials',
  'client-locations',
] as const;

export const ICON_KEY_PATTERN = '^[A-Za-z0-9-]{1,40}$';
export const SLUG_PATTERN = '^[a-z0-9]+(-[a-z0-9]+)*$';

interface FieldOptions {
  required?: boolean;
  maxLength?: number;
  pattern?: string;
}

const l = (vi: string, en: string): LocalizedLabel => ({ vi, en });

function translated(
  kind: 'text' | 'textarea' | 'richtext',
  key: string,
  label: LocalizedLabel,
  options: FieldOptions = {},
): FieldDefinition {
  return {
    key,
    kind,
    label,
    translatable: true,
    required: options.required ?? false,
    maxLength: options.maxLength,
    pattern: options.pattern,
  };
}

const text = (key: string, label: LocalizedLabel, options?: FieldOptions) =>
  translated('text', key, label, options);
const textarea = (key: string, label: LocalizedLabel, options?: FieldOptions) =>
  translated('textarea', key, label, options);
const richtext = (key: string, label: LocalizedLabel, options?: FieldOptions) =>
  translated('richtext', key, label, options);

function shared(
  kind: 'text' | 'url' | 'number' | 'boolean',
  key: string,
  label: LocalizedLabel,
  extra: Partial<FieldDefinition> = {},
): FieldDefinition {
  return { key, kind, label, translatable: false, required: false, ...extra };
}

const url = (key: string, label: LocalizedLabel, required = false) =>
  shared('url', key, label, { required, urlPolicy: 'web' });

const media = (
  key: string,
  label: LocalizedLabel,
  options: { required?: boolean; altFieldKey?: string } = {},
): FieldDefinition => ({
  key,
  kind: 'media',
  label,
  translatable: false,
  required: options.required ?? false,
  altFieldKey: options.altFieldKey,
});

const select = (
  key: string,
  label: LocalizedLabel,
  options: string[],
  required = false,
): FieldDefinition => ({ key, kind: 'select', label, translatable: false, required, options });

const list = (
  key: string,
  label: LocalizedLabel,
  itemFields: FieldDefinition[],
  extra: { required?: boolean; maxItems?: number } = {},
): FieldDefinition => ({
  key,
  kind: 'list',
  label,
  translatable: false,
  required: extra.required ?? false,
  itemFields,
  minItems: extra.required ? 1 : 0,
  maxItems: extra.maxItems ?? 50,
});

const eyebrow = () => text('eyebrow', l('Nhãn nhỏ phía trên', 'Eyebrow'), { maxLength: 80 });
const heading = (required = false) =>
  text('heading', l('Tiêu đề', 'Heading'), { required, maxLength: 200 });
const iconField = () =>
  shared('text', 'icon', l('Biểu tượng', 'Icon key'), { maxLength: 40, pattern: ICON_KEY_PATTERN });

const SOCIAL_NETWORKS = ['GitHub', 'LinkedIn', 'X'] as const;

const officeItemFields = (): FieldDefinition[] => [
  text('label', l('Tên văn phòng', 'Office name'), { required: true, maxLength: 150 }),
  shared('text', 'street', l('Địa chỉ', 'Street'), { required: true, maxLength: 200 }),
  shared('text', 'city', l('Thành phố', 'City'), { required: true, maxLength: 120 }),
  shared('text', 'state', l('Bang/Tỉnh', 'State'), { maxLength: 120 }),
  shared('text', 'zip', l('Mã bưu điện', 'Zip code'), { maxLength: 20 }),
  shared('text', 'country', l('Quốc gia', 'Country'), { required: true, maxLength: 120 }),
];

const SECTION_TYPE_LIST: SectionTypeDefinition[] = [
  {
    type: 'hero',
    label: l('Banner đầu trang', 'Hero'),
    description: l(
      'Banner lớn với tiêu đề, mô tả và nút kêu gọi',
      'Large banner with headline and buttons',
    ),
    fields: [
      eyebrow(),
      text('headline', l('Tiêu đề chính', 'Headline'), { required: true, maxLength: 200 }),
      textarea('description', l('Mô tả', 'Description'), { maxLength: 1000 }),
      media('backgroundImage', l('Ảnh nền', 'Background image'), {
        required: true,
        altFieldKey: 'backgroundImageAlt',
      }),
      text('backgroundImageAlt', l('Mô tả ảnh nền', 'Background image alt text'), {
        maxLength: 200,
      }),
      text('primaryCtaLabel', l('Nút chính', 'Primary button label'), { maxLength: 60 }),
      url('primaryCtaUrl', l('Liên kết nút chính', 'Primary button link')),
      text('secondaryCtaLabel', l('Nút phụ', 'Secondary button label'), { maxLength: 60 }),
      url('secondaryCtaUrl', l('Liên kết nút phụ', 'Secondary button link')),
      select('alignment', l('Căn chỉnh', 'Alignment'), ['left', 'center', 'right']),
    ],
  },
  {
    type: 'rich-text',
    label: l('Văn bản', 'Rich text'),
    description: l('Khối văn bản có định dạng', 'A block of formatted text'),
    fields: [
      eyebrow(),
      heading(),
      richtext('body', l('Nội dung', 'Body'), { required: true }),
      select('alignment', l('Căn chỉnh', 'Alignment'), ['left', 'center']),
    ],
  },
  {
    type: 'image-text',
    label: l('Ảnh và văn bản', 'Image with text'),
    description: l(
      'Ảnh đi kèm nội dung, dùng cho câu chuyện, tầm nhìn, sứ mệnh',
      'Image next to content',
    ),
    fields: [
      eyebrow(),
      heading(true),
      richtext('body', l('Nội dung', 'Body')),
      media('image', l('Ảnh', 'Image'), { required: true, altFieldKey: 'imageAlt' }),
      text('imageAlt', l('Mô tả ảnh', 'Image alt text'), { maxLength: 200 }),
      select('imagePosition', l('Vị trí ảnh', 'Image position'), ['left', 'right']),
      text('ctaLabel', l('Nhãn nút', 'Button label'), { maxLength: 60 }),
      url('ctaUrl', l('Liên kết nút', 'Button link')),
    ],
  },
  {
    type: 'stats',
    label: l('Số liệu', 'Stats'),
    description: l('Dải số liệu nổi bật', 'A strip of key figures'),
    fields: [
      eyebrow(),
      heading(),
      textarea('description', l('Mô tả', 'Description'), { maxLength: 1000 }),
      list(
        'items',
        l('Số liệu', 'Figures'),
        [
          iconField(),
          shared('text', 'value', l('Giá trị', 'Value'), { required: true, maxLength: 40 }),
          text('label', l('Nhãn', 'Label'), { required: true, maxLength: 120 }),
          text('description', l('Mô tả', 'Description'), { maxLength: 200 }),
        ],
        { required: true, maxItems: 12 },
      ),
    ],
  },
  {
    type: 'card-grid',
    label: l('Lưới thẻ', 'Card grid'),
    description: l('Lưới thẻ: giá trị cốt lõi, đội ngũ, quy trình, dịch vụ', 'Grid of cards'),
    fields: [
      eyebrow(),
      heading(),
      textarea('intro', l('Giới thiệu', 'Intro'), { maxLength: 1000 }),
      select('columns', l('Số cột', 'Columns'), ['2', '3', '4']),
      list(
        'items',
        l('Thẻ', 'Cards'),
        [
          iconField(),
          shared('text', 'badge', l('Huy hiệu (vd 01)', 'Badge (e.g. 01)'), { maxLength: 40 }),
          media('image', l('Ảnh', 'Image'), { altFieldKey: 'imageAlt' }),
          text('imageAlt', l('Mô tả ảnh', 'Image alt text'), { maxLength: 200 }),
          text('title', l('Tiêu đề', 'Title'), { required: true, maxLength: 160 }),
          textarea('description', l('Mô tả', 'Description'), { maxLength: 600 }),
          text('linkLabel', l('Nhãn liên kết', 'Link label'), { maxLength: 60 }),
          url('linkUrl', l('Liên kết', 'Link')),
        ],
        { required: true, maxItems: 24 },
      ),
    ],
  },
  {
    type: 'cta',
    label: l('Kêu gọi hành động', 'Call to action'),
    description: l('Khối kêu gọi liên hệ', 'Closing call to action block'),
    fields: [
      eyebrow(),
      heading(true),
      textarea('description', l('Mô tả', 'Description'), { maxLength: 1000 }),
      text('buttonLabel', l('Nhãn nút', 'Button label'), { required: true, maxLength: 60 }),
      url('buttonUrl', l('Liên kết nút', 'Button link'), true),
      media('backgroundImage', l('Ảnh nền', 'Background image')),
    ],
  },
  {
    type: 'gallery',
    label: l('Thư viện ảnh', 'Gallery'),
    description: l('Nhóm ảnh kèm chú thích', 'Images with captions'),
    fields: [
      eyebrow(),
      heading(),
      list(
        'items',
        l('Ảnh', 'Images'),
        [
          media('image', l('Ảnh', 'Image'), { required: true, altFieldKey: 'caption' }),
          text('caption', l('Chú thích', 'Caption'), { maxLength: 200 }),
        ],
        { required: true, maxItems: 60 },
      ),
    ],
  },
  {
    type: 'faq',
    label: l('Câu hỏi thường gặp', 'FAQ'),
    description: l('Danh sách hỏi đáp', 'Questions and answers'),
    fields: [
      eyebrow(),
      heading(),
      list(
        'items',
        l('Câu hỏi', 'Questions'),
        [
          text('question', l('Câu hỏi', 'Question'), { required: true, maxLength: 300 }),
          richtext('answer', l('Trả lời', 'Answer'), { required: true }),
        ],
        { required: true, maxItems: 40 },
      ),
    ],
  },
  {
    type: 'video-embed',
    label: l('Video nhúng', 'Video embed'),
    description: l('Video YouTube hoặc Vimeo (https)', 'YouTube or Vimeo video (https only)'),
    fields: [
      eyebrow(),
      heading(),
      textarea('description', l('Mô tả', 'Description'), { maxLength: 1000 }),
      shared('url', 'videoUrl', l('Liên kết video', 'Video url'), {
        required: true,
        urlPolicy: 'https-video',
      }),
      text('videoTitle', l('Tiêu đề video', 'Video title'), { maxLength: 200 }),
      media('posterImage', l('Ảnh bìa', 'Poster image'), { altFieldKey: 'videoTitle' }),
    ],
  },
  {
    type: 'featured-content',
    label: l('Nội dung nổi bật', 'Featured content'),
    description: l(
      'Lấy bài viết, sản phẩm, dự án, dịch vụ hoặc đánh giá từ dữ liệu động',
      'Pulls posts, products, projects, services or testimonials from dynamic collections',
    ),
    fields: [
      eyebrow(),
      heading(),
      text('viewAllLabel', l('Nhãn xem tất cả', 'View all label'), { maxLength: 60 }),
      url('viewAllUrl', l('Liên kết xem tất cả', 'View all link')),
      select('collection', l('Nguồn dữ liệu', 'Collection'), [...FEATURED_COLLECTIONS], true),
      shared('number', 'count', l('Số lượng', 'Count'), { min: 1, max: 12, integer: true }),
      shared('text', 'categorySlug', l('Danh mục (slug)', 'Category slug'), {
        maxLength: 80,
        pattern: SLUG_PATTERN,
      }),
      shared('boolean', 'featuredOnly', l('Chỉ nội dung nổi bật', 'Featured only')),
      select('sort', l('Sắp xếp', 'Sort'), ['newest', 'oldest', 'featured']),
    ],
  },
  {
    type: 'contact-form',
    label: l('Biểu mẫu liên hệ', 'Contact form'),
    description: l(
      'Biểu mẫu liên hệ; nhãn ô nhập nằm ở mục Văn bản giao diện',
      'Contact form; field labels live in UI texts',
    ),
    fields: [
      eyebrow(),
      heading(true),
      textarea('description', l('Mô tả', 'Description'), { maxLength: 1000 }),
      shared('text', 'email', l('Email liên hệ', 'Contact email'), { maxLength: 200 }),
      shared('text', 'phone', l('Số điện thoại', 'Phone number'), { maxLength: 40 }),
      text('address', l('Địa chỉ hiển thị', 'Displayed address'), { maxLength: 300 }),
      list('offices', l('Văn phòng', 'Offices'), officeItemFields(), { maxItems: 10 }),
      list(
        'socialLinks',
        l('Mạng xã hội', 'Social links'),
        [
          select('network', l('Kênh', 'Network'), [...SOCIAL_NETWORKS], true),
          url('url', l('Liên kết', 'Link'), true),
        ],
        { maxItems: 8 },
      ),
    ],
  },
  {
    type: 'offices',
    label: l('Văn phòng', 'Offices'),
    description: l('Danh sách văn phòng của trang này', "This page's own office list"),
    fields: [
      eyebrow(),
      heading(),
      textarea('intro', l('Giới thiệu', 'Intro'), { maxLength: 1000 }),
      list(
        'items',
        l('Văn phòng', 'Offices'),
        [...officeItemFields(), media('image', l('Ảnh', 'Image'), { altFieldKey: 'label' })],
        { maxItems: 10 },
      ),
    ],
  },
  {
    type: 'custom',
    label: l('Tuỳ chỉnh', 'Custom'),
    description: l(
      'Khối tuỳ chỉnh có cấu trúc; không cho phép HTML hoặc script thô',
      'Structured custom block; raw HTML and scripts are not allowed',
    ),
    fields: [
      eyebrow(),
      heading(),
      richtext('body', l('Nội dung', 'Body')),
      media('image', l('Ảnh', 'Image'), { altFieldKey: 'imageAlt' }),
      text('imageAlt', l('Mô tả ảnh', 'Image alt text'), { maxLength: 200 }),
      select('layout', l('Bố cục', 'Layout'), ['default', 'centered', 'split']),
      list(
        'items',
        l('Mục', 'Items'),
        [
          media('image', l('Ảnh', 'Image'), { altFieldKey: 'title' }),
          text('title', l('Tiêu đề', 'Title'), { maxLength: 160 }),
          textarea('description', l('Mô tả', 'Description'), { maxLength: 600 }),
          url('url', l('Liên kết', 'Link')),
        ],
        { maxItems: 24 },
      ),
    ],
  },
];

export const SECTION_TYPES: ReadonlyMap<string, SectionTypeDefinition> = new Map(
  SECTION_TYPE_LIST.map((definition) => [definition.type, definition]),
);

export function getSectionTypeDefinition(type: string): SectionTypeDefinition | undefined {
  return SECTION_TYPES.get(type);
}

export function listSectionTypeDefinitions(): SectionTypeDefinition[] {
  return SECTION_TYPE_LIST;
}

export function isTranslatedList(field: FieldDefinition): boolean {
  return field.kind === 'list' && (field.itemFields ?? []).some((item) => item.translatable);
}
