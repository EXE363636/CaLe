import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Shield,
  CheckCircle2,
  Star,
  Calendar,
  Wallet,
  TrendingUp,
  AlertCircle,
  Briefcase,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  Zap,
  Award,
  Heart,
  Target,
  Timer,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCurrency } from '../utils/helpers';
import { mockShifts } from '../data/mockData';

// Floating Particle Component
function FloatingParticle({ delay, size, left }: { delay: number; size: number; left: string }) {
  return (
    <motion.div
      initial={{ y: '100vh', opacity: 0 }}
      animate={{
        y: '-100vh',
        opacity: [0, 1, 1, 0],
        rotate: [0, 360]
      }}
      transition={{
        duration: 15,
        delay,
        repeat: Infinity,
        ease: 'linear'
      }}
      style={{ left }}
      className={`absolute w-${size} h-${size} rounded-full bg-gradient-to-r from-orange-400/20 to-red-400/20 blur-sm`}
    />
  );
}

// Animated Counter Component
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="inline-block"
    >
      {value.toLocaleString('vi-VN')}{suffix}
    </motion.span>
  );
}

// 3D Card Component
function Card3D({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    setRotateX(-mouseY / 40);
    setRotateY(mouseX / 40);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transformStyle: 'preserve-3d'
      }}
      className={`transition-transform duration-200 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function HomePage() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Animated Background with Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        {/* SVG Mesh Gradient Background */}
        <svg
          viewBox="0 0 1200 800"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'rgb(249, 115, 22)', stopOpacity: 0.15 }} />
              <stop offset="50%" style={{ stopColor: 'rgb(245, 158, 11)', stopOpacity: 0.1 }} />
              <stop offset="100%" style={{ stopColor: 'rgb(239, 68, 68)', stopOpacity: 0.08 }} />
            </linearGradient>
            <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'rgb(59, 130, 246)', stopOpacity: 0.12 }} />
              <stop offset="50%" style={{ stopColor: 'rgb(34, 197, 94)', stopOpacity: 0.08 }} />
              <stop offset="100%" style={{ stopColor: 'rgb(168, 85, 247)', stopOpacity: 0.1 }} />
            </linearGradient>
          </defs>
          <rect width="1200" height="800" fill="url(#grad1)" />
          <rect width="1200" height="800" fill="url(#grad2)" opacity="0.5" />
        </svg>

        {/* Large Animated Orb 1 - Orange/Red (Top Left) */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
            rotate: [0, 360],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          style={{ y: y1 }}
          className="absolute -top-32 -left-40 w-[900px] h-[900px] rounded-full bg-gradient-to-br from-orange-400/50 via-amber-300/40 to-red-400/30 blur-3xl"
        />

        {/* Large Animated Orb 2 - Blue/Cyan (Top Right) */}
        <motion.div
          animate={{
            scale: [1.1, 0.9, 1.1],
            opacity: [0.35, 0.65, 0.35],
            rotate: [360, 0],
            x: [0, 30, 0],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          style={{ y: y2 }}
          className="absolute top-0 -right-40 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-400/45 via-cyan-300/35 to-teal-400/25 blur-3xl"
        />

        {/* Animated Orb 3 - Green/Emerald (Bottom Center) */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.3, 0.55, 0.3],
            rotate: [0, -360],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[750px] h-[750px] rounded-full bg-gradient-to-br from-green-400/35 via-emerald-300/25 to-cyan-400/20 blur-3xl"
        />

        {/* Animated Orb 4 - Amber/Yellow (Middle Right) */}
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.25, 0.5, 0.25],
            x: [-50, 50, -50],
            y: [0, 30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-amber-400/40 via-yellow-300/30 to-orange-400/25 blur-3xl"
        />

        {/* Animated Orb 5 - Red/Rose (Bottom Left) */}
        <motion.div
          animate={{
            scale: [0.95, 1.15, 0.95],
            opacity: [0.2, 0.45, 0.2],
            rotate: [-360, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 -left-48 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-red-400/35 via-rose-300/25 to-pink-400/20 blur-3xl"
        />
      </div>

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 2}
            size={Math.floor(Math.random() * 20) + 10}
            left={`${Math.random() * 100}%`}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        <motion.div
          style={{ opacity }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          {/* Floating Decorations */}
          <div className="absolute top-10 left-5 float-animation">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-400/30 to-red-400/20 blur-xl"
            />
          </div>
          <div className="absolute top-32 right-10 float-animation-reverse">
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/10 blur-xl"
            />
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 text-sm font-medium mb-8 border border-orange-200 shadow-lg shadow-orange-500/10 relative overflow-hidden group"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
              <span>CaLẻ / Now - CaLedo Tech</span>
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              />
            </motion.div>

            {/* Headline with Gradient Animation */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-tight mb-6"
            >
              <motion.span
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="block"
              >
                Tìm ca làm{' '}
                <span className="relative inline-block">
                  <span className="gradient-text-animated">nhanh.</span>
                  <motion.div
                    className="absolute -bottom-2 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                  />
                </span>
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-orange-600"
              >
                Tuyển người theo ca{' '}
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block"
                >
                  dễ hơn.
                </motion.span>
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              <span className="font-semibold text-gray-700">CaLẻ / Now</span> giúp người làm tìm việc ngắn hạn phù hợp lịch rảnh,
              còn nhà tuyển dụng dễ dàng tìm nhân sự theo ca với{' '}
              <span className="text-orange-600 font-medium relative">
                quy trình minh bạch
                <motion.span
                  className="absolute bottom-0 left-0 w-full border-b-2 border-dashed border-orange-400"
                />
              </span>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link to="/worker/jobs">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <Button size="lg" className="relative bg-gradient-to-r from-orange-500 to-red-500 border-0 text-white px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all">
                    <Zap className="w-5 h-5 mr-2" />
                    Tìm ca làm ngay
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </Link>
              <Link to="/employer/create-shift">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-8 py-4 rounded-2xl border-2 border-orange-300 text-orange-600 hover:bg-orange-50 font-semibold"
                  >
                    <Target className="w-5 h-5 mr-2" />
                    Đăng ca tuyển
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-20"
            >
              {[
                { value: '10K+', label: 'Người dùng', icon: Users },
                { value: '5K+', label: 'Ca đã hoàn thành', icon: CheckCircle2 },
                { value: '98%', label: 'Hài lòng', icon: Heart },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + idx * 0.1 }}
                  className="text-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 flex items-center justify-center"
                  >
                    <stat.icon className="w-6 h-6 text-orange-600" />
                  </motion.div>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Hero Visual - 3D Cards */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {mockShifts.slice(0, 3).map((shift, idx) => (
              <motion.div
                key={shift.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + idx * 0.15 }}
              >
                <Card3D>
                  <Card hover className="h-full bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all overflow-hidden group">
                    {/* Animated border */}
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 rounded-2xl blur-xl" />

                    <div className="pt-6">
                      {/* Status Badge */}
                      <div className="flex justify-between items-start mb-4">
                        <StatusBadge
                          variant={shift.status === 'recruiting' ? 'blue' : shift.status === 'in_progress' ? 'green' : 'gray'}
                          size="sm"
                          className="shadow-lg"
                        >
                          {shift.status === 'recruiting' ? '🔥 Đang tuyển' : shift.status === 'in_progress' ? '⚡ Đang diễn ra' : '✓ Hoàn thành'}
                        </StatusBadge>
                        <motion.div
                          whileHover={{ rotate: 180 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Star className="w-5 h-5 text-amber-400 cursor-pointer hover:fill-amber-400 transition-all" />
                        </motion.div>
                      </div>

                      {/* Content */}
                      <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-orange-600 transition-colors">
                        {shift.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 flex items-center gap-1">
                        <Award className="w-4 h-4 text-orange-500" />
                        {shift.employer.businessName}
                      </p>

                      {/* Details */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-lg"
                        >
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          {shift.location.split(',')[0]}
                        </motion.span>
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-lg"
                        >
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          {shift.startTime}-{shift.endTime}
                        </motion.span>
                      </div>

                      {/* Footer */}
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Lương</p>
                          <motion.p
                            whileHover={{ scale: 1.05 }}
                            className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600"
                          >
                            {formatCurrency(shift.hourlyWage)}<span className="text-sm font-normal text-gray-500">/giờ</span>
                          </motion.p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-0.5">Cần tuyển</p>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-gray-600" />
                            <span className="font-semibold text-gray-900">
                              {shift.approvedWorkers}/{shift.requiredWorkers}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(shift.approvedWorkers / shift.requiredWorkers) * 100}%` }}
                              transition={{ delay: 1.5 + idx * 0.1, duration: 0.5 }}
                              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Card3D>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-gray-400"
          >
            <span className="text-xs">Cuộn xuống</span>
            <div className="w-6 h-10 rounded-full border-2 border-gray-300 flex items-start justify-center p-1.5">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-orange-500"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Trust Highlights with Animated Icons */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 mb-4 shadow-lg shadow-orange-500/30"
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tại sao chọn{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                CaLẻ / Now?
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Nền tảng uy tín với hàng ngàn ca đã hoàn thành thành công
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Đặt cọc an toàn', desc: 'Tiền được giữ bởi hệ thống', color: 'from-blue-500 to-cyan-500' },
              { icon: CheckCircle2, title: 'Check-in/Check-out rõ ràng', desc: 'Xác nhận có mặt minh bạch', color: 'from-green-500 to-emerald-500' },
              { icon: Star, title: 'Đánh giá hai chiều', desc: 'Xây dựng uy tín cho cả hai bên', color: 'from-amber-500 to-orange-500' },
              { icon: Calendar, title: 'Gợi ý ca thông minh', desc: 'Tìm việc phù hợp với bạn', color: 'from-purple-500 to-pink-500' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card3D>
                  <Card hover className="h-full text-center group bg-white/70 backdrop-blur-sm border-0">
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${item.color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all`}
                    >
                      <item.icon className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </Card>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works with Animated Steps */}
      <section className="py-20 relative bg-gradient-to-br from-orange-50/50 via-white to-red-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Cách thức{' '}
              <span className="gradient-text-animated">hoạt động</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Quy trình đơn giản và minh bạch cho cả người làm lẫn nhà tuyển dụng
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Worker Flow */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full bg-gradient-to-br from-green-50 to-emerald-50/50 border-0 shadow-xl">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="p-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30"
                    >
                      <Briefcase className="w-6 h-6 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-900">Cho người làm</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { step: 1, title: 'Tạo hồ sơ', desc: 'Điền thông tin, kỹ năng và lịch rảnh', icon: Users },
                      { step: 2, title: 'Tìm ca phù hợp', desc: 'Duyệt ca hoặc nhận gợi ý từ hệ thống', icon: Target },
                      { step: 3, title: 'Check-in / Check-out', desc: 'Xác nhận có mặt và hoàn thành ca', icon: Timer },
                      { step: 4, title: 'Nhận tiền', desc: 'Tiền công được chuyển vào ví an toàn', icon: Wallet },
                    ].map((item, idx) => (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-4 group"
                      >
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center justify-center font-bold shadow-lg group-hover:shadow-xl transition-all"
                        >
                          {item.step}
                        </motion.div>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <item.icon className="w-4 h-4 text-green-600" />
                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Employer Flow */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full bg-gradient-to-br from-orange-50 to-red-50/50 border-0 shadow-xl">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/30"
                    >
                      <Users className="w-6 h-6 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-900">Cho nhà tuyển dụng</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { step: 1, title: 'Đăng ca', desc: 'Tạo ca làm với thông tin chi tiết', icon: Briefcase },
                      { step: 2, title: 'Duyệt người làm', desc: 'Xem hồ sơ và chọn người phù hợp', icon: CheckCircle2 },
                      { step: 3, title: 'Xác nhận hoàn thành', desc: 'Kiểm tra và xác nhận công việc', icon: Shield },
                      { step: 4, title: 'Đánh giá', desc: 'Gửi đánh giá và xây dựng uy tín', icon: Star },
                    ].map((item, idx) => (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-4 group"
                      >
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center justify-center font-bold shadow-lg group-hover:shadow-xl transition-all"
                        >
                          {item.step}
                        </motion.div>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <item.icon className="w-4 h-4 text-orange-600" />
                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Grid with Staggered Animation */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tính năng{' '}
              <span className="gradient-text-animated">nổi bật</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Công cụ toàn diện cho cả người làm và nhà tuyển dụng
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Calendar, title: 'Lịch rảnh cá nhân', desc: 'Quản lý lịch rảnh và nhận gợi ý việc phù hợp', color: 'from-blue-500 to-cyan-500' },
              { icon: Sparkles, title: 'Gợi ý việc phù hợp', desc: 'Hệ thống đề xuất ca làm dựa trên kỹ năng và lịch', color: 'from-purple-500 to-pink-500' },
              { icon: Wallet, title: 'Ví và lịch sử giao dịch', desc: 'Quản lý tài chính minh bạch và an toàn', color: 'from-green-500 to-emerald-500' },
              { icon: TrendingUp, title: 'Điểm uy tín', desc: 'Xây dựng danh tiếng qua đánh giá và công việc', color: 'from-orange-500 to-red-500' },
              { icon: Briefcase, title: 'Kỹ năng phát triển theo ca', desc: 'Theo dõi tiến bộ kỹ năng từng loại công việc', color: 'from-indigo-500 to-blue-500' },
              { icon: AlertCircle, title: 'Tranh chấp minh bạch', desc: 'Quy trình giải quyết khiếu nại công bằng', color: 'from-rose-500 to-pink-500' },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card3D>
                  <Card hover className="h-full group bg-white/70 backdrop-blur-sm border-0">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-all`}
                    >
                      <feature.icon className="w-7 h-7 text-white" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">{feature.title}</h3>
                    <p className="text-sm text-gray-500">{feature.desc}</p>
                  </Card>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Showcase with Animated Cards */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/30 via-transparent to-red-100/30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 mb-4 shadow-lg shadow-orange-500/30"
            >
              <Briefcase className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Việc đang{' '}
              <span className="gradient-text-animated">tuyển gấp</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Các ca làm đa dạng từ phục vụ, sự kiện đến kho vận
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Phục vụ quán cà phê', wage: 35000, slots: 2, type: 'Phục vụ', emoji: '☕', color: 'from-amber-400 to-orange-500' },
              { title: 'Hỗ trợ sự kiện', wage: 40000, slots: 10, type: 'Sự kiện', emoji: '🎪', color: 'from-purple-400 to-pink-500' },
              { title: 'Đóng gói đơn hàng', wage: 32000, slots: 5, type: 'Đóng gói', emoji: '📦', color: 'from-blue-400 to-cyan-500' },
              { title: 'Bê tráp tiệc cưới', wage: 45000, slots: 4, type: 'Bê tráp', emoji: '💒', color: 'from-rose-400 to-pink-500' },
            ].map((job, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50, rotateX: 10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
              >
                <Card hover className="h-full group bg-white/80 backdrop-blur-sm border-0 overflow-hidden">
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${job.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                  {/* Emoji */}
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    className="text-5xl mb-4"
                  >
                    {job.emoji}
                  </motion.div>

                  <StatusBadge variant="blue" size="sm" className="mb-3">
                    🔥 Đang tuyển
                  </StatusBadge>

                  <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-orange-600 transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {job.type}
                  </p>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Vị trí còn lại</span>
                      <span className="text-sm font-semibold text-gray-900">{job.slots}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.random() * 60 + 20}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + idx * 0.1, duration: 0.5 }}
                        className={`h-full bg-gradient-to-r ${job.color} rounded-full`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Lương</p>
                      <motion.p
                        whileHover={{ scale: 1.05 }}
                        className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600"
                      >
                        {formatCurrency(job.wage)}
                        <span className="text-sm font-normal text-gray-500">/giờ</span>
                      </motion.p>
                    </div>
                    <motion.div whileHover={{ scale: 1.1, rotate: -10 }}>
                      <Button variant="outline" size="sm">
                        Ứng tuyển
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* View All Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link to="/worker/jobs">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 rounded-2xl border-2 border-orange-300 text-orange-600 hover:bg-orange-50 font-semibold"
                >
                  Xem tất cả ca làm
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="ml-2"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Final CTA with Animated Background */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Card className="text-center py-16 px-8 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 border-0 shadow-2xl shadow-orange-500/30 relative overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                  className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"
                />
                {/* Animated dots */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: [0, 0.5, 0],
                      scale: [0, 1, 0],
                      x: Math.random() * 500 - 250,
                      y: Math.random() * 500 - 250,
                    }}
                    transition={{
                      duration: 3,
                      delay: i * 0.2,
                      repeat: Infinity,
                    }}
                    className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-white/30"
                  />
                ))}
              </div>

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-6"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  Bắt đầu với{' '}
                  <span className="text-amber-200">CaLẻ / Now</span>
                </h2>
                <p className="text-xl text-white/90 mb-10 max-w-xl mx-auto">
                  Đăng ký miễn phí và bắt đầu tìm việc hoặc tuyển người ngay hôm nay
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/worker/jobs">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        size="lg"
                        className="bg-white text-orange-600 hover:bg-gray-100 px-10 py-5 rounded-2xl font-bold shadow-xl text-lg"
                      >
                        <Zap className="w-5 h-5 mr-2" />
                        Tìm việc ngay
                      </Button>
                    </motion.div>
                  </Link>
                  <Link to="/employer/create-shift">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="lg"
                        className="border-2 border-white text-white hover:bg-white/10 px-10 py-5 rounded-2xl font-bold text-lg"
                      >
                        <Target className="w-5 h-5 mr-2" />
                        Đăng ca tuyển
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
