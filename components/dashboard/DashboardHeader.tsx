import { GraduationCap, RefreshCw } from 'lucide-react';
import { DashboardStats } from '@/types/dashboard';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  stats: DashboardStats;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function DashboardHeader({ 
  stats, 
  onRefresh,
  refreshing = false 
}: DashboardHeaderProps) {
  return (
    <header className="border-b-4 border-border pb-8">
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="border-4 border-border bg-primary p-3 brutal-shadow">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display-brutal tracking-tight text-foreground">
                MULTI-ACCOUNT_TWITTER_BOT
              </h1>
              <p className="text-muted-foreground font-mono-brutal text-sm mt-1">
                AI-POWERED MULTI-ACCOUNT TWITTER & LINKEDIN AUTOMATION SYSTEM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full cyber-glow"></div>
              <span className="text-xs font-mono-brutal text-muted-foreground">VERSION: 2.0.1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-secondary rounded-full cyber-glow"></div>
              <span className="text-xs font-mono-brutal text-muted-foreground">STATUS: OPERATIONAL</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-secondary animate-pulse cyber-glow"></div>
              <span className="text-sm font-mono-brutal text-foreground">AUTO_SCHEDULER</span>
              <span className="font-mono-brutal font-bold text-secondary text-sm">ACTIVE</span>
            </div>
            {onRefresh && (
              <Button
                onClick={onRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="border-2 border-border bg-card text-foreground brutal-shadow-sm hover:bg-accent hover:text-accent-foreground font-mono-brutal text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                REFRESH_DATA
              </Button>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-sm font-mono-brutal text-foreground">READY_TO_POST</span>
              <span className="font-mono-brutal font-bold text-primary text-lg">{stats.ready}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-secondary"></div>
              <span className="text-sm font-mono-brutal text-foreground">TOTAL_POSTED</span>
              <span className="font-mono-brutal font-bold text-secondary text-lg">{stats.posted}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span className="text-sm font-mono-brutal text-foreground">SCHEDULED</span>
              <span className="font-mono-brutal font-bold text-destructive text-lg">0</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}