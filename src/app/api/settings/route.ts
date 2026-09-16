import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

// GET /api/settings - Get the current user's settings
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await prisma.setting.findUnique({
      where: { userId: user.id },
    });

    // Lazily create defaults on first read
    if (!settings) {
      settings = await prisma.setting.create({
        data: { userId: user.id },
      });
    }

    return NextResponse.json({
      backupPath: settings.backupPath,
      defaultProvider: settings.defaultProvider,
      autoBackup: settings.autoBackup,
      notifications: settings.notifications,
    });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/settings - Update the current user's settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { backupPath, defaultProvider, autoBackup, notifications } = body;

    // Validation
    if (backupPath !== undefined) {
      if (typeof backupPath !== 'string' || !backupPath.trim()) {
        return NextResponse.json({ error: 'Backup path cannot be empty' }, { status: 400 });
      }
      if (backupPath.length > 1024) {
        return NextResponse.json({ error: 'Backup path is too long' }, { status: 400 });
      }
    }
    if (defaultProvider !== undefined && defaultProvider !== 'local') {
      return NextResponse.json({ error: 'Unsupported storage provider' }, { status: 400 });
    }
    if (autoBackup !== undefined && typeof autoBackup !== 'boolean') {
      return NextResponse.json({ error: 'autoBackup must be a boolean' }, { status: 400 });
    }
    if (notifications !== undefined && typeof notifications !== 'boolean') {
      return NextResponse.json({ error: 'notifications must be a boolean' }, { status: 400 });
    }

    const data: {
      backupPath?: string;
      defaultProvider?: string;
      autoBackup?: boolean;
      notifications?: boolean;
    } = {};
    if (backupPath !== undefined) data.backupPath = backupPath.trim();
    if (defaultProvider !== undefined) data.defaultProvider = defaultProvider;
    if (autoBackup !== undefined) data.autoBackup = autoBackup;
    if (notifications !== undefined) data.notifications = notifications;

    const settings = await prisma.setting.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });

    return NextResponse.json({
      backupPath: settings.backupPath,
      defaultProvider: settings.defaultProvider,
      autoBackup: settings.autoBackup,
      notifications: settings.notifications,
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
