import { Link } from 'react-router-dom';
import { useTitle } from '../lib/useTitle';

export default function NotFound() {
  useTitle('Not found');
  return (
    <div className="wrap">
      <section className="panel empty" style={{ marginTop: 60 }}>
        <h3>Nothing on this block</h3>
        <p>That address doesn't lead anywhere.</p>
        <p style={{ marginTop: 14 }}><Link to="/" className="chip">Back to the homepage</Link></p>
      </section>
    </div>
  );
}
