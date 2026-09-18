export interface CompanySettings {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

export const mockCompanySettings: CompanySettings = {
  companyName: "KhaiFrost Technology LLC",
  email: "contact@khaifrost.com",
  phone: "+1 (713) 555-0100",
  address: "1200 West Loop S #1000, Houston, TX, 77027",
  website: "https://khaifrost.vn",
};

export const mockCurrentAdmin = {
  name: "Nguyễn Văn A",
  email: "admin@khaifrost.com",
  role: "Owner" as const,
  avatarInitials: "NA",
};
