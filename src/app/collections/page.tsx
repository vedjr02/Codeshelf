'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { FolderKanban, Plus, Folder, Tag, Hash } from 'lucide-react';
import Link from 'next/link';

interface CollectionItem {
  id: string;
  name: string;
  description?: string | null;
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
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [colRes, tagRes] = await Promise.all([fetch('/api/collections'), fetch('/api/tags')]);
      const [colData, tagData] = await Promise.all([colRes.json(), tagRes.json()]);
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
        body: JSON.stringify({ name: newCollectionName }),
      });
      if (res.ok) {
        setNewCollectionName('');
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
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="w-5 h-5 text-sky-400" />
            <h1 className="text-[28px] font-semibold tracking-tight leading-none">Collections & Tags</h1>
          </div>
          <p className="text-[13px] text-zinc-500 mt-1 mb-8">Group related projects and build custom taxonomies</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold flex items-center gap-2">
                  <Folder className="w-4 h-4 text-violet-400" />
                  Collections
                </h2>
                <Dialog open={isCreatingCollection} onOpenChange={setIsCreatingCollection}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary">
                      <Plus className="w-3.5 h-3.5" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-950 border-zinc-800">
                    <DialogHeader>
                      <DialogTitle>Create Collection</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCollection} className="space-y-4 mt-4">
                      <Input
                        placeholder="e.g. Work, Side Projects"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-[13px]"
                      />
                      <Button type="submit" className="w-full">Create Collection</Button>
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
                      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Folder className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <h3 className="text-[13.5px] font-semibold">{col.name}</h3>
                            {col.description && <p className="text-[11.5px] text-zinc-500">{col.description}</p>}
                          </div>
                        </div>
                        <span className="text-[11px] text-zinc-500">{col.projectCount} projects</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-fuchsia-400" />
                  Tags
                </h2>
                <Dialog open={isCreatingTag} onOpenChange={setIsCreatingTag}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary">
                      <Plus className="w-3.5 h-3.5" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-950 border-zinc-800">
                    <DialogHeader>
                      <DialogTitle>Create Tag</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTag} className="space-y-4 mt-4">
                      <Input
                        placeholder="e.g. backend, mobile"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-[13px]"
                      />
                      <Button type="submit" className="w-full">Create Tag</Button>
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
                      <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 text-[13px] font-medium hover:border-zinc-600 transition-colors" style={{ color: tag.color }}>
                        <Hash className="w-3.5 h-3.5 opacity-60" />
                        {tag.name}
                        <span className="text-[10.5px] opacity-50">({tag.projectCount})</span>
                      </span>
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