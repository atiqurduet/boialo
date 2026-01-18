import { useState, useEffect, useCallback } from 'react';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

export const useCountdown = (endDate: string | null): CountdownTime => {
  const calculateTimeRemaining = useCallback((): CountdownTime => {
    if (!endDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    }

    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false, totalSeconds };
  }, [endDate]);

  const [timeRemaining, setTimeRemaining] = useState<CountdownTime>(calculateTimeRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeRemaining]);

  return timeRemaining;
};

// Format time for display
export const formatCountdown = (time: CountdownTime, compact = false): string => {
  if (time.isExpired) return 'সময় শেষ';

  if (compact) {
    if (time.days > 0) return `${time.days}দ ${time.hours}ঘ`;
    if (time.hours > 0) return `${time.hours}ঘ ${time.minutes}মি`;
    return `${time.minutes}মি ${time.seconds}সে`;
  }

  if (time.days > 0) {
    return `${time.days} দিন ${time.hours} ঘণ্টা ${time.minutes} মিনিট`;
  }
  if (time.hours > 0) {
    return `${time.hours} ঘণ্টা ${time.minutes} মিনিট ${time.seconds} সেকেন্ড`;
  }
  return `${time.minutes} মিনিট ${time.seconds} সেকেন্ড`;
};
