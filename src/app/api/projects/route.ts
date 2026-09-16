import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectProject } from '@/lib/project-detector';
import { hashString } from '@/lib/utils';
import { getSessionUser } from '@/lib/session';
import * as path from 'path';

// GET /api/projects - List projects with filtering and sorting
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const language = searchParams.get('language');
    const framework = searchParams.get('framework');
    const status = searchParams.get('status');
    const collectionId = searchParams.get('collectionId');
    const tagId = searchParams.get('tagId');
    const isFavorite = searchParams.get('isFavorite');
    const isArchived = searchParams.get('isArchived');
    const sortBy = searchParams.get('sortBy') || 'lastModified';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: any = {
      userId: user.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { language: { contains: search, mode: 'insensitive' } },
        { framework: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (language) where.language = language;
    if (framework) where.framework = framework;
    if (status) where.status = status;
    if (isFavorite !== null && isFavorite !== undefined) where.isFavorite = isFavorite === 'true';
    if (isArchived !== null && isArchived !== undefined) {
      where.isArchived = isArchived === 'true';
    } else {
      where.isArchived = false; // Default to non-archived
    }

    if (collectionId) {
      where.collections = {
        some: { collectionId },
      };
    }

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    }

    const orderBy: any = {};
    if (sortBy === 'name') orderBy.name = sortOrder;
    else if (sortBy === 'size') orderBy.size = sortOrder;
    else if (sortBy === 'lastOpened') orderBy.lastOpened = sortOrder;
    else orderBy.lastModified = sortOrder;

    const projects = await prisma.project.findMany({
      where,
      orderBy,
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
          take: 1,
        },
      },
    });

    // Format response
    const formattedProjects = projects.map(p => ({
      ...p,
      size: Number(p.size),
      tags: p.tags.map(t => t.tag),
      collections: p.collections.map(c => c.collection),
      dependencies: p.dependencies ? JSON.parse(p.dependencies) : [],
      devDependencies: p.devDependencies ? JSON.parse(p.devDependencies) : [],
      scripts: p.scripts ? JSON.parse(p.scripts) : [],
      // Convert BigInt in nested backups too (spread above keeps them raw)
      backups: p.backups.map(b => ({ ...b, size: Number(b.size) })),
    }));

    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Add a new project by path
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectPath, collectionIds = [], tagIds = [] } = await request.json();

    if (!projectPath) {
      return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
    }

    // Detect project info
    const detected = await detectProject(projectPath);

    if (!detected) {
      return NextResponse.json({ error: 'Could not detect project at path' }, { status: 400 });
    }

    // Generate hashes for duplicate detection
    const structureHash = await hashString(
      `${detected.language}-${detected.framework}-${detected.dependencies.map(d => d.name).sort().join(',')}`
    );

    // Create project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: detected.name,
        path: projectPath,
        language: detected.language,
        framework: detected.framework,
        packageManager: detected.packageManager,
        size: BigInt(detected.size),
        lastModified: new Date(),
        readme: detected.readme,

        // Git info
        isGitRepo: detected.isGitRepo,
        gitRemote: detected.gitRemote,
        gitBranch: detected.gitBranch,
        gitStatus: detected.gitStatus,

        // Detection flags
        hasPackageJson: detected.hasPackageJson,
        hasRequirements: detected.hasRequirements,
        hasCargo: detected.hasCargo,
        hasGoMod: detected.hasGoMod,
        hasPubspec: detected.hasPubspec,
        hasGemfile: detected.hasGemfile,
        hasPomXml: detected.hasPomXml,

        // Serialized data
        dependencies: JSON.stringify(detected.dependencies),
        devDependencies: JSON.stringify(detected.devDependencies),
        scripts: JSON.stringify(detected.scripts),
        structureHash,

        // Relations
        tags: {
          create: tagIds.map((tagId: string) => ({
            tag: { connect: { id: tagId } },
          })),
        },
        collections: {
          create: collectionIds.map((collectionId: string) => ({
            collection: { connect: { id: collectionId } },
          })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        collections: { include: { collection: true } },
      },
    });

    return NextResponse.json({
      ...project,
      size: Number(project.size),
      tags: project.tags.map(t => t.tag),
      collections: project.collections.map(c => c.collection),
      dependencies: detected.dependencies,
      devDependencies: detected.devDependencies,
      scripts: detected.scripts,
    });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
