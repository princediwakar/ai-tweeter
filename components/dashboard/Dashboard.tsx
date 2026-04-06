// components/dashboard/Dashboard.tsx
'use client';

import { useTweetDashboard } from '@/hooks/useTweetDashboard';
import { MinimalHeader } from './Header';
import { MinimalComposer } from './Composer';
import { MinimalHistory } from './History';
import { MinimalHeaderSkeleton } from './Header';
import { MinimalComposerSkeleton } from './Composer';
import { MinimalHistorySkeleton } from './History';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export default function MinimalDashboard() {
  const {
    tweets,
    loading,
    initialLoading,
    generateForm,
    stats,
    accounts,
    selectedAccount,
    setGenerateForm,
    generateTweet,
    bulkGenerateTweets,
    postTweet,
    deleteTweet,
    refreshData,
    switchAccount,
    personas,
    BULK_GENERATION_CONFIG,
  } = useTweetDashboard();

  const hasAccounts = accounts.length > 0;

  // Show onboarding only after initial load completes AND no accounts exist
  if (!initialLoading && !hasAccounts) {
    return <OnboardingFlow />;
  }

  // Show loading skeletons during initial data fetch only
  if (initialLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
        <MinimalHeaderSkeleton />
        <MinimalComposerSkeleton />
        <MinimalHistorySkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header with Switcher & Refresh */}
      <MinimalHeader
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSwitchAccount={switchAccount}
        onRefresh={refreshData}
        loading={loading}
        stats={stats}
        activePersonas={personas}
      />

      {/* The Core Action: Compose & Generate */}
      <MinimalComposer
        form={generateForm}
        loading={loading}
        personas={personas}
        bulkCount={BULK_GENERATION_CONFIG.count}
        onFormChange={(updates) => setGenerateForm(prev => ({ ...prev, ...updates }))}
        onGenerate={generateTweet}
        onBulkGenerate={bulkGenerateTweets}
      />

      {/* The Activity Log */}
      <MinimalHistory
        tweets={tweets}
        onPostTweet={postTweet}
        onDeleteTweet={deleteTweet}
        loading={loading}
      />
    </div>
  );
}