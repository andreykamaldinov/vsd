import type { Comment } from '../models/comment.model';
import type { Post } from '../models/post.model';
import type { User } from '../models/user.model';

export function mulberry32(seed: number): () => number {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const FIRST = [
    'Alex',
    'Jordan',
    'Taylor',
    'Casey',
    'Riley',
    'Morgan',
    'Quinn',
    'Avery',
    'Skyler',
    'Reese',
    'Jamie',
    'Drew',
    'Sam',
    'Cameron',
    'Blake',
    'Rowan',
    'Emerson',
    'Parker',
    'Sage',
    'River',
];

const LAST = [
    'Nguyen',
    'Patel',
    'Garcia',
    'Kowalski',
    'Silva',
    'Okafor',
    'Yamamoto',
    'Hernandez',
    'Andersen',
    'Khan',
    'Fischer',
    'Murphy',
    'Santos',
    'Ibrahim',
    'Lopez',
    'Schmidt',
    'Reed',
    'Park',
    'Dubois',
    'Costa',
];

const COMPANIES = [
    'Northwind Labs',
    'Blue Orbit',
    'Cedar Systems',
    'Pixel Foundry',
    'Apex Analytics',
    'Riverstone IO',
    'Helix Cloud',
    'Nova Grid',
    'Tangent Works',
    'Quartz Digital',
    'Summit Forge',
    'Kite Robotics',
    'Parallel Path',
    'Signal Nine',
    'Bright Harbor',
];

const ROLES = [
    'Engineer',
    'Designer',
    'PM',
    'Data Analyst',
    'DevOps',
    'QA',
    'Architect',
    'Support',
    'Research',
    'Writer',
];

const TITLE_PARTS = [
    'Angular',
    'Signals',
    'Performance',
    'Virtual',
    'Scroll',
    'TypeScript',
    'Architecture',
    'Testing',
    'Accessibility',
    'Routing',
    'SSR',
    'Hydration',
    'Build',
    'Tooling',
    'UX',
    'Design',
    'Patterns',
    'State',
    'Memory',
    'Latency',
];

const WORDS = [
    'the',
    'and',
    'with',
    'from',
    'into',
    'about',
    'under',
    'between',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'across',
    'beyond',
    'within',
    'without',
    'against',
    'toward',
    'building',
    'shipping',
    'measuring',
    'caching',
    'indexing',
    'batching',
    'rendering',
    'profiling',
    'streaming',
    'chunking',
    'layouts',
    'threads',
    'frames',
    'buffers',
    'queues',
    'graphs',
    'trees',
    'maps',
    'sets',
    'arrays',
    'objects',
    'modules',
    'bundles',
    'layers',
    'panels',
    'dialogs',
    'tables',
    'forms',
    'routes',
    'guards',
    'pipes',
    'directives',
    'components',
    'services',
    'stores',
    'effects',
    'observers',
    'listeners',
    'handlers',
    'adapters',
    'bridges',
    'gateways',
    'proxies',
    'workers',
    'shards',
    'regions',
    'zones',
    'clusters',
    'nodes',
    'edges',
    'paths',
    'cycles',
    'phases',
    'steps',
    'ticks',
    'windows',
    'slots',
    'spans',
    'blocks',
    'segments',
    'streams',
    'pipelines',
    'filters',
    'reducers',
    'selectors',
    'mappers',
    'sorters',
    'mergers',
    'splitters',
    'joiners',
    'parsers',
    'emitters',
    'decoders',
    'encoders',
    'signers',
    'validators',
    'resolvers',
    'loaders',
    'fetchers',
    'pushers',
    'pullers',
    'movers',
    'copiers',
    'cloners',
    'wrappers',
    'binders',
    'linkers',
    'stitchers',
    'weavers',
    'planners',
    'schedulers',
    'watchers',
    'tracers',
    'samplers',
    'aggregators',
    'normalizers',
    'stabilizers',
    'smoothers',
    'sharpeners',
    'softeners',
    'wideners',
    'tighteners',
    'deepeners',
    'flatteners',
    'rougheners',
    'brighteners',
    'darkeners',
    'quickeners',
    'sloweners',
    'cheapeners',
    'strengtheners',
];

const TAG_POOL = [
    'angular',
    'typescript',
    'performance',
    'a11y',
    'routing',
    'testing',
    'signals',
    'rxjs',
    'css',
    'layout',
    'virtualization',
    'ux',
    'cli',
    'ssr',
    'i18n',
];

const AVATAR_HUES = [210, 24, 142, 48, 280, 168, 32, 200, 12, 320, 96, 260];

function pick<T>(rand: () => number, arr: readonly T[]): T {
    return arr[Math.floor(rand() * arr.length)]!;
}

function buildParagraph(rand: () => number, minWords: number, maxWords: number): string {
    const n = minWords + Math.floor(rand() * (maxWords - minWords + 1));
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
        let w = pick(rand, WORDS);
        if (i === 0) {
            w = w.charAt(0).toUpperCase() + w.slice(1);
        }
        parts.push(w);
        if (rand() < 0.08) {
            parts[parts.length - 1] += rand() < 0.5 ? ',' : ';';
        }
    }
    let s = parts.join(' ') + '.';
    if (rand() < 0.35) {
        s += ' ' + buildParagraph(rand, 8, 40);
    }
    if (rand() < 0.2) {
        s += ' ' + buildParagraph(rand, 6, 28);
    }
    return s;
}

function userInitials(first: string, last: string): string {
    return (first[0] ?? '?').toUpperCase() + (last[0] ?? '?').toUpperCase();
}

export function generateUsers(count: number, seed = 42): User[] {
    const rand = mulberry32(seed);
    const users: User[] = [];
    for (let id = 1; id <= count; id++) {
        const first = pick(rand, FIRST);
        const last = pick(rand, LAST);
        const company = pick(rand, COMPANIES);
        const role = pick(rand, ROLES);
        const email = `${first.toLowerCase()}.${last.toLowerCase()}@${company
            .toLowerCase()
            .replace(/\s+/g, '')}.example.com`;
        const hue = AVATAR_HUES[id % AVATAR_HUES.length]!;
        users.push({
            id,
            name: `${first} ${last}`,
            email,
            company,
            role,
            avatarColor: `hsl(${hue} 55% 42%)`,
            initials: userInitials(first, last),
        });
    }
    return users;
}

export function generatePosts(count: number, userCount: number, seed = 42): Post[] {
    const rand = mulberry32(seed ^ 0x9e3779b9);
    const posts: Post[] = [];
    const baseTime = Date.UTC(2023, 0, 1);
    for (let id = 1; id <= count; id++) {
        const userId = 1 + Math.floor(rand() * userCount);
        const t1 = pick(rand, TITLE_PARTS);
        const t2 = pick(rand, TITLE_PARTS);
        const t3 = rand() < 0.45 ? `: ${pick(rand, TITLE_PARTS)}` : '';
        const title = `${t1}, ${t2}${t3}`;
        const body = buildParagraph(rand, 24, 120);
        const createdAt = baseTime + Math.floor(rand() * 1000 * 60 * 60 * 24 * 700);
        const readTime = 1 + Math.floor(rand() * 18);
        const tagCount = Math.floor(rand() * 4);
        const tags: string[] = [];
        for (let t = 0; t < tagCount; t++) {
            tags.push(pick(rand, TAG_POOL));
        }
        posts.push({ id, userId, title, body, createdAt, readTime, tags });
    }
    return posts;
}

export function generateCommentsForPost(postId: number): Comment[] {
    const count = 2 + (Math.abs(postId) % 14);

    const seed = postId * 2654435761;
    const rand = mulberry32(seed ^ postId);

    const comments: Comment[] = [];

    const baseTime = Date.UTC(2024, 0, 1);

    for (let i = 0; i < count; i++) {
        const first = pick(rand, FIRST);
        const last = pick(rand, LAST);

        comments.push({
            id: postId * 10000 + i,
            postId,
            author: `${first} ${last}`,
            body: buildParagraph(rand, 6, 36),
            createdAt: baseTime + Math.floor(rand() * 1000 * 60 * 60 * 24 * 120),
        });
    }

    return comments;
}
