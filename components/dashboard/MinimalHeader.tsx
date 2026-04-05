import { RefreshCw, Users, Twitter, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Persona } from '@/types/dashboard';

interface MinimalHeaderProps {
  accounts: any[];
  selectedAccount: string;
  onSwitchAccount: (id: string) => void;
  onRefresh: () => void;
  loading: boolean;
  stats: { ready: number; posted: number };
  activePersonas: Persona[];
}

export function MinimalHeader({
  accounts,
  selectedAccount,
  onSwitchAccount,
  onRefresh,
  loading,
  stats,
  activePersonas
}: MinimalHeaderProps) {
  const currentAccount = accounts.find(a => a.id === selectedAccount);

  return (
    <header className="py-4 border-b border-gray-100 mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {currentAccount?.platform === 'twitter' ? (
              <Twitter size={14} className="text-gray-400" />
            ) : currentAccount?.platform === 'linkedin' ? (
              <Linkedin size={14} className="text-blue-600" />
            ) : (
              <Users size={14} className="text-gray-400" />
            )}
            <select
              value={selectedAccount}
              onChange={(e) => onSwitchAccount(e.target.value)}
              className="text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer text-gray-900"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.account_username || a.twitter_handle} {a.platform === 'linkedin' ? '(LinkedIn)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {stats.ready} Ready
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {stats.posted} Posted
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="text-gray-400 hover:text-gray-900 h-8 px-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Active Personas for Current Account */}
      {activePersonas && activePersonas.length > 0 && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
          <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest whitespace-nowrap">Active Personas:</span>
          <div className="flex flex-wrap gap-2">
            {activePersonas.map((p) => (
              <div 
                key={p.id} 
                className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500"
              >
                <span>{p.emoji}</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
