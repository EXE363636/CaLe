import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Award,
  Star,
  Briefcase,
  Wallet,
  Calendar,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Flag,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Progress } from '../../components/ui/Progress';
import { Avatar } from '../../components/ui/Avatar';
import { Tabs } from '../../components/ui/Tabs';
import { WalletCard } from '../../components/shared/WalletCard';
import { SkillsGrid } from '../../components/shared/SkillCard';
import { ReviewsList } from '../../components/shared/ReviewCard';
import { mockWorker, mockReviews, mockTransactions, mockReputationChanges } from '../../data/mockData';
import { formatCurrency, formatRelativeTime, getReputationLevel } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

const sortOptions = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'oldest', label: 'Cũ nhất' },
  { id: 'highest', label: 'Điểm cao nhất' },
  { id: 'lowest', label: 'Điểm thấp nhất' },
];

export function WorkerProfilePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewSort, setReviewSort] = useState('newest');
  const [showReputationModal, setShowReputationModal] = useState(false);

  const worker = mockWorker;
  const reputationLevel = getReputationLevel(worker.reputationScore);
  const receivedReviews = mockReviews.filter(r => r.targetId === worker.id);

  return (
    <AppShell>
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 -mt-6 pt-6 pb-8 mb-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white/95 backdrop-blur">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar name={worker.name} size="xl" className="w-20 h-20 text-2xl" />

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{worker.name}</h1>
                  {worker.verified && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-success-100 text-success-700 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã xác minh
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-3">{worker.email}</p>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <button
                    onClick={() => setShowReputationModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors"
                  >
                    <Award className="w-4 h-4 text-primary-600" />
                    <span className={cn('font-semibold', reputationLevel.color)}>
                      {worker.reputationScore} uy tín
                    </span>
                    <span className="text-gray-500">• {reputationLevel.level}</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning-400 fill-warning-400" />
                    <span className="font-semibold">{worker.rating}</span>
                    <span className="text-gray-500">/ 5</span>
                  </span>
                  <span className="flex items-center gap-1 text-gray-600">
                    <Briefcase className="w-4 h-4" />
                    {worker.completedShifts} ca
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline">
                  Chỉnh sửa hồ sơ
                </Button>
                <Button>
                  Xem ví
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'reviews', label: 'Đánh giá', count: receivedReviews.length },
            { id: 'skills', label: 'Kỹ năng' },
            { id: 'wallet', label: 'Ví' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Thông tin cá nhân</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Họ và tên</p>
                  <p className="font-medium text-gray-900">{worker.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{worker.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Số điện thoại</p>
                  <p className="font-medium text-gray-900">{worker.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ngày tham gia</p>
                  <p className="font-medium text-gray-900">{worker.createdAt}</p>
                </div>
              </div>
            </Card>

            {/* Reviews Preview */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Đánh giá gần đây</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('reviews')}
                >
                  Xem tất cả
                </Button>
              </div>
              <ReviewsList reviews={receivedReviews.slice(0, 2)} showReportButton={false} />
            </Card>

            {/* Skills Preview */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Kỹ năng của bạn</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('skills')}
                >
                  Xem tất cả
                </Button>
              </div>
              <SkillsGrid skills={worker.skills.slice(0, 4)} compact />
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Verification Status */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Trạng thái xác minh</h3>
              <div className="space-y-3">
                {[
                  { label: 'Email', verified: true },
                  { label: 'Số điện thoại', verified: true },
                  { label: 'CCCD/CMND', verified: worker.verified },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <StatusBadge variant={item.verified ? 'green' : 'amber'} size="sm">
                      {item.verified ? 'Đã xác minh' : 'Chưa xác minh'}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Statistics */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Thống kê</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ca đã hoàn thành</span>
                  <span className="font-semibold text-gray-900">{worker.completedShifts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vắng mặt</span>
                  <span className={cn('font-semibold', worker.absences > 0 ? 'text-danger-600' : 'text-gray-900')}>
                    {worker.absences}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tranh chấp</span>
                  <span className={cn('font-semibold', worker.disputes > 0 ? 'text-warning-600' : 'text-gray-900')}>
                    {worker.disputes}
                  </span>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <User className="w-4 h-4 mr-2" />
                  Chỉnh sửa hồ sơ
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  Cập nhật xác minh
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Xem cách tăng uy tín
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900">Đánh giá từ nhà tuyển dụng</h3>
                <select
                  value={reviewSort}
                  onChange={(e) => setReviewSort(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  {sortOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <ReviewsList reviews={receivedReviews} />
            </Card>
          </div>
          <div>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Tổng quan đánh giá</h3>
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-gray-900">{worker.rating}</div>
                <div className="flex items-center justify-center gap-1 my-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      className={cn(
                        'w-5 h-5',
                        i <= Math.floor(worker.rating)
                          ? 'text-warning-400 fill-warning-400'
                          : 'text-gray-300'
                      )}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500">{receivedReviews.length} đánh giá</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-4">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-6">Kỹ năng của bạn</h3>
              <SkillsGrid skills={worker.skills} />
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Lịch sử giao dịch</h3>
              <div className="divide-y divide-gray-100">
                {mockTransactions.map(tx => (
                  <div key={tx.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{tx.type}</p>
                        <p className="text-sm text-gray-500">{tx.timestamp}</p>
                      </div>
                      <span className={cn(
                        'font-semibold',
                        tx.amount > 0 ? 'text-success-600' : 'text-danger-600'
                      )}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div>
            <WalletCard
              balance={worker.walletBalance}
              onTopUp={() => {}}
              onWithdraw={() => {}}
            />
          </div>
        </div>
      )}

      {/* Reputation Modal */}
      <Modal
        isOpen={showReputationModal}
        onClose={() => setShowReputationModal(false)}
        title="Điểm uy tín"
        size="lg"
      >
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-primary-50 to-cream-100 rounded-xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{worker.reputationScore}/100</h3>
              <p className={cn('font-medium', reputationLevel.color)}>{reputationLevel.level}</p>
              <p className="text-sm text-gray-500 mt-2">
                Điểm tốt — bạn được ưu tiên xét duyệt và mở rộng hạn mức hủy ca.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-2xl font-bold text-gray-900">{worker.completedShifts}</p>
              <p className="text-sm text-gray-500">Ca đã hoàn thành</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className="text-2xl font-bold text-gray-900">{receivedReviews.length}</p>
              <p className="text-sm text-gray-500">Đánh giá đã nhận</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className={cn('text-2xl font-bold', worker.absences > 0 ? 'text-danger-600' : 'text-gray-900')}>
                {worker.absences}
              </p>
              <p className="text-sm text-gray-500">Vắng mặt</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <p className={cn('text-2xl font-bold', worker.disputes > 0 ? 'text-warning-600' : 'text-gray-900')}>
                {worker.disputes}
              </p>
              <p className="text-sm text-gray-500">Tranh chấp</p>
            </div>
          </div>

          {/* History */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Lịch sử thay đổi điểm</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {mockReputationChanges.map(change => (
                <div key={change.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <span className={cn(
                    'inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold',
                    change.points > 0 ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                  )}>
                    {change.points > 0 ? '+' : ''}{change.points}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{change.reason}</p>
                    {change.shiftTitle && (
                      <p className="text-sm text-gray-600">Ca: {change.shiftTitle}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{change.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
