// Editable model of a navigation menu tree, mirroring the rules of
// backend/src/modules/navigation/utils/navigation-tree.ts.

import type { Locale } from "@/components/admin/shared";
import {
  MAX_NAVIGATION_DEPTH,
  describeNavigationLinkProblem,
  type NavigationItem,
  type NavigationItemInput,
  type NavigationLinkType,
} from "@/lib/api/admin/navigation";

export interface MenuNode {
  /** Stable React key; not sent to the API. */
  key: string;
  /** Server id, kept so labels and children survive a save. */
  id?: string;
  linkType: NavigationLinkType;
  pageId: string | null;
  url: string;
  openInNewTab: boolean;
  isVisible: boolean;
  labels: Record<Locale, string>;
  children: MenuNode[];
}

/** Position of a node: one index per level. */
export type NodePath = number[];

let counter = 0;
function nextKey(): string {
  counter += 1;
  return `node-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createNode(): MenuNode {
  return {
    key: nextKey(),
    linkType: "path",
    pageId: null,
    url: "",
    openInNewTab: false,
    isVisible: true,
    labels: { vi: "", en: "" },
    children: [],
  };
}

export function toMenuNodes(items: NavigationItem[]): MenuNode[] {
  return items.map((item) => ({
    key: nextKey(),
    id: item.id,
    linkType: item.linkType,
    pageId: item.pageId,
    url: item.url ?? "",
    openInNewTab: item.openInNewTab,
    isVisible: item.isVisible,
    labels: {
      vi: item.translations?.vi?.label ?? "",
      en: item.translations?.en?.label ?? "",
    },
    children: toMenuNodes(item.children ?? []),
  }));
}

export function toNavigationInput(nodes: MenuNode[]): NavigationItemInput[] {
  return nodes.map((node) => ({
    ...(node.id ? { id: node.id } : {}),
    linkType: node.linkType,
    pageId: node.linkType === "page" ? node.pageId : null,
    url: node.linkType === "external" || node.linkType === "path" ? node.url.trim() : null,
    openInNewTab: node.openInNewTab,
    isVisible: node.isVisible,
    translations: {
      vi: { label: node.labels.vi.trim() },
      en: { label: node.labels.en.trim() },
    },
    ...(node.children.length > 0 ? { children: toNavigationInput(node.children) } : {}),
  }));
}

// ---------------------------------------------------------------------------
// Immutable tree operations
// ---------------------------------------------------------------------------

export function nodeAt(nodes: MenuNode[], path: NodePath): MenuNode | null {
  let current: MenuNode | undefined;
  let list = nodes;
  for (const index of path) {
    current = list[index];
    if (!current) return null;
    list = current.children;
  }
  return current ?? null;
}

function replaceList(
  nodes: MenuNode[],
  path: NodePath,
  transform: (list: MenuNode[]) => MenuNode[],
): MenuNode[] {
  if (path.length <= 1) return transform(nodes);
  const [head, ...rest] = path;
  return nodes.map((node, index) =>
    index === head ? { ...node, children: replaceList(node.children, rest, transform) } : node,
  );
}

export function updateNode(
  nodes: MenuNode[],
  path: NodePath,
  changes: Partial<MenuNode>,
): MenuNode[] {
  const last = path[path.length - 1];
  return replaceList(nodes, path, (list) =>
    list.map((node, index) => (index === last ? { ...node, ...changes } : node)),
  );
}

export function removeNode(nodes: MenuNode[], path: NodePath): MenuNode[] {
  const last = path[path.length - 1];
  return replaceList(nodes, path, (list) => list.filter((_, index) => index !== last));
}

export function addChild(nodes: MenuNode[], path: NodePath | null): MenuNode[] {
  if (path === null) return [...nodes, createNode()];
  const last = path[path.length - 1];
  return replaceList(nodes, path, (list) =>
    list.map((node, index) =>
      index === last ? { ...node, children: [...node.children, createNode()] } : node,
    ),
  );
}

export function moveNode(nodes: MenuNode[], path: NodePath, delta: number): MenuNode[] {
  const last = path[path.length - 1];
  const target = last + delta;
  return replaceList(nodes, path, (list) => {
    if (target < 0 || target >= list.length) return list;
    const copy = [...list];
    const [moved] = copy.splice(last, 1);
    copy.splice(target, 0, moved);
    return copy;
  });
}

export function depthOf(node: MenuNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(depthOf));
}

/** A node can become a child of its previous sibling while the tree stays <= 3 levels. */
export function canIndent(nodes: MenuNode[], path: NodePath): boolean {
  const index = path[path.length - 1];
  if (index === 0) return false;
  const node = nodeAt(nodes, path);
  if (!node) return false;
  return path.length + depthOf(node) <= MAX_NAVIGATION_DEPTH;
}

export function indentNode(nodes: MenuNode[], path: NodePath): MenuNode[] {
  if (!canIndent(nodes, path)) return nodes;
  const index = path[path.length - 1];
  return replaceList(nodes, path, (list) => {
    const copy = [...list];
    const [moved] = copy.splice(index, 1);
    const previous = copy[index - 1];
    copy[index - 1] = { ...previous, children: [...previous.children, moved] };
    return copy;
  });
}

export function canOutdent(path: NodePath): boolean {
  return path.length > 1;
}

export function outdentNode(nodes: MenuNode[], path: NodePath): MenuNode[] {
  if (!canOutdent(path)) return nodes;
  const node = nodeAt(nodes, path);
  if (!node) return nodes;
  const parentPath = path.slice(0, -1);
  const withoutNode = removeNode(nodes, path);
  const parentIndex = parentPath[parentPath.length - 1];
  return replaceList(withoutNode, parentPath, (list) => {
    const copy = [...list];
    copy.splice(parentIndex + 1, 0, node);
    return copy;
  });
}

export function countNodes(nodes: MenuNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Problems keyed by node key: `<key>.label.vi`, `<key>.link`. */
export type MenuErrors = Record<string, string>;

export function validateMenu(nodes: MenuNode[], errors: MenuErrors = {}): MenuErrors {
  for (const node of nodes) {
    if (!node.labels.vi.trim()) errors[`${node.key}.label.vi`] = "Nhập nhãn tiếng Việt.";
    if (!node.labels.en.trim()) errors[`${node.key}.label.en`] = "Nhập nhãn tiếng Anh.";
    const problem = describeNavigationLinkProblem({
      linkType: node.linkType,
      pageId: node.pageId,
      url: node.url,
    });
    if (problem) errors[`${node.key}.link`] = problem;
    validateMenu(node.children, errors);
  }
  return errors;
}

export interface PreviewNode {
  key: string;
  label: string;
  href: string | null;
  openInNewTab: boolean;
  children: PreviewNode[];
}

/** What the public menu endpoint would return for this tree. */
export function toPreview(
  nodes: MenuNode[],
  locale: Locale,
  pathOfPage: (pageId: string) => string | null,
): PreviewNode[] {
  return nodes
    .filter((node) => node.isVisible)
    .map((node) => ({
      key: node.key,
      label: node.labels[locale] || node.labels.vi,
      href:
        node.linkType === "page"
          ? node.pageId
            ? pathOfPage(node.pageId)
            : null
          : node.linkType === "none"
            ? null
            : node.url.trim() || null,
      openInNewTab: node.openInNewTab,
      children: toPreview(node.children, locale, pathOfPage),
    }))
    .filter((node) => node.href !== null || node.children.length > 0);
}
