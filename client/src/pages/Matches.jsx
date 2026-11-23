import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { MATCHES } from '../graphql/queries/index.js';
import MatchCard from '../components/MatchCard.jsx';
import RequestModal from '../components/RequestModal.jsx';
import { EmptyState, ErrorBox, Pagination, Tabs } from '../components/ui.jsx';
import { GridSkeleton } from '../components/Loader.jsx';
import { errorMessage } from '../utils/helpers.js';
import '../styles/marketplace.css';

export default function Matches() {
  const [type, setType] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(1);
  const [req, setReq] = useState(null);
  const { data, loading, error, refetch } = useQuery(MATCHES, { variables: { filter: { matchType: type || undefined, minScore: Number(minScore) }, page: { page, limit: 12 } } });

  const openRequest = (m) => setReq({
    partner: { ...m.user, teachSkills: m.user.teachSkills },
    preset: { requestedSkillId: m.youLearn[0]?.teacherSkill?.id, offeredSkillName: m.youTeach[0]?.skillName },
  });

  return (
    <div className="stack gap-24">
      <header className="page-header">
        <div>
          <span className="eyebrow">Smart Exchange Matching</span>
          <h1>Your skill partners</h1>
          <p className="muted">Ranked by reciprocity, proficiency fit, shared availability and reputation — no black box.</p>
        </div>
      </header>
      <div className="filter-bar">
        <Tabs value={type} onChange={(v) => { setType(v); setPage(1); }} tabs={[
          { value: '', label: 'All' }, { value: 'MUTUAL', label: 'Mutual swaps' }, { value: 'THEY_TEACH_YOU', label: 'Learn with credits' }, { value: 'YOU_TEACH_THEM', label: 'Teach & earn' },
        ]} />
        <label className="row gap-10 tiny muted range-label">Min score <input type="range" min="0" max="90" step="10" value={minScore} onChange={(e) => { setMinScore(e.target.value); setPage(1); }} /> <b>{minScore}%</b></label>
      </div>
      <ErrorBox error={error && errorMessage(error)} onRetry={refetch} />
      {loading && !data ? <GridSkeleton count={4} lines={4} /> : data?.matches.items.length ? (
        <div className="grid grid-2">{data.matches.items.map((m) => <MatchCard key={m.id} match={m} onRequest={openRequest} />)}</div>
      ) : (
        <EmptyState art="search" title="No matches with these filters" text="Add more skills to your profile, set your availability, or lower the minimum score." action={<Link to="/profile" className="btn btn-primary">Update my skills</Link>} />
      )}
      <Pagination pageInfo={data?.matches.pageInfo} onPage={setPage} />
      <RequestModal open={Boolean(req)} onClose={() => setReq(null)} partner={req?.partner} preset={req?.preset} />
    </div>
  );
}
