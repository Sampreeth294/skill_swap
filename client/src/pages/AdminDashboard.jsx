import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { ADMIN_OVERVIEW, ADMIN_USERS, ADMIN_REPORTS, ADMIN_REQUESTS, ADMIN_CATEGORIES } from '../graphql/queries/index.js';
import { ADMIN_SET_STATUS, ADMIN_SET_ROLE, CREATE_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY, RESOLVE_REPORT } from '../graphql/mutations/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { LineChart } from '../components/Charts.jsx';
import Modal from '../components/Modal.jsx';
import { Avatar, EmptyState, ErrorBox, Field, Pagination, Tabs } from '../components/ui.jsx';
import Loader from '../components/Loader.jsx';
import { errorMessage, formatDate, timeAgo, titleCase } from '../utils/helpers.js';
import '../styles/dashboard.css';

function Overview() {
  const { data, loading, error } = useQuery(ADMIN_OVERVIEW, { pollInterval: 30000 });
  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={errorMessage(error)} />;
  const s = data.adminStats;
  const tiles = [
    ['Users', s.users, `${s.onlineUsers} online now`], ['Active', s.activeUsers, `${s.suspendedUsers} suspended`], ['Skills listed', s.skills, ''],
    ['Connections', s.connections, ''], ['Requests', s.requests, `${s.pendingRequests} pending`], ['Sessions done', s.sessionsCompleted, ''],
    ['Messages', s.messages, ''], ['Open reports', s.openReports, s.openReports ? 'needs review' : 'all clear'], ['Credits in circulation', s.creditsInCirculation, ''],
  ];
  return (
    <div className="stack gap-24">
      <div className="admin-tiles">
        {tiles.map(([l, v, sub]) => <div key={l} className="card stat-tile"><span className="tiny muted">{l}</span><strong>{v}</strong>{sub && <span className="tiny muted">{sub}</span>}</div>)}
      </div>
      <div className="dash-grid">
        <section className="card card-pad">
          <LineChart title="Platform activity · last 14 days" data={s.timeline} series={[{ key: 'signups', label: 'Sign-ups' }, { key: 'requests', label: 'Swap requests' }, { key: 'sessions', label: 'Sessions completed' }]} />
        </section>
        <section className="card card-pad">
          <h3 className="card-title">Most wanted skills</h3>
          <table className="table compact">
            <thead><tr><th>Skill</th><th className="num">Learners</th><th className="num">Teachers</th></tr></thead>
            <tbody>{s.topSkills.map((t) => <tr key={t.name}><td><span className="cat-dot" style={{ background: t.category?.color }} />{t.name}</td><td className="num">{t.learners}</td><td className="num">{t.teachers}</td></tr>)}</tbody>
          </table>
        </section>
      </div>
      <section className="card card-pad">
        <h3 className="card-title">Recent platform activity</h3>
        <ul className="activity">
          {data.adminActivity.map((e) => (
            <li key={e.id}>{e.actor && <Avatar user={e.actor} size={28} />}<span className="grow">{e.text}</span><span className={`status status-${e.kind.split('_').pop().toLowerCase()}`}>{titleCase(e.kind)}</span><time className="tiny muted">{timeAgo(e.createdAt)}</time></li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading } = useQuery(ADMIN_USERS, { variables: { filter: { search: search || undefined, status: status || undefined }, page: { page, limit: 20 } } });
  const [setUserStatus] = useMutation(ADMIN_SET_STATUS);
  const [setRole] = useMutation(ADMIN_SET_ROLE);
  const run = (p, msg) => p.then(() => toast(msg, { tone: 'mint' })).catch((e) => toast(errorMessage(e), { tone: 'error' }));
  return (
    <div className="stack gap-16">
      <div className="filter-bar">
        <input className="input" placeholder="Search name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input input-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>User</th><th>Email</th><th>Joined</th><th className="num">Exchanges</th><th className="num">Credits</th><th>Role</th><th>Status</th><th /></tr></thead>
          <tbody>
            {(data?.adminUsers.items || []).map((u) => (
              <tr key={u.id}>
                <td><Link to={`/users/${u.id}`} className="row gap-8"><Avatar user={u} size={30} showStatus />{u.name}</Link></td>
                <td className="tiny">{u.email}</td><td className="tiny">{formatDate(u.createdAt)}</td>
                <td className="num">{u.completedExchanges}</td><td className="num">{u.credits}</td>
                <td>
                  <select className="input input-sm" value={u.role} disabled={u.id === me.id} onChange={(e) => run(setRole({ variables: { userId: u.id, role: e.target.value } }), 'Role updated')}>
                    <option value="USER">User</option><option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td><span className={`status status-${u.status.toLowerCase()}`}>{titleCase(u.status)}</span></td>
                <td>{u.id !== me.id && (u.status === 'ACTIVE'
                  ? <button className="btn btn-ghost btn-sm danger-text" onClick={() => window.confirm(`Suspend ${u.name}?`) && run(setUserStatus({ variables: { userId: u.id, status: 'SUSPENDED' } }), 'User suspended')}>Suspend</button>
                  : <button className="btn btn-soft btn-sm" onClick={() => run(setUserStatus({ variables: { userId: u.id, status: 'ACTIVE' } }), 'User reactivated')}>Reactivate</button>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && !data && <Loader />}
      </div>
      <Pagination pageInfo={data?.adminUsers.pageInfo} onPage={setPage} />
    </div>
  );
}

function Reports() {
  const toast = useToast();
  const [status, setStatus] = useState('OPEN');
  const { data, loading } = useQuery(ADMIN_REPORTS, { variables: { status } });
  const [resolve] = useMutation(RESOLVE_REPORT, { refetchQueries: ['AdminReports', 'AdminOverview'] });
  const act = (r, action) => {
    const note = action === 'DISMISS' ? '' : window.prompt('Resolution note (optional)') ?? '';
    resolve({ variables: { id: r.id, action, note } }).then(() => toast('Report closed.', { tone: 'mint' })).catch((e) => toast(errorMessage(e), { tone: 'error' }));
  };
  return (
    <div className="stack gap-16">
      <Tabs value={status} onChange={setStatus} tabs={[{ value: 'OPEN', label: 'Open' }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'DISMISSED', label: 'Dismissed' }]} />
      {loading && !data ? <Loader /> : data?.adminReports.items.length ? data.adminReports.items.map((r) => (
        <article key={r.id} className="card card-pad report">
          <div className="row between wrap gap-8">
            <div className="row gap-8 wrap"><span className="chip chip-soft">{titleCase(r.targetType)}</span><strong>Reported by {r.reporter.name}</strong><span className="tiny muted">{timeAgo(r.createdAt)}</span></div>
            {r.targetUser && <Link to={`/users/${r.targetUser.id}`} className="tiny">Owner: {r.targetUser.name} ({titleCase(r.targetUser.status)})</Link>}
          </div>
          <p className="report-preview">{r.targetPreview}</p>
          <p><b>Reason:</b> {r.reason}</p>
          {r.resolution && <p className="tiny muted">Resolution: {r.resolution}</p>}
          {r.status === 'OPEN' && (
            <div className="row gap-8 wrap">
              <button className="btn btn-ghost btn-sm" onClick={() => act(r, 'DISMISS')}>Dismiss</button>
              <button className="btn btn-soft btn-sm" onClick={() => act(r, 'RESOLVE')}>Resolve (no action)</button>
              {r.targetType !== 'USER' && <button className="btn btn-soft btn-sm" onClick={() => act(r, 'HIDE_CONTENT')}>Hide content</button>}
              <button className="btn btn-danger btn-sm" onClick={() => window.confirm('Suspend the owner of this content?') && act(r, 'SUSPEND_USER')}>Suspend user</button>
            </div>
          )}
        </article>
      )) : <EmptyState title="No reports" text="The community is behaving nicely ✨" />}
    </div>
  );
}

function Requests() {
  const [status, setStatus] = useState('');
  const { data } = useQuery(ADMIN_REQUESTS, { variables: { status: status || undefined } });
  return (
    <div className="stack gap-16">
      <Tabs value={status} onChange={setStatus} tabs={[{ value: '', label: 'All' }, { value: 'PENDING', label: 'Pending' }, { value: 'ACCEPTED', label: 'Accepted' }, { value: 'REJECTED', label: 'Rejected' }, { value: 'CANCELLED', label: 'Cancelled' }]} />
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>From</th><th>To</th><th>Wants</th><th>Offers</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>{(data?.adminRequests.items || []).map((r) => (
            <tr key={r.id}><td>{r.from.name}</td><td>{r.to.name}</td><td>{r.requestedSkill?.name}</td><td>{r.mode === 'CREDIT' ? `${r.creditCost} credits` : r.offeredSkill?.name}</td><td><span className={`status status-${r.status.toLowerCase()}`}>{titleCase(r.status)}</span></td><td className="tiny">{formatDate(r.createdAt)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function Categories() {
  const toast = useToast();
  const { data } = useQuery(ADMIN_CATEGORIES);
  const [edit, setEdit] = useState(null);
  const opts = { refetchQueries: ['AdminCategories', 'Categories'] };
  const [create, c] = useMutation(CREATE_CATEGORY, opts);
  const [update, u] = useMutation(UPDATE_CATEGORY, opts);
  const [del] = useMutation(DELETE_CATEGORY, opts);
  const save = async (e) => {
    e.preventDefault();
    const input = { name: edit.name, description: edit.description, icon: edit.icon, color: edit.color, isActive: edit.isActive };
    try { edit.id ? await update({ variables: { id: edit.id, input } }) : await create({ variables: { input } }); setEdit(null); toast('Category saved.', { tone: 'mint' }); } catch { /* shown */ }
  };
  return (
    <div className="stack gap-16">
      <div className="row end"><button className="btn btn-primary" onClick={() => setEdit({ name: '', description: '', icon: '✦', color: '#7357E8', isActive: true })}>New category</button></div>
      <div className="grid grid-3">
        {(data?.adminCategories || []).map((cat) => (
          <div key={cat.id} className="card card-pad cat-admin" style={{ '--cat': cat.color }}>
            <div className="row between"><span className="cat-icon">{cat.icon}</span>{!cat.isActive && <span className="chip chip-soft">Inactive</span>}</div>
            <strong>{cat.name}</strong>
            <span className="tiny muted">{cat.teachCount} teach · {cat.learnCount} learn</span>
            <div className="row gap-8">
              <button className="btn btn-soft btn-sm" onClick={() => setEdit({ ...cat })}>Edit</button>
              <button className="btn btn-ghost btn-sm danger-text" onClick={() => window.confirm('Delete category?') && del({ variables: { id: cat.id } }).catch((e) => toast(errorMessage(e), { tone: 'error' }))}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? 'Edit category' : 'New category'}
        footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" form="cat-form" disabled={c.loading || u.loading}>Save</button></>}>
        {edit && (
          <form id="cat-form" className="stack gap-16" onSubmit={save}>
            <Field label="Name"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
            <div className="grid grid-2 gap-12">
              <Field label="Icon (emoji)"><input className="input" value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} maxLength={4} /></Field>
              <Field label="Colour"><input className="input" type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></Field>
            </div>
            <Field label="Description"><textarea className="input" rows={2} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <label className="check-row"><input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active (visible to users)</label>
            <ErrorBox error={(c.error || u.error) && errorMessage(c.error || u.error)} />
          </form>
        )}
      </Modal>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  return (
    <div className="stack gap-24">
      <header className="page-header"><span className="eyebrow">Administration</span><h1>Admin console</h1><p className="muted">Every admin query and mutation is protected by role checks on the server.</p></header>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'users', label: 'Users' }, { value: 'requests', label: 'Swap requests' }, { value: 'reports', label: 'Reports' }, { value: 'categories', label: 'Categories' }]} />
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'requests' && <Requests />}
      {tab === 'reports' && <Reports />}
      {tab === 'categories' && <Categories />}
    </div>
  );
}
