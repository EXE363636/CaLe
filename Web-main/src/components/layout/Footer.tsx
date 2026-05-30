import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-100 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <div className="text-lg font-bold">CaLẻ<span className="text-orange-500"> / Now</span></div>
                <p className="text-xs text-gray-400">by CaLedo Tech</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              "Làm ca linh hoạt, nhận tiền an tâm."
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="font-semibold text-white mb-4">Cho Người Làm</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Tìm ca làm</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Hồ sơ của tôi</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Lịch rảnh</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Ví và giao dịch</a></li>
            </ul>
          </motion.div>

          {/* For Employers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="font-semibold text-white mb-4">Cho Nhà Tuyển Dụng</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Đăng ca tuyển</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Quản lý ca</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Nhân viên</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Báo cáo</a></li>
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <h4 className="font-semibold text-white mb-4">Liên Hệ</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-gray-400">
                <Phone className="w-4 h-4 text-orange-500" />
                <a href="tel:+84900000000" className="hover:text-orange-500 transition-colors">+84 (900) 000-000</a>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Mail className="w-4 h-4 text-orange-500" />
                <a href="mailto:support@cale.com" className="hover:text-orange-500 transition-colors">support@cale.com</a>
              </li>
              <li className="flex items-start gap-2 text-gray-400">
                <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh</span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 py-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center gap-4"
            >
              <span className="text-sm text-gray-400">Theo dõi chúng tôi:</span>
              <div className="flex gap-3">
                {[
                  { icon: Facebook, label: 'Facebook', color: 'hover:text-blue-600' },
                  { icon: Twitter, label: 'Twitter', color: 'hover:text-blue-400' },
                  { icon: Linkedin, label: 'LinkedIn', color: 'hover:text-blue-700' },
                ].map((social) => (
                  <a
                    key={social.label}
                    href="#"
                    className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 transition-all hover:bg-gray-700 ${social.color}`}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Copyright */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center md:text-right text-sm text-gray-400"
            >
              <p>
                © {currentYear} CaLẻ / Now. Tất cả quyền được bảo vệ.
                <br />
                <a href="#" className="text-orange-500 hover:text-orange-600 transition-colors">Chính sách bảo mật</a> |{' '}
                <a href="#" className="text-orange-500 hover:text-orange-600 transition-colors">Điều khoản sử dụng</a>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
}
