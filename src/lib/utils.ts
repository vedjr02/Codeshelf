import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | bigint): string {
  const num = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (num === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));

  return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  const months = Math.floor(diff / 2592000000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return formatDate(d);
}

export function getLanguageColor(language: string | null | undefined): string {
  const colors: Record<string, string> = {
    JavaScript: '#f7df1e',
    TypeScript: '#3178c6',
    Python: '#3776ab',
    Java: '#b07219',
    Go: '#00add8',
    Rust: '#dea584',
    Ruby: '#cc342d',
    PHP: '#777bb4',
    Swift: '#fa7343',
    Kotlin: '#a97bff',
    Dart: '#0175c2',
    Scala: '#c22d40',
    Elixir: '#6e4a7e',
    Clojure: '#db5855',
    Haskell: '#5e5086',
    Lua: '#000080',
    R: '#198ce7',
    Perl: '#39457e',
    ObjectiveC: '#438eff',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    Shell: '#89e051',
    Vue: '#41b883',
    Svelte: '#ff3e00',
    HTML: '#e34c26',
    CSS: '#563d7c',
    SCSS: '#c6538c',
    Less: '#1d365d',
  };
  return language ? colors[language] || '#6b7280' : '#6b7280';
}

export function getFrameworkColor(framework: string | null | undefined): string {
  const colors: Record<string, string> = {
    React: '#61dafb',
    Next: '#000000',
    Vue: '#4fc08d',
    Nuxt: '#00dc82',
    Svelte: '#ff3e00',
    Angular: '#dd0031',
    Express: '#000000',
    Fastify: '#000000',
    Nest: '#e0234e',
    Django: '#092e20',
    Flask: '#000000',
    FastAPI: '#009688',
    Rails: '#cc0000',
    Laravel: '#ff2d20',
    Spring: '#6db33f',
    Actix: '#000000',
    Rocket: '#d33847',
    Gin: '#00add8',
    Fiber: '#00acd7',
  };
  return framework ? colors[framework] || '#6b7280' : '#6b7280';
}

export function getPackageManagerIcon(pm: string | null | undefined): string {
  const icons: Record<string, string> = {
    npm: 'npm',
    yarn: 'yarn',
    pnpm: 'pnpm',
    bun: 'bun',
    pip: 'pip',
    poetry: 'poetry',
    cargo: 'cargo',
    go: 'go mod',
    maven: 'mvn',
    gradle: 'gradle',
    bundler: 'bundle',
    pub: 'pub',
  };
  return pm ? icons[pm] || pm : '';
}

export function parseSearchQuery(query: string): {
  text: string;
  filters: Record<string, string>;
} {
  const filters: Record<string, string> = {};
  const parts: string[] = [];

  const filterRegex = /(\w+):(\S+)/g;
  let match;

  while ((match = filterRegex.exec(query)) !== null) {
    filters[match[1]] = match[2];
  }

  const text = query.replace(filterRegex, '').trim().replace(/\s+/g, ' ');
  return { text, filters };
}

export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
