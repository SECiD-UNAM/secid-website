/**
 * Markdown renderer for member announcements (F20).
 *
 * The implementation lives in functions/src/markdown.ts so the composer's
 * live preview and the sendAnnouncement callable render byte-for-byte the
 * same HTML (same arrangement as tests/rules/harness.ts reusing
 * functions/src/rbac). The module is pure TypeScript with no Firebase
 * imports, so it bundles into the client untouched.
 */
export { renderMarkdown, escapeHtml } from '../../functions/src/markdown';
