import React from 'react';
import {
  Flame,
  Wand2,
  Bookmark,
  LogOut,
  LogIn,
  User as UserIcon,
  Sparkles,
  Layers,
} from 'lucide-react';
import { User } from 'firebase/auth';

export type ToolType = 'caption-studio' | 'viral-generator';

export interface NavigationShellProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onOpenSavedDrawer: () => void;
  onAuthClick?: () => void;
  userEmail?: string | null;
  user?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  savedCount?: number;
  currentProjectTitle?: string;
}

export const NavigationShell: React.FC<NavigationShellProps> = ({
  activeTool,
  onToolChange,
  onOpenSavedDrawer,
  onAuthClick,
  userEmail,
  user,
  onSignIn,
  onSignOut,
  savedCount = 0,
  currentProjectTitle,
}) => {
  const effectiveEmail = user?.email || userEmail || null;
  const effectiveAuthClick = onSignIn || onAuthClick;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
        {/* Brand & Format Standard */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 shadow-md shadow-rose-950/30">
            <Flame className="h-5 w-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white">
                ViralCut AI
              </span>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold text-amber-400 border border-amber-500/20">
                9:16 Short-Form
              </span>
            </div>
            {currentProjectTitle ? (
              <p className="hidden max-w-[200px] truncate text-[11px] text-zinc-400 md:block">
                {currentProjectTitle}
              </p>
            ) : (
              <p className="hidden text-[11px] text-zinc-400 md:block">
                Two-Tool AI Suite for Viral Video Creators
              </p>
            )}
          </div>
        </div>

        {/* Two-Tool Segmented Switcher */}
        <nav
          aria-label="Tool Switcher"
          className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/90 p-1 shadow-inner"
        >
          {/* Tool 1: Caption Studio */}
          <button
            type="button"
            onClick={() => onToolChange('caption-studio')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTool === 'caption-studio'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Video Auto-Caption & Styling Studio"
          >
            <Wand2 className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Caption Studio</span>
            <span className="sm:hidden">Captions</span>
          </button>

          {/* Tool 2: Viral Reel Generator */}
          <button
            type="button"
            onClick={() => onToolChange('viral-generator')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTool === 'viral-generator'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Viral Reels & Shorts Generator"
          >
            <Flame className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Viral Reel Generator</span>
            <span className="sm:hidden">Reels Gen</span>
          </button>
        </nav>

        {/* Right Actions: Saved Projects & Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Saved Projects Button */}
          <button
            type="button"
            onClick={onOpenSavedDrawer}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
            title="Saved Projects History"
          >
            <Bookmark className="h-3.5 w-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Saved Scripts</span>
            {savedCount > 0 && (
              <span className="text-[11px] font-bold text-amber-400">{savedCount}</span>
            )}
          </button>

          {/* User Auth Section */}
          {user || effectiveEmail ? (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 border-l border-zinc-800">
              <div
                className="flex items-center gap-1.5 text-xs text-zinc-300 max-w-[120px] sm:max-w-[150px] truncate"
                title={user?.email || effectiveEmail || 'User'}
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="h-6 w-6 rounded-full border border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                    {effectiveEmail?.charAt(0).toUpperCase() || <UserIcon className="h-3 w-3" />}
                  </div>
                )}
                <span className="hidden sm:inline text-[11px] text-zinc-300 truncate">
                  {user?.displayName?.split(' ')[0] || effectiveEmail?.split('@')[0]}
                </span>
              </div>

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            effectiveAuthClick && (
              <button
                type="button"
                onClick={effectiveAuthClick}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-amber-500/50 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer shadow-sm"
                title="Sign in with Google"
              >
                <LogIn className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default NavigationShell;
