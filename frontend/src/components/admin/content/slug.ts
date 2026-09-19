/** Slug helpers shared by the content editors (bài viết, sản phẩm, dự án). */

const VIETNAMESE_MAP: Record<string, string> = {
  à: "a", á: "a", ạ: "a", ả: "a", ã: "a", â: "a", ầ: "a", ấ: "a", ậ: "a", ẩ: "a", ẫ: "a",
  ă: "a", ằ: "a", ắ: "a", ặ: "a", ẳ: "a", ẵ: "a",
  è: "e", é: "e", ẹ: "e", ẻ: "e", ẽ: "e", ê: "e", ề: "e", ế: "e", ệ: "e", ể: "e", ễ: "e",
  ì: "i", í: "i", ị: "i", ỉ: "i", ĩ: "i",
  ò: "o", ó: "o", ọ: "o", ỏ: "o", õ: "o", ô: "o", ồ: "o", ố: "o", ộ: "o", ổ: "o", ỗ: "o",
  ơ: "o", ờ: "o", ớ: "o", ợ: "o", ở: "o", ỡ: "o",
  ù: "u", ú: "u", ụ: "u", ủ: "u", ũ: "u", ư: "u", ừ: "u", ứ: "u", ự: "u", ử: "u", ữ: "u",
  ỳ: "y", ý: "y", ỵ: "y", ỷ: "y", ỹ: "y",
  đ: "d",
};

/** Backend pattern: lowercase words separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Xây dựng hệ thống" → "xay-dung-he-thong". */
export function slugify(input: string, maxLength = 200): string {
  const lowered = input.toLowerCase();
  let ascii = "";
  for (const char of lowered) ascii += VIETNAMESE_MAP[char] ?? char;
  const combiningMarks = new RegExp("[\\u0300-\\u036f]", "g");
  const normalized = ascii
    .normalize("NFD")
    .replace(combiningMarks, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, maxLength).replace(/-+$/g, "");
}

/** Vietnamese validation message for a slug field, or null when it is fine. */
export function validateSlug(slug: string, maxLength = 200, required = false): string | null {
  const value = slug.trim();
  if (!value) return required ? "Vui lòng nhập đường dẫn." : null;
  if (value.length > maxLength) return `Đường dẫn tối đa ${maxLength} ký tự.`;
  if (!SLUG_PATTERN.test(value)) {
    return "Đường dẫn chỉ gồm chữ thường, số và dấu gạch ngang (ví dụ: bai-viet-moi).";
  }
  return null;
}
