import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { CATEGORIES, EXPLORE_SKILLS } from '../graphql/queries/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import SkillCard from '../components/SkillCard.jsx';
import RequestModal from '../components/RequestModal.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorBox, Pagination } from '../components/ui.jsx';
import { GridSkeleton } from '../components/Loader.jsx';
import { errorMessage, LEVELS, titleCase, cx } from '../utils/helpers.js';
import '../styles/marketplace.css';

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState(params.get('q') || '');
  const [requestFor, setRequestFor] = useState(null);
  const search = params.get('q') || '';
  const categoryId = params.get('category') || '';
  const level = params.get('level') || '';
  const sort = params.get('sort') || 'NEWEST';
  const page = Number(params.get('page')) || 1;

  useEffect(() => setTerm(search), [search]);

  const { data: cats } = useQuery(CATEGORIES);
  const { data, loading, error, refetch } = useQuery(EXPLORE_SKILLS, {
    variables: { filter: { type: 'TEACH', search: search || undefined, categoryId: categoryId || undefined, level: level || undefined }, page: { page, limit: 12 }, sort },
  });

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  const onRequest = (skill) => {
    if (!isAuthenticated) return navigate('/login', { state: { from: `/users/${skill.owner.id}` } });
    setRequestFor({ partner: { ...skill.owner, teachSkills: [skill] }, preset: { requestedSkillId: skill.id } });
  };

  const items = data?.skills.items || [];

  return (
    <div className="explore stack gap-24">
      <section className="explore-hero">
        <div>
          <span className="eyebrow">Skill marketplace</span>
          <h1>Explore skills</h1>
          <p className="muted">{data ? `${data.skills.pageInfo.total} teachable skills` : 'Browse'} from people who'd love to swap.{isAuthenticated ? ' Scores show how well each teacher matches you.' : ''}</p>
        </div>
        <form className="explore-search" onSubmit={(e) => { e.preventDefault(); update({ q: term.trim() }); }} role="search">
          <Icon name="search" size={20} />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search a skill or topic…" aria-label="Search skills" />
          {search && <button type="button" className="link-btn" onClick={() => update({ q: '' })}>Clear</button>}
          <button className="btn btn-primary">Search</button>
        </form>
      </section>

      <div className="cat-scroller" role="group" aria-label="Filter by category">
        <button className={cx('cat-pill', !categoryId && 'on')} onClick={() => update({ category: '' })}>All</button>
        {(cats?.categories || []).map((c) => (
          <button key={c.id} className={cx('cat-pill', categoryId === c.id && 'on')} style={{ '--cat': c.color }} onClick={() => update({ category: c.id })}>
            <span>{c.icon}</span> {c.name} <em>{c.teachCount}</em>
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="row gap-8 wrap">
          <span className="tiny muted">Proficiency</span>
          {['', ...LEVELS].map((l) => (
            <button key={l || 'any'} className={cx('chip chip-toggle', level === l && 'on')} onClick={() => update({ level: l })}>{l ? titleCase(l) : 'Any'}</button>
          ))}
        </div>
        <label className="row gap-8 tiny muted">Sort
          <select className="input input-sm" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="NEWEST">Newest</option><option value="LEVEL">Highest level</option><option value="NAME">Name A–Z</option>
          </select>
        </label>
      </div>

      <ErrorBox error={error && errorMessage(error)} onRetry={refetch} />
      {loading && !data ? <GridSkeleton count={6} lines={4} /> : items.length ? (
        <div className="grid grid-3">{items.map((s) => <SkillCard key={s.id} skill={s} onRequest={onRequest} />)}</div>
      ) : (
        <EmptyState art="search" title="No skills found" text="Try a different keyword or clear some filters." action={<button className="btn btn-soft" onClick={() => setParams({})}>Reset filters</button>} />
      )}
      <Pagination pageInfo={data?.skills.pageInfo} onPage={(p) => update({ page: String(p) })} />
      <RequestModal open={Boolean(requestFor)} onClose={() => setRequestFor(null)} partner={requestFor?.partner} preset={requestFor?.preset} />
    </div>
  );
}
