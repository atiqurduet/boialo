// A/B Testing Client - Assigns variants and tracks conversions
import { supabase } from '@/integrations/supabase/client';

interface ABTest {
  id: string;
  name: string;
  variants: Array<{ name: string; weight: number }>;
  target_page?: string;
  is_active: boolean;
}

interface VariantAssignment {
  testId: string;
  variant: string;
}

const ASSIGNMENTS_KEY = 'ab_assignments';

const getSessionId = () => {
  let sid = sessionStorage.getItem('v_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('v_sid', sid);
  }
  return sid;
};

// Get stored assignments
const getStoredAssignments = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY) || '{}');
  } catch { return {}; }
};

const storeAssignment = (testId: string, variant: string) => {
  const assignments = getStoredAssignments();
  assignments[testId] = variant;
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
};

// Weighted random variant selection
const selectVariant = (variants: Array<{ name: string; weight: number }>): string => {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) return variant.name;
  }
  
  return variants[0]?.name || 'control';
};

// Load active A/B tests
export const loadABTests = async (): Promise<ABTest[]> => {
  try {
    const { data } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('is_active', true);
    return (data || []) as ABTest[];
  } catch { return []; }
};

// Get assigned variant for a test (assigns if not already)
export const getVariant = async (testId: string, variants?: Array<{ name: string; weight: number }>): Promise<string> => {
  const stored = getStoredAssignments();
  if (stored[testId]) return stored[testId];

  // Need to assign
  if (!variants) {
    const { data } = await supabase
      .from('ab_tests')
      .select('variants')
      .eq('id', testId)
      .single();
    variants = (data?.variants as any) || [{ name: 'control', weight: 50 }, { name: 'variant_a', weight: 50 }];
  }

  const variant = selectVariant(variants);
  storeAssignment(testId, variant);

  // Record assignment
  try {
    await supabase.from('ab_test_assignments').insert({
      test_id: testId,
      session_id: getSessionId(),
      variant_name: variant,
    });
  } catch {}

  return variant;
};

// Track conversion for a test
export const trackABConversion = async (testId: string, value?: number) => {
  const stored = getStoredAssignments();
  const variant = stored[testId];
  if (!variant) return;

  try {
    await supabase
      .from('ab_test_assignments')
      .update({
        converted: true,
        conversion_value: value || 0,
        converted_at: new Date().toISOString(),
      })
      .eq('test_id', testId)
      .eq('session_id', getSessionId());
  } catch {}
};

// Auto-assign all active tests for current page
export const autoAssignTests = async (pagePath: string): Promise<VariantAssignment[]> => {
  const tests = await loadABTests();
  const assignments: VariantAssignment[] = [];

  for (const test of tests) {
    if (test.target_page && !pagePath.startsWith(test.target_page)) continue;
    
    const variant = await getVariant(test.id, test.variants as any);
    assignments.push({ testId: test.id, variant });
  }

  return assignments;
};

// React hook helper
export const useABTest = () => {
  return {
    getVariant,
    trackConversion: trackABConversion,
    autoAssign: autoAssignTests,
  };
};
