import { Routes, Route }                        from 'react-router-dom'
import Home                                      from './pages/Home'
import Meals                                     from './pages/Meals'
import Progress                                  from './pages/Progress'
import Shop                                      from './pages/Shop'
import Profile                                   from './pages/Profile'
import WhoopCallback                             from './pages/WhoopCallback'
import Privacy                                   from './pages/Privacy'
import Login                                     from './pages/Login'
import Signup                                    from './pages/Signup'
import Landing                                   from './pages/Landing'
import BottomNav                                 from './components/BottomNav'
import ProtectedRoute, { PublicOnlyRoute }       from './components/ProtectedRoute'
import { useAuth }                               from './context/AuthContext'

// "/" shows the dashboard for logged-in users and the landing page for visitors.
// Waits for the auth check to settle before deciding, so neither flashes wrongly.
function RootRoute() {
  const { isLoggedIn, authChecking } = useAuth()

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5EFE0] flex items-center justify-center">
        <p className="text-sm text-[#A89F88]">Loading…</p>
      </div>
    )
  }

  if (!isLoggedIn) return <Landing />

  return (
    <div className="max-w-md mx-auto min-h-screen relative bg-[#F5EFE0]">
      <Home />
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Root — landing for visitors, dashboard for logged-in users */}
      <Route path="/" element={<RootRoute />} />

      {/* Public-only — redirect to home if already logged in */}
      <Route path="/login"  element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />

      {/* Standalone pages with no nav bar */}
      <Route path="/privacy"        element={<Privacy />} />
      <Route path="/whoop/callback" element={<ProtectedRoute><WhoopCallback /></ProtectedRoute>} />

      {/* Main app shell — requires login, all routes share the BottomNav */}
      <Route path="*" element={
        <ProtectedRoute>
          <div className="max-w-md mx-auto min-h-screen relative bg-[#F5EFE0]">
            <Routes>
              <Route path="/meals"    element={<Meals />}    />
              <Route path="/progress" element={<Progress />} />
              <Route path="/shop"     element={<Shop />}     />
              <Route path="/profile"  element={<Profile />}  />
            </Routes>
            <BottomNav />
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
