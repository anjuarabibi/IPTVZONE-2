import { SiteSettings } from '../types';
import { Trophy, Zap } from 'lucide-react';

interface HeroProps {
  settings: SiteSettings;
}

export default function Hero({ settings }: HeroProps) {
  return (
    <div 
      id="hero-banner" 
      className="relative w-full overflow-hidden rounded-3xl mb-8 border border-neutral-800 bg-neutral-950 p-6 md:p-12"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(10, 10, 10, 0.95) 40%, rgba(10, 10, 10, 0.6) 80%, rgba(10, 10, 10, 0.3) 100%), url(${settings.bannerUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Decorative gradient glowing ball */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl flex flex-col items-start gap-4">
        {/* Priority Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/70 border border-rose-500/30 text-rose-400 font-sans text-[11px] font-bold animate-pulse">
          <Trophy size={12} className="text-amber-500 fill-amber-500" />
          <span>FIFA World Cup priority · Fast HLS playback</span>
          <Zap size={11} className="text-amber-400 fill-amber-400" />
        </div>

        {/* Banner Title */}
        <h1 className="font-sans font-black text-2xl md:text-4xl text-white tracking-tight leading-tight">
          {settings.bannerTitle || 'All live tv channel & Fifa world cup live stream 2026'}
        </h1>

        {/* Banner Subtitle in Bengali or English */}
        <p className="font-sans text-sm md:text-base text-neutral-300 leading-relaxed max-w-xl font-medium">
          {settings.bannerSubtitle || 'সব লাইভ টিভি চ্যানেল এক জায়গায়- খেলা, খবর, সিনেমা ও বিনোদন এখন ফ্রি স্ট্রিমিং'}
        </p>

        {/* Feature quick stats */}
        <div className="flex flex-wrap gap-4 mt-2">
          <div className="flex items-center gap-1.5 font-sans text-xs text-neutral-400 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>24/7 Active Streams</span>
          </div>
          <div className="flex items-center gap-1.5 font-sans text-xs text-neutral-400 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Low-Latency Buffering</span>
          </div>
        </div>
      </div>
    </div>
  );
}
