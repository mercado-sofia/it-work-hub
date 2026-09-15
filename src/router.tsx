import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { SessionUser } from "@/data/requests";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient, session: null as SessionUser | null },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
