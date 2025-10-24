// Minimal no-op stub to remove ICP dependency
export type Actor = any;

export function useActor() {
  return {
    actor: null as unknown as Actor,
    isReady: false,
    // keep signature flexible so existing calls don't break
    call: async (..._args: any[]) => null
  };
}
