import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const SpinWheel = () => {
  const { user } = useAuth();
  const { canSpin, doSpin } = useGamification();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<any>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const segments = [
    { label: "১০ পয়েন্ট", color: "hsl(var(--primary))" },
    { label: "২০ পয়েন্ট", color: "hsl(142 60% 38%)" },
    { label: "৫০ পয়েন্ট", color: "hsl(30 80% 50%)" },
    { label: "১০০ পয়েন্ট", color: "hsl(270 50% 50%)" },
    { label: "ফ্রি ডেলিভারি", color: "hsl(0 70% 55%)" },
    { label: "৫% ছাড়", color: "hsl(170 60% 40%)" },
    { label: "১০% ছাড়", color: "hsl(45 85% 50%)" },
    { label: "আবার চেষ্টা", color: "hsl(var(--muted))" },
  ];

  const handleSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    const prize = await doSpin();
    if (!prize) {
      setSpinning(false);
      toast.error("স্পিন করতে সমস্যা হয়েছে");
      return;
    }

    // Calculate rotation for the won segment
    const segmentAngle = 360 / segments.length;
    const prizeIndex = segments.findIndex(s => s.label === prize.label_bn) || Math.floor(Math.random() * segments.length);
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    const spins = 5 + Math.random() * 3; // 5-8 full spins
    const finalRotation = rotation + spins * 360 + targetAngle;

    setRotation(finalRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(prize);
      if (prize.prize_type !== 'nothing') {
        toast.success(`🎉 ${prize.label_bn} জিতেছেন!`);
      } else {
        toast.info("আবার চেষ্টা করুন! কাল আবার স্পিন করুন।");
      }
    }, 4000);
  };

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-base flex items-center gap-2">
          🎡 স্পিন হুইল
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col items-center">
        {/* Wheel */}
        <div className="relative w-64 h-64 mb-4">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />

          <div
            ref={wheelRef}
            className="w-full h-full rounded-full border-4 border-primary/30 overflow-hidden relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {segments.map((seg, i) => {
              const angle = (360 / segments.length) * i;
              return (
                <div
                  key={i}
                  className="absolute w-full h-full"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan(Math.PI / segments.length)}% 0%)`,
                  }}
                >
                  <div
                    className="w-full h-full flex items-start justify-center pt-4"
                    style={{ backgroundColor: seg.color }}
                  >
                    <span
                      className="text-[9px] font-bold text-white whitespace-nowrap"
                      style={{ transform: `rotate(${360 / segments.length / 2}deg)` }}
                    >
                      {seg.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Center circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-background border-2 border-primary shadow-lg flex items-center justify-center">
                <span className="text-lg">🎡</span>
              </div>
            </div>
          </div>
        </div>

        {/* Result */}
        {result && !spinning && (
          <div className={cn(
            "text-center mb-3 p-2 rounded-lg",
            result.prize_type !== 'nothing' ? "bg-accent/10 text-accent-foreground" : "bg-muted"
          )}>
            <p className="font-semibold text-sm">
              {result.prize_type !== 'nothing' ? `🎉 ${result.label_bn} জিতেছেন!` : "আবার চেষ্টা করুন!"}
            </p>
          </div>
        )}

        <Button
          onClick={handleSpin}
          disabled={!canSpin || spinning}
          className="gap-2"
          size="lg"
        >
          {spinning ? "ঘুরছে..." : canSpin ? "🎡 স্পিন করুন" : "আগামীকাল আবার আসুন"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">প্রতিদিন ১ বার স্পিন করার সুযোগ</p>
      </CardContent>
    </Card>
  );
};
