import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Crown, Sparkles } from 'lucide-react';
import { subscriptionApi } from '@/api/endpoints/subscription.api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

const BILLING_ROLES = ['owner', 'super_admin'];

export function SubscriptionBadge() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const canSeeBilling = user?.role && BILLING_ROLES.includes(user.role);

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.get,
    enabled: !!canSeeBilling,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!canSeeBilling || !subscription) return null;

  const { plan, status, daysRemaining, isTrialActive } = subscription;

  let label: string;
  let badgeClass: string;
  let Icon = Sparkles;

  if (isTrialActive && status === 'trial') {
    label = `Trial · ${daysRemaining} hari`;
    badgeClass = 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50';
  } else if (plan === 'premium' && status === 'active') {
    label = 'Premium';
    badgeClass = 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30';
    Icon = Crown;
  } else {
    label = 'Free';
    badgeClass = 'bg-muted text-muted-foreground hover:bg-muted/80';
  }

  return (
    <button
      onClick={() => navigate('/app/subscription')}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer',
        badgeClass,
      )}
      title="Kelola langganan"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
