/**
 * Utility to get current time with support for simulation via TEST_NOW environment variable or argument.
 */
export function getCurrentTime(testNow?: string | Date): Date {
    if (testNow) {
        return new Date(testNow);
    }
    
    if (process.env.TEST_NOW) {
        return new Date(process.env.TEST_NOW);
    }
    
    return new Date();
}
