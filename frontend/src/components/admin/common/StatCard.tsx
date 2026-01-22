import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const variants = {
    default: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
    success: 'from-green-500/20 to-green-600/5 border-green-500/20',
    danger: 'from-red-500/20 to-red-600/5 border-red-500/20',
    warning: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
  };

  const iconColors = {
    default: 'bg-blue-500/20 text-blue-400',
    success: 'bg-green-500/20 text-green-400',
    danger: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp size={14} className="text-green-400" />;
    if (trend.value < 0) return <TrendingDown size={14} className="text-red-400" />;
    return <Minus size={14} className="text-slate-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-400';
    if (trend.value < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <div
      className={`bg-gradient-to-br ${variants[variant]} border rounded-xl p-5 backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${iconColors[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
