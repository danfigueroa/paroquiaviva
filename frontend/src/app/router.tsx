import { createBrowserRouter } from 'react-router-dom'
import { AuthPage } from '@/pages/auth-page'
import { FeedPage } from '@/pages/feed-page'
import { GroupPage } from '@/pages/group-page'
import { GroupsPage } from '@/pages/groups-page'
import { FriendsPage } from '@/pages/friends-page'
import { NewRequestPage } from '@/pages/new-request-page'
import { RequestDetailPage } from '@/pages/request-detail-page'
import { ProfilePage } from '@/pages/profile-page'
import { ModerationPage } from '@/pages/moderation-page'
import { PublicEntry, RequireAuth } from '@/app/route-guards'

export const router = createBrowserRouter([
  { path: '/', element: <PublicEntry /> },
  { path: '/auth', element: <AuthPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/feed', element: <FeedPage /> },
      { path: '/groups', element: <GroupsPage /> },
      { path: '/groups/:id', element: <GroupPage /> },
      { path: '/friends', element: <FriendsPage /> },
      { path: '/requests/new', element: <NewRequestPage /> },
      { path: '/requests/:id', element: <RequestDetailPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/moderation', element: <ModerationPage /> }
    ]
  }
])
