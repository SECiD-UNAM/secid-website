/**
 * Minimal, dependency-free markdown renderer for member announcements (F20).
 *
 * Shared by the sendAnnouncement callable (email body) and the composer's
 * live preview (src/lib/markdown.ts re-exports this file), so what the
 * editor sees is what the member receives.
 *
 * Security model: the source is HTML-escaped BEFORE any inline rule runs,
 * so raw HTML never reaches the output, and link targets are limited to
 * http(s)/mailto. Supported syntax: `#`/`##`/`###` headings (rendered as
 * h2–h4 — h1 is the email title), paragraphs separated by blank lines
 * (single newlines become <br>), `-`/`*` and `1.` lists, `>` quotes,
 * `---` rules, **bold**, *italic*, `code`, [text](url) and bare URLs.
 *
 * Kept to ES2017 syntax: functions/tsconfig.json targets es2017.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SAFE_HREF = /^(https?:\/\/|mailto:)/i;
// The text was escaped first, so `"` and `'` can no longer appear raw. The
// target allows one level of balanced parens (`javascript:alert(1)`) so an
// unsafe link is swallowed whole instead of leaving a stray `)`.
const LINK_RE = /\[([^\]]+)\]\(((?:[^\s()]|\([^\s()]*\))+)\)/g;
const BARE_URL_RE = /(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g;

function renderLink(text: string, href: string): string {
  return SAFE_HREF.test(href) ? `<a href="${href}">${text}</a>` : text;
}

/** Inline rules over an already-escaped line. */
export function renderInline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(LINK_RE, (_m, text: string, href: string) =>
      renderLink(text, href)
    )
    .replace(
      BARE_URL_RE,
      (_m, lead: string, url: string) => `${lead}<a href="${url}">${url}</a>`
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
}

type Block =
  | { kind: 'p' | 'quote'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'hr' };

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const UL_RE = /^[-*]\s+(.*)$/;
const OL_RE = /^\d+[.)]\s+(.*)$/;
// Lines are escaped before parsing, hence `&gt;` rather than `>`.
const QUOTE_RE = /^&gt;\s?(.*)$/;
const HR_RE = /^(-{3,}|\*{3,})\s*$/;

function pushLine(
  blocks: Block[],
  last: Block | undefined,
  line: string
): void {
  // `?? ''` keeps the file valid under the root tsconfig's
  // noUncheckedIndexedAccess as well as the functions one.
  const heading = HEADING_RE.exec(line);
  const ul = UL_RE.exec(line);
  const ol = OL_RE.exec(line);
  const quote = QUOTE_RE.exec(line);
  if (HR_RE.test(line)) blocks.push({ kind: 'hr' });
  else if (heading) {
    const level = (heading[1] ?? '').length + 1;
    blocks.push({ kind: 'h', level, text: heading[2] ?? '' });
  } else if (ul) appendItem(blocks, last, 'ul', ul[1] ?? '');
  else if (ol) appendItem(blocks, last, 'ol', ol[1] ?? '');
  else if (quote) appendLine(blocks, last, 'quote', quote[1] ?? '');
  else appendLine(blocks, last, 'p', line);
}

function appendItem(
  blocks: Block[],
  last: Block | undefined,
  kind: 'ul' | 'ol',
  item: string
): void {
  if (last && last.kind === kind) last.items.push(item);
  else blocks.push({ kind, items: [item] });
}

function appendLine(
  blocks: Block[],
  last: Block | undefined,
  kind: 'p' | 'quote',
  line: string
): void {
  if (last && last.kind === kind) last.lines.push(line);
  else blocks.push({ kind, lines: [line] });
}

/**
 * Groups non-blank lines into blocks. A blank line always closes the open
 * block, so `last` is only offered for continuation while one is open.
 */
export function parseBlocks(escaped: string): Block[] {
  const blocks: Block[] = [];
  let open = false;
  for (const raw of escaped.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim() === '') {
      open = false;
      continue;
    }
    pushLine(blocks, open ? blocks[blocks.length - 1] : undefined, line);
    open = true;
  }
  return blocks;
}

function renderBlock(block: Block): string {
  switch (block.kind) {
    case 'hr':
      return '<hr>';
    case 'h':
      return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
    case 'ul':
    case 'ol':
      return `<${block.kind}>${block.items
        .map((i) => `<li>${renderInline(i)}</li>`)
        .join('')}</${block.kind}>`;
    case 'quote':
      return `<blockquote><p>${block.lines.map(renderInline).join('<br>')}</p></blockquote>`;
    default:
      return `<p>${block.lines.map(renderInline).join('<br>')}</p>`;
  }
}

/** Markdown → HTML fragment (no wrapper), with every source char escaped. */
export function renderMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown.replace(/\r\n?/g, '\n'));
  return parseBlocks(escaped).map(renderBlock).join('');
}

// ---------------------------------------------------------------------------
// HTML sanitizer for newsletter issue bodies (F21)
// ---------------------------------------------------------------------------

/**
 * Newsletter issues are authored as HTML (NewsletterForm → `content`) and
 * shown on the site through DOMPurify; the email path has no DOM, so this
 * allowlist does the same job. The input is tokenized into tags and text
 * once, left to right, and the output is rebuilt from scratch: allowlisted
 * tags are re-emitted with only `href`/`src` (http(s)/mailto) and `alt`,
 * every other tag is dropped, the content of script/style/iframe/object/
 * embed is skipped until the matching close tag, and bare `<` / `>` in
 * text are escaped. Nothing is ever removed from the original string with
 * a regex replace, so split or nested markup cannot recombine.
 */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);
const VOID_TAGS = new Set(['br', 'hr', 'img']);
/** Elements whose text content must not reach the output either. */
const SKIP_CONTENT_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
]);
const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
const ATTR_RE = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

function safeAttrs(tag: string, raw: string): string {
  let out = '';
  let m: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    const name = (m[1] ?? '').toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    if ((name === 'href' && tag === 'a') || (name === 'src' && tag === 'img')) {
      if (SAFE_HREF.test(value)) out += ` ${name}="${escapeHtml(value)}"`;
    } else if (name === 'alt' && tag === 'img') {
      out += ` alt="${escapeHtml(value)}"`;
    }
  }
  return out;
}

/** Re-emits an allowlisted tag from its parsed parts; anything else → ''. */
function emitTag(closing: boolean, tag: string, rawAttrs: string): string {
  if (!ALLOWED_TAGS.has(tag)) return '';
  if (closing) return VOID_TAGS.has(tag) ? '' : `</${tag}>`;
  return `<${tag}${safeAttrs(tag, rawAttrs)}>`;
}

/** Escapes bare angle brackets in text while keeping existing entities. */
function escapeText(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** HTML → HTML restricted to the allowlist above. */
export function sanitizeHtml(html: string): string {
  const out: string[] = [];
  let last = 0;
  let skipping: string | null = null;
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html)) !== null) {
    const closing = m[0].startsWith('</');
    const tag = (m[1] ?? '').toLowerCase();
    if (!skipping) out.push(escapeText(html.slice(last, m.index)));
    last = m.index + m[0].length;
    if (skipping) {
      if (closing && tag === skipping) skipping = null;
    } else if (!closing && SKIP_CONTENT_TAGS.has(tag)) {
      skipping = tag;
    } else {
      out.push(emitTag(closing, tag, m[2] ?? ''));
    }
  }
  if (!skipping) out.push(escapeText(html.slice(last)));
  return out.join('');
}
