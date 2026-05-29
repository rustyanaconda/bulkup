import { NavLink } from 'react-router-dom'
import { Home, UtensilsCrossed, TrendingUp, ShoppingCart, User } from 'lucide-react'

const tabs = [
  { to: '/',         label: 'Home',     Icon: Home             },
  { to: '/meals',    label: 'Meals',    Icon: UtensilsCrossed  },
  { to: '/progress', label: 'Progress', Icon: TrendingUp       },
  { to: '/shop',     label: 'Shop',     Icon: ShoppingCart     },
  { to: '/profile',  label: 'Profile',  Icon: User             },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
                    bg-white border-t border-[#E3DBC9]
                    flex justify-around py-2 z-50">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-3 py-1 rounded-lg
             text-xs transition-colors
             ${isActive ? 'text-[#1A2E45] font-semibold' : 'text-[#A89F88]'}`
          }
        >
          <Icon size={22} strokeWidth={1.75} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
