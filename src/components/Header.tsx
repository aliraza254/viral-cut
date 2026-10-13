import React from 'react';
import { User } from 'firebase/auth';
import { NavigationShell, ToolType } from './NavigationShell';

export interface HeaderProps {
  activeTool?: ToolType;
  onToolChange?: (tool: ToolType) => void;
  activeTab?: 'studio' | 'editor' | 'simulator' | 'cutsheet' | 'analytics';
  onTabChange?: (tab: 'studio' | 'editor' | 'simulator' | 'cutsheet' | 'analytics') => void;
  savedCount: number;
  onOpenSaved: () => void;
  platform?: 'tiktok' | 'reels' | 'shorts';
  onPlatformChange?: (p: 'tiktok' | 'reels' | 'shorts') => void;
  user?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  currentProjectTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTool,
  onToolChange,
  activeTab,
  onTabChange,
  savedCount,
  onOpenSaved,
  user,
  onSignIn,
  onSignOut,
  currentProjectTitle,
}) => {
  // Normalize between activeTool and legacy activeTab
  const currentTool: ToolType =
    activeTool || (activeTab === 'editor' ? 'caption-studio' : 'viral-generator');

  const handleToolChange = (tool: ToolType) => {
    if (onToolChange) {
      onToolChange(tool);
    }
    if (onTabChange) {
      onTabChange(tool === 'caption-studio' ? 'editor' : 'studio');
    }
  };

  return (
    <NavigationShell
      activeTool={currentTool}
      onToolChange={handleToolChange}
      onOpenSavedDrawer={onOpenSaved}
      savedCount={savedCount}
      user={user}
      userEmail={user?.email || null}
      onSignIn={onSignIn}
      onSignOut={onSignOut}
      currentProjectTitle={currentProjectTitle}
    />
  );
};

export default Header;
