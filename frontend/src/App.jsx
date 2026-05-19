import { Routes, Route } from 'react-router-dom'
import Home      from './pages/Home'
import Meals     from './pages/Meals'
import Progress  from './pages/Progress'
import Shop      from './pages/Shop'
import Profile   from './pages/Profile'
import BottomNav from './components/BottomNav'

/**
 * App — root component. Sets up page routing.
 *
 * React Router maps URLs to components:
 *   /          → Home
 *   /meals     → Meals
 *   /progress  → Progress
 *   /shop      → Shop
 *   /profile   → Profile
 */
export default function App() {
  return (
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
  )
}
