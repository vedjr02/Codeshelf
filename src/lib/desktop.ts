import { NextResponse } from 'next/server';

/**
 * Some of Codeshelf reaches the machine it runs on: it scans folders for
 * projects, hands a path to Finder or an editor, and zips a project to disk.
 * A serverless host has none of that — no user home directory, no editor on
 * PATH, and a filesystem that disappears between requests.
 *
 * So the app ships in two shapes. On a desktop or a server with a real disk
 * it behaves as before. On Vercel it serves the library, search, collections
 * and auth, and the disk-bound routes answer 501 with an honest reason
 * instead of a stack trace.
 */

/** Set CODESHELF_DESKTOP to 1/true to force disk features on, 0/false to force off. */
export function isDesktopHost(): boolean {
  const flag = process.env.CODESHELF_DESKTOP?.trim().toLowerCase();
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return !process.env.VERCEL;
}

export const DESKTOP_ONLY_MESSAGE =
  'This needs the machine your projects live on. Run Codeshelf locally to use it.';

/**
 * 501, not 403: the request is fine, this deployment just cannot carry it out.
 * `desktopOnly` lets the UI show an explanation rather than a failure toast.
 */
export function desktopOnlyResponse(what: string): NextResponse {
  return NextResponse.json(
    { error: `${what} ${DESKTOP_ONLY_MESSAGE}`, desktopOnly: true },
    { status: 501 }
  );
}
