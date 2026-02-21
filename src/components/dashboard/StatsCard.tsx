import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  comparison?: number; // percentage change
  comparisonLabel?: string;
  icon?: React.ReactNode;
  color?: 'cyan' | 'green' | 'amber' | 'red';
}

export function StatsCard({ 
  title, 
  value, 
  comparison, 
  comparisonLabel = 'vs yesterday',
  icon,
  color = 'cyan'
}: StatsCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'green': return 'border-green-500/30 bg-green-500/5';
      case 'amber': return 'border-amber-500/30 bg-amber-500/5';
      case 'red': return 'border-red-500/30 bg-red-500/5';
      default: return 'border-cyan-500/30 bg-cyan-500/5';
    }
  };

  const getTrendIcon = () => {
    if (comparison === undefined || comparison === 0) {
      return <Minus className="w-3 h-3 text-gray-400" />;
    }
    if (comparison > 0) {
      return <TrendingUp className="w-3 h-3 text-green-400" />;
    }
    return <TrendingDown className="w-3 h-3 text-red-400" />;
  };

  const getTrendColor = () => {
    if (comparison === undefined || comparison === 0) return 'text-gray-400';
    if (comparison > 0) return 'text-green-400';
    return 'text-red-400';
  };

  return (
    <div className={`rounded-xl border p-4 ${getColorClasses()}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          
          {comparison !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon()}
              <span className={`text-xs ${getTrendColor()}`}>
                {comparison > 0 ? '+' : ''}{comparison}% {comparisonLabel}
              </span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className="p-2 bg-gray-800/50 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
