import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  ReelScript,
  Segment,
  SavedProject,
  ViralStrategyProfile,
  VideoSubtitleSegment,
} from '../types';
import { DEFAULT_SAMPLE_REEL } from '../data/samples';
import {
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  subscribeToProjects,
  signInWithGoogle,
  signOutUser,
  onAuthUserChanged,
} from '../lib/firebase';

export type ToolType = 'caption-studio' | 'viral-generator';

export interface UploadedMediaState {
  videoUrl?: string;
  fileName?: string;
  subtitles?: VideoSubtitleSegment[];
  durationSec?: number;
  rawFile?: File;
}

export interface ProjectContextValue {
  // Navigation / Tool State
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Active Project & Reel State
  activeProject: SavedProject | null;
  setActiveProject: (proj: SavedProject | null) => void;
  currentReels: ReelScript[];
  setCurrentReels: React.Dispatch<React.SetStateAction<ReelScript[]>>;
  selectedReelIndex: number;
  setSelectedReelIndex: (index: number) => void;
  activeReel: ReelScript;

  // Source Media & Transcripts
  uploadedMedia: UploadedMediaState | null;
  setUploadedMedia: React.Dispatch<React.SetStateAction<UploadedMediaState | null>>;
  currentVideoTitle: string;
  setCurrentVideoTitle: (title: string) => void;
  currentTranscript: string;
  setCurrentTranscript: (transcript: string) => void;
  currentVideoUrl: string | undefined;
  setCurrentVideoUrl: (url: string | undefined) => void;

  // Configuration
  language: 'english' | 'roman-urdu';
  setLanguage: (lang: 'english' | 'roman-urdu') => void;
  activePlaybackSegment: number;
  setActivePlaybackSegment: (seg: number) => void;
  activeStrategy: ViralStrategyProfile | null;
  setActiveStrategy: (strat: ViralStrategyProfile | null) => void;

  // Auth & Cloud Persistence
  authUser: User | null;
  savedProjects: SavedProject[];
  setSavedProjects: React.Dispatch<React.SetStateAction<SavedProject[]>>;
  isSavedDrawerOpen: boolean;
  setIsSavedDrawerOpen: (open: boolean) => void;
  projectSavedToast: boolean;

  // Cross-Tool Bridge Actions
  transferToCaptionStudio: (videoUrl: string, segments: Segment[]) => void;
  saveCurrentProject: () => Promise<void>;
  loadProject: (proj: SavedProject) => void;
  deleteProject: (id: string) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;

  // Segment CRUD Operations
  updateSegment: (segIndex: number, updated: Segment) => void;
  deleteSegment: (segIndex: number) => void;
  moveSegment: (fromIndex: number, toIndex: number) => void;
  addSegment: () => void;
  applyHook: (newHook: string, onScreenText?: string, visualCue?: string) => void;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

const DRAFT_STORAGE_KEY = 'viralcut_draft_project';
const STRATEGY_STORAGE_KEY = 'viralcut_active_strategy';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Tool navigation
  const [activeTool, setActiveTool] = useState<ToolType>('viral-generator');

  // Reel concepts state
  const [currentReels, setCurrentReels] = useState<ReelScript[]>(() => {
    try {
      const cached = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.reels && Array.isArray(parsed.reels) && parsed.reels.length > 0) {
          return parsed.reels;
        }
      }
    } catch {
      // ignore
    }
    return [DEFAULT_SAMPLE_REEL];
  });
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);

  // Active project metadata
  const [activeProject, setActiveProject] = useState<SavedProject | null>(null);
  const [currentVideoTitle, setCurrentVideoTitle] = useState(
    'How to Charge 10x More for the Exact Same Thing'
  );
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | undefined>(undefined);

  // Uploaded media state in Caption Studio
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMediaState | null>(null);

  // Configuration
  const [language, setLanguage] = useState<'english' | 'roman-urdu'>('english');
  const [activePlaybackSegment, setActivePlaybackSegment] = useState(0);

  // Saved projects drawer & toast
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [projectSavedToast, setProjectSavedToast] = useState(false);

  // Auth & Firestore State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<ViralStrategyProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STRATEGY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active reel accessor
  const activeReel: ReelScript = useMemo(() => {
    return currentReels[selectedReelIndex] || currentReels[0] || DEFAULT_SAMPLE_REEL;
  }, [currentReels, selectedReelIndex]);

  // Firebase auth & project sync
  useEffect(() => {
    const unsubAuth = onAuthUserChanged((user) => {
      setAuthUser(user);
    });

    const unsubscribeProjects = subscribeToProjects((projects) => {
      setSavedProjects(projects);
    });

    return () => {
      unsubAuth();
      unsubscribeProjects();
    };
  }, []);

  // Save draft state to localStorage to prevent accidental data loss
  useEffect(() => {
    if (currentReels.length > 0) {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            title: currentVideoTitle,
            reels: currentReels,
            selectedReelIndex,
            language,
          })
        );
      } catch {
        // quota exceeded or private mode
      }
    }
  }, [currentReels, currentVideoTitle, selectedReelIndex, language]);

  // Auth triggers
  const signIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        console.error('Sign-in error:', err);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }, []);

  // Transfer action: Bridge from Viral Reel Generator to Caption Studio
  const transferToCaptionStudio = useCallback((videoUrl: string, segments: Segment[]) => {
    const mappedSubtitles: VideoSubtitleSegment[] = segments.map((seg, idx) => ({
      id: `seg_${idx + 1}`,
      startSec: seg.startSec,
      endSec: seg.endSec,
      timecode: seg.timecode,
      text: seg.spokenScript,
      visualCue: seg.visualCue,
      onScreenText: seg.onScreenText,
      soundEffect: seg.soundEffect,
    }));

    setUploadedMedia({
      videoUrl,
      fileName: 'Generated Viral Reel Video',
      subtitles: mappedSubtitles,
      durationSec: segments.length > 0 ? segments[segments.length - 1].endSec : 30,
    });
    setActiveTool('caption-studio');
  }, []);

  // Project persistence
  const saveCurrentProject = useCallback(async () => {
    if (currentReels.length === 0) return;
    const project: SavedProject = {
      id: `proj-${Date.now()}`,
      title: currentVideoTitle || 'Viral Reel Concept',
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      videoUrl: currentVideoUrl,
      platform: 'vertical-9-16',
      language,
      reels: currentReels,
      selectedReelIndex,
    };

    try {
      await saveProjectToFirestore(project);
      setActiveProject(project);
      setProjectSavedToast(true);
      setTimeout(() => setProjectSavedToast(false), 2500);
    } catch (err) {
      console.error('Error saving project to Firestore:', err);
    }
  }, [currentReels, currentVideoTitle, currentVideoUrl, language, selectedReelIndex]);

  const loadProject = useCallback((proj: SavedProject) => {
    setCurrentReels(proj.reels);
    setSelectedReelIndex(proj.selectedReelIndex || 0);
    setCurrentVideoTitle(proj.title);
    setCurrentVideoUrl(proj.videoUrl);
    if (proj.language) setLanguage(proj.language);
    setActiveProject(proj);
    setIsSavedDrawerOpen(false);
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await deleteProjectFromFirestore(id);
      setSavedProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
    } catch (err) {
      console.error('Error deleting project from Firestore:', err);
    }
  }, [activeProject]);

  // Segment operations
  const updateSegment = useCallback((segIndex: number, updated: Segment) => {
    setCurrentReels((prevReels) => {
      const active = prevReels[selectedReelIndex] || prevReels[0];
      if (!active) return prevReels;
      const newSegments = [...active.segments];
      newSegments[segIndex] = updated;

      const newReel = {
        ...active,
        segments: newSegments,
        startingPunchline: segIndex === 0 ? updated.spokenScript : active.startingPunchline,
      };

      const copy = [...prevReels];
      copy[selectedReelIndex] = newReel;
      return copy;
    });
  }, [selectedReelIndex]);

  const deleteSegment = useCallback((segIndex: number) => {
    setCurrentReels((prevReels) => {
      const active = prevReels[selectedReelIndex] || prevReels[0];
      if (!active || active.segments.length <= 2) return prevReels;
      const newSegments = active.segments.filter((_, idx) => idx !== segIndex);
      const newReel = { ...active, segments: newSegments };
      const copy = [...prevReels];
      copy[selectedReelIndex] = newReel;
      return copy;
    });
  }, [selectedReelIndex]);

  const moveSegment = useCallback((fromIndex: number, toIndex: number) => {
    setCurrentReels((prevReels) => {
      const active = prevReels[selectedReelIndex] || prevReels[0];
      if (!active) return prevReels;
      const newSegments = [...active.segments];
      const [moved] = newSegments.splice(fromIndex, 1);
      newSegments.splice(toIndex, 0, moved);

      const newReel = {
        ...active,
        segments: newSegments,
        startingPunchline: newSegments[0].spokenScript,
      };
      const copy = [...prevReels];
      copy[selectedReelIndex] = newReel;
      return copy;
    });
  }, [selectedReelIndex]);

  const addSegment = useCallback(() => {
    setCurrentReels((prevReels) => {
      const active = prevReels[selectedReelIndex] || prevReels[0];
      if (!active) return prevReels;
      const lastSeg = active.segments[active.segments.length - 1];
      const newStart = lastSeg ? lastSeg.endSec : 30;
      const newEnd = newStart + 8;

      const newSegment: Segment = {
        timecode: `00:${newStart.toString().padStart(2, '0')} - 00:${newEnd.toString().padStart(2, '0')}`,
        startSec: newStart,
        endSec: newEnd,
        spokenScript: 'And that is the exact reason why this changes everything.',
        visualCue: 'Sudden cut to medium shot, intense gaze into camera lens.',
        onScreenText: 'KEY TAKEAWAY ⚡',
        soundEffect: 'Fast riser whoosh',
        bRollKeywords: ['focused entrepreneur', 'digital screen'],
        musicMood: 'Tension build',
      };

      const newReel = {
        ...active,
        segments: [...active.segments, newSegment],
      };
      const copy = [...prevReels];
      copy[selectedReelIndex] = newReel;
      return copy;
    });
  }, [selectedReelIndex]);

  const applyHook = useCallback((newHook: string, onScreenText?: string, visualCue?: string) => {
    setCurrentReels((prevReels) => {
      const active = prevReels[selectedReelIndex] || prevReels[0];
      if (!active) return prevReels;
      const firstSeg = active.segments[0];
      const updatedFirstSeg: Segment = {
        ...firstSeg,
        spokenScript: newHook,
        onScreenText: onScreenText || firstSeg.onScreenText,
        visualCue: visualCue || firstSeg.visualCue,
      };

      const newSegments = [updatedFirstSeg, ...active.segments.slice(1)];
      const newReel = {
        ...active,
        startingPunchline: newHook,
        segments: newSegments,
      };

      const copy = [...prevReels];
      copy[selectedReelIndex] = newReel;
      return copy;
    });
  }, [selectedReelIndex]);

  const contextValue: ProjectContextValue = useMemo(() => ({
    activeTool,
    setActiveTool,
    activeProject,
    setActiveProject,
    currentReels,
    setCurrentReels,
    selectedReelIndex,
    setSelectedReelIndex,
    activeReel,
    uploadedMedia,
    setUploadedMedia,
    currentVideoTitle,
    setCurrentVideoTitle,
    currentTranscript,
    setCurrentTranscript,
    currentVideoUrl,
    setCurrentVideoUrl,
    language,
    setLanguage,
    activePlaybackSegment,
    setActivePlaybackSegment,
    activeStrategy,
    setActiveStrategy,
    authUser,
    savedProjects,
    setSavedProjects,
    isSavedDrawerOpen,
    setIsSavedDrawerOpen,
    projectSavedToast,
    transferToCaptionStudio,
    saveCurrentProject,
    loadProject,
    deleteProject,
    signIn,
    signOut,
    updateSegment,
    deleteSegment,
    moveSegment,
    addSegment,
    applyHook,
  }), [
    activeTool,
    activeProject,
    currentReels,
    selectedReelIndex,
    activeReel,
    uploadedMedia,
    currentVideoTitle,
    currentTranscript,
    currentVideoUrl,
    language,
    activePlaybackSegment,
    activeStrategy,
    authUser,
    savedProjects,
    isSavedDrawerOpen,
    projectSavedToast,
    transferToCaptionStudio,
    saveCurrentProject,
    loadProject,
    deleteProject,
    signIn,
    signOut,
    updateSegment,
    deleteSegment,
    moveSegment,
    addSegment,
    applyHook,
  ]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

export default ProjectContext;
