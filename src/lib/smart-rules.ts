/**
 * Smart Collection rules
 * ---------------------------------------------------------------
 * A Smart Collection stores a question, not an answer: "TypeScript
 * projects with uncommitted work and no recent backup" stays correct as
 * the library changes, where a hand-picked list goes stale the day after
 * you make it.
 *
 * Evaluation happens in one place so the count shown next to a smart
 * collection and the list you get when you open it can never disagree.
 */

export type RuleField =
  | 'language'
  | 'framework'
  | 'backup'
  | 'git'
  | 'gitStatus'
  | 'favorite'
  | 'archived'
  | 'tag'
  | 'collection'
  | 'sizeMb'
  | 'modifiedDays'
  | 'health';

export type RuleOperator = 'is' | 'isNot' | 'gt' | 'lt' | 'contains';

export interface RuleCondition {
  field: RuleField;
  op: RuleOperator;
  value: string;
}

export interface SmartRules {
  match: 'all' | 'any';
  conditions: RuleCondition[];
}

/** Shape the evaluator needs — a project plus its derived facts. */
export interface EvaluableProject {
  language?: string | null;
  framework?: string | null;
  isGitRepo?: boolean | null;
  gitRemote?: string | null;
  gitStatus?: string | null;
  isFavorite?: boolean | null;
  isArchived?: boolean | null;
  size?: number | bigint | null;
  lastModified?: Date | string | null;
  lastBackupAt?: Date | string | null;
  tagNames?: string[];
  collectionNames?: string[];
  healthScore?: number;
}

const DAY = 86_400_000;

/** Field metadata drives the rule editor UI — one definition, both sides. */
export const FIELD_DEFS: Record<
  RuleField,
  {
    label: string;
    /** How the value is entered. */
    input: 'text' | 'number' | 'choice';
    operators: RuleOperator[];
    choices?: Array<{ value: string; label: string }>;
    unit?: string;
  }
> = {
  language: { label: 'Language', input: 'text', operators: ['is', 'isNot', 'contains'] },
  framework: { label: 'Framework', input: 'text', operators: ['is', 'isNot', 'contains'] },
  backup: {
    label: 'Backup',
    input: 'choice',
    operators: ['is', 'isNot'],
    choices: [
      { value: 'never', label: 'never taken' },
      { value: 'stale', label: 'older than 7 days' },
      { value: 'fresh', label: 'within 7 days' },
    ],
  },
  git: {
    label: 'Git',
    input: 'choice',
    operators: ['is'],
    choices: [
      { value: 'repo', label: 'is a repository' },
      { value: 'noRepo', label: 'is not a repository' },
      { value: 'remote', label: 'has a remote' },
      { value: 'noRemote', label: 'has no remote' },
    ],
  },
  gitStatus: {
    label: 'Working tree',
    input: 'choice',
    operators: ['is'],
    choices: [
      { value: 'clean', label: 'clean' },
      { value: 'dirty', label: 'has uncommitted changes' },
    ],
  },
  favorite: {
    label: 'Favourite',
    input: 'choice',
    operators: ['is'],
    choices: [
      { value: 'true', label: 'yes' },
      { value: 'false', label: 'no' },
    ],
  },
  archived: {
    label: 'Archived',
    input: 'choice',
    operators: ['is'],
    choices: [
      { value: 'true', label: 'yes' },
      { value: 'false', label: 'no' },
    ],
  },
  tag: { label: 'Tag', input: 'text', operators: ['is', 'isNot', 'contains'] },
  collection: { label: 'Collection', input: 'text', operators: ['is', 'isNot', 'contains'] },
  sizeMb: { label: 'Size', input: 'number', operators: ['gt', 'lt'], unit: 'MB' },
  modifiedDays: { label: 'Last modified', input: 'number', operators: ['gt', 'lt'], unit: 'days ago' },
  health: { label: 'Shelf Score', input: 'number', operators: ['gt', 'lt'] },
};

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  is: 'is',
  isNot: 'is not',
  gt: 'is more than',
  lt: 'is less than',
  contains: 'contains',
};

function toNumber(value: number | bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'bigint' ? Number(value) : value;
}

function daysSince(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / DAY;
}

function textMatches(actual: string | null | undefined, condition: RuleCondition): boolean {
  const a = (actual ?? '').toLowerCase().trim();
  const b = condition.value.toLowerCase().trim();
  switch (condition.op) {
    case 'is':
      return a === b;
    case 'isNot':
      return a !== b;
    case 'contains':
      return b.length === 0 || a.includes(b);
    default:
      return false;
  }
}

function listMatches(list: string[] | undefined, condition: RuleCondition): boolean {
  const values = (list ?? []).map((v) => v.toLowerCase().trim());
  const needle = condition.value.toLowerCase().trim();
  switch (condition.op) {
    case 'is':
      return values.includes(needle);
    case 'isNot':
      return !values.includes(needle);
    case 'contains':
      return needle.length === 0 || values.some((v) => v.includes(needle));
    default:
      return false;
  }
}

function numberMatches(actual: number | null, condition: RuleCondition): boolean {
  const target = Number(condition.value);
  if (!Number.isFinite(target) || actual === null) return false;
  return condition.op === 'gt' ? actual > target : condition.op === 'lt' ? actual < target : false;
}

function evaluateCondition(project: EvaluableProject, condition: RuleCondition): boolean {
  switch (condition.field) {
    case 'language':
      return textMatches(project.language, condition);
    case 'framework':
      return textMatches(project.framework, condition);

    case 'backup': {
      const age = daysSince(project.lastBackupAt);
      const state = age === null ? 'never' : age > 7 ? 'stale' : 'fresh';
      const matched = state === condition.value;
      return condition.op === 'isNot' ? !matched : matched;
    }

    case 'git': {
      const map: Record<string, boolean> = {
        repo: Boolean(project.isGitRepo),
        noRepo: !project.isGitRepo,
        remote: Boolean(project.gitRemote),
        noRemote: !project.gitRemote,
      };
      return map[condition.value] ?? false;
    }

    case 'gitStatus':
      return (project.gitStatus ?? '') === condition.value;

    case 'favorite':
      return Boolean(project.isFavorite) === (condition.value === 'true');

    case 'archived':
      return Boolean(project.isArchived) === (condition.value === 'true');

    case 'tag':
      return listMatches(project.tagNames, condition);

    case 'collection':
      return listMatches(project.collectionNames, condition);

    case 'sizeMb':
      return numberMatches(toNumber(project.size) / (1024 * 1024), condition);

    case 'modifiedDays':
      return numberMatches(daysSince(project.lastModified), condition);

    case 'health':
      return numberMatches(project.healthScore ?? null, condition);

    default:
      return false;
  }
}

export function matchesRules(project: EvaluableProject, rules: SmartRules): boolean {
  const conditions = rules.conditions.filter((c) => FIELD_DEFS[c.field]);
  if (conditions.length === 0) return true;
  return rules.match === 'any'
    ? conditions.some((c) => evaluateCondition(project, c))
    : conditions.every((c) => evaluateCondition(project, c));
}

/** Parses and repairs stored JSON so one bad row cannot break a page. */
export function parseRules(raw: string | null | undefined): SmartRules {
  if (!raw) return { match: 'all', conditions: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<SmartRules>;
    const conditions = Array.isArray(parsed.conditions)
      ? parsed.conditions.filter(
          (c): c is RuleCondition =>
            !!c &&
            typeof c === 'object' &&
            typeof (c as RuleCondition).field === 'string' &&
            FIELD_DEFS[(c as RuleCondition).field] !== undefined &&
            typeof (c as RuleCondition).value === 'string'
        )
      : [];
    return { match: parsed.match === 'any' ? 'any' : 'all', conditions };
  } catch {
    return { match: 'all', conditions: [] };
  }
}

export function validateRules(input: unknown): { rules: SmartRules } | { error: string } {
  if (!input || typeof input !== 'object') return { error: 'Rules are required' };
  const candidate = input as Partial<SmartRules>;
  if (!Array.isArray(candidate.conditions) || candidate.conditions.length === 0) {
    return { error: 'Add at least one condition' };
  }
  if (candidate.conditions.length > 8) return { error: 'Use at most 8 conditions' };

  const conditions: RuleCondition[] = [];
  for (const raw of candidate.conditions) {
    const c = raw as RuleCondition;
    const def = FIELD_DEFS[c?.field];
    if (!def) return { error: 'Unknown condition field' };
    if (!def.operators.includes(c.op)) return { error: `"${def.label}" does not support that comparison` };
    if (typeof c.value !== 'string' || c.value.trim().length === 0) {
      return { error: `Give "${def.label}" a value` };
    }
    if (def.input === 'number' && !Number.isFinite(Number(c.value))) {
      return { error: `"${def.label}" needs a number` };
    }
    if (def.input === 'choice' && !def.choices?.some((o) => o.value === c.value)) {
      return { error: `"${def.label}" has an invalid value` };
    }
    conditions.push({ field: c.field, op: c.op, value: c.value.trim() });
  }

  return { rules: { match: candidate.match === 'any' ? 'any' : 'all', conditions } };
}

/** Human sentence for a rule set — shown under the collection name. */
export function describeRules(rules: SmartRules): string {
  if (rules.conditions.length === 0) return 'Every project';
  const parts = rules.conditions.map((c) => {
    const def = FIELD_DEFS[c.field];
    const choice = def.choices?.find((o) => o.value === c.value)?.label;
    const value = choice ?? `${c.value}${def.unit ? ` ${def.unit}` : ''}`;
    // Choice fields read naturally without the operator word.
    if (def.input === 'choice' && c.op === 'is') return `${def.label} ${value}`;
    return `${def.label} ${OPERATOR_LABELS[c.op]} ${value}`;
  });
  return parts.join(rules.match === 'any' ? ' or ' : ' · ');
}

/** Starter set offered on an empty Smart Collections list. */
export const RULE_PRESETS: Array<{ name: string; icon: string; description: string; rules: SmartRules }> = [
  {
    name: 'Unprotected work',
    icon: 'shield-alert',
    description: 'Never backed up, and not pushed anywhere either.',
    rules: {
      match: 'all',
      conditions: [
        { field: 'backup', op: 'is', value: 'never' },
        { field: 'git', op: 'is', value: 'noRemote' },
      ],
    },
  },
  {
    name: 'Uncommitted changes',
    icon: 'git-branch',
    description: 'Work sitting in a dirty tree right now.',
    rules: { match: 'all', conditions: [{ field: 'gitStatus', op: 'is', value: 'dirty' }] },
  },
  {
    name: 'Gone quiet',
    icon: 'moon',
    description: 'Untouched for six months — archive or revive.',
    rules: { match: 'all', conditions: [{ field: 'modifiedDays', op: 'gt', value: '180' }] },
  },
  {
    name: 'Heavyweights',
    icon: 'hard-drive',
    description: 'Over 500 MB of source on disk.',
    rules: { match: 'all', conditions: [{ field: 'sizeMb', op: 'gt', value: '500' }] },
  },
];
