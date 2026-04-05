'use client';

import { useTweetDashboard } from '@/hooks/useTweetDashboard';
import { MinimalHeader } from './MinimalHeader';
import { MinimalComposer } from './MinimalComposer';
import { MinimalHistory } from './MinimalHistory';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export default function MinimalDashboard() {
  const {
    tweets,
    loading,
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
    refreshAccounts,
    personas,
    BULK_GENERATION_CONFIG,
  } = useTweetDashboard();

  const hasAccounts = accounts.length > 0;

  if (!hasAccounts) {
    return <OnboardingFlow />;
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
