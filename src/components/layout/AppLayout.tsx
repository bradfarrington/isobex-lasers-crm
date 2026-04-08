import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { useAuth } from '@/context/AuthContext';
import { OnboardingTutorial, PageHelpGuide, InteractiveTour, shouldShowOnboarding } from '../ui/OnboardingTutorial';
import { helpContent, getHelpForRoute } from '@/lib/helpContent';
import './AppLayout.css';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, appUser } = useAuth();
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPageHelp, setShowPageHelp] = useState(false);
  const [showFullTour, setShowFullTour] = useState(false);

  // Get help content for the current page
  const currentPageHelp = getHelpForRoute(pathname);

  // Reset scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  // Show onboarding tutorial on first visit
  useEffect(() => {
    if (user?.email && shouldShowOnboarding(user.email)) {
      setShowOnboarding(true);
    }
  }, [user?.email]);

  const handleTourNavigate = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onHelpTourClick={() => setShowFullTour(true)}
      />

      <div className="app-main">
        <TopHeader 
          onToggleSidebar={toggleSidebar} 
          sidebarOpen={sidebarOpen} 
          showHelpButton={!!currentPageHelp}
          onHelpClick={() => setShowPageHelp(true)}
        />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Onboarding Tutorial (first login) */}
      {showOnboarding && (
        <OnboardingTutorial
          userEmail={user?.email}
          userName={appUser?.full_name || user?.email?.split('@')[0]}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {/* Page-specific help guide (from floating ? button) */}
      {showPageHelp && currentPageHelp && (
        <PageHelpGuide
          helpData={currentPageHelp}
          onClose={() => setShowPageHelp(false)}
        />
      )}

      {/* Full guided tour (from sidebar Help & Tutorial) */}
      {showFullTour && (
        <InteractiveTour
          helpContentMap={helpContent}
          userName={appUser?.full_name || user?.email?.split('@')[0]}
          onClose={() => setShowFullTour(false)}
          onNavigate={handleTourNavigate}
        />
      )}
    </div>
  );
}
