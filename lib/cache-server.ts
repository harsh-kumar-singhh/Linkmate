import { LRUCache } from "lru-cache";

// Global cache instance for server-side in-memory caching
const globalForCache = globalThis as unknown as {
  dashboardCache: LRUCache<string, any> | undefined;
  inFlightRequests: Map<string, Promise<any>> | undefined;
};

// Dashboard cache: Store data per user for 60-120 seconds
export const dashboardCache = globalForCache.dashboardCache ?? new LRUCache<string, any>({
  max: 500, // Maximum 500 users cached
  ttl: 1000 * 60 * 2, // 2 minutes TTL
});

// In-flight request deduplication: Prevent multiple concurrent DB hits for same user
export const inFlightRequests = globalForCache.inFlightRequests ?? new Map<string, Promise<any>>();

if (process.env.NODE_ENV !== "production") {
  globalForCache.dashboardCache = dashboardCache;
  globalForCache.inFlightRequests = inFlightRequests;
}
