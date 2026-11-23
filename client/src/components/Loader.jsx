import { cx } from '../utils/helpers.js';

export function Spinner({ size = 20 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-label="Loading" />;
}

export function Skeleton({ w = '100%', h = 14, r = 8, className }) {
  return <span className={cx('skeleton', className)} style={{ width: w, height: h, borderRadius: r }} />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card card-pad skeleton-card" aria-hidden="true">
      <div className="row gap-12">
        <Skeleton w={44} h={44} r={22} />
        <div className="stack gap-6 grow">
          <Skeleton w="60%" h={14} />
          <Skeleton w="40%" h={11} />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} w={`${90 - i * 15}%`} h={10} />)}
    </div>
  );
}

export function GridSkeleton({ count = 6, lines = 3 }) {
  return <div className="grid grid-3">{Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} lines={lines} />)}</div>;
}

export default function Loader({ label = 'Loading…', full = false }) {
  return (
    <div className={cx('loader', full && 'loader-full')}>
      <div className="loader-orbit" aria-hidden="true"><span /><span /></div>
      <p className="muted">{label}</p>
    </div>
  );
}
