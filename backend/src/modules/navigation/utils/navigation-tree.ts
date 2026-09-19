import { ValidationErrorDetail } from '../../../common/exceptions/exception.factories';
import {
  MAX_NAVIGATION_DEPTH,
  MAX_NAVIGATION_ITEMS,
  NavigationLinkType,
} from '../constants/navigation-link-type';
import { NavigationItemInputDto } from '../dto/replace-navigation.dto';

export const MENU_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isRelativePath(value: string): boolean {
  return /^\/(?!\/)[^\s\\]*$/.test(value) || /^#[^\s]*$/.test(value);
}

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !/\s/.test(value);
  } catch {
    return false;
  }
}

export interface FlatNavigationNode {
  input: NavigationItemInputDto;
  parentIndex: number | null;
  sortOrder: number;
  depth: number;
}

// Flattens parent-first and reports every structural problem in one pass
export function flattenNavigationTree(items: NavigationItemInputDto[]): {
  nodes: FlatNavigationNode[];
  errors: ValidationErrorDetail[];
} {
  const nodes: FlatNavigationNode[] = [];
  const errors: ValidationErrorDetail[] = [];
  const seenIds = new Set<string>();

  const visit = (
    level: NavigationItemInputDto[],
    parentIndex: number | null,
    depth: number,
    path: string,
  ): void => {
    level.forEach((input, position) => {
      const field = `${path}[${position}]`;
      if (depth > MAX_NAVIGATION_DEPTH) {
        errors.push({
          field,
          messages: [`Menus can be at most ${MAX_NAVIGATION_DEPTH} levels deep`],
        });
        return;
      }
      if (input.id) {
        if (seenIds.has(input.id)) {
          errors.push({
            field: `${field}.id`,
            messages: ['An item id appears more than once (an item cannot be its own ancestor)'],
          });
        }
        seenIds.add(input.id);
      }
      const index = nodes.push({ input, parentIndex, sortOrder: position, depth }) - 1;
      errors.push(...validateLink(input, field));
      if (input.children?.length) visit(input.children, index, depth + 1, `${field}.children`);
    });
  };
  visit(items, null, 1, 'items');

  if (nodes.length > MAX_NAVIGATION_ITEMS) {
    errors.push({ field: 'items', messages: [`At most ${MAX_NAVIGATION_ITEMS} items per menu`] });
  }
  return { nodes, errors };
}

function validateLink(input: NavigationItemInputDto, field: string): ValidationErrorDetail[] {
  const messages: string[] = [];
  switch (input.linkType) {
    case NavigationLinkType.PAGE:
      if (!input.pageId) messages.push('pageId is required for page links');
      break;
    case NavigationLinkType.EXTERNAL:
      if (!input.url || !isHttpUrl(input.url)) messages.push('url must be an http or https url');
      break;
    case NavigationLinkType.PATH:
      if (!input.url || !isRelativePath(input.url)) messages.push('url must be a relative path');
      break;
    default:
      break;
  }
  return messages.length > 0 ? [{ field, messages }] : [];
}
