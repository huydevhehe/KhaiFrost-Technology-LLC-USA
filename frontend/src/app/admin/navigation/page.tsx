"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronRight,
  CornerDownLeft,
  CornerDownRight,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Field, Input, Panel, Select } from "@/components/admin/ui";
import {
  ErrorState,
  LOCALE_SHORT_LABELS,
  LocaleTabs,
  TableSkeleton,
  useApiAction,
  useApiList,
  useApiResource,
  useConfirm,
  useLocaleTabs,
} from "@/components/admin/shared";
import { ActionButton, Chip, useUnsavedGuard } from "@/components/admin/builder";
import {
  addChild,
  canIndent,
  canOutdent,
  countNodes,
  indentNode,
  moveNode,
  outdentNode,
  removeNode,
  toMenuNodes,
  toNavigationInput,
  toPreview,
  updateNode,
  validateMenu,
  type MenuErrors,
  type MenuNode,
  type NodePath,
  type PreviewNode,
} from "@/components/admin/builder/navigationTree";
import { isApiError } from "@/lib/api/client";
import {
  MAX_NAVIGATION_ITEMS,
  NAVIGATION_LABEL_MAX_LENGTH,
  NAVIGATION_LINK_TYPES,
  NAVIGATION_LINK_TYPE_LABELS,
  NAVIGATION_MENUS,
  NAVIGATION_URL_MAX_LENGTH,
  navigationApi,
  type NavigationLinkType,
  type NavigationMenu,
} from "@/lib/api/admin/navigation";
import type { PageSummary } from "@/lib/api/admin/pages";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { BrandingGroup, CompanyGroup } from "../settings/GroupForms";
import { HeaderFooterTextsPanel } from "./TextsPanel";

interface NodeRowProps {
  node: MenuNode;
  path: NodePath;
  nodes: MenuNode[];
  siblingCount: number;
  pages: PageSummary[];
  errors: MenuErrors;
  disabled: boolean;
  onChange: (nodes: MenuNode[]) => void;
  onRemove: (path: NodePath, node: MenuNode) => void;
}

function describeLink(node: MenuNode, pages: PageSummary[]): string {
  if (node.linkType === "none") return "Không liên kết";
  if (node.linkType === "page") {
    const page = pages.find((p) => p.id === node.pageId);
    return page ? page.path : "Chưa chọn trang";
  }
  return node.url.trim() || "Chưa có đường dẫn";
}

function NodeRow({
  node,
  path,
  nodes,
  siblingCount,
  pages,
  errors,
  disabled,
  onChange,
  onRemove,
}: NodeRowProps) {
  const index = path[path.length - 1];
  const depth = path.length;
  const linkError = errors[`${node.key}.link`];
  const [expanded, setExpanded] = useState(Boolean(linkError));
  const [prevLinkError, setPrevLinkError] = useState(linkError);
  if (linkError !== prevLinkError) {
    setPrevLinkError(linkError);
    if (linkError) setExpanded(true);
  }

  const patch = (changes: Partial<MenuNode>) => onChange(updateNode(nodes, path, changes));

  return (
    <li style={{ marginLeft: (depth - 1) * 20 }}>
      <div
        className={`rounded-lg border ${
          linkError
            ? "border-red-200 bg-white"
            : node.isFeatured
              ? "border-amber-300 bg-amber-50/40"
              : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <ChevronRight
              size={14}
              className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
            <span className="shrink-0 text-xs font-semibold text-slate-400">Cấp {depth}</span>
            <span className="min-w-0 truncate text-sm font-medium text-slate-900">
              {node.labels.vi || "(chưa có nhãn)"}
            </span>
            <span className="shrink-0 truncate font-mono text-xs text-slate-400">
              {describeLink(node, pages)}
            </span>
            {node.children.length > 0 && (
              <span className="shrink-0 text-xs text-slate-400">{node.children.length} mục con</span>
            )}
            {node.isFeatured && <Chip tone="amber">Nổi bật</Chip>}
            {!node.isVisible && <Chip tone="slate">Đang ẩn</Chip>}
            {linkError && <Chip tone="red">Lỗi</Chip>}
          </button>

          {!disabled && (
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onChange(moveNode(nodes, path, -1))}
                aria-label="Di chuyển lên trên"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                disabled={index === siblingCount - 1}
                onClick={() => onChange(moveNode(nodes, path, 1))}
                aria-label="Di chuyển xuống dưới"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                disabled={!canIndent(nodes, path)}
                onClick={() => onChange(indentNode(nodes, path))}
                aria-label="Đưa thành mục con"
                title="Đưa thành mục con"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
              >
                <CornerDownRight size={15} />
              </button>
              <button
                type="button"
                disabled={!canOutdent(path)}
                onClick={() => onChange(outdentNode(nodes, path))}
                aria-label="Đưa lên cấp trên"
                title="Đưa lên cấp trên"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
              >
                <CornerDownLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => onChange(updateNode(nodes, path, { isVisible: !node.isVisible }))}
                aria-label={node.isVisible ? "Ẩn mục" : "Hiện mục"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100"
              >
                {node.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button
                type="button"
                disabled={path.length >= 3}
                onClick={() => onChange(addChild(nodes, path))}
                aria-label="Thêm mục con"
                title="Thêm mục con"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
              >
                <Plus size={15} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(path, node)}
                aria-label="Xoá mục"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>

        {expanded && (
          <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={`Nhãn ${LOCALE_SHORT_LABELS.vi}`} htmlFor={`${node.key}-vi`} required>
                <Input
                  id={`${node.key}-vi`}
                  value={node.labels.vi}
                  maxLength={NAVIGATION_LABEL_MAX_LENGTH}
                  disabled={disabled}
                  onChange={(event) => patch({ labels: { ...node.labels, vi: event.target.value } })}
                />
                {errors[`${node.key}.label.vi`] && (
                  <p role="alert" className="text-xs text-red-600">
                    {errors[`${node.key}.label.vi`]}
                  </p>
                )}
              </Field>
              <Field label={`Nhãn ${LOCALE_SHORT_LABELS.en}`} htmlFor={`${node.key}-en`} required>
                <Input
                  id={`${node.key}-en`}
                  value={node.labels.en}
                  maxLength={NAVIGATION_LABEL_MAX_LENGTH}
                  disabled={disabled}
                  onChange={(event) => patch({ labels: { ...node.labels, en: event.target.value } })}
                />
                {errors[`${node.key}.label.en`] && (
                  <p role="alert" className="text-xs text-red-600">
                    {errors[`${node.key}.label.en`]}
                  </p>
                )}
              </Field>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Loại liên kết" htmlFor={`${node.key}-type`}>
                <Select
                  id={`${node.key}-type`}
                  value={node.linkType}
                  disabled={disabled}
                  onChange={(event) =>
                    patch({ linkType: event.target.value as NavigationLinkType })
                  }
                >
                  {NAVIGATION_LINK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {NAVIGATION_LINK_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </Field>

              {node.linkType === "page" ? (
                <Field label="Trang" htmlFor={`${node.key}-page`}>
                  <Select
                    id={`${node.key}-page`}
                    value={node.pageId ?? ""}
                    disabled={disabled}
                    onChange={(event) => patch({ pageId: event.target.value || null })}
                  >
                    <option value="">— Chọn trang —</option>
                    {pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {(page.title.vi ?? page.path) + ` (${page.path})`}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : node.linkType === "none" ? (
                <div className="flex items-end pb-2 text-xs text-slate-400">
                  Mục này chỉ là tiêu đề nhóm, không dẫn đi đâu.
                </div>
              ) : (
                <Field
                  label={node.linkType === "external" ? "Liên kết ngoài" : "Đường dẫn nội bộ"}
                  htmlFor={`${node.key}-url`}
                >
                  <Input
                    id={`${node.key}-url`}
                    value={node.url}
                    maxLength={NAVIGATION_URL_MAX_LENGTH}
                    disabled={disabled}
                    placeholder={node.linkType === "external" ? "https://…" : "/lien-he"}
                    onChange={(event) => patch({ url: event.target.value })}
                  />
                </Field>
              )}
            </div>

            {linkError && (
              <p role="alert" className="text-xs text-red-600">
                {linkError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex w-fit items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={node.openInNewTab}
                  disabled={disabled || node.linkType === "none"}
                  onChange={(event) => patch({ openInNewTab: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-2 focus:ring-accent/30"
                />
                Mở trong tab mới
              </label>
              <label className="inline-flex w-fit items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={node.isFeatured}
                  disabled={disabled}
                  onChange={(event) => patch({ isFeatured: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-2 focus:ring-accent/30"
                />
                Nổi bật (hiển thị như nút CTA)
              </label>
            </div>
          </div>
        )}
      </div>

      {expanded && node.children.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {node.children.map((child, childIndex) => (
            <NodeRow
              key={child.key}
              node={child}
              path={[...path, childIndex]}
              nodes={nodes}
              siblingCount={node.children.length}
              pages={pages}
              errors={errors}
              disabled={disabled}
              onChange={onChange}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function PreviewList({ items }: { items: PreviewNode[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có mục nào hiển thị.</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700">
            <span className="font-medium">{item.label || "(chưa có nhãn)"}</span>
            {item.href && <span className="font-mono text-xs text-slate-400">{item.href}</span>}
            {item.isFeatured && <Chip tone="amber">Nổi bật</Chip>}
            {item.openInNewTab && <Chip tone="slate">tab mới</Chip>}
          </div>
          {item.children.length > 0 && (
            <div className="ml-4 border-l border-slate-100 pl-2">
              <PreviewList items={item.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

type SectionKey = "header" | "footer" | "branding" | "texts";

const MENU_SECTION_KEYS: SectionKey[] = ["header", "footer"];

/** Each top-level group in the footer menu becomes its own column on the site; more than this overflows the row. */
const MAX_FOOTER_TOP_LEVEL_GROUPS = 5;

const EXTRA_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "branding", label: "Thương hiệu" },
  { key: "texts", label: "Nội dung chữ" },
];

export default function AdminNavigationPage() {
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.NAVIGATION_MANAGE);

  const [menuKey, setMenuKey] = useState<SectionKey>("header");
  const isMenuSection = MENU_SECTION_KEYS.includes(menuKey);
  const menu = useApiResource<NavigationMenu>(isMenuSection ? `/admin/navigation/${menuKey}` : null);
  const pages = useApiList<PageSummary>("/admin/pages", { pageSize: 100 });
  const previewLocale = useLocaleTabs("vi");

  const [draft, setDraft] = useState<{ menuKey: SectionKey; nodes: MenuNode[] } | null>(null);
  const [errors, setErrors] = useState<MenuErrors>({});
  const [conflict, setConflict] = useState(false);
  const save = useApiAction();

  const baseNodes = useMemo(() => toMenuNodes(menu.data?.items ?? []), [menu.data]);
  const nodes = draft && draft.menuKey === menuKey ? draft.nodes : baseNodes;
  const dirty = Boolean(draft && draft.menuKey === menuKey);
  useUnsavedGuard(dirty);

  const setNodes = useCallback(
    (next: MenuNode[]) => {
      setDraft({ menuKey, nodes: next });
      setErrors({});
    },
    [menuKey],
  );

  const pathOfPage = useCallback(
    (pageId: string) => pages.items.find((page) => page.id === pageId)?.path ?? null,
    [pages.items],
  );

  const preview = useMemo(
    () => toPreview(nodes, previewLocale.locale, pathOfPage),
    [nodes, pathOfPage, previewLocale.locale],
  );

  const switchMenu = useCallback(
    async (key: SectionKey) => {
      if (key === menuKey) return;
      if (isMenuSection && dirty) {
        const ok = await confirm({
          title: "Bỏ thay đổi chưa lưu?",
          message: "Menu đang sửa chưa được lưu. Chuyển menu khác sẽ mất thay đổi.",
          confirmLabel: "Bỏ thay đổi",
          danger: true,
        });
        if (!ok) return;
      }
      setDraft(null);
      setErrors({});
      setMenuKey(key);
    },
    [confirm, dirty, isMenuSection, menuKey],
  );

  const handleRemove = useCallback(
    async (path: NodePath, node: MenuNode) => {
      const ok = await confirm({
        title: "Xoá mục này?",
        message:
          node.children.length > 0
            ? `“${node.labels.vi || "(chưa có nhãn)"}” và ${node.children.length} mục con sẽ bị xoá khỏi menu.`
            : `“${node.labels.vi || "(chưa có nhãn)"}” sẽ bị xoá khỏi menu.`,
        confirmLabel: "Xoá",
        danger: true,
      });
      if (!ok) return;
      setNodes(removeNode(nodes, path));
    },
    [confirm, nodes, setNodes],
  );

  const handleSave = useCallback(async () => {
    if (!menu.data) return;
    const found = validateMenu(nodes);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const saved = await save.run(
      () =>
        navigationApi.replace(menuKey, {
          version: menu.data?.version ?? 0,
          items: toNavigationInput(nodes),
        }),
      {
        successMessage: "Đã lưu menu.",
        onError: (error) => {
          if (isApiError(error) && error.code === "VERSION_CONFLICT") setConflict(true);
          if (isApiError(error) && error.code === "VALIDATION_FAILED") {
            const messages = error.fieldErrors
              .map((item) => `${item.field}: ${item.messages.join(", ")}`)
              .join(" · ");
            setErrors({ __server: messages });
          }
        },
      },
    );
    if (saved) {
      menu.setData(saved);
      setDraft(null);
      setConflict(false);
    }
  }, [menu, menuKey, nodes, save]);

  const total = countNodes(nodes);
  const footerTopLevelFull = menuKey === "footer" && nodes.length >= MAX_FOOTER_TOP_LEVEL_GROUPS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Header & Footer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Toàn bộ nội dung ở đầu và chân trang: menu, thương hiệu, thông tin liên hệ và chữ tĩnh.
          </p>
        </div>
        {isMenuSection && canManage && (
          <div className="flex items-center gap-3">
            {dirty && <span className="text-xs text-amber-600">Có thay đổi chưa lưu</span>}
            <ActionButton
              tone="primary"
              icon={<Save size={15} />}
              pending={save.pending}
              disabled={!dirty}
              onClick={() => void handleSave()}
            >
              Lưu menu
            </ActionButton>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[...NAVIGATION_MENUS, ...EXTRA_SECTIONS].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => void switchMenu(item.key as SectionKey)}
            aria-pressed={item.key === menuKey}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              item.key === menuKey
                ? "bg-accent text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isMenuSection && conflict && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <span>Người khác vừa lưu menu này. Hãy tải lại để lấy phiên bản mới nhất.</span>
          <ActionButton
            size="sm"
            onClick={() => {
              setDraft(null);
              setConflict(false);
              menu.refetch();
            }}
          >
            Tải lại
          </ActionButton>
        </div>
      )}

      {isMenuSection && errors.__server && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.__server}
        </p>
      )}

      {menuKey === "branding" ? (
        <div className="flex flex-col gap-4">
          <BrandingGroup />
          <CompanyGroup />
        </div>
      ) : menuKey === "texts" ? (
        <HeaderFooterTextsPanel canUpdate={hasPermission(PERMISSIONS.UI_TRANSLATION_UPDATE)} />
      ) : (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel
          title={`Cấu trúc menu (${total}/${MAX_NAVIGATION_ITEMS} mục)`}
          action={
            canManage ? (
              <ActionButton
                size="sm"
                icon={<Plus size={14} />}
                disabled={total >= MAX_NAVIGATION_ITEMS || footerTopLevelFull}
                onClick={() => setNodes(addChild(nodes, null))}
              >
                Thêm mục
              </ActionButton>
            ) : undefined
          }
        >
          {menuKey === "footer" && (
            <p className="mb-3 text-xs text-slate-400">
              Mỗi mục cấp 1 hiển thị thành 1 cột ở chân trang, tối đa {MAX_FOOTER_TOP_LEVEL_GROUPS} cột để không bị
              tràn dòng.
            </p>
          )}
          {menu.loading && !menu.data ? (
            <TableSkeleton rows={4} columns={3} />
          ) : menu.error ? (
            <ErrorState error={menu.error} onRetry={menu.refetch} />
          ) : nodes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
              Menu này chưa có mục nào.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {nodes.map((node, index) => (
                <NodeRow
                  key={node.key}
                  node={node}
                  path={[index]}
                  nodes={nodes}
                  siblingCount={nodes.length}
                  pages={pages.items}
                  errors={errors}
                  disabled={!canManage}
                  onChange={setNodes}
                  onRemove={(path, target) => void handleRemove(path, target)}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Xem trước menu" className="h-fit">
          <LocaleTabs
            value={previewLocale.locale}
            onChange={previewLocale.setLocale}
            className="mb-3"
          />
          <PreviewList items={preview} />
          <p className="mt-3 text-xs text-slate-400">
            Mục bị ẩn, mục không có liên kết và không có mục con sẽ không xuất hiện trên website.
          </p>
        </Panel>
      </div>
      )}
    </div>
  );
}
