import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="center-screen">
      <EmptyState art="search" title="This page wandered off" text="The page you're looking for doesn't exist." action={<Link to="/" className="btn btn-primary">Back home</Link>} />
    </div>
  );
}
