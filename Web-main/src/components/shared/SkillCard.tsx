import { Card } from '../ui/Card';
import { Progress } from '../ui/Progress';
import { cn } from '../../utils/helpers';
import type { Skill } from '../../types';

interface SkillCardProps {
  skill: Skill;
  showProgress?: boolean;
  compact?: boolean;
}

const skillIcons: Record<string, string> = {
  'Phục vụ': '🍽️',
  'Pha chế': '☕',
  'Bốc xếp': '📦',
  'Kho vận': '🏪',
  'Sự kiện': '🎪',
  'Thu ngân': '💳',
  'Đóng gói': '📦',
  'Giao tiếp': '💬',
};

export function SkillCard({ skill, showProgress = true, compact = false }: SkillCardProps) {
  const icon = skillIcons[skill.name] || '⭐';

  return (
    <Card padding={compact ? 'sm' : 'md'} className={cn(compact && 'flex items-center gap-4')}>
      <div className={cn('flex items-center gap-3 mb-3', compact && 'mb-0')}>
        <span className={cn('text-2xl', compact && 'text-xl')}>{icon}</span>
        <div className="flex-1">
          <h4 className={cn('font-medium text-gray-900', compact ? 'text-sm' : 'text-base')}>
            {skill.name}
          </h4>
          <p className="text-xs text-gray-500">
            Cấp độ {skill.level} • {skill.xp}/{skill.maxXP} XP
          </p>
        </div>
      </div>

      {showProgress && !compact && (
        <>
          <Progress value={skill.xp} max={skill.maxXP} color="orange" size="md" />
          <p className="mt-2 text-xs text-gray-500">{skill.hint}</p>
        </>
      )}

      {showProgress && compact && (
        <Progress value={skill.xp} max={skill.maxXP} color="orange" size="sm" className="w-24" />
      )}
    </Card>
  );
}

interface SkillsGridProps {
  skills: Skill[];
  compact?: boolean;
}

export function SkillsGrid({ skills, compact = false }: SkillsGridProps) {
  return (
    <div className={cn(
      'grid gap-4',
      compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    )}>
      {skills.map(skill => (
        <SkillCard key={skill.id} skill={skill} compact={compact} />
      ))}
    </div>
  );
}
