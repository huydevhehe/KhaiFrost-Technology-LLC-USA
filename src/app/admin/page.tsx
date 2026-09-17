import { FileText, Briefcase, Eye, Mail, TrendingUp } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import {
  dashboardStats,
  trafficSeries,
  trafficLabels,
  trafficSources,
  recentActivity,
} from "@/content/admin/mockDashboard";

const statIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  posts: FileText,
  projects: Briefcase,
  views: Eye,
  contacts: Mail,
};

function LineChart({ data, labels }: { data: number[]; labels: string[] }) {
  const width = 560;
  const height = 180;
  const padding = 20;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${
    height - padding
  } Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trafficFill)" />
      <path d={linePath} fill="none" stroke="#0EA5E9" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#0EA5E9" />
      ))}
      {labels.map((label, i) => (
        <text key={label} x={points[i].x} y={height - 2} fontSize="9" textAnchor="middle" fill="#94A3B8">
          {label}
        </text>
      ))}
    </svg>
  );
}

function DonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const size = 160;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const cumulativePct: number[] = [];
  data.reduce((sum, d, i) => {
    cumulativePct[i] = sum;
    return sum + d.pct;
  }, 0);

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          {data.map((d, i) => {
            const dash = (d.pct / 100) * circumference;
            const dashArray = `${dash} ${circumference - dash}`;
            const dashOffset = -((cumulativePct[i] / 100) * circumference);
            return (
              <circle
                key={d.label}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={20}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </g>
      </svg>
      <ul className="flex flex-col gap-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label}
            <span className="ml-auto font-medium text-slate-900">{d.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-sm text-slate-500">Chào mừng trở lại, đây là hoạt động gần đây của hệ thống.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => {
          const Icon = statIcons[stat.id];
          return (
            <Panel key={stat.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {Icon && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon size={16} />
                  </span>
                )}
                {stat.label}
              </div>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendingUp size={13} />+{stat.changePct}% {stat.changeLabel}
              </p>
            </Panel>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Traffic website" className="xl:col-span-2">
          <LineChart data={trafficSeries} labels={trafficLabels} />
        </Panel>
        <Panel title="Nguồn truy cập">
          <DonutChart data={trafficSources} />
        </Panel>
      </div>

      <Panel title="Hoạt động gần đây" action={<button className="text-sm font-medium text-accent hover:underline">Xem tất cả</button>}>
        <ul className="flex flex-col divide-y divide-slate-100">
          {recentActivity.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.actor}</p>
                <p className="text-sm text-slate-500">{item.action}</p>
              </div>
              <span className="text-xs text-slate-400">{item.timeAgo}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
