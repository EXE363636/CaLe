import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { mockApplications, mockScheduleSlots } from '../../data/mockData';
import { formatDate, getDayName } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export function WorkerSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [slotType, setSlotType] = useState<'available' | 'busy'>('available');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

  // Generate calendar days
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Events for the current view
  const approvedShifts = mockApplications.filter(app => app.status === 'approved');
  const pendingShifts = mockApplications.filter(app => app.status === 'applied');

  return (
    <AppShell>
      <PageHeader
        title="Lịch cá nhân"
        subtitle="Quản lý lịch rảnh và xem ca đã đăng ký"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Thêm lịch trình
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900 capitalize">{monthName}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {days.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, idx) => {
              const isToday = day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasApproved = approvedShifts.some(app => app.shift.date === dateStr);
              const hasPending = pendingShifts.some(app => app.shift.date === dateStr);
              const hasAvailable = mockScheduleSlots.some(s => s.date === dateStr && s.type === 'available');
              const hasBusy = mockScheduleSlots.some(s => s.date === dateStr && s.type === 'busy');

              return (
                <div
                  key={idx}
                  className={cn(
                    'aspect-square p-1 rounded-lg relative',
                    day ? 'hover:bg-gray-50 cursor-pointer' : ''
                  )}
                >
                  {day && (
                    <>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isToday ? 'text-primary-600' : 'text-gray-900'
                        )}
                      >
                        {day}
                      </span>
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {hasApproved && <span className="w-1.5 h-1.5 rounded-full bg-success-500" />}
                        {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />}
                        {hasAvailable && <span className="w-1.5 h-1.5 rounded-full bg-info-500" />}
                        {hasBusy && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-gray-100">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-info-500" />
              Lịch rảnh
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-gray-400" />
              Lịch bận
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-success-500" />
              Ca đã duyệt
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-warning-500" />
              Ca chờ duyệt
            </span>
          </div>
        </Card>

        {/* Sidebar - Upcoming Shifts */}
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Ca sắp tới</h3>

            {approvedShifts.length > 0 ? (
              <div className="space-y-3">
                {approvedShifts.slice(0, 4).map(app => (
                  <div
                    key={app.id}
                    className="p-3 rounded-xl bg-success-50 border border-success-100"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{app.shift.title}</h4>
                      <StatusBadge variant="green" size="sm">Đã duyệt</StatusBadge>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getDayName(app.shift.date)}, {app.shift.startTime}-{app.shift.endTime}
                      </p>
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {app.shift.location.split(',')[0]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                Không có ca sắp tới
              </div>
            )}
          </Card>

          {/* Suggested Jobs */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Gợi ý theo lịch rảnh</h3>
            <p className="text-sm text-gray-500 mb-4">
              Thêm lịch rảnh để nhận gợi ý ca phù hợp
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
              Thêm lịch rảnh
            </Button>
          </Card>
        </div>
      </div>

      {/* Add Schedule Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm lịch trình của bạn"
        size="md"
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Bạn có thể thêm khoảng thời gian rảnh để hệ thống gợi ý ca phù hợp, hoặc thêm lịch bận để tránh trùng lịch.
          </p>

          {/* Slot Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSlotType('available')}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                slotType === 'available'
                  ? 'border-info-500 bg-info-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <CheckCircle2 className={cn('w-6 h-6 mb-2', slotType === 'available' ? 'text-info-600' : 'text-gray-400')} />
              <h4 className="font-semibold text-gray-900">Lịch rảnh</h4>
              <p className="text-xs text-gray-500 mt-1">Nhận gợi ý ca phù hợp</p>
            </button>
            <button
              onClick={() => setSlotType('busy')}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                slotType === 'busy'
                  ? 'border-gray-500 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <AlertCircle className={cn('w-6 h-6 mb-2', slotType === 'busy' ? 'text-gray-600' : 'text-gray-400')} />
              <h4 className="font-semibold text-gray-900">Lịch bận</h4>
              <p className="text-xs text-gray-500 mt-1">Tránh trùng lịch</p>
            </button>
          </div>

          {/* Date and Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bắt đầu</label>
                <input
                  type="time"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kết thúc</label>
                <input
                  type="time"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
              Hủy
            </Button>
            <Button className="flex-1" onClick={() => setShowAddModal(false)}>
              Lưu lịch trình
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
