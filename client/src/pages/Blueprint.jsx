import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { BLUEPRINT } from '../graphql/queries/index.js';
import ExchangeBlueprint from '../components/ExchangeBlueprint.jsx';
import RequestModal from '../components/RequestModal.jsx';
import Loader from '../components/Loader.jsx';
import { ErrorBox } from '../components/ui.jsx';
import { errorMessage, firstName } from '../utils/helpers.js';

export default function Blueprint() {
  const { userId } = useParams();
  const { data, loading, error } = useQuery(BLUEPRINT, { variables: { userId } });
  const [open, setOpen] = useState(false);
  if (loading && !data) return <Loader label="Drawing your Exchange Blueprint…" />;
  if (error) return <ErrorBox error={errorMessage(error)} />;
  const bp = data.exchangeBlueprint;
  const partner = { ...bp.partner, teachSkills: bp.theirOffers };

  return (
    <div className="stack gap-24">
      <header className="page-header row between wrap gap-16">
        <div>
          <span className="eyebrow">Smart Exchange Blueprint</span>
          <h1>You × {firstName(bp.partner.name)}</h1>
          <p className="muted">A transparent look at how this exchange would work.</p>
        </div>
        <div className="row gap-8">
          <Link to={`/users/${bp.partner.id}`} className="btn btn-soft">View profile</Link>
          {bp.relation === 'NONE' && bp.theirOffers.length > 0 && <button className="btn btn-primary" onClick={() => setOpen(true)}>Request this swap</button>}
          {bp.relation === 'CONNECTED' && <Link to="/sessions" className="btn btn-primary">Schedule a session</Link>}
          {bp.relation === 'PENDING_SENT' && <span className="chip chip-soft">Request pending</span>}
          {bp.relation === 'PENDING_RECEIVED' && <Link to="/requests" className="btn btn-primary">Respond to their request</Link>}
        </div>
      </header>
      <ExchangeBlueprint blueprint={bp} />
      <RequestModal open={open} onClose={() => setOpen(false)} partner={partner}
        preset={{ requestedSkillId: bp.match?.youLearn?.[0]?.teacherSkill?.id, offeredSkillName: bp.match?.youTeach?.[0]?.skillName }} />
    </div>
  );
}
