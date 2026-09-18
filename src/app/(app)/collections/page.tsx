'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, FolderClosed, Hash, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { PageShell, Section } from '@/components/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState, SkeletonRows } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SmartCollectionEditor, type SmartCollectionDraft } from '@/components/smart-collection-editor';
import { useToast } from '@/components/ui/toast';
import { notifyLibraryChanged, useLibrary, type SmartCollectionSummary } from '@/components/library-context';
import { RULE_PRESETS } from '@/lib/smart-rules';
import { plural } from '@/lib/utils';

export default function CollectionsPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Collections">
          <SkeletonRows rows={4} />
        </PageShell>
      }
    >
      <CollectionsContent />
    </Suspense>
  );
}

function CollectionsContent() {
  const params = useSearchParams();
  const { collections, tags, smartCollections, authResolved, refresh } = useLibrary();
  const { success, error: toastError } = useToast();

  const [smartDraft, setSmartDraft] = React.useState<SmartCollectionDraft | null>(null);
  const [smartOpen, setSmartOpen] = React.useState(false);
  const [smartDelete, setSmartDelete] = React.useState<SmartCollectionSummary | null>(null);

  const [collectionOpen, setCollectionOpen] = React.useState(false);
  const [collectionName, setCollectionName] = React.useState('');
  const [collectionDesc, setCollectionDesc] = React.useState('');
  const [tagOpen, setTagOpen] = React.useState(false);
  const [tagName, setTagName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  /* The sidebar's + buttons deep-link straight into the right sheet. */
  const requested = params.get('new');
  React.useEffect(() => {
    if (!requested) return;
    const frame = requestAnimationFrame(() => {
      if (requested === 'smart') {
        setSmartDraft(null);
        setSmartOpen(true);
      } else if (requested === 'collection') {
        setCollectionOpen(true);
      } else if (requested === 'tag') {
        setTagOpen(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [requested]);

  const createCollection = async () => {
    if (!collectionName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: collectionName.trim(), description: collectionDesc.trim() }),
      });
      if (!res.ok) throw new Error('Could not create that collection');
      success('Collection created', collectionName.trim());
      setCollectionName('');
      setCollectionDesc('');
      setCollectionOpen(false);
      notifyLibraryChanged();
      await refresh();
    } catch (err) {
      toastError('Could not create collection', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const createTag = async () => {
    if (!tagName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName.trim() }),
      });
      if (!res.ok) throw new Error('Could not create that tag');
      success('Tag created', tagName.trim());
      setTagName('');
      setTagOpen(false);
      notifyLibraryChanged();
      await refresh();
    } catch (err) {
      toastError('Could not create tag', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSmart = async () => {
    if (!smartDelete) return;
    try {
      const res = await fetch(`/api/smart-collections/${smartDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete that collection');
      success('Smart Collection deleted', 'No projects were changed.');
      setSmartDelete(null);
      notifyLibraryChanged();
      await refresh();
    } catch (err) {
      toastError('Could not delete', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const createPreset = async (preset: (typeof RULE_PRESETS)[number]) => {
    try {
      const res = await fetch('/api/smart-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: preset.name, icon: preset.icon, rules: preset.rules }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Could not add that rule');
      success('Smart Collection added', preset.name);
      notifyLibraryChanged();
      await refresh();
    } catch (err) {
      toastError('Could not add it', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const unusedPresets = RULE_PRESETS.filter(
    (preset) => !smartCollections.some((smart) => smart.name === preset.name)
  );

  return (
    <>
      <PageShell
        title="Organize"
        subtitle="Collections you file by hand, Smart Collections that file themselves, and tags for everything that cuts across both."
        actions={
          <Button
            variant="primary"
            size="pill"
            onClick={() => {
              setSmartDraft(null);
              setSmartOpen(true);
            }}
          >
            <Sparkles className="h-4 w-4" />
            New rule
          </Button>
        }
      >
        {!authResolved ? (
          <SkeletonRows rows={4} />
        ) : (
          <div className="space-y-10">
            {/* ---- Smart Collections ---------------------------------- */}
            <Section
              title="Smart Collections"
              description="Rules, evaluated every time you look."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSmartDraft(null);
                    setSmartOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              }
            >
              {smartCollections.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<Sparkles className="text-violet" />}
                    title="No rules yet"
                    description="A Smart Collection answers a question about your library — and keeps answering it as things change."
                  />
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {smartCollections.map((smart) => (
                    <Card key={smart.id} interactive className="group p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-violet-tint text-violet">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/projects?smart=${smart.id}`}
                            className="block truncate text-[15.5px] font-semibold tracking-[-0.015em] text-ink hover:text-accent-ink"
                          >
                            {smart.name}
                          </Link>
                          <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-3">
                            {smart.description}
                          </p>
                          <p className="mt-2 text-[13px] tabular text-ink-4">
                            {plural(smart.projectCount, 'project')}
                            {smart.sample.length > 0 && (
                              <span className="text-ink-5"> · {smart.sample.map((s) => s.name).join(', ')}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${smart.name}`}
                            onClick={() => {
                              setSmartDraft({ id: smart.id, name: smart.name, rules: smart.rules });
                              setSmartOpen(true);
                            }}
                          >
                            <Pencil className="h-[14px] w-[14px]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${smart.name}`}
                            onClick={() => setSmartDelete(smart)}
                            className="text-ink-4 hover:bg-bad-tint hover:text-bad"
                          >
                            <Trash2 className="h-[14px] w-[14px]" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {unusedPresets.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2.5 text-[13.5px] text-ink-4">Start from a common one:</p>
                  <div className="flex flex-wrap gap-2">
                    {unusedPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => void createPreset(preset)}
                        title={preset.description}
                        className="inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-line bg-surface px-3 py-1.5 text-[13.5px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
                      >
                        <Plus className="h-3.5 w-3.5 text-ink-4" />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* ---- Collections ---------------------------------------- */}
            <Section
              title="Collections"
              description="Grouped by hand, for the sets only you can define."
              action={
                <Button variant="secondary" size="sm" onClick={() => setCollectionOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              }
            >
              {collections.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<FolderClosed />}
                    title="No collections yet"
                    description="Create one, then add projects to it from any project page."
                  />
                </Card>
              ) : (
                <Card className="overflow-hidden" elevation="flat">
                  {collections.map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/projects?collectionId=${collection.id}`}
                      className="group flex items-center gap-3 border-b-[0.5px] border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-tint text-accent-ink">
                        <FolderClosed className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-ink">{collection.name}</span>
                        {collection.description && (
                          <span className="block truncate text-[13.5px] text-ink-4">{collection.description}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-[13.5px] tabular text-ink-4">
                        {plural(collection.projectCount, 'project')}
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-5 transition-colors group-hover:text-accent-ink" />
                    </Link>
                  ))}
                </Card>
              )}
            </Section>

            {/* ---- Tags ----------------------------------------------- */}
            <Section
              title="Tags"
              description="Cross-cutting labels — a project can carry as many as it needs."
              action={
                <Button variant="secondary" size="sm" onClick={() => setTagOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              }
            >
              {tags.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<Hash />}
                    title="No tags yet"
                    description="Tags are the fastest way to slice the library — client, experiment, teaching, whatever you need."
                  />
                </Card>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/projects?tagId=${tag.id}`}
                      className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium transition-[background-color,transform] duration-150 hover:-translate-y-px"
                      style={{
                        color: tag.color,
                        backgroundColor: `color-mix(in srgb, ${tag.color} 13%, transparent)`,
                      }}
                    >
                      <Hash className="h-3.5 w-3.5 opacity-70" />
                      {tag.name}
                      <span className="tabular opacity-60">{tag.projectCount}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </PageShell>

      <SmartCollectionEditor
        open={smartOpen}
        onOpenChange={setSmartOpen}
        draft={smartDraft}
        onSaved={() => void refresh()}
      />

      <ConfirmDialog
        open={smartDelete !== null}
        onOpenChange={(open) => !open && setSmartDelete(null)}
        title={smartDelete ? `Delete “${smartDelete.name}”?` : 'Delete Smart Collection?'}
        description="Only the rule is deleted."
        detail="No project is removed, archived or changed in any way."
        confirmLabel="Delete rule"
        destructive
        onConfirm={deleteSmart}
      />

      {/* New collection */}
      <Dialog open={collectionOpen} onOpenChange={(open) => !saving && setCollectionOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>A set you curate yourself. Add projects from any project page.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <Field label="Name" htmlFor="collection-name">
              <Input
                id="collection-name"
                value={collectionName}
                onChange={(event) => setCollectionName(event.target.value)}
                placeholder="Client work"
                autoFocus
                onKeyDown={(event) => event.key === 'Enter' && void createCollection()}
              />
            </Field>
            <Field label="Description" htmlFor="collection-description" hint="Optional.">
              <Input
                id="collection-description"
                value={collectionDesc}
                onChange={(event) => setCollectionDesc(event.target.value)}
                placeholder="Anything I invoice for"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setCollectionOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void createCollection()}
              disabled={saving || !collectionName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New tag */}
      <Dialog open={tagOpen} onOpenChange={(open) => !saving && setTagOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New tag</DialogTitle>
            <DialogDescription>Short, lowercase labels work best.</DialogDescription>
          </DialogHeader>
          <div className="mt-5">
            <Field label="Name" htmlFor="tag-name">
              <Input
                id="tag-name"
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                placeholder="experiment"
                autoFocus
                onKeyDown={(event) => event.key === 'Enter' && void createTag()}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setTagOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => void createTag()} disabled={saving || !tagName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
