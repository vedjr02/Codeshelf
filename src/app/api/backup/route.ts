import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { createBackup, deleteBackup, ensureBackupDirectory, restoreBackup } from '@/lib/backup';
import { getSessionUser } from '@/lib/session';
import * as fs from 'fs/promises';
import * as path from 'path';

// GET /api/backup - List backups for a project or all backups
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: Prisma.BackupWhereInput = { userId: user.id };
    if (projectId) where.projectId = projectId;

    const backups = await prisma.backup.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, path: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      backups.map(b => ({
        ...b,
        size: Number(b.size),
      }))
    );
  } catch (error) {
    console.error('Failed to fetch backups:', error);
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 });
  }
}

// POST /api/backup - Create a new backup
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Ensure backup directory exists
    const basePath = process.env.BACKUP_STORAGE_PATH || '/tmp/codeshelf-backups';
    await ensureBackupDirectory(basePath);

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        projectId,
        userId: user.id,
        provider: 'local',
        storagePath: `${basePath}/${project.id}-${Date.now()}.zip`,
        status: 'pending',
        excludedPaths: JSON.stringify([
          'node_modules',
          '.git',
          '.next',
          'dist',
          'build',
          '__pycache__',
        ]),
      },
    });

    // Update status to in-progress
    await prisma.backup.update({
      where: { id: backup.id },
      data: { status: 'in-progress' },
    });

    try {
      // Create the backup
      const { size, fileCount } = await createBackup({
        projectId: project.id,
        projectPath: project.path,
        outputPath: backup.storagePath,
        onProgress: async (progress) => {
          // Update progress in DB (could use WebSocket for real-time updates)
          if (progress % 10 === 0) {
            await prisma.backup.update({
              where: { id: backup.id },
              data: { progress },
            });
          }
        },
      });

      // Mark as completed
      const updatedBackup = await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'completed',
          progress: 100,
          size: BigInt(size),
          fileCount,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        ...updatedBackup,
        size: Number(updatedBackup.size),
      });
    } catch (backupError) {
      // Mark as failed
      await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'failed',
          error: backupError instanceof Error ? backupError.message : 'Backup failed',
        },
      });

      throw backupError;
    }
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}

// PUT /api/backup - Restore a backup to a chosen destination directory
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { backupId, destination } = await request.json();

    if (!backupId || !destination || typeof destination !== 'string') {
      return NextResponse.json({ error: 'Backup ID and destination are required' }, { status: 400 });
    }

    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
      include: { project: { select: { name: true } } },
    });

    if (!backup || backup.userId !== user.id) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    if (backup.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed backups can be restored' }, { status: 400 });
    }

    // Destination must exist and be a directory
    try {
      const destStat = await fs.stat(destination);
      if (!destStat.isDirectory()) {
        return NextResponse.json({ error: 'Destination is not a directory' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Destination directory does not exist' }, { status: 400 });
    }

    const restoreDir = path.join(destination, `${backup.project.name}-restored-${Date.now()}`);
    await restoreBackup({ backupPath: backup.storagePath, outputPath: restoreDir });

    return NextResponse.json({ success: true, path: restoreDir });
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}

// DELETE /api/backup - Delete a backup
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('backupId');

    if (!backupId) {
      return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 });
    }

    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup || backup.userId !== user.id) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    // Delete the file
    try {
      await deleteBackup(backup.storagePath);
    } catch {
      // File may not exist, continue
    }

    // Delete the record
    await prisma.backup.delete({
      where: { id: backupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
}
