import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { ME } from '../graphql/queries/index.js';
import { LOGOUT } from '../graphql/mutations/index.js';
import { getToken, setToken, restartWebSocket } from '../services/apolloClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const client = useApolloClient();
  const [token, setTok] = useState(getToken());
  const { data, loading, error } = useQuery(ME, { skip: !token, fetchPolicy: 'cache-and-network' });
  const [logoutMutation] = useMutation(LOGOUT);

  const signIn = useCallback(
    async ({ token: newToken, user }) => {
      setToken(newToken);
      restartWebSocket();
      await client.clearStore();
      client.writeQuery({ query: ME, data: { me: user } });
      setTok(newToken);
    },
    [client]
  );

  const signOut = useCallback(async () => {
    try { await logoutMutation(); } catch { /* token may already be invalid */ }
    setToken(null);
    setTok(null);
    restartWebSocket();
    await client.clearStore();
  }, [client, logoutMutation]);

  // Token expired, user suspended or deleted → `me` comes back null
  useEffect(() => {
    if (token && !loading && data && data.me === null) {
      setToken(null);
      setTok(null);
      client.clearStore();
    }
  }, [token, loading, data, client]);

  const value = useMemo(
    () => ({
      user: token ? data?.me || null : null,
      isAuthenticated: Boolean(token && data?.me),
      isAdmin: data?.me?.role === 'ADMIN',
      loading: Boolean(token) && !data && loading,
      serverError: error,
      signIn,
      signOut,
    }),
    [token, data, loading, error, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
