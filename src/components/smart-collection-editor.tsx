'use client';

import * as React from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { notifyLibraryChanged } from '@/components/library-context';
import {
  FIELD_DEFS,
  OPERATOR_LABELS,
  describeRules,
  matchesRules,
  type EvaluableProject,
  type RuleCondition,
  type RuleField,
  type RuleOperator,
  type SmartRules,
} from '@/lib/smart-rules';
import type { ProjectSummary } from '@/types/client';

const FIELD_ORDER: RuleField[] = [
  'backup',
  'git',
  'gitStatus',
  'language',
  'framework',
  'tag',
  'collection',
  'sizeMb',
  'modifiedDays',
  'health',
  'favorite',
  'archived',
];

function defaultCondition(field: RuleField): RuleCondition {
  const def = FIELD_DEFS[field];
  return {
    field,
    op: def.operators[0],
    value: def.input === 'choice' ? (def.choices?.[0]?.value ?? '') : def.input === 'number' ? '0' : '',
  };
}

/** The rule evaluator wants derived facts, which the list response already has. */
function toEvaluable(project: ProjectSummary): EvaluableProject {
  return {
    language: project.language,
    framework: project.framework,
    isGitRepo: project.isGitRepo,
    gitRemote: project.gitRemote,
    gitStatus: project.gitStatus,
    isFavorite: project.isFavorite,
    isArchived: project.isArchived,
    size: project.size,
    lastModified: project.lastModified,
    lastBackupAt: project.lastBackupAt,
    tagNames: project.tags.map((t) => t.name),
    collectionNames: project.collections.map((c) => c.name),
    healthScore: project.health.score,
  };
}

export interface SmartCollectionDraft {
  id?: string;
  name: string;
  rules: SmartRules;
}

/**
 * Rule editor for a Smart Collection.
 *
 * It matches live while you build it: the count and the sample names below
 * the rules come from your actual library, so you never save a rule that
 * turns out to match nothing.
 */
export function SmartCollectionEditor({
  open,
  onOpenChange,
  draft,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: SmartCollectionDraft | null;
  onSaved: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [name, setName] = React.useState('');
  const [rules, setRules] = React.useState<SmartRules>({ match: 'all', conditions: [] });
  const [projects, setProjects] = React.useState<ProjectSummary[] | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);

  // Adopt the draft each time the sheet opens.
  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setName(draft?.name ?? '');
      setRules(
        draft?.rules?.conditions?.length
          ? draft.rules
          : { match: 'all', conditions: [defaultCondition('backup')] }
      );
      setProblem(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, draft]);

  // The library, once, for live matching.
  React.useEffect(() => {
    if (!open) return;
    const signal = { cancelled: false };
    (async () => {
      try {
        const res = await fetch('/api/projects?isArchived=false');
        if (!res.ok) return;
        const data = (await res.json()) as ProjectSummary[];
        if (!signal.cancelled) setProjects(data);
      } catch {
        // Preview is a nicety; saving still works without it.
      }
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [open]);

  const matched = React.useMemo(() => {
    if (!projects) return null;
    const usable = rules.conditions.filter((c) => c.value.trim().length > 0);
    if (usable.length === 0) return null;
    return projects.filter((p) => matchesRules(toEvaluable(p), { ...rules, conditions: usable }));
  }, [projects, rules]);

  const setCondition = (index: number, next: Partial<RuleCondition>) => {
    setRules((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => {
        if (i !== index) return condition;
        // Changing the field resets the operator and value to something valid.
        if (next.field && next.field !== condition.field) return defaultCondition(next.field);
        return { ...condition, ...next };
      }),
    }));
  };

  const save = async () => {
    setProblem(null);
    if (!name.trim()) {
      setProblem('Give the collection a name.');
      return;
    }
    const usable = rules.conditions.filter((c) => c.value.trim().length > 0);
    if (usable.length === 0) {
      setProblem('Add at least one condition with a value.');
      return;
    }

    setSaving(true);
    try {
      const body = JSON.stringify({ name: name.trim(), rules: { ...rules, conditions: usable } });
      const res = await fetch(
        draft?.id ? `/api/smart-collections/${draft.id}` : '/api/smart-collections',
        {
          method: draft?.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblem(payload.error || 'Could not save this collection.');
        return;
      }
      success(draft?.id ? 'Smart Collection updated' : 'Smart Collection created', name.trim());
      notifyLibraryChanged();
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toastError('Could not save', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{draft?.id ? 'Edit Smart Collection' : 'New Smart Collection'}</DialogTitle>
          <DialogDescription>
            A Smart Collection stores the rule, not the list — so it stays correct as your projects change.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-5">
          <Field label="Name" htmlFor="smart-name">
            <Input
              id="smart-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Unprotected work"
              autoFocus
            />
          </Field>

          <div>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className="text-[14px] font-medium text-ink-2">Match</span>
              <Segmented
                aria-label="Match all or any condition"
                size="sm"
                value={rules.match}
                onChange={(match) => setRules((prev) => ({ ...prev, match }))}
                options={[
                  { value: 'all', label: 'All conditions' },
                  { value: 'any', label: 'Any condition' },
                ]}
              />
            </div>

            <div className="space-y-2">
              {rules.conditions.map((condition, index) => {
                const def = FIELD_DEFS[condition.field];
                return (
                  <div key={index} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-surface-3 p-2">
                    <Select
                      value={condition.field}
                      onValueChange={(value) => setCondition(index, { field: value as RuleField })}
                    >
                      <SelectTrigger className="h-9 w-[150px] shrink-0" aria-label="Field">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_ORDER.map((field) => (
                          <SelectItem key={field} value={field}>
                            {FIELD_DEFS[field].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {def.operators.length > 1 ? (
                      <Select
                        value={condition.op}
                        onValueChange={(value) => setCondition(index, { op: value as RuleOperator })}
                      >
                        <SelectTrigger className="h-9 w-[132px] shrink-0" aria-label="Comparison">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {def.operators.map((op) => (
                            <SelectItem key={op} value={op}>
                              {OPERATOR_LABELS[op]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="shrink-0 px-1 text-[14px] text-ink-3">{OPERATOR_LABELS[condition.op]}</span>
                    )}

                    {def.input === 'choice' ? (
                      <Select value={condition.value} onValueChange={(value) => setCondition(index, { value })}>
                        <SelectTrigger className="h-9 min-w-[150px] flex-1" aria-label="Value">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {def.choices?.map((choice) => (
                            <SelectItem key={choice.value} value={choice.value}>
                              {choice.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex min-w-[140px] flex-1 items-center gap-1.5">
                        <Input
                          className="h-9"
                          type={def.input === 'number' ? 'number' : 'text'}
                          value={condition.value}
                          onChange={(event) => setCondition(index, { value: event.target.value })}
                          placeholder={def.input === 'number' ? '0' : 'typescript'}
                          aria-label="Value"
                        />
                        {def.unit && <span className="shrink-0 text-[13.5px] text-ink-4">{def.unit}</span>}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove condition"
                      disabled={rules.conditions.length === 1}
                      onClick={() =>
                        setRules((prev) => ({
                          ...prev,
                          conditions: prev.conditions.filter((_, i) => i !== index),
                        }))
                      }
                      className="shrink-0 text-ink-4"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              disabled={rules.conditions.length >= 8}
              onClick={() => setRules((prev) => ({ ...prev, conditions: [...prev.conditions, defaultCondition('language')] }))}
            >
              <Plus className="h-4 w-4" />
              Add condition
            </Button>
          </div>

          {/* Live preview — proves the rule does what you meant. */}
          <div className="rounded-[var(--radius-md)] border-[0.5px] border-line bg-surface-2 p-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-[15px] w-[15px] shrink-0 text-violet" />
              <span className="text-[14px] font-medium text-ink">
                {matched === null
                  ? 'Matches appear as you build the rule'
                  : matched.length === 0
                    ? 'Nothing matches yet'
                    : `${matched.length} of ${projects?.length ?? 0} projects match`}
              </span>
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
              {describeRules({ ...rules, conditions: rules.conditions.filter((c) => c.value.trim()) })}
            </p>
            {matched && matched.length > 0 && (
              <p className="mt-2 truncate text-[13px] text-ink-4">
                {matched.slice(0, 4).map((p) => p.name).join(', ')}
                {matched.length > 4 ? ` +${matched.length - 4} more` : ''}
              </p>
            )}
          </div>

          {problem && <p className="text-[14px] text-bad">{problem}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => void save()} disabled={saving} className="min-w-[96px]">
            {saving ? 'Saving…' : draft?.id ? 'Save changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
