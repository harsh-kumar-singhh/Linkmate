import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Lazily initializes and returns the Prisma client.
 * This prevents Prisma from being instantiated at module load time,
 * ensuring environment variables like DATABASE_URL are available.
 */
export function getPrisma() {
  if (typeof window !== 'undefined') {
    throw new Error('getPrisma() should only be called on the server.')
  }

  const databaseUrl = process.env.DATABASE_URL

  // Runtime diagnostic logging
  if (!databaseUrl) {
    console.error('[Prisma Diagnostic] DATABASE_URL is NOT defined at request time!')
  } else {
    // Log a masked version for safety
    const maskedUrl = databaseUrl.replace(/:([^@]+)@/, ':****@')
    console.log(`[Prisma Diagnostic] DATABASE_URL is defined: ${maskedUrl.substring(0, 30)}...`)
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  console.log('[Prisma Diagnostic] Instantiating new PrismaClient')
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }

  return prisma
}

// getPrisma() should be called inside functions to ensure lazy initialization

