import { Routes, Route } from 'react-router-dom'
import Home          from './pages/Home'
import Meals         from './pages/Meals'
import Progress      from './pages/Progress'
import Shop          from './pages/Shop'
import Profile       from './pages/Profile'
import WhoopCallback from './pages/WhoopCallback'
import Privacy       from './pages/Privacy'
import Login         from './pages/Login'
import Signup        from './pages/Signup'
import BottomNav     from './components/BottomNav'

export default function App() {
  return (
    <Routes>
      {/* Standalone pages — no nav bar */}
      <Route path="/whoop/callback" element={<WhoopCallback />} />
      <Route path="/privacy"        element={<Privacy />} />
      <Route path="/login"          element={<Login />} />
      <Route path="/signup"         element={<Signup />} />

      {/* Main app shell — all routes share the BottomNav */}
      <Route path="*" element={
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
      } />
    </Routes>
  )
}
