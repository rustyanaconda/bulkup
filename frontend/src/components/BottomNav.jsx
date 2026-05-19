import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',         label: 'Home',     icon: '🏠' },
  { to: '/meals',    label: 'Meals',    icon: '🥗' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/shop',     label: 'Shop',     icon: '🛒' },
  { to: '/profile',  label: 'Profile',  icon: '👤' },
]

/**
 * BottomNav — persistent navigation bar at the bottom of the screen.
 * NavLink automatically applies an active style when the route matches.
 */
export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
                    bg-[#0D1A12] border-t border-[#152A1E]
                    flex justify-around py-2 z-50">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-3 py-1 rounded-lg
             text-xs transition-colors
             ${isActive ? 'text-green-400' : 'text-[#3A5C48]'}`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
