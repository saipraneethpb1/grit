import { useAuth } from './useAuth';
import { useProfileStats } from './useSessions';

export function useDisplayName(): string {
  const { user } = useAuth();
  const { data: stats } = useProfileStats();

  return (
    stats?.display_name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Athlete'
  );
}
