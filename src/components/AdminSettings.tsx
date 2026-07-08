import React, { useState } from 'react';
import { SiteSettings } from '../types';
import { Save, HelpCircle, Check, Settings, Image, Globe, ShieldAlert } from 'lucide-react';

interface AdminSettingsProps {
  settings: SiteSettings;
  onSaveSettings: (settings: SiteSettings) => void;
}

export default function AdminSettings({ settings, onSaveSettings }: AdminSettingsProps) {
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle);
  const [bannerUrl, setBannerUrl] = useState(settings.bannerUrl);
  const [bannerTitle, setBannerTitle] = useState(settings.bannerTitle);
  const [bannerSubtitle, setBannerSubtitle] = useState(settings.bannerSubtitle);
  const [featuredGroup, setFeaturedGroup] = useState(settings.featuredGroup);
  const [fifaKeywords, setFifaKeywords] = useState(settings.fifaKeywords);
  const [autoRemoveDead, setAutoRemoveDead] = useState(settings.autoRemoveDead);

  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      siteTitle,
      bannerUrl,
      bannerTitle,
      bannerSubtitle,
      featuredGroup,
      fifaKeywords,
      autoRemoveDead,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-neutral-800/60">
        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-rose-500">
          <Settings size={16} />
        </div>
        <div>
          <h3 className="font-sans font-bold text-sm text-white">General Settings</h3>
          <p className="font-sans text-[11px] text-neutral-400">
            Configure global brand identities, landing page details, and automation settings.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Site Title */}
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
            <Globe size={13} className="text-neutral-500" />
            <span>Site Title</span>
          </label>
          <input
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
            placeholder="IPTV Zone"
            required
          />
        </div>

        {/* Home Page Banner Settings Group */}
        <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800/80 flex flex-col gap-4">
          <span className="font-sans font-bold text-xs text-rose-400 flex items-center gap-1.5 mb-1">
            <Image size={13} />
            <span>Landing Banner Image & Titles</span>
          </span>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[11px] font-semibold text-neutral-400">Banner Background Image URL</label>
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
              placeholder="https://images.unsplash.com/photo-..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[11px] font-semibold text-neutral-400">Banner Large Header Title</label>
            <input
              type="text"
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
              placeholder="All live tv channel & Fifa world cup live stream 2026"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[11px] font-semibold text-neutral-400">Banner Description Subtitle</label>
            <textarea
              value={bannerSubtitle}
              onChange={(e) => setBannerSubtitle(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white resize-none"
              placeholder="সব লাইভ টিভি চ্যানেল এক জায়গায়..."
            />
          </div>
        </div>

        {/* Extra customization keywords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Featured Group */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-neutral-300">
              Featured Group (Home Page)
            </label>
            <input
              type="text"
              value={featuredGroup}
              onChange={(e) => setFeaturedGroup(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
              placeholder="e.g. Sports"
            />
          </div>

          {/* FIFA Keywords */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-neutral-300 flex items-center gap-1">
              <span>FIFA Keywords (comma-separated)</span>
              <HelpCircle size={12} className="text-neutral-500 cursor-help" title="Matching channels are pinned to the top of every list" />
            </label>
            <input
              type="text"
              value={fifaKeywords}
              onChange={(e) => setFifaKeywords(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
              placeholder="fifa, world cup, cup, match"
            />
          </div>
        </div>

        {/* Automatic deletion flag */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/40 border border-neutral-800/80">
          <div className="flex flex-col pr-4">
            <span className="font-sans font-bold text-xs text-white flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-rose-500" />
              <span>Automatically remove dead channels after a scan</span>
            </span>
            <span className="font-sans text-[10px] text-neutral-500 mt-0.5">
              If enabled, streams that fail the active ping check will be deleted automatically instead of being marked offline.
            </span>
          </div>
          <input
            type="checkbox"
            checked={autoRemoveDead}
            onChange={(e) => setAutoRemoveDead(e.target.checked)}
            className="w-4 h-4 rounded text-rose-500 bg-neutral-900 border-neutral-800 focus:ring-rose-500 cursor-pointer accent-rose-500"
          />
        </div>

        {/* Submit Save */}
        <div className="flex items-center justify-between mt-3 pt-4 border-t border-neutral-800/60">
          {saved ? (
            <div className="flex items-center gap-2 text-green-400 font-sans text-xs font-semibold animate-pulse">
              <Check size={14} /> Settings Saved Successfully!
            </div>
          ) : (
            <div />
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-bold rounded-xl shadow-lg hover:shadow-rose-600/15 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Save size={14} />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
