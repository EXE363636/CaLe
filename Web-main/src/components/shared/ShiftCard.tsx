import { motion } from 'framer-motion';
import { MapPin, Clock, DollarSign, Users, Star, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate, getDayName, getMatchLabel } from '../../utils/helpers';
import { shiftStatusConfig } from '../../data/mockData';
import type { Shift, ApplicationStatus } from '../../types';
import { cn } from '../../utils/helpers';

interface ShiftCardProps {
  shift: Shift;
  showEmployer?: boolean;
  showMatchScore?: boolean;
  matchScore?: number;
  applicationStatus?: ApplicationStatus;
  showActions?: boolean;
  onApply?: () => void;
  compact?: boolean;
  workerView?: boolean;
}

const applicationStatusConfig: Record<ApplicationStatus, { label: string; color: 'blue' | 'orange' | 'green' | 'amber' | 'red' | 'gray' }> = {
  applied: { label: 'Đã ứng tuyển', color: 'blue' },
  approved: { label: 'Đã duyệt', color: 'green' },
  rejected: { label: 'Bị từ chối', color: 'red' },
  pending: { label: 'Chờ phản hồi', color: 'amber' },
  checked_in: { label: 'Đã check-in', color: 'green' },
  confirmed_present: { label: 'Đã xác nhận có mặt', color: 'green' },
  waiting_checkout: { label: 'Chờ check-out', color: 'amber' },
  waiting_completion: { label: 'Chờ xác nhận', color: 'amber' },
  absent: { label: 'Vắng mặt', color: 'red' },
  completed_worker: { label: 'Đã hoàn thành', color: 'green' },
};

export function ShiftCard({
  shift,
  showEmployer = true,
  showMatchScore = false,
  matchScore = 75,
  applicationStatus,
  showActions = true,
  onApply,
  compact = false,
  workerView = true,
}: ShiftCardProps) {
  const statusConfig = shiftStatusConfig[shift.status];
  const appConfig = applicationStatus ? applicationStatusConfig[applicationStatus] : null;
  const matchLabel = getMatchLabel(matchScore);

  return (
    <Card hover padding={compact ? 'sm' : 'md'} className="group">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-3">
            {showEmployer && (
              <Avatar name={shift.employer.businessName} size={compact ? 'md' : 'lg'} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{shift.title}</h3>
                {shift.employer.verified && (
                  <CheckCircle className="w-4 h-4 text-info-500 flex-shrink-0" />
                )}
              </div>
              {showEmployer && (
                <p className="text-sm text-gray-600 truncate">{shift.employer.businessName}</p>
              )}
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <StatusBadge variant={statusConfig.color} dot size="sm">
              {statusConfig.label}
            </StatusBadge>
            {appConfig && (
              <StatusBadge variant={appConfig.color} size="sm">
                {appConfig.label}
              </StatusBadge>
            )}
            {showMatchScore && workerView && !applicationStatus && (
              <span className={cn('text-xs px-2 py-1 rounded-full', matchLabel.color)}>
                {matchLabel.label}
              </span>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="truncate">{shift.location.split(',')[0]}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span>
                {getDayName(shift.date)}, {formatDate(shift.date)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span>{shift.startTime} - {shift.endTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Users className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span>
                {shift.approvedWorkers}/{shift.requiredWorkers} người
              </span>
            </div>
          </div>
        </div>

        {/* Right section - Wage & Actions */}
        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-4 lg:gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-300">
          <div className="text-right">
            <div className="flex items-center gap-1">
              <DollarSign className="w-5 h-5 text-primary-500" />
              <span className="text-xl font-bold text-primary-600">{formatCurrency(shift.hourlyWage)}</span>
            </div>
            <span className="text-xs text-gray-500">/giờ</span>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              <Link to={`/worker/shift/${shift.id}`}>
                <Button variant="outline" size="sm">
                  Chi tiết
                </Button>
              </Link>
              {workerView && !applicationStatus && shift.status === 'recruiting' && (
                <Button size="sm" onClick={onApply}>
                  Ứng tuyển
                </Button>
              )}
              {applicationStatus === 'applied' && (
                <Button variant="secondary" size="sm" disabled>
                  Đã ứng tuyển
                </Button>
              )}
              {applicationStatus === 'approved' && (
                <Link to={`/worker/shift/${shift.id}`}>
                  <Button variant="secondary" size="sm">
                    Xem ca làm
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
