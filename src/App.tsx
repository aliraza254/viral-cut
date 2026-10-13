import React from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { NavigationShell } from './components/NavigationShell';
import { CaptionStudio } from './pages/CaptionStudio';
import { ViralReelGenerator } from './pages/ViralReelGenerator';
import { SavedProjectsDrawer } from './components/SavedProjectsDrawer';
import { ApiKeyModal } from './components/ApiKeyModal';

/**
 * Inner shell containing navigation, page router, and global overlays.
 */
function AppContent() {
  const {
    activeTool,
    setActiveTool,
    savedProjects,
    isSavedDrawerOpen,
    setIsSavedDrawerOpen,
    isApiKeyModalOpen,
    setIsApiKeyModalOpen,
    loadProject,
    deleteProject,
    authUser,
    signIn,
    signOut,
    currentVideoTitle,
  } = useProject();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-zinc-950 font-sans antialiased">
      {/* Top Navigation Shell */}
      <NavigationShell
        activeTool={activeTool}
        onToolChange={setActiveTool}
        savedCount={savedProjects.length}
        onOpenSavedDrawer={() => setIsSavedDrawerOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        user={authUser}
        userEmail={authUser?.email || null}
        onSignIn={signIn}
        onSignOut={signOut}
        currentProjectTitle={currentVideoTitle}
      />

      {/* Main Workspace Router */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        {activeTool === 'caption-studio' ? (
          <CaptionStudio />
        ) : (
          <ViralReelGenerator />
        )}
      </main>

      {/* Saved Cloud Projects Drawer */}
      <SavedProjectsDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        projects={savedProjects}
        onSelectProject={loadProject}
        onDeleteProject={deleteProject}
        user={authUser}
        onSignIn={signIn}
      />

      {/* Gemini API Key Configuration Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ViralCut UI Crash Caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center font-bold text-xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-white">Application Notice</h2>
            <p className="text-xs text-zinc-400 font-mono bg-zinc-950 p-3 rounded-lg text-left overflow-auto max-h-32">
              {this.state.error?.message || 'An unexpected error occurred during rendering.'}
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('viralcut_draft_project');
                window.location.reload();
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-zinc-950 text-xs transition-colors cursor-pointer"
            >
              Reset Cache & Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Root Application Router Shell
 * Provides global ProjectContext store for seamless cross-tool state preservation.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </ErrorBoundary>
  );
}
