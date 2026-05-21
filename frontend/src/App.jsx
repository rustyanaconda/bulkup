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
import BottomNav                                 from './components/BottomNav'
import ProtectedRoute, { PublicOnlyRoute }       from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Public-only — redirect to home if already logged in */}
      <Route path="/login"  element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />

      {/* Standalone pages with no nav bar */}
      <Route path="/privacy"        element={<Privacy />} />
      <Route path="/whoop/callback" element={<ProtectedRoute><WhoopCallback /></ProtectedRoute>} />

      {/* Main app shell — requires login, all routes share the BottomNav */}
      <Route path="*" element={
        <ProtectedRoute>
          <div className="max-w-md mx-auto min-h-screen relative bg-[#0D1A12]">
            <Routes>
              <Route path="/"         element={<Home />}     />
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
