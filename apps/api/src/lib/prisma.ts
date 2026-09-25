import { env } from '../config/env';
import { PrismaClient } from '../../../../generated/prisma';

// Cap the pool via the URL's connection_limit param unless the DATABASE_URL already sets one.
function withConnectionLimit(url: string, limit: number): string {
  const parsed = new URL(url);
  if (!parsed.searchParams.has('connection_limit')) {
    parsed.searchParams.set('connection_limit', String(limit));
  }
  return parsed.toString();
}

export const prisma = new PrismaClient({
  datasourceUrl: withConnectionLimit(env.databaseUrl, env.prismaConnectionLimit),
});
