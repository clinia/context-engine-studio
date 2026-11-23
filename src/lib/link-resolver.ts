/** Maps a link's href to the in-app URL it opens, null for a link to leave as written. */
export type LinkResolver = (href: string) => string | null;
