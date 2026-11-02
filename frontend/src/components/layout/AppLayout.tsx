import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Wand2, History, BarChart2, Info,
  ChevronLeft, Landmark
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/restore',    label: 'New Restoration',   icon: Wand2 },
  { to: '/history',    label: 'History',           icon: History },
  { to: '/evaluation', label: 'Evaluation',        icon: BarChart2 },
  { to: '/about',      label: 'About Project',     icon: Info },
]

export default function AppLayout() {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-ivory overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-charcoal flex flex-col border-r border-heritage-800">
        {/* Logo */}
        <div className="p-6 border-b border-heritage-700">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center shadow-gold">
              <Landmark size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-white text-lg leading-tight">HeritageAI</p>
              <p className="text-xs text-heritage-400">Restoration Platform</p>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gold text-white shadow-gold'
                    : 'text-heritage-300 hover:bg-heritage-700 hover:text-white'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer link */}
        <div className="p-4 border-t border-heritage-700">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs text-heritage-400 hover:text-heritage-200 transition-colors"
          >
            <ChevronLeft size={14} />
            Back to Landing
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-full"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
