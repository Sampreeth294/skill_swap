import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Modal from './Modal.jsx';
import { Field, ErrorBox } from './ui.jsx';
import { CATEGORIES } from '../graphql/queries/index.js';
import { ADD_SKILL, UPDATE_SKILL } from '../graphql/mutations/index.js';
import { errorMessage, LEVELS, titleCase } from '../utils/helpers.js';
import { useToast } from '../context/ToastContext.jsx';

const SUGGESTIONS = ['Python', 'React', 'JavaScript', 'Node.js', 'MongoDB', 'GraphQL', 'UI Design', 'Figma', 'Machine Learning', 'SQL', 'Spanish', 'French', 'Guitar', 'Piano', 'Photography', 'Digital Marketing', 'Public Speaking', 'Yoga', 'Baking', 'Copywriting'];

export default function SkillFormModal({ open, onClose, type = 'TEACH', skill }) {
  const toast = useToast();
  const { data } = useQuery(CATEGORIES, { skip: !open });
  const [form, setForm] = useState({ name: '', categoryId: '', level: 'BEGINNER', experienceMonths: 0, description: '' });
  const [add, addState] = useMutation(ADD_SKILL, { refetchQueries: ['MySkills', 'Me', 'SkillDNA', 'Matches'] });
  const [update, updState] = useMutation(UPDATE_SKILL, { refetchQueries: ['MySkills', 'SkillDNA', 'Matches'] });
  const isEdit = Boolean(skill);
  const t = skill?.type || type;

  useEffect(() => {
    if (!open) return;
    addState.reset(); updState.reset();
    setForm(skill
      ? { name: skill.name, categoryId: skill.category?.id || '', level: skill.level, experienceMonths: skill.experienceMonths, description: skill.description || '' }
      : { name: '', categoryId: data?.categories?.[0]?.id || '', level: t === 'TEACH' ? 'INTERMEDIATE' : 'BEGINNER', experienceMonths: 0, description: '' });
  }, [open, skill]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && !form.categoryId && data?.categories?.length) setForm((f) => ({ ...f, categoryId: data.categories[0].id }));
  }, [data, open, form.categoryId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const input = { name: form.name, categoryId: form.categoryId, level: form.level, experienceMonths: Number(form.experienceMonths) || 0, description: form.description };
    try {
      if (isEdit) await update({ variables: { id: skill.id, input } });
      else await add({ variables: { input: { ...input, type: t } } });
      toast(`${form.name} ${isEdit ? 'updated' : 'added'}. Your matches are refreshing.`, { tone: 'mint' });
      onClose();
    } catch { /* error shown */ }
  };

  const err = addState.error || updState.error;
  const busy = addState.loading || updState.loading;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit skill' : t === 'TEACH' ? 'Add a skill you can teach' : 'Add a skill you want to learn'}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="skill-form" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add skill'}</button></>}>
      <form id="skill-form" onSubmit={submit} className="stack gap-16">
        <Field label="Skill name" htmlFor="sk-name">
          <input id="sk-name" className="input" list="skill-suggestions" value={form.name} onChange={set('name')} placeholder="e.g. React" required maxLength={60} />
          <datalist id="skill-suggestions">{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Category" htmlFor="sk-cat">
          <select id="sk-cat" className="input" value={form.categoryId} onChange={set('categoryId')} required>
            {(data?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </Field>
        <Field label={t === 'TEACH' ? 'Your proficiency' : 'Your current level'}>
          <div className="level-picker" role="radiogroup">
            {LEVELS.map((l) => (
              <button type="button" key={l} role="radio" aria-checked={form.level === l} className={form.level === l ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, level: l }))}>{titleCase(l)}</button>
            ))}
          </div>
        </Field>
        {t === 'TEACH' && (
          <Field label="Experience (months)" htmlFor="sk-exp">
            <input id="sk-exp" className="input" type="number" min={0} max={600} value={form.experienceMonths} onChange={set('experienceMonths')} />
          </Field>
        )}
        <Field label="Description" htmlFor="sk-desc" hint="What can you cover, or what do you hope to achieve?">
          <textarea id="sk-desc" className="input" rows={3} maxLength={500} value={form.description} onChange={set('description')} />
        </Field>
        {isEdit && skill.type === 'LEARN' && (
          <label className="check-row"><input type="checkbox" checked={skill.status === 'COMPLETED'} onChange={(e) => update({ variables: { id: skill.id, input: { status: e.target.checked ? 'COMPLETED' : 'ACTIVE' } } })} /> I've learned this skill</label>
        )}
        <ErrorBox error={err && errorMessage(err)} />
      </form>
    </Modal>
  );
}
