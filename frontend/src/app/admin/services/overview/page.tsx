"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import {
  ErrorState,
  TableSkeleton,
  useApiAction,
  useApiResource,
  useToast,
} from "@/components/admin/shared";
import {
  ActionButton,
  InfoNotice,
  MissingTranslationNotice,
  describeContentError,
  missingTranslationItems,
  useLeaveGuard,
} from "@/components/admin/content";
import { Panel } from "@/components/admin/ui";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  serviceCatalogApi,
  type ServicesOverview,
  type UpdateServicesOverviewInput,
} from "@/lib/api/admin/serviceCatalog";
import {
  BLOCK_CONFIGS,
  BlockListEditor,
  blockFromServer,
  blockMissingLocales,
  blockProblem,
  blockToInput,
  type BlockForm,
  type BlockKey,
} from "../blocks";

type OverviewKey = Extract<BlockKey, "stats" | "processSteps" | "highlights">;

const SECTIONS: { key: OverviewKey; title: string; description: string }[] = [
  {
    key: "stats",
    title: "Số liệu nổi bật",
    description: "Các con số hiển thị đầu trang tổng quan dịch vụ.",
  },
  {
    key: "processSteps",
    title: "Quy trình làm việc",
    description: "Các bước chung áp dụng cho mọi dịch vụ.",
  },
  {
    key: "highlights",
    title: "Điểm nổi bật",
    description: "Những lý do khách hàng tin tưởng dịch vụ của chúng tôi.",
  },
];

type OverviewForm = Record<OverviewKey, BlockForm[]>;

function toForm(data: ServicesOverview): OverviewForm {
  return {
    stats: data.stats.map((raw) => blockFromServer(raw, BLOCK_CONFIGS.stats)),
    processSteps: data.processSteps.map((raw) => blockFromServer(raw, BLOCK_CONFIGS.processSteps)),
    highlights: data.highlights.map((raw) => blockFromServer(raw, BLOCK_CONFIGS.highlights)),
  };
}

function OverviewEditor({
  initial,
  canEdit,
}: {
  initial: ServicesOverview;
  canEdit: boolean;
}) {
  const toast = useToast();
  const action = useApiAction({ showErrorToast: false });
  const [form, setForm] = useState<OverviewForm>(() => toForm(initial));
  const [dirty, setDirty] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);
  const { leave } = useLeaveGuard(dirty);

  const incomplete = SECTIONS.flatMap(({ key }) =>
    form[key].flatMap((block) => blockMissingLocales(block, BLOCK_CONFIGS[key])),
  );

  const save = async () => {
    for (const { key, title } of SECTIONS) {
      for (const [index, block] of form[key].entries()) {
        const issue = blockProblem(block, BLOCK_CONFIGS[key]);
        if (issue) {
          toast.error(`${title}, mục ${index + 1}: ${issue}`);
          return;
        }
      }
    }
    if (incomplete.length > 0) {
      toast.error("Trang tổng quan cần đủ nội dung tiếng Việt và tiếng Anh cho mọi mục.");
      return;
    }
    setMissing(null);
    const saved = await action.run(
      () =>
        serviceCatalogApi.updateOverview({
          stats: form.stats.map((block) => blockToInput(block, BLOCK_CONFIGS.stats)),
          processSteps: form.processSteps.map((block) =>
            blockToInput(block, BLOCK_CONFIGS.processSteps),
          ),
          highlights: form.highlights.map((block) => blockToInput(block, BLOCK_CONFIGS.highlights)),
        } as unknown as UpdateServicesOverviewInput),
      {
        onError: (error) => {
          if (missingTranslationItems(error).length > 0) setMissing(describeContentError(error));
          toast.error(describeContentError(error));
        },
      },
    );
    if (saved) {
      setForm(toForm(saved));
      setDirty(false);
      toast.success("Đã lưu trang tổng quan dịch vụ.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void leave("/admin/services")}
            aria-label="Quay lại danh sách dịch vụ"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Trang tổng quan dịch vụ</h1>
            {dirty && <span className="text-xs text-amber-600">Có thay đổi chưa lưu</span>}
          </div>
        </div>
        <ActionButton
          variant="primary"
          icon={<Save size={15} />}
          pending={action.pending}
          disabled={!canEdit || !dirty}
          onClick={() => void save()}
        >
          Lưu thay đổi
        </ActionButton>
      </div>

      <InfoNotice>
        Trang này không có bản nháp: mọi thay đổi được hiển thị công khai ngay sau khi lưu, nên mỗi
        mục cần đủ tiếng Việt và tiếng Anh.
      </InfoNotice>
      {!canEdit && <InfoNotice>Bạn chỉ có quyền xem trang tổng quan dịch vụ.</InfoNotice>}
      {missing && <MissingTranslationNotice message={missing} />}

      {SECTIONS.map(({ key, title, description }) => (
        <Panel key={key} title={title}>
          <p className="mb-4 text-sm text-slate-500">{description}</p>
          <BlockListEditor
            idPrefix={`overview-${key}`}
            config={BLOCK_CONFIGS[key]}
            blocks={form[key]}
            disabled={!canEdit}
            onChange={(blocks) => {
              setForm((current) => ({ ...current, [key]: blocks }));
              setDirty(true);
            }}
          />
        </Panel>
      ))}
      <Link href="/admin/services" className="text-sm font-medium text-accent hover:underline">
        Về danh sách dịch vụ
      </Link>
    </div>
  );
}

export default function ServicesOverviewAdminPage() {
  const { hasPermission } = useAuth();
  const resource = useApiResource<ServicesOverview>("/admin/services/overview");

  if (resource.loading && !resource.data) return <TableSkeleton rows={6} columns={2} />;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.refetch} />;
  if (!resource.data) return <ErrorState message="Không tải được trang tổng quan dịch vụ." />;

  return (
    <OverviewEditor
      initial={resource.data}
      canEdit={hasPermission(PERMISSIONS.SERVICE_UPDATE)}
    />
  );
}
