import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Lazily initializes and returns the Prisma client.
 * Ensures DATABASE_URL is available at runtime.
 */
export function getPrisma() {
  if (typeof window !== "undefined") {
    throw new Error("getPrisma() must only be called on the server")
  }

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("[Prisma Diagnostic] DATABASE_URL is NOT defined at request time")
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  console.log("[Prisma Diagnostic] Instantiating new PrismaClient")

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["error"],
  })

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma
  }

  return prisma
}