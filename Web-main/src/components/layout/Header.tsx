import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, ChevronDown, Home, Briefcase, Calendar, User, HelpCircle, Plus, Users, Sparkles, Zap, Shield, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../ui/Avatar';
import type { UserRole } from '../../types';

const workerNav = [
  { id: 'home', label: 'Trang chủ', path: '/', icon: Home, color: 'from-orange-500 to-red-500' },
  { id: 'find-jobs', label: 'Tìm ca làm', path: '/worker/jobs', icon: Briefcase, color: 'from-blue-500 to-cyan-500' },
  { id: 'dashboard', label: 'Tổng quan', path: '/worker/dashboard', icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
  { id: 'schedule', label: 'Lịch cá nhân', path: '/worker/schedule', icon: Calendar, color: 'from-purple-500 to-pink-500' },
  { id: 'profile', label: 'Hồ sơ', path: '/worker/profile', icon: User, color: 'from-amber-500 to-orange-500' },
];

const employerNav = [
  { id: 'home', label: 'Trang chủ', path: '/', icon: Home, color: 'from-orange-500 to-red-500' },
  { id: 'create-shift', label: 'Đăng ca', path: '/employer/create-shift', icon: Plus, color: 'from-green-500 to-emerald-500' },
  { id: 'dashboard', label: 'Tổng quan', path: '/employer/dashboard', icon: TrendingUp, color: 'from-blue-500 to-cyan-500' },
  { id: 'schedule', label: 'Lịch tuyển', path: '/employer/schedule', icon: Calendar, color: 'from-purple-500 to-pink-500' },
  { id: 'public-shifts', label: 'Ca công khai', path: '/employer/shifts', icon: Briefcase, color: 'from-indigo-500 to-blue-500' },
  { id: 'profile', label: 'Hồ sơ', path: '/employer/profile', icon: User, color: 'from-amber-500 to-orange-500' },
];

const adminNav = [
  { id: 'home', label: 'Trang chủ', path: '/', icon: Home, color: 'from-orange-500 to-red-500' },
  { id: 'dashboard', label: 'Tổng quan', path: '/admin/dashboard', icon: TrendingUp, color: 'from-blue-500 to-cyan-500' },
  { id: 'disputes', label: 'Tranh chấp', path: '/admin/disputes', icon: Shield, color: 'from-red-500 to-pink-500' },
  { id: 'users', label: 'Người dùng', path: '/admin/users', icon: Users, color: 'from-purple-500 to-pink-500' },
  { id: 'shifts', label: 'Ca làm', path: '/admin/shifts', icon: Briefcase, color: 'from-green-500 to-emerald-500' },
  { id: 'verification', label: 'Xác minh', path: '/admin/verification', icon: User, color: 'from-amber-500 to-orange-500' },
];

const roleLabels: Record<UserRole, string> = {
  worker: 'Người làm',
  employer: 'Nhà tuyển dụng',
  admin: 'Quản trị viên',
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { userRole, setUserRole, currentUser, notifications, unreadCount } = useApp();
  const location = useLocation();

  const navItems = userRole === 'worker' ? workerNav : userRole === 'employer' ? employerNav : adminNav;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Animated Background Decorations */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-orange-200/40 to-amber-100/30 rounded-full blur-3xl float-animation" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-cyan-100/20 rounded-full blur-3xl float-animation-reverse" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-gradient-to-br from-green-200/30 to-emerald-100/20 rounded-full blur-3xl float-animation-slow" />
      </div>

      {/* Header with Glass Morphism */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className={cn(
          'sticky top-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-orange-500/5 border-b border-orange-100'
            : 'bg-white/60 backdrop-blur-md border-b border-transparent'
        )}
      >
        {/* Animated top bar */}
        <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 animated-gradient" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo with Animation */}
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow glow-effect">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-orange-400 to-red-400 opacity-50 blur -z-10"
                />
              </motion.div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-gray-900">CaLẻ</span>
                <span className="text-xl font-light text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500"> / Now</span>
                <motion.div
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  className="h-0.5 bg-gradient-to-r from-orange-500 to-red-500 mt-0.5"
                />
              </div>
            </Link>

            {/* Desktop Nav with Animated Underlines */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item, idx) => {
                const isActive = location.pathname === item.path;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      className="relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 group"
                    >
                      <span className={cn(
                        'relative z-10 flex items-center gap-2',
                        isActive
                          ? 'text-transparent bg-clip-text bg-gradient-to-r ' + item.color
                          : 'text-gray-600 group-hover:text-gray-900'
                      )}>
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </span>

                      {/* Animated background */}
                      <motion.div
                        initial={false}
                        animate={{
                          scale: isActive ? 1 : 0,
                          opacity: isActive ? 1 : 0,
                        }}
                        className={cn(
                          'absolute inset-0 rounded-xl bg-gradient-to-r opacity-20',
                          item.color
                        )}
                      />

                      {/* Hover effect */}
                      <div className={cn(
                        'absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity',
                        item.color
                      )} />
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Right section */}
            <div className="flex items-center gap-2">
              {/* Notifications with Bell Animation */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNotifOpen(!notifOpen)}
                  className={cn(
                    'relative p-2.5 rounded-xl transition-all duration-300',
                    notifOpen
                      ? 'bg-orange-100 text-orange-600'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  )}
                >
                  <motion.div
                    animate={unreadCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
                    transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 3 }}
                  >
                    <Bell className="w-5 h-5" />
                  </motion.div>
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 min-w-5 h-5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs flex items-center justify-center font-bold shadow-lg shadow-red-500/30"
                    >
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.3 }}
                      >
                        {unreadCount}
                      </motion.span>
                    </motion.span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="absolute right-0 mt-3 w-96 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 border border-orange-100 overflow-hidden"
                    >
                      <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Thông báo
                          </h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
                              {unreadCount} mới
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.slice(0, 5).map((notif, idx) => (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={cn(
                              'p-4 hover:bg-orange-50/50 transition-colors cursor-pointer border-l-4',
                              !notif.read ? 'bg-orange-50/30 border-orange-500' : 'border-transparent'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {!notif.read && (
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 mt-2 flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 mb-0.5">{notif.title}</p>
                                <p className="text-xs text-gray-600 line-clamp-2">{notif.body}</p>
                                <p className="text-xs text-gray-400 mt-1">{notif.timestamp.split('.')[0]}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="p-3 bg-gradient-to-r from-gray-50 to-orange-50 border-t border-orange-100">
                        <Link
                          to={`/${userRole}/notifications`}
                          className="block text-center text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                          onClick={() => setNotifOpen(false)}
                        >
                          Xem tất cả thông báo
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Profile Menu */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={cn(
                    'flex items-center gap-2 p-1.5 pr-3 rounded-2xl transition-all duration-300',
                    profileOpen
                      ? 'bg-orange-100 shadow-lg shadow-orange-500/20'
                      : 'hover:bg-gray-100'
                  )}
                >
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    className="relative"
                  >
                    <Avatar name={currentUser?.name || 'User'} size="sm" />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white"
                    />
                  </motion.div>
                  <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform duration-300', profileOpen && 'rotate-180')} />
                </motion.button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 border border-orange-100 overflow-hidden"
                    >
                      <div className="p-5 bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
                        <div className="relative flex items-center gap-3">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <Avatar name={currentUser?.name || 'User'} size="lg" />
                          </motion.div>
                          <div>
                            <p className="font-semibold text-lg">{currentUser?.name}</p>
                            <p className="text-xs text-white/80">{currentUser?.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 border-b border-orange-100">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3 font-medium">Chế độ xem</p>
                        {(['worker', 'employer', 'admin'] as UserRole[]).map((role, idx) => (
                          <motion.button
                            key={role}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => {
                              setUserRole(role);
                              setProfileOpen(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 group',
                              userRole === role
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20'
                                : 'text-gray-600 hover:bg-orange-50'
                            )}
                          >
                            <motion.div
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.5 }}
                            >
                              <User className="w-4 h-4" />
                            </motion.div>
                            <span className="font-medium">{roleLabels[role]}</span>
                            {userRole === role && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto"
                              >
                                <Sparkles className="w-4 h-4 text-amber-300" />
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                      <div className="p-3">
                        <Link
                          to={`/${userRole}/profile`}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-orange-50 transition-colors group"
                          onClick={() => setProfileOpen(false)}
                        >
                          <User className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                          Xem hồ sơ
                        </Link>
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-orange-50 transition-colors group">
                          <HelpCircle className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                          Hỗ trợ
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Mobile menu button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-colors relative overflow-hidden ml-1"
              >
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="w-6 h-6 text-gray-600" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="w-6 h-6 text-gray-600" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Nav with Slide Animation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden border-t border-orange-100"
            >
              <nav className="px-4 py-4 space-y-1 bg-white/80 backdrop-blur-xl">
                {navItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group',
                        location.pathname === item.path
                          ? 'bg-gradient-to-r text-transparent bg-clip-text ' + item.color + ' bg-opacity-10'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      )}
                    >
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className={cn(
                          'p-2 rounded-lg',
                          location.pathname === item.path
                            ? 'bg-gradient-to-r ' + item.color + ' text-white'
                            : 'bg-gray-100 group-hover:bg-orange-100 text-gray-500'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                      </motion.div>
                      <span className={location.pathname === item.path ? 'font-semibold' : ''}>{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
