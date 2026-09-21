/**
 * Allow-list HTML sanitizer for CMS-authored content rendered with
 * dangerouslySetInnerHTML (shipping / returns policies).
 *
 * Runs in the browser only (uses DOMParser). Everything not on the allow
 * list is dropped: unknown tags are unwrapped to their text, event handler
 * attributes and javascript:/data: URLs are removed, and script/style/iframe
 * subtrees are discarded entirely.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark', 'sub', 'sup',
  'a', 'span', 'div', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption',
]);

/** Subtrees removed wholesale (their text must not leak either). */
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'svg', 'math',
  'template', 'noscript', 'form', 'input', 'button', 'textarea', 'select',
]);

const GLOBAL_ATTRS = new Set(['class', 'title', 'dir', 'lang']);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  td: new Set(['colspan', 'rowspan']),
  ol: new Set(['start', 'type']),
};

const URL_ATTRS = new Set(['href', 'src']);

function isSafeUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v === '' || v.startsWith('#') || v.startsWith('/')) return true;
  return /^(https?:|mailto:|tel:)/.test(v);
}

function cleanElement(el: Element) {
  const tag = el.tagName.toLowerCase();
  const allowedForTag = TAG_ATTRS[tag];

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    const ok =
      !name.startsWith('on') &&
      (GLOBAL_ATTRS.has(name) || allowedForTag?.has(name) === true);
    if (!ok) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (URL_ATTRS.has(name) && !isSafeUrl(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }

  if (tag === 'a' && el.getAttribute('target') === '_blank') {
    el.setAttribute('rel', 'noopener noreferrer');
  }
}

function walk(node: Node) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (DROP_WITH_CONTENT.has(tag)) {
      el.parentNode?.removeChild(el);
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap: keep the (sanitized) children, drop the element itself
      walk(el);
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      continue;
    }

    cleanElement(el);
    walk(el);
  }
}

/**
 * @returns sanitized HTML string; '' when not running in a browser or when
 * the input is empty.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return '';
  }
  const doc = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    'text/html',
  );
  walk(doc.body);
  return doc.body.innerHTML;
}
