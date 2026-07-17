/**
 * Mentions in comments are stored as `@FirstName` (first word of user.name)
 * by RichTextEditor — not user IDs.
 */
export function extractMentionTokens(content: string): string[] {
  const tokens = new Set<string>();
  const re = /@([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    tokens.add(match[1].toLowerCase());
  }
  return [...tokens];
}

export function resolveMentionedUserIds(
  content: string,
  users: Array<{ id: string; name: string }>
): string[] {
  const tokens = extractMentionTokens(content);
  if (tokens.length === 0) return [];

  const ids = new Set<string>();
  for (const u of users) {
    const first = (u.name.split(/\s+/)[0] || "").toLowerCase();
    const compact = u.name.replace(/\s+/g, "").toLowerCase();
    if (tokens.includes(first) || tokens.includes(compact)) {
      ids.add(u.id);
    }
  }
  return [...ids];
}
