import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { SWAP_REQUESTS } from '../graphql/queries/index.js';
import { ACCEPT_REQUEST, REJECT_REQUEST, CANCEL_REQUEST } from '../graphql/mutations/index.js';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar, EmptyState, ErrorBox, LevelBadge, Pagination, Stars, Tabs } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { CardSkeleton } from '../components/Loader.jsx';
import { errorMessage, firstName, timeAgo, titleCase } from '../utils/helpers.js';

const VIEWS = {
  incoming: { box: 'INCOMING', status: 'PENDING' },
  outgoing: { box: 'OUTGOING', status: 'PENDING' },
  accepted: { box: 'ALL', status: 'ACCEPTED' },
  history: { box: 'ALL', status: undefined },
};

function RequestCard({ r, actions }) {
  const other = r.isIncoming ? r.from : r.to;
  return (
    <article className="card request-card">
      <div className="row gap-12">
        <Link to={`/users/${other.id}`}><Avatar user={other} size={48} showStatus /></Link>
        <div className="grow stack gap-2">
          <div className="row gap-8 wrap"><Link to={`/users/${other.id}`}><strong>{other.name}</strong></Link><span className={`status status-${r.status.toLowerCase()}`}>{titleCase(r.status)}</span></div>
          <Stars value={other.ratingAvg} count={other.ratingCount} size={12} />
        </div>
        <span className="tiny muted">{timeAgo(r.createdAt)}</span>
      </div>
      <div className="request-swap">
        <div>
          <span className="tiny muted">{r.isIncoming ? `${firstName(other.name)} wants to learn` : 'You want to learn'}</span>
          <strong>{r.requestedSkill?.name || 'Removed skill'}</strong>
          {r.requestedSkill && <LevelBadge level={r.requestedSkill.level} />}
        </div>
        <span className="swap-arrows"><Icon name="swap" size={20} /></span>
        <div className="right">
          <span className="tiny muted">{r.mode === 'CREDIT' ? 'Paid with' : r.isIncoming ? 'They teach you' : 'You teach'}</span>
          <strong>{r.mode === 'CREDIT' ? `${r.creditCost} Knowledge Credits` : r.offeredSkill?.name}</strong>
          {r.mode === 'EXCHANGE' && r.offeredSkill && <LevelBadge level={r.offeredSkill.level} />}
        </div>
      </div>
      {r.message && <p className="request-msg">“{r.message}”</p>}
      {actions && <div className="row gap-8 end">{actions}</div>}
    </article>
  );
}

export default function Requests() {
  const toast = useToast();
  const [view, setView] = useState('incoming');
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useQuery(SWAP_REQUESTS, { variables: { ...VIEWS[view], page: { page, limit: 10 } } });
  const { data: inc } = useQuery(SWAP_REQUESTS, { variables: { ...VIEWS.incoming, page: { limit: 1 } } });
  const opts = { refetchQueries: ['SwapRequests', 'Dashboard', 'Connections', 'Me', 'Matches'] };
  const [accept, a] = useMutation(ACCEPT_REQUEST, opts);
  const [reject, b] = useMutation(REJECT_REQUEST, opts);
  const [cancel, c] = useMutation(CANCEL_REQUEST, opts);
  const busy = a.loading || b.loading || c.loading;

  const run = async (fn, id, msg) => {
    try { await fn({ variables: { id } }); toast(msg, { tone: 'mint' }); } catch (e) { toast(errorMessage(e), { tone: 'error', title: 'Could not update request' }); }
  };

  const actionsFor = (r) => {
    if (r.status !== 'PENDING') return r.status === 'ACCEPTED' ? <Link to="/chat" className="btn btn-soft btn-sm">Open chat</Link> : null;
    if (r.isIncoming) return (<>
      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(reject, r.id, 'Request declined.')}>Decline</button>
      <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(accept, r.id, 'Accepted! You can now chat and schedule sessions.')}>Accept swap</button>
    </>);
    return <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(cancel, r.id, 'Request cancelled.')}>Cancel request</button>;
  };

  return (
    <div className="stack gap-24">
      <header className="page-header">
        <span className="eyebrow">Swap requests</span>
        <h1>Requests & exchanges</h1>
        <p className="muted">Only the person who receives a request can accept it. Credit requests transfer credits only on acceptance.</p>
      </header>
      <Tabs value={view} onChange={(v) => { setView(v); setPage(1); }} tabs={[
        { value: 'incoming', label: 'Received', count: inc?.swapRequests.pageInfo.total },
        { value: 'outgoing', label: 'Sent' }, { value: 'accepted', label: 'Accepted' }, { value: 'history', label: 'History' },
      ]} />
      <ErrorBox error={error && errorMessage(error)} onRetry={refetch} />
      {loading && !data ? <div className="grid grid-2"><CardSkeleton /><CardSkeleton /></div> : data?.swapRequests.items.length ? (
        <div className="grid grid-2">{data.swapRequests.items.map((r) => <RequestCard key={r.id} r={r} actions={actionsFor(r)} />)}</div>
      ) : (
        <EmptyState title={view === 'incoming' ? 'No requests waiting' : 'Nothing here yet'} text="Find a compatible partner and send your first swap request." action={<Link to="/matches" className="btn btn-primary">Browse matches</Link>} />
      )}
      <Pagination pageInfo={data?.swapRequests.pageInfo} onPage={setPage} />
    </div>
  );
}
