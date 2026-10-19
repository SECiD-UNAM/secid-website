/**
 * Tests for the announcement markdown renderer (F20).
 *
 * Source: functions/src/markdown.ts — a pure module shared by the
 * sendAnnouncement callable and the composer's live preview
 * (src/lib/markdown.ts re-exports it), so both render identically.
 *
 * The renderer never passes raw HTML through: every character of the
 * source is escaped before the inline markdown rules run, and link
 * targets are limited to http(s)/mailto.
 */
import { describe, it, expect } from 'vitest';
import {
  renderMarkdown,
  markdownToText,
  sanitizeHtml,
} from '../../../functions/src/markdown';

describe('renderMarkdown — blocks', () => {
  it('wraps plain text in a paragraph', () => {
    expect(renderMarkdown('Hola a todos')).toBe('<p>Hola a todos</p>');
  });

  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    expect(renderMarkdown('Línea 1\nLínea 2\n\nOtro párrafo')).toBe(
      '<p>Línea 1<br>Línea 2</p><p>Otro párrafo</p>'
    );
  });

  it('renders headings (# → h2, ## → h3, ### → h4; h1 is the email title)', () => {
    expect(renderMarkdown('# Título\n## Sub\n### Sub-sub')).toBe(
      '<h2>Título</h2><h3>Sub</h3><h4>Sub-sub</h4>'
    );
  });

  it('renders unordered and ordered lists', () => {
    expect(renderMarkdown('- uno\n- dos\n\n1. a\n2. b')).toBe(
      '<ul><li>uno</li><li>dos</li></ul><ol><li>a</li><li>b</li></ol>'
    );
  });

  it('renders blockquotes and horizontal rules', () => {
    expect(renderMarkdown('> cita\n\n---\n\nfin')).toBe(
      '<blockquote><p>cita</p></blockquote><hr><p>fin</p>'
    );
  });

  it('returns an empty string for blank input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown('  \n\n  ')).toBe('');
  });
});

describe('renderMarkdown — inline', () => {
  it('renders bold, italic and inline code', () => {
    expect(renderMarkdown('**fuerte** y *suave* y `code`')).toBe(
      '<p><strong>fuerte</strong> y <em>suave</em> y <code>code</code></p>'
    );
  });

  it('renders markdown links with http(s) and mailto targets', () => {
    expect(
      renderMarkdown('[SECiD](https://secid.mx) [mail](mailto:a@b.mx)')
    ).toBe(
      '<p><a href="https://secid.mx">SECiD</a> <a href="mailto:a@b.mx">mail</a></p>'
    );
  });

  it('autolinks bare https URLs', () => {
    expect(renderMarkdown('Ver https://secid.mx/es/eventos ya')).toBe(
      '<p>Ver <a href="https://secid.mx/es/eventos">https://secid.mx/es/eventos</a> ya</p>'
    );
  });

  it('drops links whose target is not http(s)/mailto', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).toBe('<p>x</p>');
    expect(renderMarkdown('[x](data:text/html,hi)')).toBe('<p>x</p>');
  });
});

describe('renderMarkdown — escaping', () => {
  it('escapes raw HTML instead of passing it through', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
    );
    expect(renderMarkdown('<img src=x onerror=alert(1)>')).toBe(
      '<p>&lt;img src=x onerror=alert(1)&gt;</p>'
    );
  });

  it('escapes quotes and ampersands inside link text and href', () => {
    expect(renderMarkdown('[a&b](https://x.mx/?q="1")')).toBe(
      '<p><a href="https://x.mx/?q=&quot;1&quot;">a&amp;b</a></p>'
    );
  });

  it('escapes HTML inside headings and list items', () => {
    expect(renderMarkdown('# <b>x</b>\n- <i>y</i>')).toBe(
      '<h2>&lt;b&gt;x&lt;/b&gt;</h2><ul><li>&lt;i&gt;y&lt;/i&gt;</li></ul>'
    );
  });
});

describe('sanitizeHtml (newsletter issue bodies, F21)', () => {
  it('keeps the allowlisted tags and http(s)/mailto hrefs', () => {
    expect(
      sanitizeHtml(
        '<h2>T</h2><p>a <b>b</b> <strong>c</strong> <em>d</em></p><ul><li>x</li></ul><a href="https://secid.mx">l</a><a href="mailto:a@b.mx">m</a><img src="https://secid.mx/i.png" alt="i"><br><hr>'
      )
    ).toBe(
      '<h2>T</h2><p>a <b>b</b> <strong>c</strong> <em>d</em></p><ul><li>x</li></ul><a href="https://secid.mx">l</a><a href="mailto:a@b.mx">m</a><img src="https://secid.mx/i.png" alt="i"><br><hr>'
    );
  });

  it('drops script/style/iframe with their content and unknown tags without it', () => {
    expect(
      sanitizeHtml(
        '<p>a</p><script>alert(1)</script><style>p{}</style><iframe src="x"></iframe><div class="c">b</div><span>c</span>'
      )
    ).toBe('<p>a</p>bc');
  });

  it('strips event handlers, style attributes and unsafe URLs', () => {
    expect(
      sanitizeHtml(
        '<p onclick="x()" style="color:red">a</p><a href="javascript:alert(1)" target="_blank">b</a><img src="data:image/png;base64,AAAA" onerror="x()">'
      )
    ).toBe('<p>a</p><a>b</a><img>');
  });

  it('escapes stray angle brackets and keeps text', () => {
    expect(sanitizeHtml('1 < 2 and <notatag>x</notatag>')).toBe(
      '1 &lt; 2 and x'
    );
  });
});

describe('markdownToText', () => {
  it('strips markdown syntax for a plain-text excerpt', () => {
    expect(markdownToText('# Hola\n\n**mundo** [liga](https://x.mx)')).toBe(
      'Hola mundo liga'
    );
  });
});
