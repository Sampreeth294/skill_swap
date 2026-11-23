import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { ROOM } from '../graphql/queries/index.js';
import { SEND_ROOM_MESSAGE, CREATE_NOTE, UPDATE_NOTE, DELETE_NOTE, ADD_AGENDA, TOGGLE_AGENDA, REMOVE_AGENDA, LEAVE_ROOM, ARCHIVE_ROOM } from '../graphql/mutations/index.js';
import { ROOM_MESSAGE_ADDED, ROOM_NOTE_UPDATED, ROOM_UPDATED } from '../graphql/subscriptions/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';
import { Avatar, EmptyState, ProgressBar } from '../components/ui.jsx';
import { cx, errorCode, errorMessage, formatTime, timeAgo } from '../utils/helpers.js';
import '../styles/rooms.css';
import '../styles/chat.css';

/** Collaborative note editor: debounced autosave + optimistic concurrency via `version`. */
function NoteEditor({ note, onDeleted }) {
  const toast = useToast();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [status, setStatus] = useState('saved');
  const version = useRef(note.version);
  const dirty = useRef(false);
  const timer = useRef(null);
  const [update] = useMutation(UPDATE_NOTE);
  const [del] = useMutation(DELETE_NOTE);

  // Apply remote edits when we have no unsaved local changes
  useEffect(() => {
    if (note.version > version.current && !dirty.current) {
      version.current = note.version;
      setTitle(note.title);
      setContent(note.content);
      setStatus('synced');
    }
  }, [note.version, note.title, note.content]);

  const save = async (t, c) => {
    setStatus('saving');
    try {
      const { data } = await update({ variables: { id: note.id, title: t, content: c, version: version.current } });
      version.current = data.updateRoomNote.version;
      dirty.current = false;
      setStatus('saved');
    } catch (err) {
      if (errorCode(err) === 'CONFLICT') {
        const ext = err.errors?.[0]?.extensions || {};
        version.current = ext.latestVersion ?? version.current;
        setContent(ext.latestContent ?? c);
        dirty.current = false;
        setStatus('conflict');
        toast('A partner saved this note at the same time — their version was loaded.', { title: 'Note updated by someone else' });
      } else { setStatus('error'); toast(errorMessage(err), { tone: 'error' }); }
    }
  };

  const change = (t, c) => {
    setTitle(t); setContent(c);
    dirty.current = true;
    setStatus('typing');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(t, c), 900);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="note-editor">
      <div className="row gap-8">
        <input className="note-title" value={title} onChange={(e) => change(e.target.value, content)} aria-label="Note title" />
        <span className={`save-state s-${status}`}>{{ saved: 'Saved', saving: 'Saving…', typing: 'Editing…', synced: 'Synced', conflict: 'Reloaded', error: 'Not saved' }[status]}</span>
        <button className="icon-btn danger" aria-label="Delete note" onClick={async () => { if (window.confirm('Delete this note?')) { try { await del({ variables: { id: note.id } }); onDeleted(); } catch (e) { toast(errorMessage(e), { tone: 'error' }); } } }}><Icon name="trash" size={16} /></button>
      </div>
      <textarea className="note-body" value={content} onChange={(e) => change(title, e.target.value)} placeholder="Write together… (Markdown welcome)" aria-label="Note content" />
      <span className="tiny muted">Last edit by {note.updatedBy?.name || note.createdBy.name} · {timeAgo(note.updatedAt)} · v{note.version}</span>
    </div>
  );
}

export default function Room() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { data, loading, error, subscribeToMore } = useQuery(ROOM, { variables: { id }, fetchPolicy: 'network-only' });
  const [activeNote, setActiveNote] = useState(null);
  const [msg, setMsg] = useState('');
  const [agendaText, setAgendaText] = useState('');
  const listRef = useRef(null);
  const [sendMsg] = useMutation(SEND_ROOM_MESSAGE);
  const [createNote] = useMutation(CREATE_NOTE);
  const [addAgenda] = useMutation(ADD_AGENDA);
  const [toggleAgenda] = useMutation(TOGGLE_AGENDA);
  const [removeAgenda] = useMutation(REMOVE_AGENDA);
  const [leave] = useMutation(LEAVE_ROOM, { refetchQueries: ['Rooms'] });
  const [archive] = useMutation(ARCHIVE_ROOM, { refetchQueries: ['Rooms'] });

  const patchRoom = (fn) => client.cache.updateQuery({ query: ROOM, variables: { id } }, (prev) => (prev ? fn(prev) : prev));
  const pushMessage = (m) => patchRoom((prev) => (prev.roomMessages.items.some((x) => x.id === m.id) ? prev : { ...prev, roomMessages: { ...prev.roomMessages, items: [...prev.roomMessages.items, m] } }));

  useEffect(() => subscribeToMore({
    document: ROOM_MESSAGE_ADDED, variables: { roomId: id },
    updateQuery: (prev, { subscriptionData }) => {
      const m = subscriptionData.data?.roomMessageAdded;
      if (!m || !prev?.roomMessages || prev.roomMessages.items.some((x) => x.id === m.id)) return prev;
      return { ...prev, roomMessages: { ...prev.roomMessages, items: [...prev.roomMessages.items, m] } };
    },
  }), [id, subscribeToMore]);

  useSubscription(ROOM_NOTE_UPDATED, {
    variables: { roomId: id },
    onData: ({ data: d }) => {
      const e = d.data?.roomNoteUpdated;
      if (!e) return;
      patchRoom((prev) => {
        let notes = prev.room.notes.filter((n) => n.id !== (e.deletedId || e.note?.id));
        if (e.note) notes = [e.note, ...notes];
        return { ...prev, room: { ...prev.room, notes } };
      });
    },
  });
  useSubscription(ROOM_UPDATED, { variables: { roomId: id } }); // normalized cache updates the room automatically

  const room = data?.room;
  const messages = data?.roomMessages.items || [];
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages.length]);
  useEffect(() => { if (room && !activeNote && room.notes[0]) setActiveNote(room.notes[0].id); }, [room, activeNote]);

  if (loading && !data) return <Loader label="Entering room…" />;
  if (error || !room) return <EmptyState title="Room unavailable" text={error ? errorMessage(error) : 'This room may have been archived.'} action={<Link className="btn btn-primary" to="/rooms">All rooms</Link>} />;
  const note = room.notes.find((n) => n.id === activeNote);
  const run = (p) => p.catch((e) => toast(errorMessage(e), { tone: 'error' }));

  return (
    <div className="room stack gap-16">
      <header className="room-head card">
        <div className="stack gap-4 grow">
          <div className="row gap-8 wrap"><Link to="/rooms" className="tiny muted">← Rooms</Link><span className={`chip ${room.type === 'GROUP' ? 'chip-blue' : 'chip-lavender'}`}>{room.type === 'GROUP' ? 'Group room' : '1:1 room'}</span>{room.skillName && <span className="chip chip-mint">{room.skillName}</span>}</div>
          <h1>{room.name}</h1>
          {room.description && <p className="muted tiny">{room.description}</p>}
        </div>
        <div className="avatar-stack">{room.participants.map((p) => <Avatar key={p.id} user={p} size={36} showStatus />)}</div>
        {room.isOwner
          ? <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Archive this room for everyone?') && run(archive({ variables: { roomId: id } }).then(() => navigate('/rooms')))}>Archive</button>
          : <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Leave this room?') && run(leave({ variables: { roomId: id } }).then(() => navigate('/rooms')))}>Leave</button>}
      </header>

      <div className="room-grid">
        <aside className="stack gap-16">
          <section className="card card-pad">
            <h3 className="card-title">Participants</h3>
            <ul className="participants">
              {room.participants.map((p) => (
                <li key={p.id}><Avatar user={p} size={30} showStatus /><span className="grow">{p.name}{p.id === user.id && ' (you)'}</span><span className={cx('dot-label', p.isOnline && 'on')}>{p.isOnline ? 'Online' : 'Away'}</span></li>
              ))}
            </ul>
          </section>
          <section className="card card-pad">
            <h3 className="card-title">Session details</h3>
            <p className="tiny"><Icon name="calendar" size={14} /> {room.schedule || 'No schedule set'}</p>
            <Link to="/sessions" className="link-arrow tiny">Plan a session →</Link>
          </section>
          <section className="card card-pad">
            <div className="row between"><h3 className="card-title">Learning progress</h3><b>{room.progress}%</b></div>
            <ProgressBar value={room.progress} tone="mint" />
            <ul className="agenda">
              {room.agenda.map((a) => (
                <li key={a.id} className={a.done ? 'done' : ''}>
                  <label><input type="checkbox" checked={a.done} onChange={() => run(toggleAgenda({ variables: { roomId: id, itemId: a.id } }))} /> <span>{a.text}</span></label>
                  <button className="icon-btn" aria-label="Remove" onClick={() => run(removeAgenda({ variables: { roomId: id, itemId: a.id } }))}><Icon name="close" size={14} /></button>
                </li>
              ))}
            </ul>
            <form className="row gap-6" onSubmit={(e) => { e.preventDefault(); if (agendaText.trim()) { run(addAgenda({ variables: { roomId: id, text: agendaText } })); setAgendaText(''); } }}>
              <input className="input input-sm" value={agendaText} onChange={(e) => setAgendaText(e.target.value)} placeholder="Add agenda item" />
              <button className="btn btn-soft btn-sm">Add</button>
            </form>
          </section>
        </aside>

        <section className="card room-chat">
          <h3 className="card-title pad-16">Live chat</h3>
          <div className="convo-list" ref={listRef}>
            {!messages.length && <EmptyState art="chat" title="Start the conversation" />}
            {messages.map((m) => (
              <div key={m.id} className={cx('bubble-row', m.isMine && 'mine')}>
                {!m.isMine && <Avatar user={m.sender} size={26} />}
                <div className="bubble">{!m.isMine && <span className="bubble-name">{m.sender.name}</span>}<p>{m.body}</p><span className="bubble-meta">{formatTime(m.createdAt)}</span></div>
              </div>
            ))}
          </div>
          <form className="composer" onSubmit={async (e) => {
            e.preventDefault();
            const text = msg.trim(); if (!text) return; setMsg('');
            try { const { data: d } = await sendMsg({ variables: { roomId: id, body: text } }); pushMessage(d.sendRoomMessage); } catch (err) { setMsg(text); toast(errorMessage(err), { tone: 'error' }); }
          }}>
            <textarea rows={1} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message the room…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form.requestSubmit(); } }} aria-label="Room message" />
            <button className="btn btn-primary send-btn" aria-label="Send"><Icon name="send" /></button>
          </form>
        </section>

        <section className="card room-notes">
          <div className="row between pad-16">
            <h3 className="card-title">Shared notes</h3>
            <button className="btn btn-soft btn-sm" onClick={async () => { try { const { data: d } = await createNote({ variables: { roomId: id, title: 'Untitled note' } }); setActiveNote(d.createRoomNote.id); } catch (e) { toast(errorMessage(e), { tone: 'error' }); } }}><Icon name="plus" size={14} /> Note</button>
          </div>
          <div className="note-tabs">
            {room.notes.map((n) => <button key={n.id} className={cx('note-tab', n.id === activeNote && 'on')} onClick={() => setActiveNote(n.id)}>{n.title}</button>)}
          </div>
          {note ? <NoteEditor key={note.id} note={note} onDeleted={() => setActiveNote(null)} /> : <p className="muted pad-16">Create a note to start writing together.</p>}
        </section>
      </div>
    </div>
  );
}
