import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Modal from './Modal.jsx';
import { Avatar, Field, ErrorBox } from './ui.jsx';
import { MY_SKILLS } from '../graphql/queries/index.js';
import { SEND_REQUEST } from '../graphql/mutations/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage, firstName, titleCase } from '../utils/helpers.js';

const CREDIT_COST = 10;

/**
 * Send a swap request. `partner` must include teachSkills; `preset` may hold
 * { requestedSkillId, offeredSkillName } from a match.
 */
export default function RequestModal({ open, onClose, partner, preset = {} }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data } = useQuery(MY_SKILLS, { skip: !open });
  const myTeach = (data?.mySkills || []).filter((s) => s.type === 'TEACH');
  const [requested, setRequested] = useState('');
  const [offered, setOffered] = useState('');
  const [mode, setMode] = useState('EXCHANGE');
  const [message, setMessage] = useState('');
  const [send, { loading, error, reset }] = useMutation(SEND_REQUEST, { refetchQueries: ['SwapRequests', 'Matches', 'Dashboard'] });

  useEffect(() => {
    if (!open) return;
    reset();
    setRequested(preset.requestedSkillId || partner?.teachSkills?.[0]?.id || '');
    setMessage(`Hi ${firstName(partner?.name)}! I'd love to learn from you.`);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const pick = myTeach.find((s) => s.name === preset.offeredSkillName) || myTeach[0];
    setOffered(pick?.id || '');
    if (!myTeach.length) setMode('CREDIT');
  }, [open, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!partner) return null;
  const canAfford = (user?.credits || 0) >= CREDIT_COST;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await send({ variables: { input: { toUserId: partner.id, requestedSkillId: requested, offeredSkillId: mode === 'EXCHANGE' ? offered : null, mode, message } } });
      toast(`${firstName(partner.name)} will be notified instantly.`, { title: 'Swap request sent 🚀', tone: 'mint' });
      onClose();
    } catch { /* shown via error */ }
  };

  return (
    <Modal open={open} onClose={onClose} title="Request a skill swap" subtitle={`with ${partner.name}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="req-form" disabled={loading || !requested || (mode === 'EXCHANGE' && !offered) || (mode === 'CREDIT' && !canAfford)}>{loading ? 'Sending…' : 'Send request'}</button></>}>
      <form id="req-form" onSubmit={submit} className="stack gap-16">
        <div className="row gap-12 req-partner"><Avatar user={partner} size={44} /><div><strong>{partner.name}</strong><p className="muted tiny">{partner.headline}</p></div></div>
        <Field label={`What do you want to learn from ${firstName(partner.name)}?`} htmlFor="req-skill">
          <select id="req-skill" className="input" value={requested} onChange={(e) => setRequested(e.target.value)} required>
            {(partner.teachSkills || []).map((s) => <option key={s.id} value={s.id}>{s.name} · {titleCase(s.level)}</option>)}
          </select>
        </Field>
        <div className="segmented" role="radiogroup" aria-label="Exchange type">
          <button type="button" role="radio" aria-checked={mode === 'EXCHANGE'} className={mode === 'EXCHANGE' ? 'on' : ''} onClick={() => setMode('EXCHANGE')} disabled={!myTeach.length}>
            <strong>Skill swap</strong><span>Teach something in return</span>
          </button>
          <button type="button" role="radio" aria-checked={mode === 'CREDIT'} className={mode === 'CREDIT' ? 'on' : ''} onClick={() => setMode('CREDIT')}>
            <strong>Use credits</strong><span>{CREDIT_COST} ✦ · you have {user?.credits ?? 0}</span>
          </button>
        </div>
        {mode === 'EXCHANGE' ? (
          <Field label="What will you teach in return?" htmlFor="req-offer" hint={!myTeach.length ? 'Add a teaching skill in your profile first.' : undefined}>
            <select id="req-offer" className="input" value={offered} onChange={(e) => setOffered(e.target.value)} required>
              {myTeach.map((s) => <option key={s.id} value={s.id}>{s.name} · {titleCase(s.level)}</option>)}
            </select>
          </Field>
        ) : (
          <p className={`alert ${canAfford ? 'alert-info' : 'alert-error'}`}>
            {canAfford ? `${CREDIT_COST} credits transfer to ${firstName(partner.name)} only if they accept. The amount is set by the server.` : `You need ${CREDIT_COST} credits. Teach a session to earn more.`}
          </p>
        )}
        <Field label="Message" htmlFor="req-msg">
          <textarea id="req-msg" className="input" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <ErrorBox error={error && errorMessage(error)} />
      </form>
    </Modal>
  );
}
