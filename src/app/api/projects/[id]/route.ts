import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectProject } from '@/lib/project-detector';
import * as fs from 'fs/promises';
import * as path from 'path';

// Helper for file tree generation
async function getFileTree(dirPath: string, maxDepth = 3, currentDepth = 0): Promise<any[]> {
  if (currentDepth >= maxDepth) return [];

  const ignoreDirs = ['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.venv', 'venv'];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result: any[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
      if (ignoreDirs.includes(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = await getFileTree(fullPath, maxDepth, currentDepth + 1);
        result.push({
          name: entry.name,
          type: 'directory',
          path: fullPath,
          children,
        });
      } else {
        try {
          const stats = await fs.stat(fullPath);
          result.push({
            name: entry.name,
            type: 'file',
            path: fullPath,
            size: stats.size,
          });
        } catch {
          // Skip
        }
      }
    }

    return result.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  } catch {
    return [];
  }
}

// GET /api/projects/[id] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        collections: {
          include: {
            collection: true,
          },
        },
        backups: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update lastOpened
    await prisma.project.update({
      where: { id },
      data: { lastOpened: new Date() },
    });

    // Get live file structure
    let fileStructure = [];
    try {
      fileStructure = await getFileTree(project.path);
    } catch {
      // Keep empty if path is inaccessible
    }

    return NextResponse.json({
      ...project,
      size: Number(project.size),
      tags: project.tags.map(t => t.tag),
      collections: project.collections.map(c => c.collection),
      dependencies: project.dependencies ? JSON.parse(project.dependencies) : [],
      devDependencies: project.devDependencies ? JSON.parse(project.devDependencies) : [],
      scripts: project.scripts ? JSON.parse(project.scripts) : [],
      fileStructure,
      backups: project.backups.map(b => ({
        ...b,
        size: Number(b.size),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update project metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      notes,
      isFavorite,
      isArchived,
      isPinned,
      status,
      tagIds,
      collectionIds,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (status !== undefined) updateData.status = status;

    // Update tags if provided
    if (tagIds !== undefined) {
      await prisma.projectTag.deleteMany({ where: { projectId: id } });
      updateData.tags = {
        create: tagIds.map((tagId: string) => ({
          tag: { connect: { id: tagId } },
        })),
      };
    }

    // Update collections if provided
    if (collectionIds !== undefined) {
      await prisma.projectCollection.deleteMany({ where: { projectId: id } });
      updateData.collections = {
        create: collectionIds.map((collectionId: string) => ({
          collection: { connect: { id: collectionId } },
        })),
      };
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        tags: { include: { tag: true } },
        collections: { include: { collection: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      size: Number(updated.size),
      tags: updated.tags.map(t => t.tag),
      collections: updated.collections.map(c => c.collection),
    });
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project from CodeShelf (does not delete local files)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
