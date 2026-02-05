import { useEffect } from 'react';
import 'shepherd.js/dist/css/shepherd.css';

interface ProductTourProps {
  tourId: string;
  onComplete?: () => void;
  onSkip?: () => void;
  children?: React.ReactNode;
}

/**
 * ProductTour component provides styling and tour completion tracking.
 * Actual tour implementation should use Shepherd.js directly in pages.
 */
export function ProductTour({ tourId, children }: ProductTourProps) {
  useEffect(() => {
    // Check if tour has already been shown and completed
    const completedTours = JSON.parse(
      localStorage.getItem('tilo-completed-tours') || '[]'
    );

    if (completedTours.includes(tourId)) {
      return;
    }

    // Tours will be implemented with Shepherd.js in individual pages
    // This component mainly provides the global styling
  }, [tourId]);

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
          justify-content: flex-end;
          gap: 8px;
        }

        .tilo-tour .shepherd-modal-overlay-container {
          background-color: rgba(0, 0, 0, 0.5);
        }

        .tilo-tour.shepherd-element {
          background-color: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          max-width: 400px;
        }

        .tilo-tour .shepherd-arrow::before {
          background-color: hsl(var(--background));
          border: 1px solid hsl(var(--border));
        }

        .tilo-tour .shepherd-cancel-icon {
          color: hsl(var(--muted-foreground));
        }

        .tilo-tour .shepherd-cancel-icon:hover {
          color: hsl(var(--foreground));
        }

        .shepherd-highlight {
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
          border-radius: 4px;
        }
      `}</style>
    </>
  );
}

/**
 * Hook to mark a tour as completed
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTourCompletion(tourId: string) {
  const markCompleted = () => {
    const completedTours = JSON.parse(
      localStorage.getItem('tilo-completed-tours') || '[]'
    );

    if (!completedTours.includes(tourId)) {
      completedTours.push(tourId);
      localStorage.setItem('tilo-completed-tours', JSON.stringify(completedTours));
    }
  };

  const isCompleted = () => {
    const completedTours = JSON.parse(
      localStorage.getItem('tilo-completed-tours') || '[]'
    );
    return completedTours.includes(tourId);
  };

  return { markCompleted, isCompleted };
}
