import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { LOGIN } from '../graphql/mutations/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, ErrorBox } from '../components/ui.jsx';
import AuthShell from './AuthShell.jsx';
import { errorMessage } from '../utils/helpers.js';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [login, { loading, error }] = useMutation(LOGIN);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await login({ variables: { input: form } });
      await signIn(data.login);
      navigate(location.state?.from || (data.login.user.role === 'ADMIN' ? '/admin' : '/dashboard'), { replace: true });
    } catch { /* error rendered below */ }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your learning journey.">
      <form onSubmit={submit} className="stack gap-16" noValidate>
        <Field label="Email" htmlFor="email">
          <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" className="input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <ErrorBox error={error && errorMessage(error)} />
        <button className="btn btn-primary btn-lg w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        <div className="demo-hint">
          <strong>Demo accounts</strong> (after <code>npm run seed</code>)
          <button type="button" className="link-btn" onClick={() => setForm({ email: 'raju@skillswap.dev', password: 'Demo@1234' })}>raju@skillswap.dev</button>
          <button type="button" className="link-btn" onClick={() => setForm({ email: 'admin@skillswap.dev', password: 'Admin@12345' })}>admin@skillswap.dev</button>
        </div>
        <p className="muted center">New to SkillSwap? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthShell>
  );
}
