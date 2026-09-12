import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createBackup,
  restoreBackup,
  deleteBackup,
  ensureBackupDirectory,
  getBackupInfo,
} from '@/lib/backup';

const DEFAULT_USER_ID = 'dev-user-id';

// GET /api/backup - List backups for a project or all backups
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: any = { userId: DEFAULT_USER_ID };
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
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Ensure backup directory exists
    const basePath = process.env.BACKUP_STORAGE_PATH || '/tmp/codeshelf-backups';
    await ensureBackupDirectory(basePath);

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        projectId,
        userId: DEFAULT_USER_ID,
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
        onProgress: async (progress, currentFile) => {
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

// DELETE /api/backup - Delete a backup
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('backupId');

    if (!backupId) {
      return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 });
    }

    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
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
