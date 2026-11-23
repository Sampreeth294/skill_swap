import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { QUESTS } from '../graphql/queries/index.js';
import { CREATE_QUEST, TOGGLE_MILESTONE, ADD_MILESTONE, DELETE_MILESTONE, DELETE_QUEST } from '../graphql/mutations/index.js';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorBox, Field, ProgressBar, Tabs } from '../components/ui.jsx';
import { CardSkeleton } from '../components/Loader.jsx';
import { cx, errorMessage, formatDate } from '../utils/helpers.js';
import '../styles/quest.css';

const TEMPLATE = { title: 'Learn React in 21 days', skillName: 'React', targetDays: 21, description: 'From fundamentals to a deployed project.', milestones: ['React fundamentals', 'Components and props', 'State management', 'API integration', 'Build a project'] };

function CreateQuestModal({ open, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ title: '', skillName: '', targetDays: 21, description: '', milestones: ['', ''] });
  const [create, { loading, error }] = useMutation(CREATE_QUEST, { refetchQueries: ['Quests', 'Dashboard'] });
  const setM = (i, v) => setF({ ...f, milestones: f.milestones.map((m, j) => (j === i ? v : m)) });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await create({ variables: { input: { ...f, targetDays: Number(f.targetDays), milestones: f.milestones.map((m) => m.trim()).filter(Boolean) } } });
      toast('Quest created — your journey starts today!', { tone: 'mint' });
      setF({ title: '', skillName: '', targetDays: 21, description: '', milestones: ['', ''] });
      onClose();
    } catch { /* shown */ }
  };
  return (
    <Modal open={open} onClose={onClose} title="Start a learning quest" subtitle="Break a goal into milestones. Due dates are spread across your timeline."
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="quest-form" disabled={loading}>{loading ? 'Creating…' : 'Create quest'}</button></>}>
      <form id="quest-form" className="stack gap-16" onSubmit={submit}>
        <button type="button" className="template-card" onClick={() => setF({ ...TEMPLATE })}>
          <Icon name="spark" /> <span><strong>Use template</strong> · {TEMPLATE.title}</span>
        </button>
        <Field label="Quest title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Conversational Spanish in 30 days" required /></Field>
        <div className="grid grid-2 gap-12">
          <Field label="Skill" hint="Completing the quest marks this learning skill as learned"><input className="input" value={f.skillName} onChange={(e) => setF({ ...f, skillName: e.target.value })} required /></Field>
          <Field label="Target days"><input className="input" type="number" min={1} max={365} value={f.targetDays} onChange={(e) => setF({ ...f, targetDays: e.target.value })} /></Field>
        </div>
        <Field label="Description"><textarea className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Milestones">
          <div className="stack gap-8">
            {f.milestones.map((m, i) => (
              <div key={i} className="row gap-8">
                <span className="ms-index">{i + 1}</span>
                <input className="input" value={m} onChange={(e) => setM(i, e.target.value)} placeholder={`Milestone ${i + 1}`} />
                {f.milestones.length > 1 && <button type="button" className="icon-btn" onClick={() => setF({ ...f, milestones: f.milestones.filter((_, j) => j !== i) })} aria-label="Remove"><Icon name="close" /></button>}
              </div>
            ))}
            {f.milestones.length < 20 && <button type="button" className="btn btn-soft btn-sm self-start" onClick={() => setF({ ...f, milestones: [...f.milestones, ''] })}><Icon name="plus" size={14} /> Add milestone</button>}
          </div>
        </Field>
        <ErrorBox error={error && errorMessage(error)} />
      </form>
    </Modal>
  );
}

function QuestTimeline({ q }) {
  const toast = useToast();
  const [newMs, setNewMs] = useState('');
  const opts = { refetchQueries: ['Me', 'Dashboard', 'SkillDNA'] };
  const [toggle, t] = useMutation(TOGGLE_MILESTONE, opts);
  const [add] = useMutation(ADD_MILESTONE);
  const [delMs] = useMutation(DELETE_MILESTONE);
  const [delQuest] = useMutation(DELETE_QUEST, { refetchQueries: ['Quests', 'Dashboard'] });
  const done = q.status === 'COMPLETED';
  const run = (p) => p.catch((e) => toast(errorMessage(e), { tone: 'error' }));

  return (
    <article className={cx('card quest', done && 'done')}>
      <header className="quest-head">
        <div className="stack gap-4">
          <div className="row gap-8 wrap">
            <h3>{q.title}</h3>
            <span className="chip chip-lavender">{q.skillName}</span>
            {done && <span className="chip chip-mint">Completed 🏆</span>}
          </div>
          {q.description && <p className="muted tiny">{q.description}</p>}
          <span className="tiny muted">{formatDate(q.startDate)} → {formatDate(q.endDate)} · {done ? `finished ${formatDate(q.completedAt)}` : `${q.daysLeft} days left`}</span>
        </div>
        <div className="quest-progress">
          <strong>{q.progress}%</strong>
          <span className="tiny muted">{q.completedCount} of {q.totalCount}</span>
        </div>
      </header>
      <ProgressBar value={q.progress} tone="mint" label={`${q.title} progress`} />
      <ol className="timeline">
        {q.milestones.map((m) => {
          const overdue = !m.completed && m.dueDate && new Date(m.dueDate) < new Date();
          return (
            <li key={m.id} className={cx('tl-item', m.completed && 'complete', overdue && 'overdue')}>
              <button className="tl-dot" disabled={done || t.loading} onClick={() => run(toggle({ variables: { id: m.id } }))} aria-label={m.completed ? `Mark ${m.title} incomplete` : `Complete ${m.title}`}>
                {m.completed && <Icon name="check" size={14} />}
              </button>
              <div className="tl-body">
                <strong>{m.title}</strong>
                <span className="tiny muted">{m.completed ? `Completed ${formatDate(m.completedAt)}` : m.dueDate ? `${overdue ? 'Was due' : 'Due'} ${formatDate(m.dueDate)}` : ''}</span>
              </div>
              {!done && !m.completed && q.milestones.length > 1 && <button className="icon-btn tl-del" aria-label="Delete milestone" onClick={() => run(delMs({ variables: { id: m.id } }))}><Icon name="trash" size={15} /></button>}
            </li>
          );
        })}
      </ol>
      {!done && (
        <div className="row gap-8 quest-foot">
          <input className="input input-sm" value={newMs} onChange={(e) => setNewMs(e.target.value)} placeholder="Add a milestone…" onKeyDown={(e) => { if (e.key === 'Enter' && newMs.trim()) { run(add({ variables: { questId: q.id, title: newMs } })); setNewMs(''); } }} />
          <button className="btn btn-soft btn-sm" disabled={!newMs.trim()} onClick={() => { run(add({ variables: { questId: q.id, title: newMs } })); setNewMs(''); }}>Add</button>
          <button className="btn btn-ghost btn-sm danger-text" onClick={() => window.confirm('Delete this quest?') && run(delQuest({ variables: { id: q.id } }))}>Delete quest</button>
        </div>
      )}
    </article>
  );
}

export default function LearningQuest() {
  const [tab, setTab] = useState('ACTIVE');
  const [open, setOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery(QUESTS);
  const quests = (data?.quests || []).filter((q) => q.status === tab);
  const streak = data?.me?.streak;
  const completedCount = (data?.quests || []).filter((q) => q.status === 'COMPLETED').length;

  return (
    <div className="stack gap-24">
      <header className="page-header row between wrap gap-16">
        <div>
          <span className="eyebrow">Learning Quest</span>
          <h1>Your learning journeys</h1>
          <p className="muted">Goals become milestones, milestones become streaks, streaks become badges.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> New quest</button>
      </header>

      <div className="quest-stats">
        <div className="card streak-card">
          <span className="streak-flame" aria-hidden="true">🔥</span>
          <div><strong>{streak?.current || 0}-day streak</strong><span className="tiny muted">Longest: {streak?.longest || 0} days</span></div>
        </div>
        <div className="card streak-card"><span className="streak-flame" aria-hidden="true">🧭</span><div><strong>{(data?.quests || []).filter((q) => q.status === 'ACTIVE').length} active</strong><span className="tiny muted">quests in progress</span></div></div>
        <div className="card streak-card"><span className="streak-flame" aria-hidden="true">🏆</span><div><strong>{completedCount} completed</strong><span className="tiny muted">journeys finished</span></div></div>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'ACTIVE', label: 'In progress' }, { value: 'COMPLETED', label: 'Completed journeys', count: completedCount }]} />
      <ErrorBox error={error && errorMessage(error)} onRetry={refetch} />
      {loading && !data ? <CardSkeleton lines={5} /> : quests.length ? (
        <div className="grid grid-2 align-start">{quests.map((q) => <QuestTimeline key={q.id} q={q} />)}</div>
      ) : (
        <EmptyState title={tab === 'ACTIVE' ? 'No active quests' : 'No completed journeys yet'} text="Try “Learn React in 21 days” to get started." action={tab === 'ACTIVE' && <button className="btn btn-primary" onClick={() => setOpen(true)}>Start a quest</button>} />
      )}
      <CreateQuestModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
