import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { HeroIllustration, StepArt } from '../components/Illustrations.jsx';
import UserCard from '../components/UserCard.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, Stars } from '../components/ui.jsx';
import { Skeleton } from '../components/Loader.jsx';
import { LANDING } from '../graphql/queries/index.js';
import '../styles/landing.css';

const STEPS = [
  ['List what you know', 'Add the skills you can teach and the ones you want to learn — with your level and weekly availability.'],
  ['Get smart matches', 'Our transparent two-way algorithm finds people who teach what you want and want what you teach.'],
  ['Swap & learn live', 'Accept a request, chat in real time, open a Knowledge Room and schedule sessions without clashes.'],
  ['Grow your Passport', 'Verified sessions add hours, Knowledge Credits, endorsements and badges to your Skill Passport.'],
];

const FEATURES = [
  ['spark', 'Smart Exchange Matching', 'Reciprocity, proficiency gaps and schedule overlap combine into one explainable compatibility score.', 'lavender'],
  ['dna', 'Skill DNA', 'An interactive constellation of everything you teach, learn and have mastered — your skills, visualised.', 'blue'],
  ['swap', 'Exchange Blueprint', 'See exactly why you and a partner fit: who teaches what, level fit and shared free hours.', 'mint'],
  ['flag', 'Learning Quests', 'Turn goals into milestone timelines with streaks and achievement badges that keep you going.', 'lavender'],
  ['passport', 'Skill Passport', 'A verified record of hours taught and learned, peer endorsements and community reputation.', 'blue'],
  ['coin', 'Knowledge Credits', 'Teach to earn, spend to learn. A fair, non-monetary currency secured on the server.', 'mint'],
];

export default function Home() {
  const { data, loading } = useQuery(LANDING);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const stats = data?.publicStats;

  const search = (e) => { e.preventDefault(); navigate(`/explore?q=${encodeURIComponent(q.trim())}`); };

  return (
    <div className="landing">
      <Navbar />

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="pulse" /> Share What You Know. Discover What You Don't.</span>
            <h1>Your Skills Have Value. <em>Exchange Them.</em></h1>
            <p className="hero-sub">Teach what you know, learn what you love, and connect with people who grow alongside you.</p>
            <div className="row gap-12 wrap">
              <Link to="/register" className="btn btn-primary btn-lg">Find Your Skill Partner</Link>
              <Link to="/explore" className="btn btn-white btn-lg">Explore Skills</Link>
            </div>
            <form className="hero-search" onSubmit={search} role="search">
              <Icon name="search" size={20} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What do you want to learn? Try “React” or “Guitar”" aria-label="Search skills" />
              <button className="btn btn-primary">Search</button>
            </form>
            <div className="hero-popular">
              <span className="muted tiny">Popular:</span>
              {(data?.popularSkills || []).slice(0, 5).map((s) => <Link key={s.name} to={`/explore?q=${encodeURIComponent(s.name)}`} className="chip chip-soft">{s.name}</Link>)}
            </div>
          </div>
          <div className="hero-visual"><HeroIllustration /></div>
        </div>
      </section>

      <section className="section" id="categories">
        <div className="container">
          <div className="section-intro">
            <span className="eyebrow">Popular categories</span>
            <h2>Every skill has a swap partner</h2>
          </div>
          <div className="cat-grid">
            {loading && !data && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={118} r={22} />)}
            {(data?.categories || []).map((c) => (
              <Link key={c.id} to={`/explore?category=${c.id}`} className="cat-card hover-lift" style={{ '--cat': c.color }}>
                <span className="cat-icon">{c.icon}</span>
                <strong>{c.name}</strong>
                <span className="muted tiny">{c.teachCount} teachers · {c.learnCount} learners</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint" id="how">
        <div className="container">
          <div className="section-intro">
            <span className="eyebrow">How SkillSwap works</span>
            <h2>From “I wish I knew” to “I can teach that”</h2>
          </div>
          <div className="steps">
            {STEPS.map(([title, text], i) => (
              <div key={title} className="step">
                <StepArt n={i + 1} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="example-swap card">
            <div className="example-person"><span className="avatar-lg lav">R</span><div><strong>Raju</strong><span>Knows Python · wants React</span></div></div>
            <div className="example-mid"><span className="chip chip-lavender">Python →</span><span className="example-score">94% match</span><span className="chip chip-mint">← React</span></div>
            <div className="example-person right"><div><strong>Rahul</strong><span>Knows React · wants Python</span></div><span className="avatar-lg mint">R</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-intro row between wrap">
            <div>
              <span className="eyebrow">Featured skill partners</span>
              <h2>Meet people ready to swap</h2>
            </div>
            <Link to="/explore" className="btn btn-soft">Browse everyone →</Link>
          </div>
          <div className="grid grid-3">
            {loading && !data && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={300} r={24} />)}
            {(data?.featuredUsers || []).map((u) => <UserCard key={u.id} user={u} footer={<Link to={`/users/${u.id}`} className="btn btn-soft btn-sm">View profile</Link>} />)}
          </div>
        </div>
      </section>

      <section className="section section-tint" id="why">
        <div className="container">
          <div className="section-intro">
            <span className="eyebrow">Why SkillSwap</span>
            <h2>Built for real learning, not just listings</h2>
          </div>
          <div className="feature-grid">
            {FEATURES.map(([icon, title, text, tone]) => (
              <div key={title} className="feature card">
                <span className={`feature-icon tone-${tone}`}><Icon name={icon} size={22} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container stats-band">
          {[
            ['Members', stats?.users], ['Skills listed', stats?.skills], ['Exchanges', stats?.exchanges],
            ['Sessions completed', stats?.sessions], ['Hours shared', stats?.hoursShared], ['Categories', stats?.categories],
          ].map(([label, value]) => (
            <div key={label} className="stat"><strong>{value ?? '—'}</strong><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section className="section section-tint" id="testimonials">
        <div className="container">
          <div className="section-intro">
            <span className="eyebrow">From the community</span>
            <h2>Real reviews from completed exchanges</h2>
          </div>
          <div className="grid grid-3">
            {(data?.featuredReviews || []).map((r) => (
              <figure key={r.id} className="card testimonial">
                <Stars value={r.rating} />
                <blockquote>“{r.comment}”</blockquote>
                <figcaption className="row gap-10">
                  <Avatar user={r.reviewer} size={38} />
                  <div className="stack gap-2"><strong>{r.reviewer.name}</strong><span className="tiny muted">learned {r.endorsedSkill || 'a skill'} from {r.reviewee.name.split(' ')[0]}</span></div>
                </figcaption>
              </figure>
            ))}
            {data && !data.featuredReviews.length && <p className="muted">Reviews appear here once members complete their first exchanges.</p>}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cta">
          <div>
            <h2>Your next skill is one swap away.</h2>
            <p>Join free, get {20} Knowledge Credits, and meet your first partner today.</p>
          </div>
          <div className="row gap-12 wrap">
            <Link to="/register" className="btn btn-white btn-lg">Create free account</Link>
            <Link to="/explore" className="btn btn-outline-white btn-lg">Explore skills</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
