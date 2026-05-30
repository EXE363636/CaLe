import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  AlertTriangle,
  Flag,
  Shield,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { mockDisputes, mockWorkers, mockShifts } from '../../data/mockData';
import { formatDate, formatRelativeTime } from '../../utils/helpers';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = {
    totalUsers: mockWorkers.length + 1,
    activeShifts: mockShifts.filter(s => s.status === 'recruiting' || s.status === 'in_progress').length,
    disputes: mockDisputes.length,
    reports: 3,
    verificationPending: 5,
  };

  return (
    <AppShell>
      <PageHeader
        title="Tổng quan Admin"
        subtitle="Quản lý và giám sát hệ thống CaLẻ / Now"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Người dùng"
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Ca đang hoạt động"
          value={stats.activeShifts}
          icon={<Briefcase className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Tranh chấp"
          value={stats.disputes}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Báo cáo"
          value={stats.reports}
          icon={<Flag className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Chờ xác minh"
          value={stats.verificationPending}
          icon={<Shield className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'disputes', label: 'Tranh chấp', count: mockDisputes.length },
            { id: 'users', label: 'Người dùng' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dispute Queue */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tranh chấp mới</h3>
              <Link to="/admin/disputes">
                <Button variant="ghost" size="sm">Xem tất cả</Button>
              </Link>
            </div>

            <div className="space-y-4">
              {mockDisputes.map(dispute => (
                <motion.div
                  key={dispute.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-danger-50 border border-danger-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{dispute.shift.title}</h4>
                      <p className="text-sm text-gray-600">
                        {dispute.worker.name} vs {dispute.employer.businessName}
                      </p>
                    </div>
                    <StatusBadge variant="red" size="sm" dot>
                      Chờ xử lý
                    </StatusBadge>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">{dispute.reason}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Số tiền: {dispute.amount.toLocaleString('vi-VN')}₫
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Verification Queue */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Xác minh chờ xử lý</h3>
                <span className="px-2 py-1 rounded-full bg-warning-100 text-warning-700 text-xs font-medium">
                  {stats.verificationPending} chờ
                </span>
              </div>

              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Người dùng {i}</p>
                      <p className="text-xs text-gray-500">CCCD/CMND</p>
                    </div>
                    <Button variant="outline" size="sm">Xem</Button>
                  </div>
                ))}
              </div>

              <Link to="/admin/verification">
                <Button variant="ghost" className="w-full mt-4">
                  Xem tất cả
                </Button>
              </Link>
            </Card>

            {/* Reported Reviews */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Đánh giá bị báo cáo</h3>
                <span className="px-2 py-1 rounded-full bg-danger-100 text-danger-700 text-xs font-medium">
                  {stats.reports} báo cáo
                </span>
              </div>

              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-gray-900 text-sm">Báo cáo {i}</p>
                      <StatusBadge variant="amber" size="sm">Đang xem</StatusBadge>
                    </div>
                    <p className="text-xs text-gray-500">Nội dung không phù hợp</p>
                    <p className="text-xs text-gray-400 mt-1">2 giờ trước</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Activity */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
              <div className="space-y-3">
                {[
                  { icon: Users, text: 'Người dùng mới đăng ký', time: '10 phút' },
                  { icon: Briefcase, text: 'Ca mới được tạo', time: '25 phút' },
                  { icon: AlertTriangle, text: 'Tranh chấp mới', time: '1 giờ' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <item.icon className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.text}</p>
                      <p className="text-xs text-gray-500">{item.time} trước</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'disputes' && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Danh sách tranh chấp</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">Ca làm</th>
                  <th className="pb-3 font-medium">Người làm</th>
                  <th className="pb-3 font-medium">Nhà tuyển dụng</th>
                  <th className="pb-3 font-medium">Số tiền</th>
                  <th className="pb-3 font-medium">Trạng thái</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockDisputes.map(dispute => (
                  <tr key={dispute.id} className="text-sm">
                    <td className="py-4">{dispute.shift.title}</td>
                    <td className="py-4">{dispute.worker.name}</td>
                    <td className="py-4">{dispute.employer.businessName}</td>
                    <td className="py-4 font-medium">{dispute.amount.toLocaleString('vi-VN')}₫</td>
                    <td className="py-4">
                      <StatusBadge variant="red" size="sm" dot>
                        Chờ xử lý
                      </StatusBadge>
                    </td>
                    <td className="py-4">
                      <Button variant="outline" size="sm">Xử lý</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'users' && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Danh sách người dùng</h3>
          <div className="space-y-4">
            {mockWorkers.map(worker => (
              <div key={worker.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{worker.name}</p>
                  <p className="text-sm text-gray-500">{worker.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge variant={worker.verified ? 'green' : 'gray'} size="sm">
                    {worker.verified ? 'Đã xác minh' : 'Chưa xác minh'}
                  </StatusBadge>
                  <Button variant="ghost" size="sm">Chi tiết</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
}

// Import useState at the top
import { useState } from 'react';
