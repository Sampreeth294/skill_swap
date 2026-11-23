import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { CONNECTIONS, MESSAGES } from '../graphql/queries/index.js';
import { SEND_MESSAGE, MARK_READ, SET_TYPING, COMPLETE_EXCHANGE, CREATE_REVIEW, CREATE_ROOM, REPORT_CONTENT } from '../graphql/mutations/index.js';
import { MESSAGE_ADDED, TYPING } from '../graphql/subscriptions/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, EmptyState, ErrorBox, Field } from '../components/ui.jsx';
import { Spinner } from '../components/Loader.jsx';
import { cx, errorMessage, firstName, formatDate, formatTime, timeAgo } from '../utils/helpers.js';
import '../styles/chat.css';

function ReviewModal({ open, onClose, connection }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [endorsed, setEndorsed] = useState('');
  const [create, { loading, error }] = useMutation(CREATE_REVIEW, { refetchQueries: ['Connections'] });
  if (!connection) return null;
  const taught = connection.exchanges.filter((e) => e.teacher.id === connection.partner.id).map((e) => e.skillName);
  return (
    <Modal open={open} onClose={onClose} title={`Review ${firstName(connection.partner.name)}`} subtitle="Reviews are only possible after a verified session."
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={loading} onClick={async () => {
        try { await create({ variables: { input: { connectionId: connection.id, rating, comment, endorsedSkill: endorsed || null } } }); toast('Thanks for your review!', { tone: 'mint' }); onClose(); } catch { /* shown */ }
      }}>Submit review</button></>}>
      <div className="stack gap-16">
        <div className="star-picker" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>★</button>)}
        </div>
        <Field label="Feedback"><textarea className="input" rows={4} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What was great? What could be better?" /></Field>
        {taught.length > 0 && (
          <Field label="Endorse a skill (optional)">
            <select className="input" value={endorsed} onChange={(e) => setEndorsed(e.target.value)}>
              <option value="">No endorsement</option>
              {taught.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <ErrorBox error={error && errorMessage(error)} />
      </div>
    </Modal>
  );
}

function Conversation({ connection }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const client = useApolloClient();
  const id = connection.id;
  const [body, setBody] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const listRef = useRef(null);
  const typingTimer = useRef(null);
  const typingSent = useRef(false);
  const atBottom = useRef(true);

  const { data, loading, fetchMore, subscribeToMore } = useQuery(MESSAGES, { variables: { connectionId: id }, fetchPolicy: 'network-only' });
  const [send, sendState] = useMutation(SEND_MESSAGE);
  const [markRead] = useMutation(MARK_READ, { refetchQueries: ['UnreadCounts', 'Connections'] });
  const [setTyping] = useMutation(SET_TYPING);
  const [completeExchange] = useMutation(COMPLETE_EXCHANGE, { refetchQueries: ['Connections', 'Me'] });
  const [createRoom] = useMutation(CREATE_ROOM, { refetchQueries: ['Rooms'] });
  const [report] = useMutation(REPORT_CONTENT);

  const appendMessage = (msg) => {
    client.cache.updateQuery({ query: MESSAGES, variables: { connectionId: id } }, (prev) => {
      if (!prev || prev.messages.items.some((m) => m.id === msg.id)) return prev;
      return { messages: { ...prev.messages, items: [...prev.messages.items, msg] } };
    });
  };

  // Real-time: new messages in this conversation
  useEffect(() => subscribeToMore({
    document: MESSAGE_ADDED,
    variables: { connectionId: id },
    updateQuery: (prev, { subscriptionData }) => {
      const msg = subscriptionData.data?.messageAdded;
      if (!msg || !prev?.messages || prev.messages.items.some((m) => m.id === msg.id)) return prev;
      if (!msg.isMine) setTimeout(() => markRead({ variables: { connectionId: id } }), 300);
      return { messages: { ...prev.messages, items: [...prev.messages.items, msg] } };
    },
  }), [id, subscribeToMore, markRead]);

  useSubscription(TYPING, {
    variables: { connectionId: id },
    onData: ({ data: d }) => {
      setPartnerTyping(Boolean(d.data?.typing?.isTyping));
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPartnerTyping(false), 4000);
    },
  });

  useEffect(() => { if (connection.unreadCount > 0) markRead({ variables: { connectionId: id } }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = data?.messages.items || [];
  useEffect(() => {
    const el = listRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [items.length, partnerTyping]);

  const onScroll = () => {
    const el = listRef.current;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    const el = listRef.current;
    const prevHeight = el.scrollHeight;
    await fetchMore({
      variables: { connectionId: id, before: items[0]?.createdAt },
      updateQuery: (prev, { fetchMoreResult }) => ({ messages: { hasMore: fetchMoreResult.messages.hasMore, items: [...fetchMoreResult.messages.items, ...prev.messages.items] } }),
    });
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevHeight; });
  };

  const onType = (v) => {
    setBody(v);
    if (!typingSent.current && v) { typingSent.current = true; setTyping({ variables: { connectionId: id, isTyping: true } }).catch(() => {}); setTimeout(() => { typingSent.current = false; }, 3000); }
  };

  const submit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody('');
    atBottom.current = true;
    try {
      const { data: res } = await send({ variables: { connectionId: id, body: text } });
      appendMessage(res.sendMessage);
      client.refetchQueries({ include: ['Connections'] });
    } catch (err) { setBody(text); toast(errorMessage(err), { tone: 'error' }); }
  };

  const openRoom = async () => {
    try {
      const skill = connection.exchanges[0]?.skillName || '';
      const { data: r } = await createRoom({ variables: { input: { name: `${firstName(user.name)} × ${firstName(connection.partner.name)} · ${skill}`, skillName: skill, type: 'ONE_TO_ONE', participantIds: [connection.partner.id] } } });
      navigate(`/rooms/${r.createRoom.id}`);
    } catch (err) { toast(errorMessage(err), { tone: 'error' }); }
  };

  const grouped = useMemo(() => {
    const out = [];
    let lastDay = '';
    for (const m of items) {
      const day = new Date(m.createdAt).toDateString();
      if (day !== lastDay) { out.push({ divider: formatDate(m.createdAt), key: `d${day}` }); lastDay = day; }
      out.push(m);
    }
    return out;
  }, [items]);

  const p = connection.partner;
  return (
    <section className="convo card">
      <header className="convo-head">
        <Link to={`/chat`} className="icon-btn convo-back" aria-label="Back"><Icon name="close" /></Link>
        <Link to={`/users/${p.id}`} className="row gap-10 grow owner-link">
          <Avatar user={p} size={42} showStatus />
          <div className="stack gap-2">
            <strong>{p.name}</strong>
            <span className="tiny muted">{partnerTyping ? <em className="typing-text">typing…</em> : p.isOnline ? 'Online' : `Last seen ${timeAgo(p.lastSeen)}`}</span>
          </div>
        </Link>
        <div className="row gap-6 convo-actions">
          <Link to="/sessions" state={{ connectionId: id }} className="btn btn-soft btn-sm"><Icon name="calendar" size={15} /> Schedule</Link>
          <button className="btn btn-soft btn-sm" onClick={openRoom}><Icon name="room" size={15} /> Room</button>
          {connection.canReview && <button className="btn btn-primary btn-sm" onClick={() => setReviewOpen(true)}><Icon name="star" size={15} /> Review</button>}
        </div>
      </header>

      <div className="convo-exchange">
        {connection.exchanges.map((e, i) => (
          <span key={i} className={cx('chip', e.teacher.id === user.id ? 'chip-lavender' : 'chip-mint')}>
            {e.teacher.id === user.id ? `You teach ${e.skillName}` : `${firstName(e.teacher.name)} teaches you ${e.skillName}`}
          </span>
        ))}
        <span className="tiny muted">{connection.completedSessions} verified session{connection.completedSessions === 1 ? '' : 's'}</span>
        {connection.status === 'ACTIVE' && connection.completedSessions > 0 && (
          <button className="link-btn tiny" onClick={async () => { if (window.confirm('Mark this whole exchange as completed?')) { try { await completeExchange({ variables: { connectionId: id } }); toast('Exchange completed 🎓', { tone: 'mint' }); } catch (err) { toast(errorMessage(err), { tone: 'error' }); } } }}>Mark exchange complete</button>
        )}
        {connection.status === 'COMPLETED' && <span className="chip chip-soft">Exchange completed</span>}
      </div>

      <div className="convo-list" ref={listRef} onScroll={onScroll}>
        {data?.messages.hasMore && <button className="btn btn-soft btn-sm load-older" onClick={loadOlder}>Load earlier messages</button>}
        {loading && !data && <div className="center pad-16"><Spinner /></div>}
        {data && !items.length && <EmptyState art="chat" title={`Say hi to ${firstName(p.name)} 👋`} text="Introduce yourself and suggest a time for your first session." />}
        {grouped.map((m) => m.divider ? <div key={m.key} className="day-divider"><span>{m.divider}</span></div> : (
          <div key={m.id} className={cx('bubble-row', m.isMine && 'mine')}>
            {!m.isMine && <Avatar user={m.sender} size={28} />}
            <div className="bubble">
              <p>{m.body}</p>
              <span className="bubble-meta">
                {formatTime(m.createdAt)}{m.isMine && (m.readAt ? ' · Seen' : ' · Sent')}
                {!m.isMine && <button className="bubble-report" title="Report message" onClick={async () => { const reason = window.prompt('Why are you reporting this message?'); if (reason) { try { await report({ variables: { input: { targetType: 'MESSAGE', targetId: m.id, reason } } }); toast('Reported. Thank you.'); } catch (err) { toast(errorMessage(err), { tone: 'error' }); } } }}>⚑</button>}
              </span>
            </div>
          </div>
        ))}
        {partnerTyping && <div className="bubble-row"><Avatar user={p} size={28} /><div className="bubble typing"><span /><span /><span /></div></div>}
      </div>

      <form className="composer" onSubmit={submit}>
        <textarea value={body} onChange={(e) => onType(e.target.value)} placeholder={`Message ${firstName(p.name)}…`} rows={1} maxLength={2000}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }} aria-label="Message" />
        <button className="btn btn-primary send-btn" disabled={!body.trim() || sendState.loading} aria-label="Send"><Icon name="send" /></button>
      </form>
      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} connection={connection} />
    </section>
  );
}

export default function Chat() {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const { data, loading, error } = useQuery(CONNECTIONS);
  const list = (data?.connections || []).filter((c) => c.partner.name.toLowerCase().includes(filter.toLowerCase()));
  const active = data?.connections.find((c) => c.id === connectionId);

  useEffect(() => {
    if (!connectionId && data?.connections.length && window.innerWidth > 900) navigate(`/chat/${data.connections[0].id}`, { replace: true });
  }, [connectionId, data, navigate]);

  if (error) return <ErrorBox error={errorMessage(error)} />;
  if (data && !data.connections.length) {
    return <EmptyState art="chat" title="No conversations yet" text="Messaging unlocks once a swap request is accepted — so every chat is with a real exchange partner." action={<Link to="/matches" className="btn btn-primary">Find a partner</Link>} />;
  }

  return (
    <div className={cx('chat-layout', connectionId && 'has-active')}>
      <aside className="chat-list card">
        <div className="chat-list-head">
          <h2>Messages</h2>
          <input className="input input-sm" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search partners" aria-label="Search conversations" />
        </div>
        {loading && !data && <div className="center pad-16"><Spinner /></div>}
        <div className="chat-items">
          {list.map((c) => (
            <Link key={c.id} to={`/chat/${c.id}`} className={cx('chat-item', c.id === connectionId && 'active')}>
              <Avatar user={c.partner} size={44} showStatus />
              <div className="grow stack gap-2 min0">
                <div className="row between"><strong className="ellipsis">{c.partner.name}</strong>{c.lastMessage && <span className="tiny muted">{timeAgo(c.lastMessage.createdAt)}</span>}</div>
                <span className="tiny muted ellipsis">{c.lastMessage ? `${c.lastMessage.isMine ? 'You: ' : ''}${c.lastMessage.body}` : 'No messages yet'}</span>
              </div>
              {c.unreadCount > 0 && <span className="nav-badge">{c.unreadCount}</span>}
            </Link>
          ))}
        </div>
      </aside>
      {active ? <Conversation key={active.id} connection={active} /> : <section className="convo card convo-empty"><EmptyState art="chat" title="Pick a conversation" text="Choose a partner on the left to start chatting." /></section>}
    </div>
  );
}
