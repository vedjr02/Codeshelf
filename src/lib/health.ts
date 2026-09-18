/**
 * Shelf Score
 * ---------------------------------------------------------------
 * One legible number for "can I lose this, and can I come back to it".
 *
 * The score is deliberately about *recoverability and re-entry*, not code
 * quality — CodeShelf cannot judge your code, but it can tell you that a
 * project exists in exactly one place on one disk with no README.
 *
 * Every factor reports its own score, its ceiling, and the single next
 * action that would raise it, so the UI can show why the number is what
 * it is instead of just asserting it.
 */

export type HealthGrade = 'excellent' | 'good' | 'fair' | 'at-risk';

export interface HealthFactor {
  id: 'recoverable' | 'versioned' | 'documented' | 'organized' | 'tidy';
  label: string;
  score: number;
  max: number;
  /** Plain-language state, shown next to the factor. */
  detail: string;
  /** What to do next, only present when points are missing. */
  hint?: string;
}

export interface HealthReport {
  score: number;
  grade: HealthGrade;
  /** Short verdict for the headline. */
  headline: string;
  factors: HealthFactor[];
}

/** Input shape — a subset of Project plus its newest backup. */
export interface HealthInput {
  isGitRepo?: boolean | null;
  gitRemote?: string | null;
  gitStatus?: string | null;
  readme?: string | null;
  notes?: string | null;
  size?: number | bigint | null;
  lastModified?: Date | string | null;
  lastBackupAt?: Date | string | null;
  tagCount?: number;
  collectionCount?: number;
}

const DAY = 86_400_000;

function daysSince(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, (Date.now() - then) / DAY);
}

function toNumber(value: number | bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'bigint' ? Number(value) : value;
}

export function gradeFor(score: number): HealthGrade {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 40) return 'fair';
  return 'at-risk';
}

/** Token name for the grade's colour, so callers never pick a hex. */
export function gradeColorVar(grade: HealthGrade): string {
  switch (grade) {
    case 'excellent':
      return 'var(--color-good)';
    case 'good':
      return 'var(--color-accent)';
    case 'fair':
      return 'var(--color-warn)';
    default:
      return 'var(--color-bad)';
  }
}

export function gradeLabel(grade: HealthGrade): string {
  switch (grade) {
    case 'excellent':
      return 'Protected';
    case 'good':
      return 'Healthy';
    case 'fair':
      return 'Needs care';
    default:
      return 'At risk';
  }
}

export function computeHealth(input: HealthInput): HealthReport {
  const factors: HealthFactor[] = [];

  /* ---- Recoverable: 40 — backup freshness is the whole point ------ */
  const backupAge = daysSince(input.lastBackupAt);
  let recoverable = 0;
  let recoverableDetail: string;
  let recoverableHint: string | undefined;

  if (backupAge === null) {
    recoverable = 0;
    recoverableDetail = 'Never backed up';
    recoverableHint = 'Take a first snapshot';
  } else if (backupAge <= 7) {
    recoverable = 40;
    recoverableDetail = backupAge < 1 ? 'Backed up today' : `Backed up ${Math.round(backupAge)}d ago`;
  } else if (backupAge <= 30) {
    recoverable = 28;
    recoverableDetail = `Backed up ${Math.round(backupAge)}d ago`;
    recoverableHint = 'Snapshot again to refresh';
  } else if (backupAge <= 90) {
    recoverable = 15;
    recoverableDetail = `Last backup ${Math.round(backupAge / 30)}mo ago`;
    recoverableHint = 'The snapshot is stale — take a new one';
  } else {
    recoverable = 6;
    recoverableDetail = 'Backup is over 3 months old';
    recoverableHint = 'Take a new snapshot';
  }
  factors.push({
    id: 'recoverable',
    label: 'Recoverable',
    score: recoverable,
    max: 40,
    detail: recoverableDetail,
    hint: recoverableHint,
  });

  /* ---- Versioned: 25 — a remote is a second copy ------------------ */
  let versioned = 0;
  let versionedDetail: string;
  let versionedHint: string | undefined;

  if (!input.isGitRepo) {
    versionedDetail = 'Not a git repository';
    versionedHint = 'Run git init so history is tracked';
  } else if (!input.gitRemote) {
    versioned = 10;
    versionedDetail = 'Git history, no remote';
    versionedHint = 'Push to a remote for an off-disk copy';
  } else {
    versioned = 25;
    versionedDetail = 'Tracked with a remote';
  }
  factors.push({
    id: 'versioned',
    label: 'Versioned',
    score: versioned,
    max: 25,
    detail: versionedDetail,
    hint: versionedHint,
  });

  /* ---- Documented: 15 — will you understand it in a year? -------- */
  const readmeLength = input.readme?.trim().length ?? 0;
  const hasNotes = (input.notes?.trim().length ?? 0) > 0;
  let documented = 0;
  let documentedDetail: string;
  let documentedHint: string | undefined;

  if (readmeLength >= 240) {
    documented = 12;
    documentedDetail = 'README explains the project';
  } else if (readmeLength > 0) {
    documented = 6;
    documentedDetail = 'README is very short';
    documentedHint = 'Say what it does and how to run it';
  } else {
    documentedDetail = 'No README';
    documentedHint = 'Add a README.md';
  }
  if (hasNotes) documented += 3;
  factors.push({
    id: 'documented',
    label: 'Documented',
    score: Math.min(15, documented),
    max: 15,
    detail: hasNotes ? `${documentedDetail} · has notes` : documentedDetail,
    hint: documentedHint,
  });

  /* ---- Organized: 10 — findable six months from now -------------- */
  const tagCount = input.tagCount ?? 0;
  const collectionCount = input.collectionCount ?? 0;
  const organized = Math.min(10, (collectionCount > 0 ? 6 : 0) + (tagCount > 0 ? 4 : 0));
  factors.push({
    id: 'organized',
    label: 'Organized',
    score: organized,
    max: 10,
    detail:
      collectionCount > 0 && tagCount > 0
        ? 'In a collection and tagged'
        : collectionCount > 0
          ? 'In a collection, untagged'
          : tagCount > 0
            ? 'Tagged, not in a collection'
            : 'Not filed anywhere',
    hint: organized === 10 ? undefined : 'Add it to a collection or tag it',
  });

  /* ---- Tidy: 10 — uncommitted work is unprotected work ----------- */
  const modifiedAge = daysSince(input.lastModified);
  let tidy = 0;
  let tidyDetail: string;
  let tidyHint: string | undefined;

  if (!input.isGitRepo) {
    tidy = 4;
    tidyDetail = 'No git status to check';
  } else if (input.gitStatus === 'clean') {
    tidy = 10;
    tidyDetail = 'Working tree clean';
  } else if (input.gitStatus === 'dirty') {
    tidy = 3;
    tidyDetail = 'Uncommitted changes';
    tidyHint = 'Commit or stash before you forget what they were';
  } else {
    tidy = 6;
    tidyDetail = 'Git status unknown';
    tidyHint = 'Refresh the project to read git state';
  }
  factors.push({ id: 'tidy', label: 'Tidy', score: tidy, max: 10, detail: tidyDetail, hint: tidyHint });

  const score = Math.max(0, Math.min(100, Math.round(factors.reduce((sum, f) => sum + f.score, 0))));
  const grade = gradeFor(score);

  /* ---- Headline: name the single biggest gap --------------------- */
  const worst = [...factors]
    .filter((f) => f.hint)
    .sort((a, b) => b.max - b.score - (a.max - a.score))[0];

  let headline: string;
  if (grade === 'excellent') {
    headline = 'Safe, tracked and documented.';
  } else if (worst?.hint) {
    headline = worst.hint;
  } else if (modifiedAge !== null && modifiedAge > 365) {
    headline = 'Untouched for over a year.';
  } else {
    headline = 'Nothing urgent.';
  }

  return { score, grade, headline, factors };
}

/** Bytes a project is unlikely to want in a backup — shown as reclaimable. */
export const RECLAIMABLE_DIRECTORIES = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'out',
  'target',
  '.turbo',
  '.parcel-cache',
  '.cache',
  'coverage',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
  'vendor',
  'Pods',
  '.gradle',
  'DerivedData',
] as const;

/** Rough guide for the storage view: what each directory is. */
export const RECLAIMABLE_REASONS: Record<string, string> = {
  node_modules: 'Reinstallable from your lockfile',
  '.next': 'Next.js build output',
  dist: 'Build output',
  build: 'Build output',
  out: 'Export output',
  target: 'Cargo/Maven build output',
  '.turbo': 'Turborepo cache',
  '.parcel-cache': 'Parcel cache',
  '.cache': 'Tooling cache',
  coverage: 'Test coverage report',
  __pycache__: 'Python bytecode cache',
  '.pytest_cache': 'Pytest cache',
  '.venv': 'Python virtualenv — recreate from requirements',
  venv: 'Python virtualenv — recreate from requirements',
  vendor: 'Vendored dependencies',
  Pods: 'CocoaPods — reinstallable',
  '.gradle': 'Gradle cache',
  DerivedData: 'Xcode build cache',
};

export { toNumber as healthToNumber };
