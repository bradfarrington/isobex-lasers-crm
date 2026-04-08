import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  ShoppingBag,
  PackageCheck,
  Mail,
  Star,
  FileText,
  BarChart3,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Rocket,
  Map,
  MousePointerClick,
  MonitorPlay,
  Settings,
  FolderOpen,
} from 'lucide-react';
import './OnboardingTutorial.css';

// ─── Icon resolver for string keys from helpContent.ts ───
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  ShoppingBag,
  PackageCheck,
  Mail,
  Star,
  FileText,
  BarChart3,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Rocket,
  Map,
  MousePointerClick,
  MonitorPlay,
  Settings,
  FolderOpen,
};

function resolveIcon(iconRef: any) {
  if (typeof iconRef === 'string') {
    const Icon = iconMap[iconRef];
    return Icon ? <Icon /> : null;
  }
  return iconRef; // already JSX
}

// ─── Shared slide renderer ─────────────────────────────
interface Slide {
  id?: string;
  icon?: any;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle: string;
  description?: string;
  sectionBadge?: string;
  features?: {
    icon: any;
    label: string;
    desc: string;
    color: string;
  }[];
}

interface SlideOverlayProps {
  slides: Slide[];
  onClose: () => void;
  title?: string;
}

function SlideOverlay({ slides, onClose, title }: SlideOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  };

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const slide = slides[currentStep];
  if (!slide) return null;

  const isLast = currentStep === slides.length - 1;
  const isFirst = currentStep === 0;

  const icon = resolveIcon(slide.icon);
  const iconColor = slide.iconColor || 'var(--color-primary)';
  const iconBg = slide.iconBg || `rgba(220, 38, 38, 0.08)`;

  // Badge: per-slide sectionBadge takes priority, then the global title
  const badge = slide.sectionBadge || (title ? `${title} Guide` : null);

  return (
    <div className={`onboarding-overlay ${isClosing ? 'onboarding-closing' : ''}`}>
      <div className={`onboarding-modal ${isClosing ? 'onboarding-modal-closing' : ''}`}>
        <button className="onboarding-close" onClick={handleClose} title="Close">
          <X style={{ width: 20, height: 20 }} />
        </button>

        {/* Page title badge */}
        {badge && <div className="onboarding-page-badge">{badge}</div>}

        <div className="onboarding-content" key={currentStep}>
          {icon && (
            <div className="onboarding-icon" style={{ background: iconBg, color: iconColor }}>
              {icon}
            </div>
          )}

          <h2 className="onboarding-title">{slide.title}</h2>
          <p className="onboarding-subtitle">{slide.subtitle}</p>

          {slide.description && (
            <p className="onboarding-description">{slide.description}</p>
          )}

          {slide.features && (
            <div className="onboarding-features">
              {slide.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="onboarding-feature-item"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div
                    className="onboarding-feature-icon"
                    style={{ color: feat.color, background: `${feat.color}22` }}
                  >
                    {resolveIcon(feat.icon)}
                  </div>
                  <div className="onboarding-feature-text">
                    <div className="onboarding-feature-label">{feat.label}</div>
                    <div className="onboarding-feature-desc">{feat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-dots">
            {slides.map((_, idx) => (
              <button
                key={idx}
                className={`onboarding-dot ${idx === currentStep ? 'active' : ''} ${
                  idx < currentStep ? 'completed' : ''
                }`}
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>

          <div className="onboarding-nav">
            {!isFirst && (
              <button className="btn-secondary" onClick={handlePrev}>
                <ArrowLeft style={{ width: 16, height: 16 }} />
                Back
              </button>
            )}
            {isFirst && slides.length > 1 && (
              <button className="btn-secondary" onClick={handleClose} style={{ border: 'none' }}>
                Skip
              </button>
            )}
            <button className="btn-danger" onClick={handleNext}>
              {isLast ? (slides.length === 1 ? 'Got It' : 'Done') : 'Next'}
              {!isLast && <ArrowRight style={{ width: 16, height: 16 }} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding welcome slides (first login) ──────────
const STORAGE_KEY_PREFIX = 'isobex-onboarding-';

const welcomeSlides: Slide[] = [
  {
    id: 'welcome',
    icon: <Sparkles />,
    iconColor: 'var(--color-primary)',
    iconBg: 'rgba(220, 38, 38, 0.08)',
    title: 'Welcome to Isobex CRM',
    subtitle: "Let's take a quick tour so you know where everything is.",
    description:
      'This will only take a minute. You can skip at any time and come back to this tutorial from the Help button in the sidebar.',
  },
  {
    id: 'navigation',
    icon: <Map />,
    iconColor: 'var(--color-info)',
    iconBg: 'rgba(37, 99, 235, 0.08)',
    title: 'Your Sidebar Navigation',
    subtitle: 'Everything is organised into clear sections on the left.',
    features: [
      {
        icon: <LayoutDashboard />,
        label: 'Core',
        desc: 'Dashboard, Contacts, and Companies management',
        color: 'var(--color-primary)',
      },
      {
        icon: <Target />,
        label: 'Sales & Commerce',
        desc: 'Pipeline, Online Store, and Orders',
        color: 'var(--color-info)',
      },
      {
        icon: <Mail />,
        label: 'Marketing & Operations',
        desc: 'Email Marketing, Reviews, Documents, and Reports',
        color: 'var(--color-success)',
      },
    ],
  },
  {
    id: 'features',
    icon: <MousePointerClick />,
    iconColor: 'var(--color-warning)',
    iconBg: 'rgba(217, 119, 6, 0.08)',
    title: 'Help & Knowledge Hub',
    subtitle: 'We are here to help whenever you need it.',
    features: [
      {
        icon: <Sparkles />,
        label: 'Page Tutorials',
        desc: 'Click the "?" icon in the top right of any page for quick tips specific to that page.',
        color: 'var(--color-info)',
      },
      {
        icon: <FolderOpen />,
        label: 'Knowledge Hub',
        desc: 'Access detailed step-by-step guides anytime from the "Knowledge Hub" in the sidebar.',
        color: 'var(--color-success)',
      },
    ],
  },
];

export function OnboardingTutorial({
  userEmail,
  userName,
  onClose,
}: {
  userEmail?: string;
  userName?: string;
  onClose: () => void;
}) {
  const storageKey = `${STORAGE_KEY_PREFIX}${userEmail || 'default'}`;

  const handleClose = () => {
    try {
      localStorage.setItem(storageKey, 'completed');
    } catch {}
    onClose();
  };

  // Personalise the welcome slide
  const personalSlides = welcomeSlides.map((s, i) =>
    i === 0 && userName ? { ...s, title: `Welcome, ${userName}!` } : s
  );

  return <SlideOverlay slides={personalSlides} onClose={handleClose} />;
}

/**
 * Page-specific help guide powered by helpContent.js
 */
export function PageHelpGuide({ helpData, onClose }: { helpData: any; onClose: () => void }) {
  if (!helpData || !helpData.slides || helpData.slides.length === 0) return null;
  return <SlideOverlay slides={helpData.slides} onClose={onClose} title={helpData.title} />;
}

/**
 * Full guided tour — welcome flow + every page guide in order.
 * Shown when user clicks "Help & Tutorial" in the sidebar.
 */

// The order pages appear in the full tour (matches sidebar order)
const tourPageOrder = [
  '/',
  '/crm',
  '/companies',
  '/pipeline',
  '/store',
  '/orders',
  '/email-marketing',
  '/reviews',
  '/documents',
  '/reporting',
  '/settings',
];

// Friendly labels for sidebar routes used in the "Click here" prompt
const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/crm': 'Contacts',
  '/companies': 'Companies',
  '/pipeline': 'Pipeline',
  '/store': 'Online Store',
  '/orders': 'Orders',
  '/email-marketing': 'Email Marketing',
  '/reviews': 'Reviews',
  '/documents': 'Documents',
  '/reporting': 'Reporting',
  '/settings': 'Settings',
};

/**
 * Interactive multi-page tour.
 * Phases: welcome → navigate → page-tutorial → (repeat) → complete
 */
export function InteractiveTour({
  helpContentMap,
  userName,
  onClose,
  onNavigate,
}: {
  helpContentMap: any;
  userName?: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const [phase, setPhase] = useState<'welcome' | 'navigate' | 'page-tutorial' | 'complete'>('welcome');
  const [pageIndex, setPageIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<any>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Get current route from tourPageOrder
  const currentRoute = tourPageOrder[pageIndex] || '/';
  const currentLabel = routeLabels[currentRoute] || 'Next Page';

  // Get help data for the current page
  const getPageHelp = (route: string) => {
    let entry = helpContentMap[route];
    if (!entry) return null;
    if (entry.fallback && !entry.slides) {
      entry = helpContentMap[entry.fallback];
    }
    if (!entry || !entry.slides) return null;
    return entry;
  };

  // Measure the sidebar link position for the spotlight & highlight the element
  useEffect(() => {
    if (phase !== 'navigate') return;

    let targetEl: HTMLElement | null = null;

    const handleLinkClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Navigate & advance the tour
      onNavigate(currentRoute);
      setTimeout(() => {
        setPhase('page-tutorial');
      }, 300);
    };

    const measure = () => {
      const el = document.querySelector(`[data-tour-target="${currentRoute}"]`) as HTMLElement;
      if (el) {
        targetEl = el;
        el.setAttribute('data-tour-highlight', 'true');
        el.addEventListener('click', handleLinkClick);
        // Ensure the link is scrolled into view within the sidebar
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Re-measure the position after scroll settles
    const updateRect = () => {
      const el = document.querySelector(`[data-tour-target="${currentRoute}"]`) as HTMLElement;
      if (el) {
        const rect = el.getBoundingClientRect();
        setSpotlightRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    // Measure, scroll, then update rect after scroll completes
    measure();
    const scrollTimer = setTimeout(updateRect, 400);
    const recheck = setTimeout(updateRect, 100);
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(recheck);
      window.removeEventListener('resize', updateRect);
      if (targetEl) {
        targetEl.removeAttribute('data-tour-highlight');
        targetEl.removeEventListener('click', handleLinkClick);
      }
    };
  }, [phase, pageIndex, currentRoute, onNavigate]);

  // Handle clicking the highlighted link
  const handleSpotlightClick = () => {
    onNavigate(currentRoute);
    // Small delay so navigation completes before showing the tutorial
    setTimeout(() => {
      setPhase('page-tutorial');
    }, 300);
  };

  // Called when a page tutorial's slides finish
  const handlePageTutorialClose = () => {
    const nextIndex = pageIndex + 1;
    if (nextIndex < tourPageOrder.length) {
      // Check if next page has help content; skip if not
      let idx = nextIndex;
      while (idx < tourPageOrder.length && !getPageHelp(tourPageOrder[idx])) {
        idx++;
      }
      if (idx < tourPageOrder.length) {
        setPageIndex(idx);
        setPhase('navigate');
      } else {
        setPhase('complete');
      }
    } else {
      setPhase('complete');
    }
  };

  // Called when welcome slides finish
  const handleWelcomeClose = () => {
    setPageIndex(0);
    setPhase('navigate');
  };

  // Called on "Let's Go!" or skip
  const handleComplete = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  };

  // ── WELCOME PHASE ──
  if (phase === 'welcome') {
    const personalSlides = welcomeSlides.map((s, i) =>
      i === 0 && userName ? { ...s, title: `Welcome, ${userName}!` } : s
    );
    return <SlideOverlay slides={personalSlides} onClose={handleWelcomeClose} />;
  }

  // ── NAVIGATE PHASE — highlight a sidebar link ──
  if (phase === 'navigate') {
    return (
      <>
        {/* Dark overlay behind everything */}
        <div className={`tour-spotlight-overlay ${isClosing ? 'onboarding-closing' : ''}`} />

        {/* Tooltip next to the highlighted sidebar link (rendered outside overlay for z-index) */}
        {spotlightRect && (
          <div
            className="tour-tooltip"
            style={{
              top: spotlightRect.top + spotlightRect.height / 2,
              left: spotlightRect.left + spotlightRect.width + 16,
            }}
            onClick={handleSpotlightClick}
          >
            <div className="tour-tooltip-content">
              <MousePointerClick style={{ width: 18, height: 18, flexShrink: 0 }} />
              <span>
                Click here → <strong>{currentLabel}</strong>
              </span>
            </div>
            <div className="tour-tooltip-arrow" />
          </div>
        )}

        {/* Skip tour button */}
        <button className="tour-skip-btn" onClick={handleComplete}>
          Skip Tour
          <X style={{ width: 16, height: 16 }} />
        </button>

        {/* Progress indicator */}
        <div className="tour-progress-bar">
          <div
            className="tour-progress-fill"
            style={{ width: `${(pageIndex / tourPageOrder.length) * 100}%` }}
          />
        </div>
      </>
    );
  }

  // ── PAGE TUTORIAL PHASE — show help slides for the current page ──
  if (phase === 'page-tutorial') {
    const helpData = getPageHelp(currentRoute);
    if (!helpData) {
      // No help data, skip to next
      handlePageTutorialClose();
      return null;
    }
    return (
      <SlideOverlay
        slides={helpData.slides}
        onClose={handlePageTutorialClose}
        title={helpData.title}
      />
    );
  }

  // ── COMPLETE PHASE — celebration screen ──
  if (phase === 'complete') {
    return (
      <div className={`onboarding-overlay ${isClosing ? 'onboarding-closing' : ''}`}>
        <div className={`onboarding-modal tour-complete-modal ${isClosing ? 'onboarding-modal-closing' : ''}`}>
          {/* Confetti particles */}
          <div className="tour-confetti">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="tour-confetti-particle"
                style={{
                  '--x': `${Math.random() * 100}%`,
                  '--delay': `${Math.random() * 2}s`,
                  '--duration': `${2 + Math.random() * 2}s`,
                  '--color': [
                    'var(--color-primary)',
                    'var(--color-success)',
                    'var(--color-info)',
                    'var(--color-warning)',
                    '#FF69B4',
                  ][i % 5],
                  '--size': `${6 + Math.random() * 6}px`,
                } as any}
              />
            ))}
          </div>

          <div className="onboarding-content tour-complete-content">
            <div className="tour-complete-icon">
              <Rocket />
            </div>
            <h2 className="onboarding-title tour-complete-title">You're All Set!</h2>
            <p className="onboarding-subtitle">
              You've completed the full tour of Isobex Lasers CRM.
            </p>
            <p className="onboarding-description">
              You now know where everything is and how to use the key features. If you ever need a refresher, click <strong>Help & Tutorial</strong> in the sidebar, or refer to our <strong>Knowledge Hub</strong>.
            </p>

            <div className="tour-complete-stats">
              <div className="tour-complete-stat">
                <span className="tour-complete-stat-number">{tourPageOrder.length}</span>
                <span className="tour-complete-stat-label">Pages Explored</span>
              </div>
              <div className="tour-complete-stat">
                <span className="tour-complete-stat-number">✓</span>
                <span className="tour-complete-stat-label">Ready to Go</span>
              </div>
            </div>

            <button className="btn-danger tour-complete-btn" onClick={handleComplete}>
              <Sparkles style={{ width: 18, height: 18, marginRight: 8 }} />
              Let's Go — Good Luck!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Check if the onboarding tutorial should be shown for a given user.
 */
export function shouldShowOnboarding(userEmail?: string) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userEmail || 'default'}`;
    return localStorage.getItem(key) !== 'completed';
  } catch {
    return false;
  }
}

/**
 * Reset onboarding for a user (used by the "Help" button to replay).
 */
export function resetOnboarding(userEmail?: string) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userEmail || 'default'}`;
    localStorage.removeItem(key);
  } catch {}
}
