// Form Analytics - Track form interactions, field hesitation, abandonment
import { serverTrack } from './serverTracking';

interface FieldMetrics {
  name: string;
  focusCount: number;
  totalFocusTime: number;
  changeCount: number;
  correctionCount: number;
  firstInteractionAt: number;
  lastInteractionAt: number;
  completed: boolean;
  hesitationTime: number; // Time between focus and first keystroke
}

interface FormSession {
  formId: string;
  startedAt: number;
  fields: Map<string, FieldMetrics>;
  submitted: boolean;
  abandoned: boolean;
  currentField: string | null;
  currentFieldFocusAt: number;
  currentFieldFirstKeystroke: boolean;
}

const activeForms = new Map<string, FormSession>();

const getOrCreateField = (session: FormSession, fieldName: string): FieldMetrics => {
  if (!session.fields.has(fieldName)) {
    session.fields.set(fieldName, {
      name: fieldName,
      focusCount: 0,
      totalFocusTime: 0,
      changeCount: 0,
      correctionCount: 0,
      firstInteractionAt: Date.now(),
      lastInteractionAt: Date.now(),
      completed: false,
      hesitationTime: 0,
    });
  }
  return session.fields.get(fieldName)!;
};

const getFieldName = (el: HTMLElement): string => {
  return (el as HTMLInputElement).name || el.id || el.getAttribute('data-field') || el.tagName.toLowerCase();
};

export const trackForm = (formId: string, formElement?: HTMLFormElement | null) => {
  if (activeForms.has(formId)) return;

  const session: FormSession = {
    formId,
    startedAt: Date.now(),
    fields: new Map(),
    submitted: false,
    abandoned: false,
    currentField: null,
    currentFieldFocusAt: 0,
    currentFieldFirstKeystroke: false,
  };
  activeForms.set(formId, session);

  const container = formElement || document;

  // Focus tracking
  const handleFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    
    const fieldName = getFieldName(target);
    const field = getOrCreateField(session, fieldName);
    field.focusCount++;
    session.currentField = fieldName;
    session.currentFieldFocusAt = Date.now();
    session.currentFieldFirstKeystroke = false;
  };

  // Blur tracking  
  const handleBlur = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    
    const fieldName = getFieldName(target);
    const field = session.fields.get(fieldName);
    if (field && session.currentFieldFocusAt) {
      field.totalFocusTime += Date.now() - session.currentFieldFocusAt;
      field.lastInteractionAt = Date.now();
      const val = (target as HTMLInputElement).value;
      if (val && val.length > 0) field.completed = true;
    }
    session.currentField = null;
  };

  // Input tracking (hesitation + corrections)
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!session.currentField) return;
    
    const field = session.fields.get(session.currentField);
    if (!field) return;

    field.changeCount++;

    // First keystroke hesitation
    if (!session.currentFieldFirstKeystroke) {
      session.currentFieldFirstKeystroke = true;
      field.hesitationTime = Date.now() - session.currentFieldFocusAt;
    }

    // Correction detection (backspace reduces length)
    if ((e as InputEvent).inputType?.includes('delete')) {
      field.correctionCount++;
    }
  };

  container.addEventListener('focusin', handleFocus as EventListener, { passive: true });
  container.addEventListener('focusout', handleBlur as EventListener, { passive: true });
  container.addEventListener('input', handleInput, { passive: true });

  // Track abandonment on page leave
  const handleUnload = () => {
    if (!session.submitted) {
      session.abandoned = true;
      reportFormAnalytics(formId);
    }
  };
  window.addEventListener('beforeunload', handleUnload, { once: true });

  return () => {
    container.removeEventListener('focusin', handleFocus as EventListener);
    container.removeEventListener('focusout', handleBlur as EventListener);
    container.removeEventListener('input', handleInput);
    window.removeEventListener('beforeunload', handleUnload);
    activeForms.delete(formId);
  };
};

export const trackFormSubmit = (formId: string) => {
  const session = activeForms.get(formId);
  if (session) {
    session.submitted = true;
    reportFormAnalytics(formId);
    activeForms.delete(formId);
  }
};

const reportFormAnalytics = (formId: string) => {
  const session = activeForms.get(formId);
  if (!session) return;

  const fields = Array.from(session.fields.values());
  const completedFields = fields.filter(f => f.completed).length;
  const totalTime = Date.now() - session.startedAt;
  const avgHesitation = fields.length > 0
    ? Math.round(fields.reduce((sum, f) => sum + f.hesitationTime, 0) / fields.length)
    : 0;

  // Find the field where users drop off most (highest focus time without completion)
  const dropOffField = fields
    .filter(f => !f.completed && f.focusCount > 0)
    .sort((a, b) => b.totalFocusTime - a.totalFocusTime)[0];

  serverTrack('FormAnalytics', {
    form_id: formId,
    submitted: session.submitted,
    abandoned: session.abandoned,
    total_fields: fields.length,
    completed_fields: completedFields,
    completion_rate: fields.length > 0 ? Math.round((completedFields / fields.length) * 100) : 0,
    total_time_ms: totalTime,
    avg_hesitation_ms: avgHesitation,
    total_corrections: fields.reduce((sum, f) => sum + f.correctionCount, 0),
    drop_off_field: dropOffField?.name || null,
    field_details: fields.map(f => ({
      name: f.name,
      focus_count: f.focusCount,
      time_spent_ms: f.totalFocusTime,
      corrections: f.correctionCount,
      hesitation_ms: f.hesitationTime,
      completed: f.completed,
    })),
  });
};
