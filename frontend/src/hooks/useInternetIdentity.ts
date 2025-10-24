// frontend/src/hooks/useInternetIdentity.ts
export function useInternetIdentity() {
  return {
    isAuthenticated: false as boolean,
    identity: null as unknown,
    login: async () => {},
    logout: async () => {}
  };
}
