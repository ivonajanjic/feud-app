import { QueryClient } from "@tanstack/react-query";

// Simplified QueryClient for standalone Family Feud Go prototype
// tRPC/API dependencies removed for offline-first gameplay
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable refetching for offline prototype
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});
