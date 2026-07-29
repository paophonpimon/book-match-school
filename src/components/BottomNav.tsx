import { BookHeart, House, Search, Trophy, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/home', label: 'หน้าหลัก', icon: House },
  { to: '/discover', label: 'ค้นหา', icon: Search },
  { to: '/shelf', label: 'หนังสือของฉัน', icon: BookHeart },
  { to: '/leaderboard', label: 'อันดับนักอ่าน', icon: Trophy },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
          <Icon size={22} strokeWidth={1.8} /><span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
