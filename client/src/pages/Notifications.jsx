import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { NOTIFICATIONS } from '../graphql/queries/index.js';
import { MARK_ALL_NOTIFICATIONS, MARK_NOTIFICATION, DELETE_NOTIFICATION } from '../graphql/mutations/index.js';
import { NotificationItem } from '../components/Notification.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, Pagination, Tabs } from '../components/ui.jsx';
import { CardSkeleton } from '../components/Loader.jsx';

export default function Notifications() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { data, loading } = useQuery(NOTIFICATIONS, { variables: { unreadOnly, page: { page, limit: 20 } } });
  const refetch = { refetchQueries: ['Notifications', 'UnreadCounts'] };
  const [markOne] = useMutation(MARK_NOTIFICATION, refetch);
  const [markAll] = useMutation(MARK_ALL_NOTIFICATIONS, refetch);
  const [del] = useMutation(DELETE_NOTIFICATION, refetch);

  return (
    <div className="stack gap-24 narrow-page">
      <header className="page-header row between wrap gap-16">
        <div><span className="eyebrow">Real-time updates</span><h1>Notifications</h1></div>
        <button className="btn btn-soft" onClick={() => markAll()} disabled={!data?.unreadNotificationCount}>Mark all as read</button>
      </header>
      <Tabs value={unreadOnly ? 'unread' : 'all'} onChange={(v) => { setUnreadOnly(v === 'unread'); setPage(1); }} tabs={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread', count: data?.unreadNotificationCount }]} />
      {loading && !data ? <CardSkeleton /> : data?.notifications.items.length ? (
        <div className="card notif-list">
          {data.notifications.items.map((n) => (
            <div key={n.id} className="notif-wrap">
              <NotificationItem n={n} onOpen={(x) => { if (!x.read) markOne({ variables: { id: x.id } }); if (x.link) navigate(x.link); }} />
              <button className="icon-btn notif-del" aria-label="Delete notification" onClick={() => del({ variables: { id: n.id } })}><Icon name="trash" size={15} /></button>
            </div>
          ))}
        </div>
      ) : <EmptyState title="You're all caught up" text="New requests, messages and milestones show up here instantly." />}
      <Pagination pageInfo={data?.notifications.pageInfo} onPage={setPage} />
    </div>
  );
}
