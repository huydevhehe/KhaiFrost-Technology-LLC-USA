export interface AdminMediaItem {
  id: string;
  url: string;
  name: string;
  uploadedDate: string;
  sizeKb: number;
}

export const mockMedia: AdminMediaItem[] = [
  { id: "MED-001", url: "/images/placeholders/project-1.jpg", name: "project-1.jpg", uploadedDate: "01/06/2025", sizeKb: 214 },
  { id: "MED-002", url: "/images/placeholders/project-2.jpg", name: "project-2.jpg", uploadedDate: "02/06/2025", sizeKb: 198 },
  { id: "MED-003", url: "/images/placeholders/project-3.jpg", name: "project-3.jpg", uploadedDate: "03/06/2025", sizeKb: 256 },
  { id: "MED-004", url: "/images/placeholders/blog-1.jpg", name: "blog-1.jpg", uploadedDate: "04/06/2025", sizeKb: 189 },
  { id: "MED-005", url: "/images/placeholders/blog-2.jpg", name: "blog-2.jpg", uploadedDate: "05/06/2025", sizeKb: 233 },
  { id: "MED-006", url: "/images/placeholders/blog-3.jpg", name: "blog-3.jpg", uploadedDate: "06/06/2025", sizeKb: 175 },
  { id: "MED-007", url: "/images/placeholders/blog-4.jpg", name: "blog-4.jpg", uploadedDate: "07/06/2025", sizeKb: 201 },
  { id: "MED-008", url: "/images/placeholders/testimonial-1.jpg", name: "testimonial-1.jpg", uploadedDate: "08/06/2025", sizeKb: 122 },
  { id: "MED-009", url: "/images/placeholders/testimonial-2.jpg", name: "testimonial-2.jpg", uploadedDate: "09/06/2025", sizeKb: 130 },
  { id: "MED-010", url: "/images/placeholders/testimonial-3.jpg", name: "testimonial-3.jpg", uploadedDate: "10/06/2025", sizeKb: 141 },
];
