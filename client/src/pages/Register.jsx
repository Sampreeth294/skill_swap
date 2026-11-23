import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { REGISTER } from '../graphql/mutations/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, ErrorBox } from '../components/ui.jsx';
import AuthShell from './AuthShell.jsx';
import { errorMessage } from '../utils/helpers.js';

function validate({ name, email, password, confirm }) {
  const e = {};
  if (name.trim().length < 2) e.name = 'Please enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'Enter a valid email.';
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) e.password = 'At least 8 characters with letters and numbers.';
  if (confirm !== password) e.confirm = 'Passwords do not match.';
  return e;
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const [register, { loading, error }] = useMutation(REGISTER);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const errors = touched ? validate(form) : {};
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const strength = [form.password.length >= 8, /\d/.test(form.password), /[A-Z]/.test(form.password), /[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(validate(form)).length) return;
    try {
      const { data } = await register({ variables: { input: { name: form.name, email: form.email, password: form.password } } });
      await signIn(data.register);
      navigate('/profile?welcome=1', { replace: true });
    } catch { /* shown */ }
  };

  return (
    <AuthShell title="Join SkillSwap" subtitle="Create your free account and get 20 Knowledge Credits.">
      <form onSubmit={submit} className="stack gap-16" noValidate>
        <Field label="Full name" error={errors.name} htmlFor="name"><input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} /></Field>
        <Field label="Email" error={errors.email} htmlFor="email"><input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Password" error={errors.password} htmlFor="password">
          <input id="password" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
          <div className="strength" aria-hidden="true">{[1, 2, 3, 4].map((i) => <span key={i} className={i <= strength ? `on s${strength}` : ''} />)}</div>
        </Field>
        <Field label="Confirm password" error={errors.confirm} htmlFor="confirm"><input id="confirm" className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></Field>
        <ErrorBox error={error && errorMessage(error)} />
        <button className="btn btn-primary btn-lg w-full" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        <p className="muted center">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
