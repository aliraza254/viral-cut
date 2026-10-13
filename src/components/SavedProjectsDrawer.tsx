import React from 'react';
import { X, Trash2, FolderOpen, Clock, Sparkles, Database, LogIn, CheckCircle } from 'lucide-react';
import { SavedProject } from '../types';
import { User } from 'firebase/auth';

interface SavedProjectsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: SavedProject[];
  onSelectProject: (project: SavedProject) => void;
  onDeleteProject: (id: string) => void;
  user?: User | null;
  onSignIn?: () => void;
}

export const SavedProjectsDrawer: React.FC<SavedProjectsDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  onSelectProject,
  onDeleteProject,
  user,
  onSignIn,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 p-4 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Saved Viral Projects</h3>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <Database className="h-3 w-3" />
              <span>Cloud Firestore Storage</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Close Drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Account / Sync Status Card */}
        <div className="mt-4">
          {user ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 min-w-0 flex-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate min-w-0 flex-1">Connected: {user.email}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs">
              <div className="text-amber-200 font-semibold flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-amber-400" />
                <span>Cloud Database Synchronization</span>
              </div>
              <p className="mt-1 text-zinc-400 text-[11px] leading-relaxed">
                Sign in with Google to sync and preserve your generated scripts permanently in Firestore across devices.
              </p>
              {onSignIn && (
                <button
                  onClick={onSignIn}
                  className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors shadow-sm"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Project List */}
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
              <Sparkles className="h-8 w-8 text-zinc-700" />
              <p className="mt-3 text-sm font-medium">No saved projects yet</p>
              <p className="mt-1 text-xs text-zinc-600">
                Generate viral reels and hit "Save Project" to keep them in Firestore.
              </p>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                className="group relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelectProject(proj)}>
                    <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                      {proj.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span className="capitalize text-zinc-400">{proj.platform}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="h-3 w-3" /> {proj.date}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      {proj.reels.length} viral concepts generated
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteProject(proj.id)}
                    className="ml-2 rounded-lg p-1.5 text-zinc-500 hover:bg-rose-950/60 hover:text-rose-400 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
