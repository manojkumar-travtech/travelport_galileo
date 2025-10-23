export const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};


/**
 * Waits for the specified number of milliseconds
 * @param ms milliseconds to wait
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> => {
  let attempt = 0;

  while (attempt < retries) {
    attempt++;
    try {
      return await fn();
    } catch (error: any) {
      if (attempt < retries) {
        console.warn(`⚠️ Attempt ${attempt} failed: ${error.message || error}. Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      } else {
        throw new Error(`Failed after ${retries} attempts: ${error.message || error}`);
      }
    }
  }

  // This should never happen
  throw new Error("Unexpected error in retry function");
};