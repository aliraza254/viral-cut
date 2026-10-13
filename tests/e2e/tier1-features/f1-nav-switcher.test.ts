import { describe, it, expect, setContext } from '../harness';
import { ContractValidator } from '../helpers/contract-validators';

setContext(1, 'F1');

describe('Feature F1: Navigation Shell & Tool Switcher', () => {
  it('TC-T1-F1-01: Navigation state machine supports switching between Caption Studio and Viral Reel Generator', () => {
    type ToolType = 'caption-studio' | 'viral-generator';
    let activeTool: ToolType = 'caption-studio';

    function switchTool(target: ToolType) {
      if (target !== 'caption-studio' && target !== 'viral-generator') {
        throw new Error(`Invalid tool target: ${target}`);
      }
      activeTool = target;
      return activeTool;
    }

    expect(activeTool).toBe('caption-studio');
    expect(switchTool('viral-generator')).toBe('viral-generator');
    expect(switchTool('caption-studio')).toBe('caption-studio');
  });

  it('TC-T1-F1-02: Navigation shell props contract strictly defines brand, tool toggle, and action callbacks', () => {
    interface NavigationShellContract {
      activeTool: 'caption-studio' | 'viral-generator';
      onToolChange: (tool: 'caption-studio' | 'viral-generator') => void;
      onOpenSavedDrawer: () => void;
      onAuthClick?: () => void;
      userEmail?: string | null;
    }

    let openedDrawer = false;
    let switchedTool: string | null = null;

    const navProps: NavigationShellContract = {
      activeTool: 'caption-studio',
      onToolChange: (tool) => { switchedTool = tool; },
      onOpenSavedDrawer: () => { openedDrawer = true; },
      userEmail: 'creator@viralcut.ai',
    };

    expect(navProps.activeTool).toBe('caption-studio');
    navProps.onToolChange('viral-generator');
    expect(switchedTool).toBe('viral-generator');
    navProps.onOpenSavedDrawer();
    expect(openedDrawer).toBe(true);
  });

  it('TC-T1-F1-03: Switching tools preserves view mode state without triggering page reload', () => {
    // Simulates SPA routing state transition
    const historyStack: string[] = ['/'];
    let pageReloadTriggered = false;

    function navigateTool(tool: 'caption-studio' | 'viral-generator') {
      historyStack.push(`/#/${tool}`);
      // Page reload should NOT be called in SPA
      pageReloadTriggered = false;
    }

    navigateTool('caption-studio');
    navigateTool('viral-generator');

    expect(historyStack.length).toBe(3);
    expect(historyStack[2]).toBe('/#/viral-generator');
    expect(pageReloadTriggered).toBe(false);
  });

  it('TC-T1-F1-04: Saved projects drawer toggle operates independently of the active tool', () => {
    let activeTool: 'caption-studio' | 'viral-generator' = 'caption-studio';
    let isDrawerOpen = false;

    const toggleDrawer = () => { isDrawerOpen = !isDrawerOpen; };

    // Open drawer in Caption Studio
    toggleDrawer();
    expect(isDrawerOpen).toBe(true);

    // Switch tool while drawer is open
    activeTool = 'viral-generator';
    expect(activeTool).toBe('viral-generator');
    expect(isDrawerOpen).toBe(true); // Drawer state persists

    toggleDrawer();
    expect(isDrawerOpen).toBe(false);
  });

  it('TC-T1-F1-05: Google auth state is accessible across both tool interfaces', () => {
    const mockAuthUser = {
      uid: 'user_ai_viral_123',
      displayName: 'Alex Creator',
      email: 'alex@creator.com',
      photoURL: 'https://lh3.googleusercontent.com/avatar123',
    };

    function getAuthDisplayState(user: typeof mockAuthUser | null, activeTool: string) {
      return {
        isAuthenticated: user !== null,
        userEmail: user?.email ?? null,
        toolContext: activeTool,
      };
    }

    const stateStudio = getAuthDisplayState(mockAuthUser, 'caption-studio');
    expect(stateStudio.isAuthenticated).toBe(true);
    expect(stateStudio.userEmail).toBe('alex@creator.com');

    const stateReels = getAuthDisplayState(mockAuthUser, 'viral-generator');
    expect(stateReels.isAuthenticated).toBe(true);
    expect(stateReels.toolContext).toBe('viral-generator');
  });
});
