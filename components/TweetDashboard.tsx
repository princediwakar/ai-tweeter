'use client';

import { useTweetDashboard } from '@/hooks/useTweetDashboard';
import { ModernDashboardHeader } from '@/components/dashboard/ModernDashboardHeader';
import { ModernAccountSelector } from '@/components/dashboard/ModernAccountSelector';
import { TweetPreview } from '@/components/dashboard/TweetPreview';
import { ModernGeneration } from '@/components/dashboard/ModernGeneration';
import { TweetHistoryToggle } from '@/components/dashboard/TweetHistoryToggle';
import { TweetHistory } from '@/components/dashboard/TweetHistory';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export default function TweetDashboard() {
  const {
    tweets,
    latestTweet,
    selectedTweets,
    loading,
    showHistory,
    generateForm,
    pagination,
    stats,
    accounts,
    selectedAccount,
    setSelectedTweets,
    setShowHistory,
    setGenerateForm,
    generateTweet,
    bulkGenerateTweets,
    postTweet,
    deleteTweet,
    deleteSelectedTweets,
    shareOnX,
    refreshData,
    switchAccount,
    refreshAccounts,
    goToPage,
    changePageSize,
    getStatusBadgeColor,
    getQualityGradeColor,
    formatForUserDisplay,
    personas,
    BULK_GENERATION_CONFIG,
  } = useTweetDashboard();

  const hasAccounts = accounts.length > 0;

  return (
    <div className="w-full max-w-5xl space-y-8">
      {!hasAccounts ? (
        <OnboardingFlow />
      ) : (
        <>
          <ModernAccountSelector 
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSwitchAccount={switchAccount}
            onRefresh={refreshAccounts}
          />

          <ModernDashboardHeader 
            stats={stats}
            onRefresh={refreshData}
            refreshing={loading}
          />

          {latestTweet && (
            <TweetPreview 
              tweet={latestTweet}
              personas={personas}
              onShare={shareOnX}
              loading={loading}
            />
          )}
        
          <ModernGeneration 
            form={generateForm}
            loading={loading}
            personas={personas}
            bulkCount={BULK_GENERATION_CONFIG.count}
            onFormChange={(updates) => setGenerateForm(prev => ({ ...prev, ...updates }))}
            onGenerate={generateTweet}
            onBulkGenerate={bulkGenerateTweets}
          />

          <TweetHistoryToggle 
            showHistory={showHistory}
            onToggle={() => setShowHistory(!showHistory)}
          />

          {showHistory && (
            <TweetHistory 
              tweets={tweets}
              selectedTweets={selectedTweets}
              onSelectionChange={setSelectedTweets}
              onDeleteSelected={deleteSelectedTweets}
              onPostTweet={postTweet}
              onDeleteTweet={deleteTweet}
              getStatusBadgeColor={getStatusBadgeColor}
              getQualityGradeColor={getQualityGradeColor}
              formatForUserDisplay={formatForUserDisplay}
              pagination={pagination}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          )}
        </>
      )}
    </div>
  );
}
