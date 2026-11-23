import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { CONNECTIONS, SESSIONS } from '../graphql/queries/index.js';
import { PROPOSE_SESSION, RESPOND_SESSION, CANCEL_SESSION, COMPLETE_SESSION } from '../graphql/mutations/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, EmptyState, ErrorBox, Field, Pagination, Tabs } from '../components/ui.jsx';
import { CardSkeleton } from '../components/Loader.jsx';
import { errorMessage, firstName, formatTime, toLocalInput, titleCase } from '../utils/helpers.js';

function PlanModal({ open, onClose, defaultConnectionId }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data } = useQuery(CONNECTIONS, { skip: !open });
  const conns = (data?.connections || []).filter((c) => c.status === 'ACTIVE');
  const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(19, 0, 0, 0);
  const [f, setF] = useState({ connectionId: '', teacherId: '', skillName: '', title: '', startsAt: toLocalInput(tomorrow), durationMinutes: 60, agenda: '', meetingLink: '' });
  const [propose, { loading, error, reset }] = useMutation(PROPOSE_SESSION, { refetchQueries: ['Sessions', 'Dashboard'] });
  const conn = conns.find((c) => c.id === f.connectionId);

  useEffect(() => { if (open) reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || !conns.length) return;
    const c = conns.find((x) => x.id === defaultConnectionId) || conns.find((x) => x.id === f.connectionId) || conns[0];
    if (c.id !== f.connectionId) pickConnection(c);
  }, [open, data]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickConnection(c) {
    const ex = c.exchanges[0];
    setF((x) => ({ ...x, connectionId: c.id, teacherId: ex?.teacher.id || user.id, skillName: ex?.skillName || '', title: ex ? `${ex.skillName} session` : '' }));
  }
  const pickExchange = (i) => {
    const ex = conn.exchanges[i];
    setF((x) => ({ ...x, teacherId: ex.teacher.id, skillName: ex.skillName, title: `${ex.skillName} session` }));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await propose({ variables: { input: { ...f, durationMinutes: Number(f.durationMinutes), startsAt: new Date(f.startsAt).toISOString() } } });
      toast(`Invitation sent to ${firstName(conn.partner.name)}.`, { tone: 'mint', title: 'Session proposed' });
      onClose();
    } catch { /* shown */ }
  };

  return (
    <Modal open={open} onClose={onClose} title="Plan a session" subtitle="Conflicts with either calendar are blocked automatically." width={620}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="plan-form" disabled={loading || !conn}>{loading ? 'Sending…' : 'Send invitation'}</button></>}>
      {!conns.length ? <EmptyState title="No active partners" text="Accept a swap request first." /> : (
        <form id="plan-form" className="stack gap-16" onSubmit={submit}>
          <Field label="Partner">
            <select className="input" value={f.connectionId} onChange={(e) => pickConnection(conns.find((c) => c.id === e.target.value))}>
              {conns.map((c) => <option key={c.id} value={c.id}>{c.partner.name}</option>)}
            </select>
          </Field>
          {conn && (
            <Field label="What will you cover?">
              <div className="segmented">
                {conn.exchanges.map((ex, i) => (
                  <button type="button" key={i} className={f.skillName === ex.skillName && f.teacherId === ex.teacher.id ? 'on' : ''} onClick={() => pickExchange(i)}>
                    <strong>{ex.skillName}</strong><span>{ex.teacher.id === user.id ? 'You teach' : `${firstName(ex.teacher.name)} teaches`}</span>
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={120} /></Field>
          <div className="grid grid-2 gap-12">
            <Field label="Starts"><input className="input" type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} required /></Field>
            <Field label="Duration">
              <select className="input" value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: e.target.value })}>
                {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </Field>
          </div>
          <Field label="Agenda (optional)"><textarea className="input" rows={3} value={f.agenda} onChange={(e) => setF({ ...f, agenda: e.target.value })} /></Field>
          <Field label="Meeting link (optional)" hint="Google Meet, Zoom, Jitsi…"><input className="input" value={f.meetingLink} onChange={(e) => setF({ ...f, meetingLink: e.target.value })} placeholder="https://" /></Field>
          <ErrorBox error={error && errorMessage(error)} />
        </form>
      )}
    </Modal>
  );
}

function SessionCard({ s, onAction, busy }) {
  const start = new Date(s.startsAt);
  const past = start < new Date();
  return (
    <article className={`card session-card status-${s.status.toLowerCase()}`}>
      <div className="session-date">
        <span>{start.toLocaleString(undefined, { month: 'short' })}</span>
        <strong>{start.getDate()}</strong>
        <span>{start.toLocaleString(undefined, { weekday: 'short' })}</span>
      </div>
      <div className="grow stack gap-6">
        <div className="row gap-8 wrap">
          <strong>{s.title}</strong>
          <span className={`status status-${s.status.toLowerCase()}`}>{titleCase(s.status)}</span>
          <span className={`chip ${s.myRole === 'TEACHER' ? 'chip-lavender' : 'chip-mint'}`}>{s.myRole === 'TEACHER' ? `You teach ${s.skillName}` : `You learn ${s.skillName}`}</span>
        </div>
        <div className="row gap-12 wrap tiny muted">
          <span><Icon name="clock" size={13} /> {formatTime(s.startsAt)} – {formatTime(s.endsAt)} ({s.durationMinutes} min)</span>
          <span className="row gap-6"><Avatar user={s.partner} size={20} /> with {s.partner.name}</span>
          {s.myRole === 'TEACHER' && s.status !== 'COMPLETED' && <span>Earn {s.creditsForTeacher} ✦ on completion</span>}
        </div>
        {s.agenda && <p className="tiny">{s.agenda}</p>}
        {s.status === 'ACCEPTED' && past && <p className="tiny muted">Confirmations: {s.confirmationsCount}/2 — hours & credits are awarded when both of you confirm.</p>}
      </div>
      <div className="session-actions">
        {s.meetingLink && s.status === 'ACCEPTED' && <a className="btn btn-soft btn-sm" href={s.meetingLink} target="_blank" rel="noreferrer">Join call</a>}
        {s.canRespond && <>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onAction('accept', s)}>Accept</button>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction('decline', s)}>Decline</button>
        </>}
        {s.canConfirm && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onAction('complete', s)}><Icon name="check" size={14} /> Mark done</button>}
        {s.confirmedByMe && s.status === 'ACCEPTED' && <span className="chip chip-soft">Waiting for partner</span>}
        {s.status === 'PROPOSED' && !s.canRespond && <span className="chip chip-soft">Awaiting reply</span>}
        {['PROPOSED', 'ACCEPTED'].includes(s.status) && !s.confirmedByMe && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction('cancel', s)}>Cancel</button>}
        {s.status === 'COMPLETED' && <Link to={`/chat/${s.connection?.id}`} className="btn btn-soft btn-sm">Open chat</Link>}
      </div>
    </article>
  );
}

export default function Sessions() {
  const location = useLocation();
  const toast = useToast();
  const [scope, setScope] = useState('UPCOMING');
  const [page, setPage] = useState(1);
  const [planOpen, setPlanOpen] = useState(Boolean(location.state?.connectionId));
  const { data, loading, error, refetch } = useQuery(SESSIONS, { variables: { scope, page: { page, limit: 10 } } });
  const { data: inv } = useQuery(SESSIONS, { variables: { scope: 'INVITATIONS', page: { limit: 1 } } });
  const opts = { refetchQueries: ['Sessions', 'Dashboard', 'Me'] };
  const [respond, r1] = useMutation(RESPOND_SESSION, opts);
  const [cancel, r2] = useMutation(CANCEL_SESSION, opts);
  const [complete, r3] = useMutation(COMPLETE_SESSION, opts);

  const onAction = async (kind, s) => {
    try {
      if (kind === 'accept') { await respond({ variables: { id: s.id, accept: true } }); toast('Session accepted. See you there!', { tone: 'mint' }); }
      if (kind === 'decline') { await respond({ variables: { id: s.id, accept: false } }); toast('Invitation declined.'); }
      if (kind === 'cancel') { if (!window.confirm('Cancel this session?')) return; await cancel({ variables: { id: s.id } }); toast('Session cancelled.'); }
      if (kind === 'complete') {
        const { data: d } = await complete({ variables: { id: s.id } });
        toast(d.completeSession.status === 'COMPLETED' ? 'Both confirmed — hours and credits added 🎉' : 'Marked done. Waiting for your partner to confirm.', { tone: 'mint' });
      }
    } catch (e) { toast(errorMessage(e), { tone: 'error' }); }
  };

  const groups = useMemo(() => {
    const out = [];
    for (const s of data?.sessions.items || []) {
      const key = new Date(s.startsAt).toDateString();
      const g = out.find((x) => x.key === key);
      g ? g.items.push(s) : out.push({ key, label: new Date(s.startsAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }), items: [s] });
    }
    return out;
  }, [data]);

  return (
    <div className="stack gap-24">
      <header className="page-header row between wrap gap-16">
        <div>
          <span className="eyebrow">Session scheduling</span>
          <h1>Sessions</h1>
          <p className="muted">Propose times, accept invitations and confirm completed sessions to earn verified hours.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPlanOpen(true)}><Icon name="plus" size={16} /> Plan a session</button>
      </header>
      <Tabs value={scope} onChange={(v) => { setScope(v); setPage(1); }} tabs={[
        { value: 'UPCOMING', label: 'Scheduled' }, { value: 'INVITATIONS', label: 'Invitations', count: inv?.sessions.pageInfo.total }, { value: 'PAST', label: 'History' },
      ]} />
      <ErrorBox error={error && errorMessage(error)} onRetry={refetch} />
      {loading && !data ? <div className="stack gap-12"><CardSkeleton /><CardSkeleton /></div> : groups.length ? (
        <div className="stack gap-24">
          {groups.map((g) => (
            <div key={g.key} className="stack gap-12">
              <h4 className="group-label">{g.label}</h4>
              {g.items.map((s) => <SessionCard key={s.id} s={s} onAction={onAction} busy={r1.loading || r2.loading || r3.loading} />)}
            </div>
          ))}
        </div>
      ) : <EmptyState art="calendar" title="No sessions here" text="Plan your first session with a connected partner." action={<button className="btn btn-primary" onClick={() => setPlanOpen(true)}>Plan a session</button>} />}
      <Pagination pageInfo={data?.sessions.pageInfo} onPage={setPage} />
      <PlanModal open={planOpen} onClose={() => setPlanOpen(false)} defaultConnectionId={location.state?.connectionId} />
    </div>
  );
}
