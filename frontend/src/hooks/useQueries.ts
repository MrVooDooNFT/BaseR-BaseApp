import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';

export function useLogs() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, string]>>({
    queryKey: ['logs'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddLog() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addLog(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
}

export function useClearLogs() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.clearLogs();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
}

// Cache operations for wallet stats
export function useWalletStatsCache() {
  const { actor } = useActor();

  const getCachedStats = async (walletAddress: string): Promise<string | null> => {
    if (!actor) return null;
    try {
      const key = hashAddress(walletAddress);
      return await actor.getCache(key);
    } catch (error) {
      console.warn('Failed to get cached stats:', error);
      return null;
    }
  };

  const setCachedStats = async (walletAddress: string, data: string): Promise<void> => {
    if (!actor) return;
    try {
      const key = hashAddress(walletAddress);
      await actor.setCache(key, data);
    } catch (error) {
      console.warn('Failed to set cached stats:', error);
    }
  };

  return { getCachedStats, setCachedStats };
}

// Simple hash function to convert address to number
function hashAddress(address: string): bigint {
  let hash = 0n;
  const normalized = address.toLowerCase().replace('0x', '');
  for (let i = 0; i < Math.min(normalized.length, 16); i++) {
    hash = hash * 16n + BigInt(parseInt(normalized[i], 16));
  }
  return hash;
}
