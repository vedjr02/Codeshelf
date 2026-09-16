'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { FolderKanban, Plus, Folder, Tag, Hash, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface CollectionItem {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  projectCount: number;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
  projectCount: number;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [colRes, tagRes] = await Promise.all([
        fetch('/api/collections'),
        fetch('/api/tags'),
      ]);

      const [colData, tagData] = await Promise.all([
        colRes.json(),
        tagRes.json(),
      ]);

      setCollections(colData);
      setTags(tagData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName,
          description: newCollectionDesc,
        }),
      });

      if (res.ok) {
        setNewCollectionName('');
        setNewCollectionDesc('');
        setIsCreatingCollection(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName }),
      });

      if (res.ok) {
        setNewTagName('');
        setIsCreatingTag(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Loading collections and tags..." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-rise">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-sky-400/80 flex items-center gap-1.5 mb-2">
              <FolderKanban className="w-3.5 h-3.5" />
              Organize
            </span>
            <h1 className="text-[28px] font-semibold tracking-tight leading-none mb-1">
              Collections & Tags
            </h1>
            <p className="text-[13px] text-white/40 mt-1">
              Group related projects and build custom taxonomies
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Collections Section */}
            <div className="animate-rise" style={{ animationDelay: '0.05s' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Folder className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  Collections
                </h2>

                <Dialog open={isCreatingCollection} onOpenChange={setIsCreatingCollection}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary" className="rounded-xl gap-1 text-[12.5px]">
                      <Plus className="w-3.5 h-3.5" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#141416] border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-[16px] tracking-tight">Create Collection</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCollection} className="space-y-4 mt-4">
                      <div>
                        <label className="text-[12px] text-white/50 mb-1.5 block font-medium">Name</label>
                        <Input
                          placeholder="e.g. Work, Side Projects, Open Source"
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          className="rounded-xl bg-white/[0.045] border-white/[0.08] text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] text-white/50 mb-1.5 block font-medium">Description</label>
                        <Input
                          placeholder="Optional description"
                          value={newCollectionDesc}
                          onChange={(e) => setNewCollectionDesc(e.target.value)}
                          className="rounded-xl bg-white/[0.045] border-white/[0.08] text-[13px]"
                        />
                      </div>
                      <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                        Create Collection
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {collections.length === 0 ? (
                <EmptyState
                  title="No collections yet"
                  description="Create a collection to group related projects together."
                  className="py-10"
                />
              ) : (
                <div className="space-y-2">
                  {collections.map((col) => (
                    <Link key={col.id} href={`/projects?collectionId=${col.id}`}>
                      <div className="group flex items-center justify-between p-4 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                            <Folder className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <h3 className="text-[13.5px] font-semibold tracking-tight">{col.name}</h3>
                            {col.description && (
                              <p className="text-[11.5px] text-white/35 mt-0.5">{col.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/40 tabular-nums bg-white/[0.05] px-2 py-0.5 rounded-full">
                            {col.projectCount} projects
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Tags Section */}
            <div className="animate-rise" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 text-fuchsia-400" />
                  </div>
                  Tags
                </h2>

                <Dialog open={isCreatingTag} onOpenChange={setIsCreatingTag}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary" className="rounded-xl gap-1 text-[12.5px]">
                      <Plus className="w-3.5 h-3.5" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#141416] border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-[16px] tracking-tight">Create Tag</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTag} className="space-y-4 mt-4">
                      <div>
                        <label className="text-[12px] text-white/50 mb-1.5 block font-medium">Name</label>
                        <Input
                          placeholder="e.g. backend, mobile, machine-learning"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="rounded-xl bg-white/[0.045] border-white/[0.08] text-[13px]"
                        />
                      </div>
                      <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white">
                        Create Tag
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {tags.length === 0 ? (
                <EmptyState
                  title="No tags yet"
                  description="Tags allow multi-dimensional filtering across your projects."
                  className="py-10"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Link key={tag.id} href={`/projects?tagId=${tag.id}`}>
                      <div
                        className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] text-[13px] font-medium transition-all duration-200 hover:border-white/[0.12]"
                        style={{
                          backgroundColor: `${tag.color}0D`,
                          color: tag.color,
                        }}
                      >
                        <Hash className="w-3.5 h-3.5 opacity-60" />
                        {tag.name}
                        <span className="text-[10.5px] opacity-50 tabular-nums">({tag.projectCount})</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
