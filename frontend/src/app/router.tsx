import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from '@/pages/landing-page'
import { AuthPage } from '@/pages/auth-page'
import { FeedPage } from '@/pages/feed-page'
import { GroupPage } from '@/pages/group-page'
import { NewRequestPage } from '@/pages/new-request-page'
import { RequestDetailPage } from '@/pages/request-detail-page'
import { ProfilePage } from '@/pages/profile-page'
import { ModerationPage } from '@/pages/moderation-page'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/auth', element: <AuthPage /> },
  { path: '/feed', element: <FeedPage /> },
  { path: '/groups/:id', element: <GroupPage /> },
  { path: '/requests/new', element: <NewRequestPage /> },
  { path: '/requests/:id', element: <RequestDetailPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/moderation', element: <ModerationPage /> }
])
