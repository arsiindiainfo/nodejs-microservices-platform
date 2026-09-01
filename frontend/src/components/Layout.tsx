import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ToastStack } from './ToastStack';
import logo from '../assets/logo.png';

export function Layout() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-inner">
          <NavLink to="/catalog">
            <img className="navbar-logo" src={logo} alt="Arsi India Info" />
          </NavLink>

          <nav className="navbar-links">
            <NavLink to="/catalog" className={({ isActive }) => (isActive ? 'active' : '')}>
              Catalog
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
              My Orders
            </NavLink>
            <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'active' : '')}>
              Notifications
            </NavLink>
            {user?.role === 'ADMIN' && (
              <>
                <span className="navbar-divider" />
                <NavLink to="/admin/products" className={({ isActive }) => (isActive ? 'active' : '')}>
                  Manage Products
                </NavLink>
                <NavLink to="/admin/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
                  All Orders
                </NavLink>
              </>
            )}
          </nav>

          <div className="navbar-right">
            <NavLink to="/cart" className="navbar-cart">
              <span>🛒 Cart</span>
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </NavLink>
            {user && (
              <div className="navbar-user">
                <div>
                  <div className="navbar-user-name">{user.name}</div>
                </div>
                <span className={`navbar-user-role${user.role === 'ADMIN' ? ' admin' : ''}`}>{user.role}</span>
                <button type="button" className="btn-logout" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <ToastStack />
    </div>
  );
}
