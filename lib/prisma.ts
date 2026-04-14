import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

/**
 * Utility to retry database operations, specifically to handle Neon cold starts.
 * @param fn The database operation to execute
 * @param retries Number of retries (default: 2)
 * @param delay Delay between retries in ms (default: 1000)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isConnectionError = 
      error.name === "PrismaClientInitializationError" || 
      error.message?.includes("Can't reach database server") ||
      error.message?.includes("connection reset") ||
      error.code === "P1001"; // Can't reach database at host:port

    if (retries > 0 && isConnectionError) {
      console.warn(`[DATABASE] Retrying connection... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}