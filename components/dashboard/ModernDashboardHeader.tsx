'use client';

import { 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Zap,
  TrendingUp,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  ready: number;
  posted: number;
}

interface ModernDashboardHeaderProps {
  stats: DashboardStats;
  onRefresh: () => void;
  refreshing: boolean;
}

export function ModernDashboardHeader({ 
  stats, 
  onRefresh, 
  refreshing 
}: ModernDashboardHeaderProps) {
  const statCards = [
    {
      label: 'Ready to Post',
      value: stats.ready,
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20'
    },
    {
      label: 'Posted Today',
      value: stats.posted,
      icon: Zap,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      label: 'Scheduled',
      value: 0,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            Content Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your AI-powered content generation
          </p>
        </div>

        <Button
          onClick={onRefresh}
          disabled={refreshing}
          variant="outline"
          className="h-10 px-4 rounded-xl border-2 border-border hover:bg-muted"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden p-5 rounded-2xl border-2 ${stat.border} ${stat.bg} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
              <stat.icon className="h-24 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Status Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card border-2 border-border rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Auto-scheduler</span>
          <span className="text-sm font-medium text-green-500">Active</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">AI Model</span>
          <span className="text-sm font-medium text-foreground">Ready</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Twitter API</span>
          <span className="text-sm font-medium text-foreground">Connected</span>
        </div>
      </div>
    </div>
  );
}