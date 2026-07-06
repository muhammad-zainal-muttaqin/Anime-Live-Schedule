import { QueryClient } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Data comes from server-side KV; it changes slowly, so avoid noisy
        // refetches on window focus and keep it fresh for a minute by default.
        staleTime: 1000 * 60,
        refetchOnWindowFocus: false,
      },
    },
  })

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultStructuralSharing: true,
    // Un-preloaded navigations (year dropdown, deep links) show the skeleton
    // after 200ms instead of the 1s default, so the UI never feels frozen.
    // MinMs keeps a shown skeleton up briefly to avoid a one-frame flash.
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
