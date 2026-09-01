import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/StatusBadge';

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Your Profile</h1>
      </div>
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="order-meta-grid">
          <div className="order-meta-cell">
            <div className="lbl">Name</div>
            <div className="val">{user.name}</div>
          </div>
          <div className="order-meta-cell">
            <div className="lbl">Email</div>
            <div className="val">{user.email}</div>
          </div>
          <div className="order-meta-cell">
            <div className="lbl">Role</div>
            <div className="val"><RoleBadge role={user.role} /></div>
          </div>
          <div className="order-meta-cell">
            <div className="lbl">Member since</div>
            <div className="val">{new Date(user.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
