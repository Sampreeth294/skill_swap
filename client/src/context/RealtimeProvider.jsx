import { useApolloClient, useSubscription } from '@apollo/client/react';
import { NOTIFICATION_ADDED, MESSAGE_ADDED, PRESENCE_CHANGED, REQUEST_UPDATED } from '../graphql/subscriptions/index.js';
import { useToast } from './ToastContext.jsx';
import { useLocation } from 'react-router-dom';

/**
 * App-wide GraphQL subscriptions: notifications, incoming messages,
 * presence and request updates. Mounted once inside the signed-in shell.
 */
export default function RealtimeProvider({ children }) {
  const client = useApolloClient();
  const toast = useToast();
  const location = useLocation();

  useSubscription(NOTIFICATION_ADDED, {
    onData: ({ data }) => {
      const n = data.data?.notificationAdded;
      if (!n) return;
      const inThisChat = n.type === 'NEW_MESSAGE' && location.pathname.startsWith('/chat');
      if (!inThisChat) toast(n.body || '', { title: n.title, tone: 'lavender' });
      client.refetchQueries({ include: ['UnreadCounts', 'Notifications', 'Dashboard'] });
    },
  });

  useSubscription(MESSAGE_ADDED, {
    variables: {},
    onData: () => client.refetchQueries({ include: ['UnreadCounts', 'Connections'] }),
  });

  useSubscription(PRESENCE_CHANGED, {
    onData: ({ data }) => {
      const p = data.data?.presenceChanged;
      if (!p) return;
      client.cache.modify({
        id: client.cache.identify({ __typename: 'User', id: p.userId }),
        fields: { isOnline: () => p.isOnline, lastSeen: () => p.lastSeen },
      });
    },
  });

  useSubscription(REQUEST_UPDATED, {
    onData: () => client.refetchQueries({ include: ['SwapRequests', 'Dashboard', 'Connections', 'Matches'] }),
  });

  return children;
}
