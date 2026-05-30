import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency, formatShortCurrency } from '../../utils/helpers';
import { cn } from '../../utils/helpers';
import type { Transaction } from '../../types';

interface WalletCardProps {
  balance: number;
  pendingAmount?: number;
  onTopUp?: () => void;
  onWithdraw?: () => void;
  onViewHistory?: () => void;
  compact?: boolean;
}

export function WalletCard({
  balance,
  pendingAmount = 0,
  onTopUp,
  onWithdraw,
  onViewHistory,
  compact = false,
}: WalletCardProps) {
  return (
    <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white border-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-white/20">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="font-medium">Ví CaLẻ</span>
        </div>
        {pendingAmount > 0 && (
          <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            {formatShortCurrency(pendingAmount)} chờ xử lý
          </div>
        )}
      </div>

      <div className="mb-6">
        <p className="text-sm text-white/70">Số dư khả dụng</p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold"
        >
          {formatCurrency(balance)}
        </motion.p>
      </div>

      {!compact && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
            onClick={onTopUp}
            icon={<ArrowDownCircle className="w-4 h-4" />}
          >
            Nạp tiền
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
            onClick={onWithdraw}
            icon={<ArrowUpCircle className="w-4 h-4" />}
          >
            Rút tiền
          </Button>
        </div>
      )}
    </Card>
  );
}

interface TransactionItemProps {
  transaction: Transaction;
}

const transactionIcons: Record<string, React.ReactNode> = {
  deposit_topup: <ArrowDownCircle className="w-4 h-4 text-success-500" />,
  deposit: <ArrowDownCircle className="w-4 h-4 text-info-500" />,
  withdraw: <ArrowUpCircle className="w-4 h-4 text-danger-500" />,
  wage: <ArrowDownCircle className="w-4 h-4 text-success-500" />,
  deposit_refund: <ArrowDownCircle className="w-4 h-4 text-primary-500" />,
  refund: <ArrowDownCircle className="w-4 h-4 text-primary-500" />,
};

const transactionLabels: Record<string, string> = {
  deposit_topup: 'Nạp tiền',
  deposit: 'Đặt cọc',
  withdraw: 'Rút tiền',
  wage: 'Tiền công',
  deposit_refund: 'Hoàn tiền cọc',
  refund: 'Hoàn tiền',
};

export function TransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = transaction.amount > 0;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="p-2 rounded-lg bg-gray-100">
        {transactionIcons[transaction.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">
          {transactionLabels[transaction.type]}
        </p>
        {transaction.shiftTitle && (
          <p className="text-xs text-gray-500 truncate">{transaction.shiftTitle}</p>
        )}
        <p className="text-xs text-gray-400">{transaction.timestamp}</p>
      </div>
      <div className={cn(
        'font-semibold text-sm',
        isPositive ? 'text-success-600' : 'text-danger-600'
      )}>
        {isPositive ? '+' : ''}{formatCurrency(transaction.amount)}
      </div>
    </div>
  );
}

interface TransactionListProps {
  transactions: Transaction[];
  emptyMessage?: string;
}

export function TransactionList({ transactions, emptyMessage = 'Chưa có giao dịch nào' }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {transactions.map(tx => (
        <TransactionItem key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}
