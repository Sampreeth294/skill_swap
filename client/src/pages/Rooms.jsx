import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { ROOMS, CONNECTIONS } from '../graphql/queries/index.js';
import { CREATE_ROOM } from '../graphql/mutations/index.js';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, EmptyState, ErrorBox, Field, ProgressBar } from '../components/ui.jsx';
import { GridSkeleton } from '../components/Loader.jsx';
import { errorMessage, timeAgo, cx } from '../utils/helpers.js';
import '../styles/rooms.css';

function CreateRoomModal({ open, onClose }) {
  const navigate = useNavigate();
  const { data } = useQuery(CONNECTIONS, { skip: !open });
  const [f, setF] = useState({ name: '', description: '', skillName: '', schedule: '', participantIds: [] });
  const [create, { loading, error }] = useMutation(CREATE_ROOM, { refetchQueries: ['Rooms'] });
  const toggle = (id) => setF({ ...f, participantIds: f.participantIds.includes(id) ? f.participantIds.filter((x) => x !== id) : [...f.participantIds, id] });
  const type = f.participantIds.length > 1 ? 'GROUP' : 'ONE_TO_ONE';
  return (
    <Modal open={open} onClose={onClose} title="Create a Knowledge Room" subtitle="Rooms are for connected partners only."
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="room-form" disabled={loading || !f.participantIds.length}>{loading ? 'Creating…' : `Create ${type === 'GROUP' ? 'group' : '1:1'} room`}</button></>}>
      <form id="room-form" className="stack gap-16" onSubmit={async (e) => {
        e.preventDefault();
        try { const { data: d } = await create({ variables: { input: { ...f, type } } }); onClose(); navigate(`/rooms/${d.createRoom.id}`); } catch { /* shown */ }
      }}>
        <Field label="Room name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required placeholder="e.g. Python study circle" /></Field>
        <div className="grid grid-2 gap-12">
          <Field label="Skill focus"><input className="input" value={f.skillName} onChange={(e) => setF({ ...f, skillName: e.target.value })} placeholder="e.g. Python" /></Field>
          <Field label="Schedule"><input className="input" value={f.schedule} onChange={(e) => setF({ ...f, schedule: e.target.value })} placeholder="e.g. Saturdays 10am" /></Field>
        </div>
        <Field label="Description"><textarea className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Invite partners" hint="Select one for a 1:1 room, or several for a small group (max 12).">
          <div className="pick-list">
            {(data?.connections || []).map((c) => (
              <label key={c.id} className={cx('pick-item', f.participantIds.includes(c.partner.id) && 'on')}>
                <input type="checkbox" checked={f.participantIds.includes(c.partner.id)} onChange={() => toggle(c.partner.id)} />
                <Avatar user={c.partner} size={30} /> {c.partner.name}
              </label>
            ))}
            {data && !data.connections.length && <p className="muted tiny">Connect with someone first.</p>}
          </div>
        </Field>
        <ErrorBox error={error && errorMessage(error)} />
      </form>
    </Modal>
  );
}

export default function Rooms() {
  const [open, setOpen] = useState(false);
  const { data, loading, error } = useQuery(ROOMS);
  return (
    <div className="stack gap-24">
      <header className="page-header row between wrap gap-16">
        <div>
          <span className="eyebrow">Live Knowledge Rooms</span>
          <h1>Learn together, in real time</h1>
          <p className="muted">Shared notes, live chat, agenda and session details — one space per learning circle.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> New room</button>
      </header>
      <ErrorBox error={error && errorMessage(error)} />
      {loading && !data ? <GridSkeleton count={3} /> : data?.rooms.length ? (
        <div className="grid grid-3">
          {data.rooms.map((r) => (
            <Link to={`/rooms/${r.id}`} key={r.id} className="card room-card hover-lift">
              <div className="row between"><span className={`chip ${r.type === 'GROUP' ? 'chip-blue' : 'chip-lavender'}`}>{r.type === 'GROUP' ? 'Group' : '1:1'}</span><span className="tiny muted">{timeAgo(r.updatedAt)}</span></div>
              <h3>{r.name}</h3>
              {r.description && <p className="muted tiny">{r.description}</p>}
              <div className="avatar-stack">{r.participants.slice(0, 5).map((p) => <Avatar key={p.id} user={p} size={32} showStatus />)}</div>
              <div className="stack gap-4"><div className="row between tiny"><span className="muted">Agenda progress</span><b>{r.progress}%</b></div><ProgressBar value={r.progress} tone="mint" /></div>
            </Link>
          ))}
        </div>
      ) : <EmptyState title="No rooms yet" text="Open a room from any conversation, or create one for a small study group." action={<button className="btn btn-primary" onClick={() => setOpen(true)}>Create a room</button>} />}
      <CreateRoomModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
