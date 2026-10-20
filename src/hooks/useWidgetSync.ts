import { useEffect, useMemo } from 'react';
import { getSplitTemplate } from '@/src/domain/catalog';
import { buildWidgetSnapshot } from '@/src/domain/widgetSnapshot';
import { syncWidgets } from '@/src/widgets/sync';
import { useTrainingHistory } from './useAnalytics';
import { useAuth } from './useAuth';
import { useActivePlan } from './usePlans';
import { useProfileStats } from './useSessions';

/**
 * Keeps the home-screen widgets in step with the app. Runs once at the root, so
 * a finished workout, a new plan or signing out redraws them straight away.
 * Writes only when what the widgets show changes, not on every refetch.
 */
export function useWidgetSync() {
  const { user, loading } = useAuth();
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const { data: stats } = useProfileStats();
  const { data: history } = useTrainingHistory();

  const snapshot = useMemo(() => {
    if (loading || (user && planLoading)) return null;
    const programName = plan ? (plan.template_id === 'custom' ? plan.name : getSplitTemplate(plan.template_id)?.name ?? plan.name) : null;
    return buildWidgetSnapshot({
      signedIn: Boolean(user),
      plan: plan ?? null,
      programName,
      dayIndex: stats?.current_day_index ?? 0,
      streak: stats?.current_streak ?? 0,
      sessions: history ?? [],
      now: new Date(),
    });
  }, [loading, user, planLoading, plan, stats, history]);

  // Compare without the timestamp, which changes every render.
  const key = snapshot ? JSON.stringify({ ...snapshot, updatedAt: '' }) : null;
  useEffect(() => {
    if (snapshot) void syncWidgets(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
