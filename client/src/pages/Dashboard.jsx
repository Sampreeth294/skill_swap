import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { DASHBOARD } from '../graphql/queries/index.js';
import { ACCEPT_REQUEST, REJECT_REQUEST } from '../graphql/mutations/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import MatchCard from '../components/MatchCard.jsx';
import SkillDNA from '../components/SkillDNA.jsx';
import { StackedBars } from '../components/Charts.jsx';
import { NotificationItem } from '../components/Notification.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, EmptyState, ErrorBox, ProgressBar, SectionHeader } from '../components/ui.jsx';
import { GridSkeleton, Skeleton } from '../components/Loader.jsx';
import { errorMessage, firstName, formatDateTime } from '../utils/helpers.js';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(DASHBOARD);
  const [accept] = useMutation(ACCEPT_REQUEST, { refetchQueries: ['Dashboard', 'Connections', 'Me'] });
  const [reject] = useMutation(REJECT_REQUEST, { refetchQueries: ['Dashboard'] });

  if (loading && !data) return <div className="stack gap-24"><Skeleton h={150} r={28} /><GridSkeleton count={3} /></div>;
  if (error && !data) return <ErrorBox error={errorMessage(error)} onRetry={refetch} />;
  const s = data.dashboardStats;

  const respond = async (fn, id, ok) => {
    try { await fn({ variables: { id } }); toast(ok, { tone: 'mint' }); } catch (e) { toast(errorMessage(e), { tone: 'error' }); }
  };

  const STATS = [
    ['Teaching', s.teachCount, 'skills', 'spark', 'lavender', '/profile'],
    ['Learning', s.learnCount, 'skills', 'flag', 'blue', '/profile'],
    ['Partners', s.connections, 'connected', 'swap', 'mint', '/chat'],
    ['Credits', s.credits, 'balance', 'coin', 'lavender', '/passport'],
  ];

  return (
    <div className="dashboard stack gap-24">
      <section className="welcome card">
        <div className="welcome-copy">
          <span className="eyebrow">{greeting()}</span>
          <h1>Hi {firstName(user?.name)}, ready to swap some skills?</h1>
          <p className="muted">
            {s.pendingIncoming ? `You have ${s.pendingIncoming} swap request${s.pendingIncoming > 1 ? 's' : ''} waiting` : 'No requests waiting'}
            {' · '}{s.upcomingSessions} upcoming session{s.upcomingSessions === 1 ? '' : 's'}
            {user?.streak?.current ? ` · 🔥 ${user.streak.current}-day streak` : ''}
          </p>
          <div className="row gap-10 wrap">
            <Link to="/matches" className="btn btn-primary">See my matches</Link>
            <Link to="/quests" className="btn btn-white">Continue learning</Link>
          </div>
        </div>
        <div className="profile-meter">
          <div className="row between"><strong>Profile strength</strong><span>{s.profileCompletion}%</span></div>
          <ProgressBar value={s.profileCompletion} label="Profile completion" />
          {s.missingProfileItems.length > 0 ? (
            <ul className="todo-list">
              {s.missingProfileItems.slice(0, 3).map((m) => <li key={m}><Link to="/profile">{m}</Link></li>)}
            </ul>
          ) : <p className="tiny muted">Your profile is complete — great matches ahead ✨</p>}
        </div>
      </section>

      <section className="stat-grid">
        {STATS.map(([label, value, unit, icon, tone, to]) => (
          <Link key={label} to={to} className="stat-card card hover-lift">
            <span className={`stat-icon tone-${tone}`}><Icon name={icon} /></span>
            <div><span className="muted tiny">{label}</span><strong>{value}</strong><span className="tiny muted">{unit}</span></div>
          </Link>
        ))}
      </section>

      <section>
        <SectionHeader title="Recommended partners" subtitle={`${data.matches.pageInfo.total} compatible people found by Smart Matching`} to="/matches" />
        {data.matches.items.length ? (
          <div className="grid grid-2">{data.matches.items.map((m) => <MatchCard key={m.id} match={m} compact />)}</div>
        ) : (
          <EmptyState art="search" title="No matches yet" text="Add skills you teach and want to learn to unlock Smart Matching." action={<Link to="/profile" className="btn btn-primary">Add skills</Link>} />
        )}
      </section>

      <div className="dash-grid">
        <section className="card card-pad">
          <SectionHeader title="Your Skill DNA" subtitle="Hover the constellation to explore" />
          <SkillDNA compact />
        </section>

        <section className="card card-pad">
          <StackedBars title="Learning activity · last 14 days" data={data.myActivity}
            series={[{ key: 'sessions', label: 'Sessions' }, { key: 'milestones', label: 'Milestones' }, { key: 'messages', label: 'Messages' }]} />
        </section>
      </div>

      <div className="dash-grid three">
        <section className="card card-pad">
          <SectionHeader title="Pending requests" to="/requests" />
          {data.swapRequests.items.length === 0 && <p className="muted tiny">No pending requests.</p>}
          <div className="stack gap-12">
            {data.swapRequests.items.map((r) => (
              <div key={r.id} className="mini-request">
                <Avatar user={r.from} size={38} />
                <div className="grow">
                  <strong>{r.from.name}</strong>
                  <p className="tiny muted">wants <b>{r.requestedSkill?.name}</b>{r.mode === 'EXCHANGE' ? <> for <b>{r.offeredSkill?.name}</b></> : ` · ${r.creditCost} ✦`}</p>
                </div>
                <div className="row gap-6">
                  <button className="icon-btn ok" title="Accept" onClick={() => respond(accept, r.id, 'Request accepted — say hi in Messages!')}><Icon name="check" /></button>
                  <button className="icon-btn" title="Decline" onClick={() => respond(reject, r.id, 'Request declined.')}><Icon name="close" /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <SectionHeader title="Upcoming sessions" to="/sessions" />
          {data.sessions.items.length === 0 && <p className="muted tiny">Nothing scheduled. Plan one from Sessions.</p>}
          <div className="stack gap-12">
            {data.sessions.items.map((x) => (
              <Link to="/sessions" key={x.id} className="mini-session">
                <span className="date-pill"><b>{new Date(x.startsAt).getDate()}</b>{new Date(x.startsAt).toLocaleString(undefined, { month: 'short' })}</span>
                <div className="grow"><strong>{x.title}</strong><p className="tiny muted">{formatDateTime(x.startsAt)} · with {firstName(x.partner.name)}</p></div>
                <span className={`chip ${x.myRole === 'TEACHER' ? 'chip-lavender' : 'chip-mint'}`}>{x.myRole === 'TEACHER' ? 'Teach' : 'Learn'}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <SectionHeader title="Learning quests" to="/quests" />
          {data.quests.length === 0 && <p className="muted tiny">Start a quest to track a learning goal.</p>}
          <div className="stack gap-16">
            {data.quests.slice(0, 3).map((q) => (
              <Link key={q.id} to="/quests" className="mini-quest">
                <div className="row between"><strong>{q.title}</strong><span className="tiny muted">{q.completedCount}/{q.totalCount}</span></div>
                <ProgressBar value={q.progress} tone="mint" label={q.title} />
                <span className="tiny muted">{q.daysLeft} days left</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="card card-pad">
        <SectionHeader title="Recent notifications" to="/notifications" />
        {data.notifications.items.length === 0 && <p className="muted tiny">Nothing new.</p>}
        <div className="notif-list">
          {data.notifications.items.map((n) => <NotificationItem key={n.id} n={n} onOpen={(x) => x.link && navigate(x.link)} />)}
        </div>
      </section>
    </div>
  );
}
