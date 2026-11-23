import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { USER_PROFILE, BLUEPRINT } from '../graphql/queries/index.js';
import { REPORT_CONTENT } from '../graphql/mutations/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import SkillDNA from '../components/SkillDNA.jsx';
import RequestModal from '../components/RequestModal.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import { RatingBars } from '../components/Charts.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { Avatar, CategoryChip, EmptyState, LevelBadge, Stars } from '../components/ui.jsx';
import Loader from '../components/Loader.jsx';
import { errorMessage, firstName, formatDate, timeAgo } from '../utils/helpers.js';

export default function UserProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const toast = useToast();
  const isMe = me?.id === id;
  const { data, loading } = useQuery(USER_PROFILE, { variables: { id } });
  const { data: bp } = useQuery(BLUEPRINT, { variables: { userId: id }, skip: isMe || !me });
  const [requestOpen, setRequestOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [report, reportState] = useMutation(REPORT_CONTENT);

  if (loading && !data) return <Loader />;
  const u = data?.user;
  if (!u) return <EmptyState title="Profile not found" text="This member may have left SkillSwap." action={<Link className="btn btn-primary" to="/explore">Explore skills</Link>} />;
  const match = bp?.exchangeBlueprint?.match;
  const relation = bp?.exchangeBlueprint?.relation;

  return (
    <div className="stack gap-24">
      <section className="profile-hero card">
        <Avatar user={u} size={96} showStatus />
        <div className="grow stack gap-6">
          <h1>{u.name}</h1>
          {u.headline && <p className="muted">{u.headline}</p>}
          <div className="row gap-14 wrap tiny muted">
            {u.location && <span><Icon name="pin" size={14} /> {u.location}</span>}
            <span><Icon name="swap" size={14} /> {u.completedExchanges} exchanges</span>
            <span><Icon name="clock" size={14} /> {u.teachingHours}h taught</span>
            <span>{u.isOnline ? '🟢 Online now' : `Last seen ${timeAgo(u.lastSeen)}`}</span>
          </div>
          <Stars value={u.ratingAvg} count={u.ratingCount} />
        </div>
        {!isMe && me && (
          <div className="profile-cta">
            {match && <ScoreRing score={match.score} size={84} stroke={7} />}
            <div className="stack gap-8">
              {relation === 'NONE' && <button className="btn btn-primary" onClick={() => setRequestOpen(true)} disabled={!u.teachSkills.length}>Request swap</button>}
              {relation === 'CONNECTED' && <Link to="/chat" className="btn btn-primary">Message</Link>}
              {relation === 'PENDING_SENT' && <span className="chip chip-soft">Request pending</span>}
              {relation === 'PENDING_RECEIVED' && <Link to="/requests" className="btn btn-primary">Respond to request</Link>}
              <Link to={`/blueprint/${u.id}`} className="btn btn-soft">Exchange Blueprint</Link>
              <button className="link-btn tiny muted" onClick={() => setReportOpen(true)}>Report profile</button>
            </div>
          </div>
        )}
        {isMe && <Link to="/profile" className="btn btn-soft">Edit profile</Link>}
        {!me && <Link to="/register" className="btn btn-primary">Join to swap with {firstName(u.name)}</Link>}
      </section>

      <div className="grid grid-profile">
        <div className="stack gap-24">
          {u.bio && <section className="card card-pad"><h3 className="card-title">About</h3><p className="prose">{u.bio}</p>{u.experience && <p className="muted tiny mt-12">Experience: {u.experience}</p>}</section>}
          <section className="card card-pad">
            <h3 className="card-title">Skill DNA</h3>
            <SkillDNA userId={u.id} />
          </section>
          <section className="card card-pad">
            <h3 className="card-title">Reviews</h3>
            {data.reviews.items.length === 0 && <p className="muted">No reviews yet.</p>}
            <div className="stack gap-16">
              {data.reviews.items.map((r) => (
                <div key={r.id} className="review">
                  <Avatar user={r.reviewer} size={36} />
                  <div className="stack gap-4">
                    <div className="row gap-8 wrap"><strong>{r.reviewer.name}</strong><Stars value={r.rating} size={12} /><span className="tiny muted">{formatDate(r.createdAt)}</span></div>
                    {r.comment && <p>{r.comment}</p>}
                    {r.endorsedSkill && <span className="chip chip-lavender self-start">Endorsed for {r.endorsedSkill}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="stack gap-24">
          <section className="card card-pad">
            <h3 className="card-title">Teaches</h3>
            <div className="stack gap-10">
              {u.teachSkills.map((s) => (
                <div key={s.id} className="skill-mini"><strong>{s.name}</strong><div className="row gap-6 wrap"><CategoryChip category={s.category} /><LevelBadge level={s.level} /></div></div>
              ))}
              {!u.teachSkills.length && <p className="muted tiny">Nothing listed yet.</p>}
            </div>
          </section>
          <section className="card card-pad">
            <h3 className="card-title">Wants to learn</h3>
            <div className="row wrap gap-6">{u.learnSkills.map((s) => <span key={s.id} className="chip chip-mint">{s.name}{s.status === 'COMPLETED' ? ' ✓' : ''}</span>)}</div>
            {u.learningInterests.length > 0 && <><span className="label mt-12">Interests</span><div className="row wrap gap-6">{u.learningInterests.map((i) => <span key={i} className="chip chip-blue">{i}</span>)}</div></>}
          </section>
          <section className="card card-pad">
            <h3 className="card-title">Availability</h3>
            {u.availability.length ? <ul className="avail-list">{u.availability.map((a, i) => <li key={i}><b>{a.dayLabel}</b> {a.start} – {a.end}</li>)}</ul> : <p className="muted tiny">Not shared.</p>}
          </section>
          <section className="card card-pad">
            <h3 className="card-title">Rating</h3>
            <div className="row gap-12"><strong className="big-number">{data.ratingSummary.average || '—'}</strong><span className="muted tiny">{data.ratingSummary.count} reviews</span></div>
            <RatingBars distribution={data.ratingSummary.distribution} />
          </section>
        </aside>
      </div>

      <RequestModal open={requestOpen} onClose={() => setRequestOpen(false)} partner={u}
        preset={{ requestedSkillId: match?.youLearn?.[0]?.teacherSkill?.id, offeredSkillName: match?.youTeach?.[0]?.skillName }} />
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title={`Report ${firstName(u.name)}`} subtitle="Our admin team reviews every report."
        footer={<><button className="btn btn-ghost" onClick={() => setReportOpen(false)}>Cancel</button><button className="btn btn-danger" disabled={reason.trim().length < 5 || reportState.loading} onClick={async () => {
          try { await report({ variables: { input: { targetType: 'USER', targetId: u.id, reason } } }); toast('Report submitted. Thank you.'); setReportOpen(false); setReason(''); } catch (e) { toast(errorMessage(e), { tone: 'error' }); }
        }}>Submit report</button></>}>
        <textarea className="input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened?" />
      </Modal>
    </div>
  );
}
