import { useEffect, useRef } from 'react';
import { ShepherdTour, Tour } from 'react-shepherd';
import 'shepherd.js/dist/css/shepherd.css';

interface ProductTourProps {
  tourId: string;
  onComplete?: () => void;
  onSkip?: () => void;
  children?: React.ReactNode;
}

// Custom Shepherd theme styles
const tourOptions = {
  defaultStepOptions: {
    classes: 'tilo-tour',
    cancelIcon: {
      enabled: true,
    },
    arrowClass: 'shepherd-arrow',
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Back',
        type: 'cancel',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Next',
        type: 'cancel',
      },
    ],
    highlightClass: 'shepherd-highlight',
    scrollTo: {
      behavior: 'smooth',
      block: 'center',
    },
    showCancelLink: true,
    tooltipClass: 'shepherd-tooltip',
    title: '',
    text: '',
  },
  useModalOverlay: true,
  Shepherd: {
    classes: 'shepherd-theme-arrows',
  },
};

export function ProductTour({ tourId, onComplete, onSkip, children }: ProductTourProps) {
  const tourRef = useRef<Tour | null>(null);
  const hasShownRef = useRef(false);

  useEffect(() => {
    // Check if tour has already been shown and completed
    const completedTours = JSON.parse(
      localStorage.getItem('tilo-completed-tours') || '[]'
    );

    if (completedTours.includes(tourId) || hasShownRef.current) {
      return;
    }

    // Auto-show tour after a short delay
    const timer = setTimeout(() => {
      // Only auto-show on first visit
      hasShownRef.current = true;

      // Check if element exists before starting tour
      const firstStepElement = document.querySelector('[data-tour]');
      if (firstStepElement) {
        tourRef.current?.start();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [tourId]);

  const handleTourComplete = () => {
    // Mark tour as completed in localStorage
    const completedTours = JSON.parse(
      localStorage.getItem('tilo-completed-tours') || '[]'
    );

    if (!completedTours.includes(tourId)) {
      completedTours.push(tourId);
      localStorage.setItem('tilo-completed-tours', JSON.stringify(completedTours));
    }

    onComplete?.();
  };

  const handleTourCancel = () => {
    onSkip?.();
  };

  return (
    <>
      {children}
      <style>{`
        .tilo-tour {
          --shepherd-color-primary: hsl(var(--primary));
          --shepherd-color-secondary: hsl(var(--muted));
          --shepherd-color-text: hsl(var(--foreground));
          --shepherd-color-border: hsl(var(--border));
          --shepherd-color-bg: hsl(var(--background));
        }

        .tilo-tour .shepherd-text {
          color: hsl(var(--foreground));
        }

        .tilo-tour .shepherd-button {
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .tilo-tour .shepherd-button-primary {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border: none;
        }

        .tilo-tour .shepherd-button-primary:hover {
          opacity: 0.9;
        }

        .tilo-tour .shepherd-button-secondary {
          background-color: hsl(var(--muted));
          color: hsl(var(--muted-foreground));
          border: 1px solid hsl(var(--border));
        }

        .tilo-tour .shepherd-button-secondary:hover {
          background-color: hsl(var(--accent));
        }

        .tilo-tour .shepherd-header {
          padding: 16px 16px 0;
        }

        .tilo-tour .shepherd-title {
          font-size: 18px;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .tilo-tour .shepherd-content {
          padding: 16px;
        }

        .tilo-tour .shepherd-footer {
          padding: 0 16px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tilo-tour .shepherd-cancel-icon {
          color: hsl(var(--muted-foreground));
        }

        .tilo-tour .shepherd-cancel-icon:hover {
          color: hsl(var(--foreground));
        }

        .shepherd-modal-mask-container {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
        }

        .shepherd-highlight {
          border-radius: 8px;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </>
  );
}

// Hook to manually trigger a tour
export function useProductTour(tourId: string) {
  const startTour = () => {
    // This would be implemented with Shepherd instance
    console.log('Starting tour:', tourId);
  };

  const resetTour = () => {
    // Remove tour from completed list
    const completedTours = JSON.parse(
      localStorage.getItem('tilo-completed-tours') || '[]'
    );
    const updated = completedTours.filter((id: string) => id !== tourId);
    localStorage.setItem('tilo-completed-tours', JSON.stringify(updated));
  };

  return { startTour, resetTour };
}
