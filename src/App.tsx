import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { CoffeeForm } from './pages/CoffeeForm'
import { Detail } from './pages/Detail'
import { Feed } from './pages/Feed'
import { Settings } from './pages/Settings'
import { Stats } from './pages/Stats'

export default function App() {
  return (
    <HashRouter>
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="icon.svg" alt="" width="28" height="28" />
          Brewlog
        </Link>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/new" element={<CoffeeForm />} />
          <Route path="/coffee/:id" element={<Detail />} />
          <Route path="/coffee/:id/edit" element={<CoffeeForm />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end>
          <span aria-hidden="true">☕</span>Feed
        </NavLink>
        <NavLink to="/new" className="tab-add">
          <span aria-hidden="true">＋</span>Check in
        </NavLink>
        <NavLink to="/stats">
          <span aria-hidden="true">📊</span>Stats
        </NavLink>
        <NavLink to="/settings">
          <span aria-hidden="true">⚙︎</span>Settings
        </NavLink>
      </nav>
    </HashRouter>
  )
}
