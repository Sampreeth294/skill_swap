import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import Icon from './Icon.jsx';
import { Avatar } from './ui.jsx';
import { NOTIFICATIONS } from '../graphql/queries/index.js';
import { MARK_ALL_NOTIFICATIONS, MARK_NOTIFICATION } from '../graphql/mutations/index.js';
import { timeAgo, cx } from '../utils/helpers.js';

const TYPE_ICON = {
  SWAP_REQUEST: 'swap', REQUEST_ACCEPTED: 'check', REQUEST_REJECTED: 'close', NEW_MESSAGE: 'chat',
  SESSION_INVITATION: 'calendar', SESSION_UPDATE: 'calendar', LEARNING_MILESTONE: 'flag',
  EXCHANGE_COMPLETED: 'star', CREDITS_EARNED: 'coin', ACHIEVEMENT: 'star', NEW_REVIEW: 'star', ROOM_INVITE: 'room', SYSTEM: 'spark',
};

export function NotificationItem({ n, onOpen, compact }) {
  return (
    <button className={cx('notif', !n.read && 'unread', compact && 'compact')} onClick={() => onOpen(n)}>
      <span className={`notif-icon t-${n.type.toLowerCase()}`}>
        {n.actor ? <Avatar user={n.actor} size={34} /> : <Icon name={TYPE_ICON[n.type]} />}
      </span>
      <span className="notif-text">
        <strong>{n.title}</strong>
        {n.body && <span className="muted">{n.body}</span>}
        <time>{timeAgo(n.createdAt)}</time>
      </span>
      {!n.read && <span className="notif-dot" aria-label="Unread" />}
    </button>
  );
}

/** Bell with live unread count (refreshed by the notificationAdded subscription). */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { data } = useQuery(NOTIFICATIONS, { variables: { page: { limit: 8 } } });
  const [markOne] = useMutation(MARK_NOTIFICATION);
  const [markAll] = useMutation(MARK_ALL_NOTIFICATIONS, { refetchQueries: ['Notifications', 'UnreadCounts'] });
  const unread = data?.unreadNotificationCount || 0;

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) markOne({ variables: { id: n.id }, refetchQueries: ['Notifications', 'UnreadCounts'] });
    if (n.link) navigate(n.link);
  };

  return (
    <div className="bell" ref={ref}>
      <button className="icon-btn" aria-label={`Notifications (${unread} unread)`} onClick={() => setOpen((o) => !o)}>
        <Icon name="bell" size={20} />
        {unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown bell-panel">
          <div className="dropdown-head">
            <strong>Notifications</strong>
            {unread > 0 && <button className="link-btn" onClick={() => markAll()}>Mark all read</button>}
          </div>
          <div className="bell-list">
            {(data?.notifications.items || []).length === 0 && <p className="muted pad-16">You're all caught up ✨</p>}
            {(data?.notifications.items || []).map((n) => <NotificationItem key={n.id} n={n} onOpen={openItem} compact />)}
          </div>
          <Link to="/notifications" className="dropdown-foot" onClick={() => setOpen(false)}>See all notifications</Link>
        </div>
      )}
    </div>
  );
}
