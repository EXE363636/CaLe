import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Filter,
  X,
  ChevronDown,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ShiftCard } from '../../components/shared/ShiftCard';
import { mockShifts, mockApplications } from '../../data/mockData';
import { cn } from '../../utils/helpers';

export function FindJobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    area: '',
    date: '',
    time: '',
    minWage: '',
    jobType: '',
    matchSchedule: false,
  });
  const [sortBy, setSortBy] = useState('relevance');

  // Filter out jobs that worker already applied to
  const appliedShiftIds = mockApplications
    .filter(app => app.status !== 'rejected')
    .map(app => app.shiftId);

  const availableJobs = mockShifts.filter(
    shift => shift.status === 'recruiting' && !appliedShiftIds.includes(shift.id)
  );

  const appliedJobs = mockApplications.map(app => ({
    ...app.shift,
    applicationStatus: app.status,
  }));

  const jobTypeOptions = [
    { value: '', label: 'Tất cả loại công việc' },
    { value: 'Phục vụ', label: 'Phục vụ' },
    { value: 'Pha chế', label: 'Pha chế' },
    { value: 'Sự kiện', label: 'Sự kiện' },
    { value: 'Đóng gói', label: 'Đóng gói' },
    { value: 'Kho vận', label: 'Kho vận' },
    { value: 'Bê tráp', label: 'Bê tráp' },
    { value: 'Thu ngân', label: 'Thu ngân' },
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Phù hợp nhất' },
    { value: 'nearest', label: 'Gần nhất' },
    { value: 'wage_high', label: 'Lương cao' },
    { value: 'soonest', label: 'Sắp diễn ra' },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Tìm ca làm"
        subtitle={`${availableJobs.length} ca đang tuyển dụng`}
      />

      {/* Search Bar */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm ca, địa điểm, loại công việc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="w-4 h-4" />}
          >
            Bộ lọc
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card className={`mb-6 overflow-hidden transition-all ${showFilters ? 'opacity-100' : 'max-h-0 opacity-0 py-0'}`}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Khu vực"
            options={[
              { value: '', label: 'Tất cả khu vực' },
              { value: 'q1', label: 'Quận 1' },
              { value: 'q3', label: 'Quận 3' },
              { value: 'q4', label: 'Quận 4' },
            ]}
            value={filters.area}
            onChange={(e) => setFilters({ ...filters, area: e.target.value })}
          />
          <Select
            label="Ngày làm"
            options={[
              { value: '', label: 'Tất cả ngày' },
              { value: 'today', label: 'Hôm nay' },
              { value: 'tomorrow', label: 'Ngày mai' },
              { value: 'week', label: 'Tuần này' },
            ]}
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
          <Select
            label="Khung giờ"
            options={[
              { value: '', label: 'Tất cả khung giờ' },
              { value: 'morning', label: 'Sáng (6h-12h)' },
              { value: 'afternoon', label: 'Chiều (12h-18h)' },
              { value: 'evening', label: 'Tối (18h-23h)' },
            ]}
            value={filters.time}
            onChange={(e) => setFilters({ ...filters, time: e.target.value })}
          />
          <Select
            label="Lương tối thiểu"
            options={[
              { value: '', label: 'Tất cả mức lương' },
              { value: '30000', label: '30,000₫/giờ' },
              { value: '35000', label: '35,000₫/giờ' },
              { value: '40000', label: '40,000₫/giờ' },
            ]}
            value={filters.minWage}
            onChange={(e) => setFilters({ ...filters, minWage: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.matchSchedule}
              onChange={(e) => setFilters({ ...filters, matchSchedule: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Phù hợp lịch rảnh
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({
              area: '',
              date: '',
              time: '',
              minWage: '',
              jobType: '',
              matchSchedule: false,
            })}
          >
            <X className="w-4 h-4 mr-1" />
            Xóa lọc
          </Button>
        </div>
      </Card>

      {/* Active Filters Chips */}
      {Object.values(filters).some(v => v) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.jobType && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm">
              {filters.jobType}
              <button onClick={() => setFilters({ ...filters, jobType: '' })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.matchSchedule && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success-100 text-success-700 text-sm">
              Phù hợp lịch rảnh
              <button onClick={() => setFilters({ ...filters, matchSchedule: false })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Applied Jobs Section */}
      {appliedJobs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Đơn đã ứng tuyển</h2>
          <div className="grid gap-4">
            {appliedJobs.map((job: any) => (
              <ShiftCard
                key={job.id}
                shift={job}
                applicationStatus={job.applicationStatus}
                workerView
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Jobs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ca đang tuyển</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border-0 bg-transparent focus:ring-0 cursor-pointer"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4">
          {availableJobs.map(shift => (
            <motion.div
              key={shift.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ShiftCard
                shift={shift}
                showMatchScore
                matchScore={Math.floor(Math.random() * 30) + 70}
                workerView
              />
            </motion.div>
          ))}
        </div>

        {availableJobs.length === 0 && (
          <Card className="text-center py-12">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="font-semibold text-gray-900 mb-2">Không tìm thấy ca làm</h3>
            <p className="text-sm text-gray-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
