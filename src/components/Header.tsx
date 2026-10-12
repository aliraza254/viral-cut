import React from 'react';
import {
  Flame,
  Smartphone,
  FileSpreadsheet,
  BarChart3,
  Bookmark,
  Sparkles,
  LogOut,
  LogIn,
  User as UserIcon,
  Wand2,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeTab: 'studio' | 'editor' | 'simulator' | 'cutsheet' | 'analytics';
  onTabChange: (tab: 'studio' | 'editor' | 'simulator' | 'cutsheet' | 'analytics') => void;
  savedCount: number;
  onOpenSaved: () => void;
  platform?: 'tiktok' | 'reels' | 'shorts';
  onPlatformChange?: (p: 'tiktok' | 'reels' | 'shorts') => void;
  user?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  savedCount,
  onOpenSaved,
  user,
  onSignIn,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 shadow-md shadow-rose-950/30">
            <Flame className="h-5 w-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">ViralCut AI</span>
              <span className="text-xs text-amber-400 font-medium">Reels & Shorts</span>
            </div>
            <p className="hidden text-xs text-zinc-400 sm:block">
              YouTube & Transcript to High-Retention Viral Scripts
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-lg bg-zinc-900/90 p-1 border border-zinc-800/70">
          <button
            onClick={() => onTabChange('studio')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'studio'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Script Studio</span>
          </button>

          <button
            onClick={() => onTabChange('editor')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'editor'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5 text-amber-400" />
            <span>AI Video Editor</span>
          </button>

          <button
            onClick={() => onTabChange('simulator')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-rose-400" />
            <span>Mobile 9:16 Sim</span>
          </button>

          <button
            onClick={() => onTabChange('cutsheet')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'cutsheet'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" />
            <span>Editor Cut-Sheet</span>
          </button>

          <button
            onClick={() => onTabChange('analytics')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Retention Tracker</span>
          </button>
        </nav>

        {/* Right Actions: Saved Projects & Auth */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSaved}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Saved Projects History"
          >
            <Bookmark className="h-3.5 w-3.5 text-zinc-400" />
            <span>Saved Scripts</span>
            {savedCount > 0 && (
              <span className="ml-1 text-[11px] text-amber-400 font-semibold">{savedCount}</span>
            )}
          </button>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-zinc-800">
              <div
                className="flex items-center gap-1.5 text-xs text-zinc-300 max-w-[140px] truncate"
                title={user.email || user.displayName || 'Authenticated User'}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="h-6 w-6 rounded-full border border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                    {user.email?.charAt(0).toUpperCase() || <UserIcon className="h-3 w-3" />}
                  </div>
                )}
                <span className="hidden sm:inline text-[11px] text-zinc-300 truncate">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 transition-colors"
                  title="Sign out of Google"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            onSignIn && (
              <button
                onClick={onSignIn}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-amber-500/50 hover:bg-zinc-800 hover:text-white transition-colors shadow-sm"
                title="Sign in with Google to sync scripts in Cloud Firestore"
              >
                <LogIn className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Google Sign In</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
