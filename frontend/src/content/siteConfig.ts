import { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  companyName: "KhaiFrost Technology LLC",
  email: "hello@khaifrost.vn",
  phone: "+84 96 123 4567",
  address: "Quận 9, TP. Hồ Chí Minh",
  offices: [
    {
      id: "office-usa",
      label: { en: "Houston, USA", vi: "Houston, Hoa Kỳ" },
      street: "11419 Astoria Blvd",
      city: "Houston",
      state: "TX",
      zip: "77089",
      country: "USA",
      countryCode: "US",
      x: 23.5,
      y: 33.6,
    },
    {
      id: "office-vn",
      label: { en: "Ho Chi Minh City, Vietnam", vi: "TP. Hồ Chí Minh, Việt Nam" },
      street: "2/21 Thanh Xuan 24, Thoi An Ward",
      city: "Ho Chi Minh City",
      zip: "",
      country: "Vietnam",
      countryCode: "VN",
      x: 79.6,
      y: 44,
    },
  ],
  socialLinks: [
    { label: "GitHub", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "X", href: "#" },
  ],
};
