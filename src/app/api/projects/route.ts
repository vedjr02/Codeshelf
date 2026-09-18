import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectProject } from '@/lib/project-detector';
import { desktopOnlyResponse, isDesktopHost } from '@/lib/desktop';
import { hashString } from '@/lib/utils';
import { getSessionUser } from '@/lib/session';
import { loadProjects, serializeProject, toEvaluable } from '@/lib/project-query';
import { parseRules, matchesRules, describeRules } from '@/lib/smart-rules';

// GET /api/projects - List projects with filtering, sorting and Shelf Scores
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const language = searchParams.get('language');
    const framework = searchParams.get('framework');
    const collectionId = searchParams.get('collectionId');
    const tagId = searchParams.get('tagId');
    const isFavorite = searchParams.get('isFavorite');
    const isArchived = searchParams.get('isArchived');
    const needsBackup = searchParams.get('needsBackup') === 'true';
    const smartId = searchParams.get('smart');
    const sortBy = searchParams.get('sortBy') || 'lastModified';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Everything is scored and rule-matched in one place, so the list is
    // loaded whole and narrowed in memory. A personal library is small, and
    // this keeps the count on a smart collection and its contents in sync.
    const rows = await loadProjects(user.id);
    let projects = rows.map(serializeProject);

    if (isArchived === 'true') {
      projects = projects.filter((p) => p.isArchived);
    } else if (isArchived === 'false' || isArchived === null) {
      projects = projects.filter((p) => !p.isArchived);
    }

    if (isFavorite !== null) {
      const want = isFavorite === 'true';
      projects = projects.filter((p) => p.isFavorite === want);
    }

    if (language) projects = projects.filter((p) => p.language === language);
    if (framework) projects = projects.filter((p) => p.framework === framework);
    if (collectionId) projects = projects.filter((p) => p.collections.some((c) => c.id === collectionId));
    if (tagId) projects = projects.filter((p) => p.tags.some((t) => t.id === tagId));
    if (needsBackup) {
      projects = projects.filter((p) => {
        const recoverable = p.health.factors.find((f) => f.id === 'recoverable');
        return (recoverable?.score ?? 0) < 40;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      projects = projects.filter((p) =>
        [p.name, p.language, p.framework, p.path, ...p.tags.map((t) => t.name)]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      );
    }

    let smartMeta: { id: string; name: string; description: string } | null = null;
    if (smartId) {
      const smart = await prisma.smartCollection.findFirst({
        where: { id: smartId, userId: user.id },
      });
      if (!smart) {
        return NextResponse.json({ error: 'Smart collection not found' }, { status: 404 });
      }
      const rules = parseRules(smart.rules);
      projects = projects.filter((p) => matchesRules(toEvaluable(p), rules));
      smartMeta = { id: smart.id, name: smart.name, description: describeRules(rules) };
    }

    const direction = sortOrder === 'asc' ? 1 : -1;
    const time = (value: Date | null) => (value ? new Date(value).getTime() : 0);
    projects.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name) * direction;
        case 'size':
          return (a.size - b.size) * direction;
        case 'lastOpened':
          return (time(a.lastOpened) - time(b.lastOpened)) * direction;
        case 'health':
          return (a.health.score - b.health.score) * direction;
        default:
          return (time(a.lastModified) - time(b.lastModified)) * direction;
      }
    });

    // Header carries smart-collection context without changing the array shape
    // the client already expects.
    const response = NextResponse.json(projects);
    if (smartMeta) response.headers.set('x-smart-collection', encodeURIComponent(JSON.stringify(smartMeta)));
    return response;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Add a new project by path
export async function POST(request: NextRequest) {
  try {
    if (!isDesktopHost()) return desktopOnlyResponse('Adding a project by path reads that folder on disk.');

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
