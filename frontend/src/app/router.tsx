import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AuthPage } from '@/pages/auth-page'
import { PublicEntry, RequireAuth } from '@/app/route-guards'
import { FeedSkeleton } from '@/components/feed-skeleton'

const FeedPage = lazy(() => import('@/pages/feed-page').then((m) => ({ default: m.FeedPage })))
const GroupPage = lazy(() => import('@/pages/group-page').then((m) => ({ default: m.GroupPage })))
const GroupsPage = lazy(() => import('@/pages/groups-page').then((m) => ({ default: m.GroupsPage })))
const NewGroupPage = lazy(() => import('@/pages/new-group-page').then((m) => ({ default: m.NewGroupPage })))
const FriendsPage = lazy(() => import('@/pages/friends-page').then((m) => ({ default: m.FriendsPage })))
const NewRequestPage = lazy(() =>
  import('@/pages/new-request-page').then((m) => ({ default: m.NewRequestPage }))
)
const RequestDetailPage = lazy(() =>
  import('@/pages/request-detail-page').then((m) => ({ default: m.RequestDetailPage }))
)
const ProfilePage = lazy(() => import('@/pages/profile-page').then((m) => ({ default: m.ProfilePage })))
const ModerationPage = lazy(() =>
  import('@/pages/moderation-page').then((m) => ({ default: m.ModerationPage }))
)

function lazyRoute(element: JSX.Element) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-6"><FeedSkeleton count={2} /></div>}>
      {element}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <PublicEntry /> },
  { path: '/auth', element: <AuthPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/feed', element: lazyRoute(<FeedPage />) },
      { path: '/groups', element: lazyRoute(<GroupsPage />) },
      { path: '/groups/new', element: lazyRoute(<NewGroupPage />) },
      { path: '/groups/:id', element: lazyRoute(<GroupPage />) },
      { path: '/friends', element: lazyRoute(<FriendsPage />) },
      { path: '/requests/new', element: lazyRoute(<NewRequestPage />) },
      { path: '/requests/:id', element: lazyRoute(<RequestDetailPage />) },
      { path: '/profile', element: lazyRoute(<ProfilePage />) },
      { path: '/moderation', element: lazyRoute(<ModerationPage />) }
    ]
  }
])
