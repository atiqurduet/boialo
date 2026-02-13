import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LoyaltySettings {
  points_per_taka: number;
  min_redeem_points: number;
  points_value_taka: number;
  signup_bonus: number;
  review_bonus: number;
  is_enabled: boolean;
}

export const useLoyaltyPoints = () => {
  const { user } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [settings, setSettings] = useState<LoyaltySettings>({
    points_per_taka: 1,
    min_redeem_points: 100,
    points_value_taka: 0.5,
    signup_bonus: 50,
    review_bonus: 10,
    is_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('loyalty_settings')
      .select('setting_key, setting_value');

    if (data) {
      const parsed: Record<string, any> = {};
      data.forEach(item => {
        const val = (item.setting_value as any)?.value;
        parsed[item.setting_key] = val;
      });
      setSettings(prev => ({
        ...prev,
        ...parsed,
      }));
    }
  }, []);

  const fetchPoints = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('loyalty_points')
      .select('points, type')
      .eq('user_id', user.id);

    if (data) {
      const total = data.reduce((sum, item) => {
        return item.type === 'redeemed' || item.type === 'expired'
          ? sum - Math.abs(item.points)
          : sum + item.points;
      }, 0);
      setTotalPoints(Math.max(0, total));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
    fetchPoints();
  }, [fetchSettings, fetchPoints]);

  const addPoints = async (points: number, source: string, description: string, referenceId?: string) => {
    if (!user) return;

    await supabase.from('loyalty_points').insert({
      user_id: user.id,
      points,
      type: 'earned',
      source,
      description,
      reference_id: referenceId || null,
    });

    await fetchPoints();
  };

  const redeemPoints = async (points: number, orderId?: string) => {
    if (!user || points > totalPoints || points < settings.min_redeem_points) return false;

    const { error } = await supabase.from('loyalty_points').insert({
      user_id: user.id,
      points: Math.abs(points),
      type: 'redeemed',
      source: 'redemption',
      description: `${points} পয়েন্ট রিডিম করা হয়েছে`,
      reference_id: orderId || null,
    });

    if (error) return false;

    await fetchPoints();
    return true;
  };

  const getPointsValue = (points: number) => {
    return points * settings.points_value_taka;
  };

  return {
    totalPoints,
    settings,
    loading,
    addPoints,
    redeemPoints,
    getPointsValue,
    refreshPoints: fetchPoints,
  };
};
