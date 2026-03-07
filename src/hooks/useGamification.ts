import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLoyaltyPoints } from '@/hooks/useLoyaltyPoints';

export const useGamification = () => {
  const { user } = useAuth();
  const { addPoints } = useLoyaltyPoints();
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [canSpin, setCanSpin] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckinStatus = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('checkin_date', { ascending: false })
      .limit(31);

    const checkins = (data || []) as any[];
    const checkedToday = checkins.some((c: any) => c.checkin_date === today);
    setTodayCheckedIn(checkedToday);
    setCurrentStreak(checkins[0]?.streak_count || 0);

    // Can spin once per day
    const { data: spins } = await supabase
      .from('spin_wheel_history')
      .select('spun_at')
      .eq('user_id', user.id)
      .gte('spun_at', new Date(today).toISOString())
      .limit(1);

    setCanSpin(!spins?.length);
  }, [user]);

  const fetchBadges = useCallback(async () => {
    if (!user) return;

    const [{ data: allBadges }, { data: userBadges }] = await Promise.all([
      supabase.from('achievement_badges').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('user_badges').select('badge_id').eq('user_id', user.id),
    ]);

    setBadges((allBadges || []) as any[]);
    setEarnedBadgeIds((userBadges || []).map((b: any) => b.badge_id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCheckinStatus();
    fetchBadges();
  }, [fetchCheckinStatus, fetchBadges]);

  const doCheckin = async () => {
    if (!user || todayCheckedIn) return false;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Get yesterday's checkin for streak
    const { data: yesterdayCheckin } = await supabase
      .from('daily_checkins')
      .select('streak_count')
      .eq('user_id', user.id)
      .eq('checkin_date', yesterday)
      .maybeSingle();

    const newStreak = (yesterdayCheckin as any)?.streak_count ? (yesterdayCheckin as any).streak_count + 1 : 1;
    const points = Math.min(5 + (newStreak - 1) * 2, 50); // 5 base + 2 per streak day, max 50

    const { error } = await supabase.from('daily_checkins').insert({
      user_id: user.id,
      checkin_date: today,
      streak_count: newStreak,
      points_earned: points,
    } as any);

    if (error) return false;

    await addPoints(points, 'checkin', `ডেইলি চেক-ইন (স্ট্রিক: ${newStreak} দিন)`);
    setTodayCheckedIn(true);
    setCurrentStreak(newStreak);

    // Check streak badges
    await checkAndAwardBadge('checkin_streak', newStreak);

    return { points, streak: newStreak };
  };

  const doSpin = async () => {
    if (!user || !canSpin) return null;

    // Fetch prizes
    const { data: prizes } = await supabase
      .from('spin_wheel_prizes')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (!prizes?.length) return null;

    // Weighted random selection
    const totalWeight = prizes.reduce((sum: number, p: any) => sum + Number(p.probability), 0);
    let random = Math.random() * totalWeight;
    let selected = prizes[0] as any;

    for (const prize of prizes) {
      random -= Number((prize as any).probability);
      if (random <= 0) { selected = prize as any; break; }
    }

    // Record spin
    await supabase.from('spin_wheel_history').insert({
      user_id: user.id,
      prize_id: selected.id,
      prize_label: selected.label_bn,
      prize_type: selected.prize_type,
      prize_value: selected.prize_value,
    } as any);

    // Award points if applicable
    if (selected.prize_type === 'points' && selected.prize_value > 0) {
      await addPoints(selected.prize_value, 'spin_wheel', `স্পিন হুইল: ${selected.label_bn}`);
    }

    setCanSpin(false);
    return selected;
  };

  const checkAndAwardBadge = async (conditionType: string, value: number) => {
    if (!user) return;

    const eligible = badges.filter(
      (b: any) => b.condition_type === conditionType && 
        b.condition_value <= value && 
        !earnedBadgeIds.includes(b.id)
    );

    for (const badge of eligible) {
      await supabase.from('user_badges').insert({
        user_id: user.id,
        badge_id: badge.id,
      } as any);

      if (badge.points_reward > 0) {
        await addPoints(badge.points_reward, 'badge', `ব্যাজ: ${badge.name_bn}`);
      }

      // Send notification
      await supabase.from('user_notifications').insert({
        user_id: user.id,
        title: `🏆 নতুন ব্যাজ অর্জন!`,
        message: `আপনি "${badge.name_bn}" ব্যাজ পেয়েছেন! ${badge.points_reward > 0 ? `+${badge.points_reward} পয়েন্ট` : ''}`,
        type: 'loyalty',
        link: '/rewards',
      } as any);

      setEarnedBadgeIds(prev => [...prev, badge.id]);
    }
  };

  return {
    todayCheckedIn,
    currentStreak,
    canSpin,
    badges,
    earnedBadgeIds,
    loading,
    doCheckin,
    doSpin,
    checkAndAwardBadge,
    refresh: () => { fetchCheckinStatus(); fetchBadges(); },
  };
};
