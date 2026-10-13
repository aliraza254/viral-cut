import React from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { NavigationShell } from './components/NavigationShell';
import { CaptionStudio } from './pages/CaptionStudio';
import { ViralReelGenerator } from './pages/ViralReelGenerator';
import { SavedProjectsDrawer } from './components/SavedProjectsDrawer';

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
    </div>
  );
}

/**
 * Root Application Router Shell
 * Provides global ProjectContext store for seamless cross-tool state preservation.
 */
export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
