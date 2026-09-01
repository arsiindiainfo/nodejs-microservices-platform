import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="empty-state">
      <div className="icon">🧭</div>
      <h3>Page not found</h3>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/catalog" className="btn btn-primary mt-16" style={{ display: 'inline-flex' }}>
        Back to catalog
      </Link>
    </div>
  );
}
