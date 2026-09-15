import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { SessionUser } from "@/data/requests";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient, session: null as SessionUser | null },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultStaleTime: 30_000,
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
