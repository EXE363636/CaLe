import { motion } from 'framer-motion';
import { Star, Award, Clock, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { cn } from '../../utils/helpers';
import type { Worker, ApplicationStatus } from '../../types';

interface WorkerCardProps {
  worker: Worker;
  applicationStatus?: ApplicationStatus;
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onViewProfile?: () => void;
  onMarkPresent?: () => void;
  onMarkAbsent?: () => void;
  compact?: boolean;
}

export function WorkerCard({
  worker,
  applicationStatus,
  showActions = true,
  onApprove,
  onReject,
  onViewProfile,
  onMarkPresent,
  onMarkAbsent,
  compact = false,
}: WorkerCardProps) {
  return (
    <Card padding={compact ? 'sm' : 'md'} className="group">
      <div className="flex items-start gap-4">
        <Avatar name={worker.name} size={compact ? 'lg' : 'xl'} />

        <div className="flex-1 min-w-0">
          {/* Name and rating */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{worker.name}</h4>
            {worker.verified && (
              <span className="text-info-500">
                <Award className="w-4 h-4" />
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-warning-400 fill-warning-400" />
              <span className="font-medium">{worker.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({worker.completedShifts} ca)</span>
            </div>
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4 text-primary-400" />
              <span className="font-medium">{worker.reputationScore}</span>
              <span className="text-xs text-gray-400">uy tín</span>
            </div>
          </div>

          {/* Status badge */}
          {applicationStatus && (
            <StatusBadge
              variant={
                applicationStatus === 'approved' || applicationStatus === 'checked_in' || applicationStatus === 'confirmed_present'
                  ? 'green'
                  : applicationStatus === 'applied'
                  ? 'blue'
                  : applicationStatus === 'absent'
                  ? 'red'
                  : 'amber'
              }
              size="sm"
            >
              {applicationStatus === 'applied' && 'Chờ duyệt'}
              {applicationStatus === 'approved' && 'Đã duyệt'}
              {applicationStatus === 'checked_in' && 'Đã check-in'}
              {applicationStatus === 'confirmed_present' && 'Đã xác nhận có mặt'}
              {applicationStatus === 'waiting_checkout' && 'Chờ check-out'}
              {applicationStatus === 'absent' && 'Vắng mặt'}
            </StatusBadge>
          )}

          {/* Warning flags */}
          <div className="flex items-center gap-3 mt-2">
            {worker.absences > 0 && (
              <span className="flex items-center gap-1 text-xs text-danger-600">
                <AlertCircle className="w-3 h-3" />
                {worker.absences} vắng mặt
              </span>
            )}
            {worker.disputes > 0 && (
              <span className="flex items-center gap-1 text-xs text-warning-600">
                <AlertCircle className="w-3 h-3" />
                {worker.disputes} tranh chấp
              </span>
            )}
          </div>

          {/* Skills preview */}
          <div className="flex flex-wrap gap-1 mt-2">
            {worker.skills.slice(0, 4).map(skill => (
              <span
                key={skill.id}
                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
              >
                {skill.name}
              </span>
            ))}
            {worker.skills.length > 4 && (
              <span className="px-2 py-0.5 text-xs text-gray-400">
                +{worker.skills.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex flex-col gap-2">
            {applicationStatus === 'applied' && (
              <>
                <Button size="sm" onClick={onApprove}>
                  Duyệt
                </Button>
                <Button variant="ghost" size="sm" onClick={onReject}>
                  Từ chối
                </Button>
              </>
            )}
            {applicationStatus === 'approved' && (
              <>
                <Button variant="outline" size="sm" onClick={onMarkPresent}>
                  Đánh dấu có mặt
                </Button>
                <Button variant="ghost" size="sm" onClick={onReject}>
                  Vắng mặt
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onViewProfile}>
              Xem hồ sơ
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
