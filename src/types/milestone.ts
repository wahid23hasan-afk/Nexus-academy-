export type MilestoneType = 'xp' | 'streak' | 'badge' | 'level' | 'goal' | 'custom';

export interface MilestoneNotification {
  id: string;
  type: MilestoneType;
  title: string;
  value: string | number;
  description: string;
  icon?: string;
  badgeType?: string;
  colorTheme?: 'green' | 'amber' | 'purple' | 'cyan' | 'rose';
  soundEnabled?: boolean;
  actionLabel?: string;
  actionUrl?: string;
  createdAt: number;
}
