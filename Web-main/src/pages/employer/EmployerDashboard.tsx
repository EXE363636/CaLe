import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Calendar,
  Wallet,
  Users,
  Star,
  Plus,
  CheckCircle2,
  Bell,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { WorkerCard } from '../../components/shared/WorkerCard';
import { WalletCard, TransactionItem } from '../../components/shared/WalletCard';
import { mockEmployer, mockShifts, mockApplications, mockWorkers, mockTransactions } from '../../data/mockData';
import { formatCurrency, formatDate, getDayName } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

export function EmployerDashboard() {
  const employer = mockEmployer;
  const activeShifts = mockShifts.filter(s => s.employerId === employer.id && (s.status === 'recruiting' || s.status === 'in_progress'));
  const pendingApplications = mockApplications.filter(app => app.status === 'applied');

  return (
    <AppShell>
      <PageHeader
        title={`Xin chào, ${employer.businessName}`}
        subtitle="Tổng quan hoạt động tuyển dụng"
        actions={
          <Link to="/employer/create-shift">
            <Button icon={<Plus className="w-4 h-4" />}>
              Đăng ca cần tuyển
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Số dư ví"
          value={employer.walletBalance / 1000000}
          suffix=" triệu"
          icon={<Wallet className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Ca đang tuyển"
          value={activeShifts.length}
          icon={<Briefcase className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Đơn chờ duyệt"
          value={pendingApplications.length}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Đã hoàn thành"
          value={employer.completedShifts}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Đánh giá"
          value={employer.rating}
          suffix=" / 5"
          icon={<Star className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Plus, label: 'Đăng ca', path: '/employer/create-shift', color: 'bg-primary-100 text-primary-600' },
          { icon: Users, label: 'Quản lý ứng viên', path: '/employer/shifts', color: 'bg-info-100 text-info-600' },
          { icon: Calendar, label: 'Xem lịch tuyển', path: '/employer/schedule', color: 'bg-success-100 text-success-600' },
          { icon: Wallet, label: 'Nạp tiền ví', path: '/employer/wallet', color: 'bg-warning-100 text-warning-600' },
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

      {/* Alerts */}
      <Card className="mb-6 bg-warning-50 border-warning-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">Ca sắp bắt đầu</p>
            <p className="text-sm text-gray-600">
              "Phục vụ quán cà phê cuối tuần" sẽ bắt đầu trong 30 phút. 1 người đã check-in.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Shifts */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ca đang hoạt động</h3>
              <Link to="/employer/shifts" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {activeShifts.slice(0, 3).map(shift => (
                <div key={shift.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{shift.title}</h4>
                      <StatusBadge
                        variant={shift.status === 'in_progress' ? 'green' : 'blue'}
                        size="sm"
                      >
                        {shift.status === 'in_progress' ? 'Đang diễn ra' : 'Đang tuyển'}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {getDayName(shift.date)}, {formatDate(shift.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {shift.startTime} - {shift.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Users className="w-3 h-3" />
                        {shift.approvedWorkers}/{shift.requiredWorkers} người đã duyệt
                      </span>
                      <span className={cn(
                        'flex items-center gap-1',
                        shift.approvedWorkers === shift.requiredWorkers
                          ? 'text-success-600'
                          : 'text-warning-600'
                      )}>
                        {shift.approvedWorkers === shift.requiredWorkers ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {shift.approvedWorkers === shift.requiredWorkers
                          ? 'Đủ người'
                          : `Còn thiếu ${shift.requiredWorkers - shift.approvedWorkers} người`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{formatCurrency(shift.hourlyWage)}/giờ</p>
                    <Link to={`/employer/shift/${shift.id}`}>
                      <Button variant="outline" size="sm" className="mt-2">
                        Xem chi tiết
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pending Applications */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Đơn chờ duyệt</h3>
              <span className="px-2 py-1 rounded-full bg-info-100 text-info-700 text-sm font-medium">
                {pendingApplications.length} đơn
              </span>
            </div>

            <div className="space-y-4">
              {mockApplications.slice(0, 3).map(app => (
                <WorkerCard
                  key={app.id}
                  worker={mockWorkers[0]}
                  applicationStatus="applied"
                  onApprove={() => {}}
                  onReject={() => {}}
                  onViewProfile={() => {}}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WalletCard
            balance={employer.walletBalance}
            onTopUp={() => {}}
            onWithdraw={() => {}}
          />

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Giao dịch gần đây</h3>
            <div className="divide-y divide-gray-100">
              {mockTransactions.slice(0, 4).map(tx => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </div>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Thông báo mới</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="p-2 rounded-lg bg-info-100">
                  <Users className="w-4 h-4 text-info-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Người làm mới ứng tuyển</p>
                  <p className="text-xs text-gray-500">Trần Thị Bình - Phục vụ quán cà phê</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="p-2 rounded-lg bg-success-100">
                  <CheckCircle2 className="w-4 h-4 text-success-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Người làm đã check-in</p>
                  <p className="text-xs text-gray-500">Nguyễn Văn An - Thu ngân ca tối</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
