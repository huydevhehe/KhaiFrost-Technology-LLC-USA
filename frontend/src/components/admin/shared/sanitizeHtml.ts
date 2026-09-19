// Keeps editor output inside the tag set the backend sanitiser preserves.
// Runs in the browser only (DOMParser); on the server the input is returned as is.

const ALLOWED_TAGS = new Set([
  "h2",
  "h3",
  "h4",
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "figure",
  "figcaption",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
]);

/** Elements dropped together with their content. */
const DROPPED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "noscript",
  "template",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "svg",
  "canvas",
  "video",
  "audio",
]);

/** Block wrappers the browser produces that become a paragraph (or vanish). */
const PARAGRAPH_LIKE = new Set(["div", "section", "article", "main", "header", "footer", "aside", "address"]);

const BLOCK_TAGS = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "blockquote",
  "table",
  "figure",
  "pre",
  "hr",
  "li",
]);

const RENAMED_TAGS: Record<string, string> = {
  h1: "h2",
  h5: "h4",
  h6: "h4",
  strike: "s",
  del: "s",
  ins: "u",
  big: "strong",
  small: "em",
};

const ALLOWED_ATTRIBUTES: Record<string, readonly string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  col: ["span"],
  colgroup: ["span"],
};

/** Accepts http(s), mailto, fragments and site-relative paths; rejects javascript:, data: etc. */
export function isSafeHref(value: string): boolean {
  const href = value.trim();
  if (href === "") return false;
  if (/^(https?:|mailto:|tel:)/i.test(href)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false;
  return href.startsWith("/") || href.startsWith("#") || href.startsWith("./") || href.startsWith("../");
}

/** Same rules as links, minus mailto/tel. */
export function isSafeSrc(value: string): boolean {
  const src = value.trim();
  if (src === "") return false;
  if (/^https?:/i.test(src)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return false;
  return src.startsWith("/") || src.startsWith("./") || src.startsWith("../");
}

function unwrap(element: Element): void {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
}

function rename(element: Element, tagName: string): Element {
  const doc = element.ownerDocument;
  const replacement = doc.createElement(tagName);
  while (element.firstChild) replacement.appendChild(element.firstChild);
  element.parentNode?.replaceChild(replacement, element);
  return replacement;
}

function hasBlockChild(element: Element): boolean {
  for (const child of Array.from(element.children)) {
    if (BLOCK_TAGS.has(child.tagName.toLowerCase())) return true;
  }
  return false;
}

function cleanAttributes(element: Element): void {
  const tag = element.tagName.toLowerCase();
  const allowed = ALLOWED_ATTRIBUTES[tag] ?? [];
  for (const attribute of Array.from(element.attributes)) {
    if (!allowed.includes(attribute.name.toLowerCase())) element.removeAttribute(attribute.name);
  }
}

function cleanElement(element: Element): void {
  // Depth first so children are already normalised when the parent is decided.
  for (const child of Array.from(element.childNodes)) cleanNode(child);

  const tag = element.tagName.toLowerCase();

  if (PARAGRAPH_LIKE.has(tag)) {
    if (hasBlockChild(element) || element.childNodes.length === 0) unwrap(element);
    else {
      const paragraph = rename(element, "p");
      cleanAttributes(paragraph);
    }
    return;
  }

  const renamed = RENAMED_TAGS[tag];
  if (renamed) {
    const replacement = rename(element, renamed);
    cleanAttributes(replacement);
    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    unwrap(element);
    return;
  }

  cleanAttributes(element);

  if (tag === "a") {
    const href = element.getAttribute("href") ?? "";
    if (!isSafeHref(href)) {
      element.removeAttribute("href");
      unwrap(element);
      return;
    }
    if (element.getAttribute("target") === "_blank") element.setAttribute("rel", "noopener noreferrer");
    else element.removeAttribute("rel");
  }

  if (tag === "img") {
    const src = element.getAttribute("src") ?? "";
    if (!isSafeSrc(src)) {
      element.parentNode?.removeChild(element);
      return;
    }
    if (!element.hasAttribute("alt")) element.setAttribute("alt", "");
  }
}

function cleanNode(node: ChildNode): void {
  if (node.nodeType === 8) {
    node.parentNode?.removeChild(node);
    return;
  }
  if (node.nodeType !== 1) return;
  const element = node as Element;
  if (DROPPED_TAGS.has(element.tagName.toLowerCase())) {
    element.parentNode?.removeChild(element);
    return;
  }
  cleanElement(element);
}

/**
 * Normalises editor HTML: `<div>` becomes `<p>`, inline styles and classes are
 * dropped, unknown tags are unwrapped and unsafe links/images removed.
 */
export function sanitizeEditorHtml(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
  for (const child of Array.from(doc.body.childNodes)) cleanNode(child);
  return doc.body.innerHTML.trim();
}

/** True when the HTML carries no visible text, image or rule. */
export function isEmptyHtml(html: string): boolean {
  if (!html) return true;
  const withoutTags = html
    .replace(/<(img|hr|table)\b[^>]*>/gi, "x")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return withoutTags === "";
}
