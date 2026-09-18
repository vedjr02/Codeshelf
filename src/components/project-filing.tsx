'use client';

import * as React from 'react';
import { Check, FolderClosed, Hash, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { notifyLibraryChanged, useLibrary } from '@/components/library-context';
import { cn } from '@/lib/utils';

export interface TagRef {
  id: string;
  name: string;
  color: string;
}

export interface CollectionRef {
  id: string;
  name: string;
}

/**
 * Puts a project into collections and tags.
 *
 * Tags and collections could be created but never attached to anything, which
 * made both features decorative. This is the missing half: the chips are the
 * current filing, and the menus change it.
 */
export function ProjectFiling({
  projectId,
  tags,
  collections,
  onChanged,
}: {
  projectId: string;
  tags: TagRef[];
  collections: CollectionRef[];
  onChanged: (next: { tags: TagRef[]; collections: CollectionRef[] }) => void;
}) {
  const library = useLibrary();
  const { error: toastError } = useToast();
  const [saving, setSaving] = React.useState(false);

  const tagIds = new Set(tags.map((t) => t.id));
  const collectionIds = new Set(collections.map((c) => c.id));

  const save = async (nextTagIds: string[], nextCollectionIds: string[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: nextTagIds, collectionIds: nextCollectionIds }),
      });
      if (!res.ok) throw new Error('Could not save that change');
      const updated = await res.json();
      onChanged({ tags: updated.tags ?? [], collections: updated.collections ?? [] });
      notifyLibraryChanged();
    } catch (err) {
      toastError('Could not file this project', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (id: string) => {
    const next = new Set(tagIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    void save(Array.from(next), Array.from(collectionIds));
  };

  const toggleCollection = (id: string) => {
    const next = new Set(collectionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    void save(Array.from(tagIds), Array.from(next));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {collections.map((collection) => (
        <span
          key={collection.id}
          className="inline-flex h-[23px] items-center gap-1.5 rounded-full bg-accent-tint px-2.5 text-[13px] font-medium text-accent-ink"
        >
          <FolderClosed className="h-3 w-3" />
          {collection.name}
        </span>
      ))}
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex h-[23px] items-center gap-1 rounded-full px-2.5 text-[13px] font-medium"
          style={{
            color: tag.color,
            backgroundColor: `color-mix(in srgb, ${tag.color} 13%, transparent)`,
          }}
        >
          <Hash className="h-3 w-3 opacity-70" />
          {tag.name}
        </span>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs" disabled={saving} className="rounded-full text-ink-3">
            <Plus className="h-3.5 w-3.5" />
            {tags.length + collections.length === 0 ? 'File this project' : 'Edit'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[240px]">
          <DropdownMenuLabel>Collections</DropdownMenuLabel>
          {library.collections.length === 0 ? (
            <DropdownMenuItem disabled>No collections yet</DropdownMenuItem>
          ) : (
            library.collections.map((collection) => (
              <DropdownMenuItem
                key={collection.id}
                onSelect={(event) => {
                  event.preventDefault();
                  toggleCollection(collection.id);
                }}
              >
                <Check
                  className={cn('transition-opacity', collectionIds.has(collection.id) ? 'opacity-100' : 'opacity-0')}
                />
                {collection.name}
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Tags</DropdownMenuLabel>
          {library.tags.length === 0 ? (
            <DropdownMenuItem disabled>No tags yet</DropdownMenuItem>
          ) : (
            library.tags.map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                onSelect={(event) => {
                  event.preventDefault();
                  toggleTag(tag.id);
                }}
              >
                <Check className={cn('transition-opacity', tagIds.has(tag.id) ? 'opacity-100' : 'opacity-0')} />
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
