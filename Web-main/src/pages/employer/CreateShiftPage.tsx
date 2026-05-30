import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Users,
  FileText,
  Phone,
  Camera,
  CheckSquare,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { mockEmployer } from '../../data/mockData';
import { formatCurrency } from '../../utils/helpers';

const jobTypes = [
  { value: '', label: 'Chọn loại công việc' },
  { value: 'Phục vụ', label: 'Phục vụ' },
  { value: 'Pha chế', label: 'Pha chế' },
  { value: 'Sự kiện', label: 'Sự kiện' },
  { value: 'Đóng gói', label: 'Đóng gói' },
  { value: 'Kho vận', label: 'Kho vận' },
  { value: 'Bê tráp', label: 'Bê tráp' },
  { value: 'Thu ngân', label: 'Thu ngân' },
  { value: 'Khác', label: 'Khác' },
];

const evidenceOptions = [
  { value: 'none', label: 'Không yêu cầu', icon: null },
  { value: 'checklist', label: 'Checklist', icon: CheckSquare },
  { value: 'photo', label: 'Ảnh', icon: Camera },
  { value: 'both', label: 'Checklist + Ảnh', icon: CheckSquare },
];

export function CreateShiftPage() {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    jobType: '',
    customJobType: '',
    location: '',
    date: '',
    startTime: '',
    endTime: '',
    hourlyWage: '',
    workersNeeded: '',
    description: '',
    requirements: '',
    notes: '',
    contactPerson: '',
    contactPhone: '',
    workplaceNote: '',
    evidenceType: '',
  });

  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState([
    { id: 'd1', title: 'Phục vụ cuối tuần', savedAt: '2 giờ trước', date: '15/06' },
  ]);

  const employer = mockEmployer;
  const estimatedDeposit = formData.hourlyWage && formData.workersNeeded && formData.startTime && formData.endTime
    ? Math.round(
      parseInt(formData.hourlyWage) *
      (parseInt(formData.endTime.split(':')[0]) - parseInt(formData.startTime.split(':')[0])) *
      parseInt(formData.workersNeeded) *
      0.8
    )
    : 0;

  const insufficientBalance = estimatedDeposit > employer.walletBalance;

  const handleSubmit = () => {
    if (insufficientBalance) {
      setShowInsufficientModal(true);
    } else {
      addToast('success', 'Ca tuyển đã được đăng thành công!');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Đăng ca tuyển"
        subtitle="Tạo ca làm mới và bắt đầu tuyển người"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin ca làm */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-600" />
              Thông tin ca làm
            </h3>

            <div className="space-y-4">
              <Input
                label="Tên ca"
                placeholder="VD: Phục vụ quán cà phê cuối tuần"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />

              <Select
                label="Loại công việc"
                options={jobTypes}
                value={formData.jobType}
                onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
              />

              {formData.jobType === 'Khác' && (
                <Input
                  label="Tên công việc khác"
                  placeholder="Nhập tên công việc"
                  value={formData.customJobType}
                  onChange={(e) => setFormData({ ...formData, customJobType: e.target.value })}
                />
              )}

              <Input
                label="Địa điểm"
                placeholder="Địa chỉ làm việc chi tiết"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày làm</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giờ bắt đầu</label>
                  <input
                    type="time"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giờ kết thúc</label>
                  <input
                    type="time"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Lương theo giờ (VNĐ)"
                  type="number"
                  placeholder="35000"
                  value={formData.hourlyWage}
                  onChange={(e) => setFormData({ ...formData, hourlyWage: e.target.value })}
                />
                <Input
                  label="Số người cần"
                  type="number"
                  placeholder="2"
                  value={formData.workersNeeded}
                  onChange={(e) => setFormData({ ...formData, workersNeeded: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* Mô tả và yêu cầu */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Mô tả và yêu cầu
            </h3>

            <div className="space-y-4">
              <Textarea
                label="Mô tả công việc"
                placeholder="Mô tả chi tiết công việc cần làm..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <Textarea
                label="Yêu cầu người làm"
                placeholder="Yêu cầu về kỹ năng, kinh nghiệm..."
                rows={3}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              />

              <Textarea
                label="Ghi chú"
                placeholder="Ghi chú thêm (tùy chọn)..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </Card>

          {/* Liên hệ tại nơi làm việc */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary-600" />
              Liên hệ tại nơi làm việc
            </h3>

            <div className="space-y-4">
              <Input
                label="Người phụ trách tại chỗ"
                placeholder="Họ tên người phụ trách"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />

              <Input
                label="SĐT người phụ trách"
                placeholder="Số điện thoại liên hệ"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />

              <Textarea
                label="Ghi chú địa điểm"
                placeholder="Hướng dẫn đến nơi làm việc, chỗ để xe,..."
                rows={2}
                value={formData.workplaceNote}
                onChange={(e) => setFormData({ ...formData, workplaceNote: e.target.value })}
              />
            </div>
          </Card>

          {/* Bằng chứng và bàn giao */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary-600" />
              Bằng chứng và bàn giao
            </h3>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Chọn loại bằng chứng người làm cần nộp khi check-out để xác nhận hoàn thành công việc.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {evidenceOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormData({ ...formData, evidenceType: opt.value })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      formData.evidenceType === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {opt.icon && (
                      <opt.icon className={`w-6 h-6 mx-auto mb-2 ${
                        formData.evidenceType === opt.value ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                    )}
                    <span className={`text-sm font-medium ${
                      formData.evidenceType === opt.value ? 'text-primary-600' : 'text-gray-600'
                    }`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar - Deposit Calculation */}
        <div className="space-y-6">
          <Card className="sticky top-20">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-600" />
              Đặt cọc
            </h3>

            <div className="space-y-4">
              {/* Estimated Deposit */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-cream-100">
                <p className="text-sm text-gray-600 mb-1">Tổng tiền cần đặt cọc</p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(estimatedDeposit)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 p-0 h-auto text-xs text-gray-500"
                >
                  Xem cách tính
                </Button>
              </div>

              {/* Wallet Balance */}
              <div className="p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Số dư ví hiện tại</p>
                  <StatusBadge variant="green" size="sm">
                    Khả dụng
                  </StatusBadge>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(employer.walletBalance)}
                </p>
              </div>

              {/* Insufficient Warning */}
              {insufficientBalance && (
                <div className="p-4 rounded-xl bg-danger-50 border border-danger-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-danger-700">Số dư không đủ</p>
                      <p className="text-sm text-danger-600 mt-1">
                        Còn thiếu {formatCurrency(estimatedDeposit - employer.walletBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.title || !formData.date || !formData.startTime}
                >
                  Xác nhận đặt cọc
                </Button>
                <Button variant="outline" onClick={() => addToast('info', 'Bản nháp đã được lưu')}>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu nháp
                </Button>
              </div>
            </div>
          </Card>

          {/* Saved Drafts */}
          {savedDrafts.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Bản nháp đã lưu</h3>
              <div className="space-y-3">
                {savedDrafts.map(draft => (
                  <div
                    key={draft.id}
                    className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{draft.title}</p>
                        <p className="text-xs text-gray-500">
                          {draft.date && `${draft.date} • `}{draft.savedAt}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Tiếp tục</Button>
                        <Button variant="ghost" size="sm" className="text-danger-600">Xóa</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Insufficient Balance Modal */}
      <Modal
        isOpen={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        title="Số dư ví không đủ"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-50">
            <AlertTriangle className="w-6 h-6 text-danger-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Không thể đăng ca</p>
              <p className="text-sm text-gray-600 mt-1">
                Số dư ví không đủ để đặt cọc. Bạn có muốn nạp tiền vào ví không?
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1">
              Nạp tiền ngay
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowInsufficientModal(false)}>
              Lưu nháp
            </Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setShowInsufficientModal(false)}>
            Quay lại chỉnh sửa
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
