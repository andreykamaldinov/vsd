export interface Post {
    id: number;
    userId: number;
    title: string;
    body: string;
    createdAt: number;
    readTime: number;
    tags: string[];
}
