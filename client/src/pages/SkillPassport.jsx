import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { PASSPORT, CREDITS } from '../graphql/queries/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import SkillDNA from '../components/SkillDNA.jsx';
import { LogoMark } from '../components/Logo.jsx';
import { Avatar, EmptyState, ErrorBox, Pagination, ProgressBar, Tabs } from '../components/ui.jsx';
import Loader from '../components/Loader.jsx';
import { cx, errorMessage, formatDate, titleCase } from '../utils/helpers.js';
import '../styles/passport.css';

function Wallet() {
  const [page, setPage] = useState(1);
  const { data, loading } = useQuery(CREDITS, { variables: { page: { page, limit: 10 } } });
  if (loading && !data) return <Loader />;
  const w = data.myCredits;
  return (
    <div className="stack gap-24">
      <div className="wallet-grid">
        <div className="card wallet-balance">
          <span className="tiny">Knowledge Credits</span>
          <strong>{w.balance} <small>✦</small></strong>
          <p>Non-monetary · earned only through verified teaching</p>
        </div>
        <div className="card card-pad stack gap-4"><span className="tiny muted">Total earned</span><strong className="big-number pos">+{w.earned}</strong></div>
        <div className="card card-pad stack gap-4"><span className="tiny muted">Total spent</span><strong className="big-number neg">−{w.spent}</strong></div>
      </div>
      <div className="card card-pad">
        <h3 className="card-title">How credits work</h3>
        <ul className="rules">
          <li><b>+{w.rules.perTeachingHour}</b> per verified teaching hour (max {w.rules.maxPerSession} per session)</li>
          <li><b>−{w.rules.creditRequestCost}</b> to learn from someone without a reciprocal swap</li>
          <li><b>+{w.rules.signupBonus}</b> welcome bonus</li>
          <li>Every amount is calculated by the server; balances can never go below zero.</li>
        </ul>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Date</th><th>Description</th><th>Type</th><th className="num">Amount</th><th className="num">Balance</th></tr></thead>
          <tbody>
            {w.transactions.items.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.createdAt)}</td><td>{t.reason}</td>
                <td><span className={`status status-${t.type.toLowerCase()}`}>{titleCase(t.type)}</span></td>
                <td className={cx('num', t.type === 'SPEND' ? 'neg' : 'pos')}>{t.type === 'SPEND' ? '−' : '+'}{t.amount}</td>
                <td className="num">{t.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!w.transactions.items.length && <p className="muted pad-16">No transactions yet.</p>}
      </div>
      <Pagination pageInfo={w.transactions.pageInfo} onPage={setPage} />
    </div>
  );
}

export default function SkillPassport() {
  const { userId } = useParams();
  const { user } = useAuth();
  const isMe = !userId || userId === user?.id;
  const [tab, setTab] = useState('passport');
  const { data, loading, error } = useQuery(PASSPORT, { variables: { userId: userId || undefined } });

  if (loading && !data) return <Loader label="Opening Skill Passport…" />;
  if (error) return <ErrorBox error={errorMessage(error)} />;
  const p = data.skillPassport;
  const rep = p.reputation;
  const earned = p.achievements.filter((a) => a.earned);

  return (
    <div className="stack gap-24">
      <section className="passport card">
        <div className="passport-cover">
          <div className="row gap-10"><LogoMark size={30} /><span className="passport-brand">SKILL PASSPORT</span></div>
          <span className="passport-no">No. {p.user.id.slice(-8).toUpperCase()}</span>
        </div>
        <div className="passport-body">
          <Avatar user={p.user} size={104} />
          <div className="passport-id">
            <span className="tiny muted">Holder</span>
            <h1>{p.user.name}</h1>
            <span className="muted">{p.user.headline}</span>
            <div className="row gap-16 wrap tiny muted"><span>Member since {formatDate(p.memberSince)}</span><span>{p.user.location}</span></div>
          </div>
          <div className="passport-rep">
            <span className="tiny muted">Community reputation</span>
            <strong>{rep.level}</strong>
            <span className="rep-score">{rep.score} pts</span>
            {rep.nextLevelAt && <><ProgressBar value={(rep.score / rep.nextLevelAt) * 100} /><span className="tiny muted">{rep.nextLevelAt - rep.score} pts to next level</span></>}
          </div>
        </div>
        <div className="passport-stats">
          {[['Teaching hours', p.teachingHours], ['Learning hours', p.learningHours], ['Exchanges', p.completedExchanges], ['Sessions', p.sessionsCompleted], ['Milestones', p.milestonesCompleted], ['Badges', earned.length]].map(([l, v]) => (
            <div key={l}><strong>{v}</strong><span>{l}</span></div>
          ))}
        </div>
        <div className="passport-stamp" aria-hidden="true">VERIFIED<br />ACTIVITY</div>
      </section>

      {isMe && <Tabs value={tab} onChange={setTab} tabs={[{ value: 'passport', label: 'Passport' }, { value: 'dna', label: 'Skill DNA' }, { value: 'wallet', label: 'Knowledge Credits' }]} />}

      {tab === 'wallet' && isMe && <Wallet />}
      {tab === 'dna' && <section className="card card-pad"><SkillDNA userId={p.user.id} /></section>}
      {tab === 'passport' && (
        <>
          <div className="grid grid-2">
            <section className="card card-pad">
              <h3 className="card-title">Skills taught</h3>
              {p.skillsTaught.length ? p.skillsTaught.map((s) => (
                <div key={s.skillName} className="hours-row"><span>{s.skillName}</span><span className="hours-bar"><i style={{ width: `${Math.min(100, (s.hours / Math.max(...p.skillsTaught.map((x) => x.hours))) * 100)}%` }} /></span><span className="tiny muted">{s.hours}h · {s.sessions}</span></div>
              )) : <p className="muted tiny">No verified teaching yet.</p>}
              {p.masteredSkills.length > 0 && <><span className="label mt-12">Mastered</span><div className="row wrap gap-6">{p.masteredSkills.map((s) => <span key={s} className="chip chip-gold">★ {s}</span>)}</div></>}
            </section>
            <section className="card card-pad">
              <h3 className="card-title">Skills learned</h3>
              {p.skillsLearned.length ? p.skillsLearned.map((s) => (
                <div key={s.skillName} className="hours-row mint"><span>{s.skillName}</span><span className="hours-bar"><i style={{ width: `${Math.min(100, (s.hours / Math.max(...p.skillsLearned.map((x) => x.hours))) * 100)}%` }} /></span><span className="tiny muted">{s.hours}h · {s.sessions}</span></div>
              )) : <p className="muted tiny">No verified learning yet.</p>}
              {p.learnedSkills.length > 0 && <><span className="label mt-12">Completed learning</span><div className="row wrap gap-6">{p.learnedSkills.map((s) => <span key={s} className="chip chip-mint">✓ {s}</span>)}</div></>}
            </section>
          </div>

          <section className="card card-pad">
            <h3 className="card-title">Achievement badges</h3>
            <p className="muted tiny">Awarded automatically from verified platform activity — they can't be claimed manually.</p>
            <div className="badges">
              {p.achievements.map((a) => (
                <div key={a.code} className={cx('badge-card', `tier-${a.tier.toLowerCase()}`, !a.earned && 'locked')} title={a.description}>
                  <span className="badge-icon">{a.icon}</span>
                  <strong>{a.title}</strong>
                  <span className="tiny muted">{a.earned ? `Earned ${formatDate(a.awardedAt)}` : a.description}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-2">
            <section className="card card-pad">
              <h3 className="card-title">Peer endorsements</h3>
              {p.endorsements.length ? <div className="row wrap gap-8">{p.endorsements.map((e) => <span key={e.skillName} className="endorse">{e.skillName}<b>×{e.count}</b></span>)}</div> : <EmptyState title="No endorsements yet" text="Partners can endorse a skill when they review an exchange." />}
            </section>
            {isMe && (
              <section className="card card-pad">
                <h3 className="card-title">Recent milestones</h3>
                {p.recentMilestones.length ? <ul className="ms-list">{p.recentMilestones.map((m) => <li key={m.id}><span>✓</span>{m.title}<time>{formatDate(m.completedAt)}</time></li>)}</ul> : <p className="muted tiny">Complete quest milestones to see them here.</p>}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
