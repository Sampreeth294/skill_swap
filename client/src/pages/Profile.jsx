import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { MY_SKILLS } from '../graphql/queries/index.js';
import { UPDATE_PROFILE, DELETE_SKILL, CHANGE_PASSWORD } from '../graphql/mutations/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import SkillFormModal from '../components/SkillFormModal.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, CategoryChip, EmptyState, ErrorBox, Field, LevelBadge, ProgressBar, Tabs } from '../components/ui.jsx';
import { DAYS, errorMessage } from '../utils/helpers.js';

function SkillList({ skills, type, onAdd, onEdit, onDelete }) {
  return (
    <section className="card card-pad">
      <div className="row between">
        <div>
          <h3 className="card-title">{type === 'TEACH' ? 'Skills I can teach' : 'Skills I want to learn'}</h3>
          <p className="muted tiny">{type === 'TEACH' ? 'Your offer to the community.' : 'Drives who Smart Matching recommends.'}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onAdd}><Icon name="plus" size={16} /> Add</button>
      </div>
      {skills.length === 0 ? (
        <EmptyState title={type === 'TEACH' ? 'What could you teach?' : 'What do you want to learn?'} text="Add at least one to start matching." />
      ) : (
        <div className="skill-rows">
          {skills.map((s) => (
            <div key={s.id} className="skill-row">
              <div className="stack gap-4 grow">
                <div className="row gap-8 wrap"><strong>{s.name}</strong>{s.status === 'COMPLETED' && <span className="chip chip-mint">Learned ✓</span>}</div>
                <div className="row gap-8 wrap"><CategoryChip category={s.category} /><LevelBadge level={s.level} />{s.type === 'TEACH' && s.experienceMonths > 0 && <span className="tiny muted">{s.experienceMonths} months</span>}</div>
              </div>
              <button className="icon-btn" title="Edit" onClick={() => onEdit(s)}><Icon name="edit" /></button>
              <button className="icon-btn danger" title="Delete" onClick={() => onDelete(s)}><Icon name="trash" /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AvailabilityEditor({ value, onChange }) {
  const add = () => onChange([...value, { day: 1, start: '19:00', end: '21:00' }]);
  const set = (i, k, v) => onChange(value.map((s, j) => (j === i ? { ...s, [k]: k === 'day' ? Number(v) : v } : s)));
  return (
    <div className="stack gap-8">
      {value.map((s, i) => (
        <div key={i} className="avail-row">
          <select className="input" value={s.day} onChange={(e) => set(i, 'day', e.target.value)} aria-label="Day">{DAYS.map((d, n) => <option key={d} value={n}>{d}</option>)}</select>
          <input className="input" type="time" value={s.start} onChange={(e) => set(i, 'start', e.target.value)} aria-label="Start" />
          <span className="muted">to</span>
          <input className="input" type="time" value={s.end} onChange={(e) => set(i, 'end', e.target.value)} aria-label="End" />
          <button type="button" className="icon-btn danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove slot"><Icon name="trash" /></button>
        </div>
      ))}
      <button type="button" className="btn btn-soft btn-sm self-start" onClick={add}><Icon name="plus" size={14} /> Add time slot</button>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [tab, setTab] = useState('skills');
  const [modal, setModal] = useState(null);
  const { data, loading } = useQuery(MY_SKILLS);
  const [form, setForm] = useState(null);
  const [interest, setInterest] = useState('');
  const [save, saveState] = useMutation(UPDATE_PROFILE, { refetchQueries: ['Matches', 'SkillDNA'] });
  const [del] = useMutation(DELETE_SKILL, { refetchQueries: ['MySkills', 'SkillDNA', 'Matches', 'Me'] });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [changePw, pwState] = useMutation(CHANGE_PASSWORD);

  useEffect(() => {
    if (user && !form) setForm({
      name: user.name, avatarUrl: user.avatarUrl || '', headline: user.headline || '', bio: user.bio || '', location: user.location || '',
      experience: user.experience || '', learningInterests: user.learningInterests || [], availability: (user.availability || []).map(({ day, start, end }) => ({ day, start, end })),
    });
  }, [user, form]);

  if (!user || !form) return null;
  const skills = data?.mySkills || [];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try { await save({ variables: { input: form } }); toast('Profile saved.', { tone: 'mint' }); } catch { /* shown */ }
  };
  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.name}?`)) return;
    try { await del({ variables: { id: s.id } }); toast(`${s.name} removed.`); } catch (e) { toast(errorMessage(e), { tone: 'error' }); }
  };
  const addInterest = () => {
    const v = interest.trim();
    if (v && !form.learningInterests.includes(v)) setForm({ ...form, learningInterests: [...form.learningInterests, v] });
    setInterest('');
  };

  return (
    <div className="stack gap-24">
      {params.get('welcome') && (
        <div className="alert alert-info welcome-banner"><strong>Welcome to SkillSwap! 🎉</strong> Add one skill you can teach and one you want to learn — your matches appear instantly.</div>
      )}
      <section className="profile-hero card">
        <Avatar user={{ ...user, avatarUrl: form.avatarUrl }} size={88} />
        <div className="grow stack gap-4">
          <h1>{user.name}</h1>
          <p className="muted">{user.headline || 'Add a headline so partners know what you do.'}</p>
          <div className="row gap-12 wrap tiny muted">
            {user.location && <span><Icon name="pin" size={14} /> {user.location}</span>}
            <span><Icon name="star" size={14} /> {user.ratingAvg || 'New'} rating</span>
            <span><Icon name="swap" size={14} /> {user.completedExchanges} exchanges</span>
          </div>
        </div>
        <div className="profile-hero-meter">
          <span className="tiny muted">Profile {user.profileCompletion}% complete</span>
          <ProgressBar value={user.profileCompletion} />
          <Link to={`/users/${user.id}`} className="link-arrow tiny">View public profile →</Link>
        </div>
      </section>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'skills', label: 'Skills', count: skills.length }, { value: 'about', label: 'About & availability' }, { value: 'security', label: 'Security' }]} />

      {tab === 'skills' && (
        <div className="grid grid-2">
          <SkillList type="TEACH" skills={skills.filter((s) => s.type === 'TEACH')} onAdd={() => setModal({ type: 'TEACH' })} onEdit={(s) => setModal({ skill: s })} onDelete={remove} />
          <SkillList type="LEARN" skills={skills.filter((s) => s.type === 'LEARN')} onAdd={() => setModal({ type: 'LEARN' })} onEdit={(s) => setModal({ skill: s })} onDelete={remove} />
          {loading && !data && <p className="muted">Loading skills…</p>}
        </div>
      )}

      {tab === 'about' && (
        <form className="grid grid-2" onSubmit={submit}>
          <section className="card card-pad stack gap-16">
            <h3 className="card-title">About you</h3>
            <Field label="Full name" htmlFor="p-name"><input id="p-name" className="input" value={form.name} onChange={set('name')} /></Field>
            <Field label="Profile picture URL" htmlFor="p-av" hint="https:// link to an image"><input id="p-av" className="input" value={form.avatarUrl} onChange={set('avatarUrl')} placeholder="https://…" /></Field>
            <Field label="Headline" htmlFor="p-head"><input id="p-head" className="input" maxLength={120} value={form.headline} onChange={set('headline')} placeholder="e.g. Backend engineer who loves Python" /></Field>
            <Field label="Bio" htmlFor="p-bio" hint={`${form.bio.length}/1000`}><textarea id="p-bio" className="input" rows={4} maxLength={1000} value={form.bio} onChange={set('bio')} /></Field>
            <Field label="Location" htmlFor="p-loc"><input id="p-loc" className="input" value={form.location} onChange={set('location')} placeholder="City, Country or Remote" /></Field>
            <Field label="Experience" htmlFor="p-exp"><input id="p-exp" className="input" value={form.experience} onChange={set('experience')} placeholder="e.g. 5 years building web apps" /></Field>
          </section>
          <section className="card card-pad stack gap-16">
            <h3 className="card-title">Weekly availability</h3>
            <p className="muted tiny">Used to compute schedule overlap with partners.</p>
            <AvailabilityEditor value={form.availability} onChange={(availability) => setForm({ ...form, availability })} />
            <h3 className="card-title mt-12">Learning interests</h3>
            <div className="row gap-8">
              <input className="input" value={interest} onChange={(e) => setInterest(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }} placeholder="e.g. System design" />
              <button type="button" className="btn btn-soft" onClick={addInterest}>Add</button>
            </div>
            <div className="row wrap gap-6">
              {form.learningInterests.map((i) => (
                <button type="button" key={i} className="chip chip-blue removable" onClick={() => setForm({ ...form, learningInterests: form.learningInterests.filter((x) => x !== i) })}>{i} ×</button>
              ))}
            </div>
            <ErrorBox error={saveState.error && errorMessage(saveState.error)} />
            <button className="btn btn-primary self-start" disabled={saveState.loading}>{saveState.loading ? 'Saving…' : 'Save profile'}</button>
          </section>
        </form>
      )}

      {tab === 'security' && (
        <form className="card card-pad stack gap-16 narrow" onSubmit={async (e) => {
          e.preventDefault();
          try { await changePw({ variables: pw }); setPw({ currentPassword: '', newPassword: '' }); toast('Password changed.', { tone: 'mint' }); } catch { /* shown */ }
        }}>
          <h3 className="card-title">Change password</h3>
          <Field label="Current password" htmlFor="cp"><input id="cp" className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <Field label="New password" htmlFor="np" hint="8+ characters, letters and numbers"><input id="np" className="input" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          <ErrorBox error={pwState.error && errorMessage(pwState.error)} />
          <button className="btn btn-primary self-start" disabled={pwState.loading}>Update password</button>
        </form>
      )}

      <SkillFormModal open={Boolean(modal)} onClose={() => setModal(null)} type={modal?.type} skill={modal?.skill} />
    </div>
  );
}
