import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as os from 'os';

const run = promisify(execFile);

export type OsAction = 'finder' | 'editor' | 'terminal';

export interface OsActionResult {
  ok: boolean;
  /** Human-readable name of what handled it, for the toast. */
  handler: string;
  error?: string;
}

/**
 * Editors are tried in order. The first launcher found on PATH wins, so a
 * VS Code user gets VS Code and everyone else still gets something.
 */
const EDITOR_CANDIDATES: Array<{ bin: string; args: (p: string) => string[]; name: string }> = [
  { bin: 'cursor', args: (p) => [p], name: 'Cursor' },
  { bin: 'code', args: (p) => [p], name: 'Visual Studio Code' },
  { bin: 'zed', args: (p) => [p], name: 'Zed' },
  { bin: 'subl', args: (p) => [p], name: 'Sublime Text' },
  { bin: 'webstorm', args: (p) => [p], name: 'WebStorm' },
  { bin: 'idea', args: (p) => [p], name: 'IntelliJ IDEA' },
];

async function onPath(bin: string): Promise<boolean> {
  try {
    await run('which', [bin]);
    return true;
  } catch {
    return false;
  }
}

/** Reject anything that is not a real directory we can hand to the OS. */
export async function assertDirectory(target: string): Promise<void> {
  const stats = await fs.stat(target);
  if (!stats.isDirectory()) throw new Error('Path is not a directory');
}

/**
 * Hands a project directory to the desktop: reveal it, open it in an
 * editor, or open a terminal there. Only the recorded project path is ever
 * passed, and it is passed as an argv entry — never interpolated into a shell.
 */
export async function runOsAction(action: OsAction, target: string): Promise<OsActionResult> {
  const platform = os.platform();

  try {
    await assertDirectory(target);
  } catch {
    return { ok: false, handler: '', error: 'That folder no longer exists on disk.' };
  }

  if (action === 'finder') {
    try {
      if (platform === 'darwin') {
        await run('open', [target]);
        return { ok: true, handler: 'Finder' };
      }
      if (platform === 'win32') {
        await run('explorer', [target]);
        return { ok: true, handler: 'File Explorer' };
      }
      await run('xdg-open', [target]);
      return { ok: true, handler: 'your file manager' };
    } catch {
      return { ok: false, handler: '', error: 'Could not open the folder.' };
    }
  }

  if (action === 'editor') {
    const preferred = process.env.CODESHELF_EDITOR?.trim();
    const candidates = preferred
      ? [{ bin: preferred, args: (p: string) => [p], name: preferred }, ...EDITOR_CANDIDATES]
      : EDITOR_CANDIDATES;

    for (const candidate of candidates) {
      if (!(await onPath(candidate.bin))) continue;
      try {
        await run(candidate.bin, candidate.args(target));
        return { ok: true, handler: candidate.name };
      } catch {
        // Launcher exists but refused — keep trying the next one.
      }
    }
    return {
      ok: false,
      handler: '',
      error: 'No editor launcher found on PATH. Install one (e.g. the VS Code `code` command) or set CODESHELF_EDITOR.',
    };
  }

  // Terminal
  try {
    if (platform === 'darwin') {
      await run('open', ['-a', 'Terminal', target]);
      return { ok: true, handler: 'Terminal' };
    }
    if (platform === 'win32') {
      await run('cmd', ['/c', 'start', 'cmd', '/K', `cd /d ${target}`]);
      return { ok: true, handler: 'Command Prompt' };
    }
    for (const term of ['gnome-terminal', 'konsole', 'xterm']) {
      if (await onPath(term)) {
        await run(term, ['--working-directory', target]).catch(() => run(term, []));
        return { ok: true, handler: term };
      }
    }
    return { ok: false, handler: '', error: 'No terminal emulator found.' };
  } catch {
    return { ok: false, handler: '', error: 'Could not open a terminal there.' };
  }
}
