import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { HeaderActions } from './HeaderActions';

function titleForPath(pathname: string): string {
  if (pathname.startsWith('/exam')) return '考试';
  if (pathname.startsWith('/wrong')) return '错题';
  if (pathname.startsWith('/stats')) return '统计';
  return '练习';
}

export function Layout() {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">{title}</h1>
        <HeaderActions />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="tab-bar" role="tablist" aria-label="主导航">
        <NavLink
          to="/practice"
          end
          role="tab"
          className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
        >
          练习
        </NavLink>
        <NavLink
          to="/exam"
          role="tab"
          className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
        >
          考试
        </NavLink>
        <NavLink
          to="/wrong"
          role="tab"
          className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
        >
          错题
        </NavLink>
        <NavLink
          to="/stats"
          role="tab"
          className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
        >
          统计
        </NavLink>
      </nav>
    </div>
  );
}
