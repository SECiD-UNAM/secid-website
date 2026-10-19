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
import { renderMarkdown } from '../../../functions/src/markdown';

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

  it('never reassembles a tag from nested or split markup (CodeQL regression)', () => {
    // Escaping happens once on the raw source; nothing is deleted or
    // unescaped afterwards, so split tags cannot recombine.
    expect(renderMarkdown('<scr<script>ipt>alert(1)</script>')).toBe(
      '<p>&lt;scr&lt;script&gt;ipt&gt;alert(1)&lt;/script&gt;</p>'
    );
    expect(renderMarkdown('<script>')).not.toContain('<script');
  });

  it('escapes already-escaped sequences once more instead of unescaping them', () => {
    expect(renderMarkdown('&amp;lt;script&amp;gt;')).toBe(
      '<p>&amp;amp;lt;script&amp;amp;gt;</p>'
    );
    expect(renderMarkdown('a &lt; b')).toBe('<p>a &amp;lt; b</p>');
  });

  it('allowlists link schemes case-insensitively instead of stripping bad ones', () => {
    expect(renderMarkdown('[x](JAVASCRIPT:alert(1))')).toBe('<p>x</p>');
    expect(renderMarkdown('[x](vbscript:msgbox(1))')).toBe('<p>x</p>');
    expect(renderMarkdown('[x](  javascript:alert(1))')).toBe(
      '<p>[x](  javascript:alert(1))</p>'
    );
    expect(renderMarkdown('[x](HTTPS://secid.mx)')).toBe(
      '<p><a href="HTTPS://secid.mx">x</a></p>'
    );
  });

  it('escapes HTML inside headings and list items', () => {
    expect(renderMarkdown('# <b>x</b>\n- <i>y</i>')).toBe(
      '<h2>&lt;b&gt;x&lt;/b&gt;</h2><ul><li>&lt;i&gt;y&lt;/i&gt;</li></ul>'
    );
  });
});
