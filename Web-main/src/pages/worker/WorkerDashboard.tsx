import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Calendar,
  Wallet,
  User,
  Star,
  TrendingUp,
  Clock,
  MapPin,
  ChevronRight,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { StatCard } from '../../components/ui/StatCard';
import { Avatar } from '../../components/ui/Avatar';
import { ShiftCard } from '../../components/shared/ShiftCard';
import { WalletCard, TransactionItem } from '../../components/shared/WalletCard';
import { SkillCard } from '../../components/shared/SkillCard';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, getDayName } from '../../utils/helpers';
import { mockWorker, mockShifts, mockApplications, mockTransactions } from '../../data/mockData';

export function WorkerDashboard() {
  const { userRole } = useApp();
  const worker = mockWorker;

  const upcomingShifts = mockApplications
    .filter(app => app.status === 'approved' || app.status === 'checked_in')
    .slice(0, 3);

  const appliedJobs = mockApplications
    .filter(app => app.status === 'applied' || app.status === 'rejected')
    .slice(0, 3);

  const recommendedJobs = mockShifts
    .filter(shift => shift.status === 'recruiting')
    .slice(0, 4);

  return (
    <AppShell>
      <PageHeader
        title={`Xin chào, ${worker.name}`}
        subtitle="Tổng quan hoạt động của bạn trên CaLẻ"
        actions={
          <Link to="/worker/jobs">
            <Button>
              Tìm ca làm ngay
            </Button>
          </Link>
        }
      />

      {/* Welcome Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Điểm uy tín"
          value={worker.reputationScore}
          suffix="/100"
          icon={<Award className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Số dư ví"
          value={worker.walletBalance / 1000}
          suffix="K"
          prefix="₫"
          icon={<Wallet className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Ca đã hoàn thành"
          value={worker.completedShifts}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Đánh giá trung bình"
          value={worker.rating}
          suffix=" / 5"
          icon={<Star className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Briefcase, label: 'Tìm ca làm', path: '/worker/jobs', color: 'bg-primary-100 text-primary-600' },
          { icon: Calendar, label: 'Xem lịch', path: '/worker/schedule', color: 'bg-success-100 text-success-600' },
          { icon: Wallet, label: 'Xem ví', path: '/worker/wallet', color: 'bg-info-100 text-info-600' },
          { icon: User, label: 'Hồ sơ', path: '/worker/profile', color: 'bg-warning-100 text-warning-600' },
        ].map((action, idx) => (
          <Link key={idx} to={action.path}>
            <Card hover className="text-center">
              <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-3`}>
                <action.icon className="w-6 h-6" />
              </div>
              <p className="font-medium text-gray-900">{action.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Shifts */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ca sắp tới</h3>
              <Link to="/worker/schedule" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {upcomingShifts.length > 0 ? (
              <div className="space-y-3">
                {upcomingShifts.map(app => (
                  <div key={app.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{app.shift.title}</h4>
                        <StatusBadge
                          variant={app.status === 'checked_in' ? 'green' : 'orange'}
                          size="sm"
                        >
                          {app.status === 'checked_in' ? 'Đã check-in' : 'Đã duyệt'}
                        </StatusBadge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{app.shift.employer.businessName}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {getDayName(app.shift.date)}, {formatDate(app.shift.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {app.shift.startTime} - {app.shift.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {app.shift.location.split(',')[0]}
                        </span>
                      </div>

                      {/* Attendance state message */}
                      {app.status === 'checked_in' && (
                        <div className="mt-2 p-2 rounded-lg bg-success-50 text-sm text-success-700">
                          Bạn đã check-in. Vui lòng chờ đến giờ bắt đầu ca.
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">{formatCurrency(app.shift.hourlyWage)}/giờ</p>
                      <Link to={`/worker/shift/${app.shift.id}`}>
                        <Button variant="outline" size="sm" className="mt-2">
                          Xem chi tiết
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Không có ca sắp tới</p>
              </div>
            )}
          </Card>

          {/* Applied Jobs */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Đã ứng tuyển</h3>
            </div>

            {appliedJobs.length > 0 ? (
              <div className="space-y-3">
                {appliedJobs.map(app => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                      <div>
                        <h4 className="font-medium text-gray-900">{app.shift.title}</h4>
                        <p className="text-xs text-gray-500">{app.shift.employer.businessName}</p>
                      </div>
                      <StatusBadge
                        variant={app.status === 'applied' ? 'blue' : 'red'}
                        size="sm"
                      >
                        {app.status === 'applied' ? 'Chờ phản hồi' : 'Bị từ chối'}
                      </StatusBadge>
                    </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Chưa ứng tuyển ca nào</p>
              </div>
            )}
          </Card>

          {/* Recommended Jobs */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Gợi ý theo lịch rảnh và kỹ năng</h3>
              <Link to="/worker/jobs" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {recommendedJobs.map(shift => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  showMatchScore
                  matchScore={Math.floor(Math.random() * 30) + 70}
                  compact
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet Preview */}
          <WalletCard
            balance={worker.walletBalance}
            onTopUp={() => {}}
            onWithdraw={() => {}}
          />

          {/* Recent Transactions */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Giao dịch gần đây</h3>
            <div className="divide-y divide-gray-100">
              {mockTransactions.slice(0, 4).map(tx => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </div>
          </Card>

          {/* Skill Progression */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Kỹ năng</h3>
              <Link to="/worker/profile" className="text-sm text-primary-600">
                Xem tất cả
              </Link>
            </div>
            <div className="space-y-4">
              {worker.skills.slice(0, 3).map(skill => (
                <SkillCard key={skill.id} skill={skill} compact />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
