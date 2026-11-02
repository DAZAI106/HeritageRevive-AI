import { Routes, Route } from 'react-router-dom'
import Landing    from './pages/Landing'
import Dashboard  from './pages/Dashboard'
import Restoration from './pages/Restoration'
import Evaluation from './pages/Evaluation'
import History    from './pages/History'
import About      from './pages/About'
import AppLayout  from './components/layout/AppLayout'

export default function App() {
  return (
    <Routes>
      {/* Landing page — no sidebar */}
      <Route path="/" element={<Landing />} />

      {/* App pages — with sidebar */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/restore"      element={<Restoration />} />
        <Route path="/evaluation"   element={<Evaluation />} />
        <Route path="/history"      element={<History />} />
        <Route path="/about"        element={<About />} />
      </Route>
    </Routes>
  )
}
