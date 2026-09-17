export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  changePct: number;
  changeLabel: string;
}

export const dashboardStats: DashboardStat[] = [
  { id: "posts", label: "Bài viết", value: "124", changePct: 12, changeLabel: "so với tháng trước" },
  { id: "projects", label: "Dự án", value: "28", changePct: 8, changeLabel: "so với tháng trước" },
  { id: "views", label: "Lượt xem", value: "12,584", changePct: 24, changeLabel: "so với tháng trước" },
  { id: "contacts", label: "Form liên hệ mới", value: "36", changePct: 18, changeLabel: "so với tháng trước" },
];

// Traffic over the last 12 weeks, arbitrary units for the line chart.
export const trafficSeries: number[] = [320, 410, 380, 460, 520, 480, 560, 610, 590, 650, 700, 760];
export const trafficLabels: string[] = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export interface TrafficSource {
  label: string;
  pct: number;
  color: string;
}

export const trafficSources: TrafficSource[] = [
  { label: "Google", pct: 45, color: "#0EA5E9" },
  { label: "Trực tiếp", pct: 28, color: "#38BDF8" },
  { label: "Social Media", pct: 15, color: "#7DD3FC" },
  { label: "Khác", pct: 12, color: "#BAE6FD" },
];

export interface RecentActivity {
  id: string;
  actor: string;
  action: string;
  timeAgo: string;
}

export const recentActivity: RecentActivity[] = [
  { id: "ACT-1", actor: "Nguyễn Văn B", action: "Đã tạo bài viết mới", timeAgo: "2 phút trước" },
  { id: "ACT-2", actor: "Trần Thị C", action: "Đã cập nhật dự án", timeAgo: "15 phút trước" },
  { id: "ACT-3", actor: "Lê Văn C", action: "Đã thêm testimonial mới", timeAgo: "1 giờ trước" },
  { id: "ACT-4", actor: "Phạm Thị D", action: "Đã cập nhật SEO trang chủ", timeAgo: "3 giờ trước" },
];
