import { prisma } from "../lib/db";

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomSuffix(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const base = toSlug(name) || "agent";

  const existing = await prisma.agent.findUnique({ where: { slug: base }, select: { id: true } });
  if (!existing) return base;

  // Keep trying with random suffixes until unique
  let slug = `${base}-${randomSuffix()}`;
  while (await prisma.agent.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${randomSuffix()}`;
  }
  return slug;
}
