import { Button } from '@/components/ui/button';
import { Twitter, Loader2 } from 'lucide-react';
import { Tweet, Persona } from '@/types/dashboard';

interface TweetPreviewProps {
  tweet: Tweet;
  personas: Persona[];
  onShare: (tweet: Tweet) => void;
  loading?: boolean;
}

export function TweetPreview({ tweet, personas, onShare, loading = false }: TweetPreviewProps) {
  return (
    <section className="border-4 border-border container-brutal brutal-shadow">
      <div className="p-5 border-b-4 border-border bg-accent">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display-brutal text-accent-foreground flex items-center gap-3">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary cyber-glow" />
                <span>GENERATING_TWEET...</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-primary rounded-full cyber-glow"></div>
                <span>LATEST_GENERATED_TWEET</span>
              </>
            )}
          </h2>
          <Button
            onClick={() => onShare(tweet)}
            disabled={loading}
            className="border-2 border-border bg-primary text-primary-foreground brutal-shadow-sm hover:bg-primary/90 font-mono-brutal text-sm"
          >
            <Twitter className="h-4 w-4 mr-2" /> SHARE_ON_X
          </Button>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-2 h-2 bg-secondary rounded-full"></div>
          <span className="text-xs font-mono-brutal text-muted-foreground">
            TWEET_PREVIEW: REAL-TIME_GENERATION
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="border-2 border-border bg-card p-5 grid-overlay-dense">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary cyber-glow mb-4" />
              <p className="font-mono-brutal text-foreground text-sm mb-2">GENERATING_FRESH_CONTENT</p>
              <p className="text-muted-foreground font-mono-brutal text-xs">AI_MODEL_PROCESSING...</p>
              <div className="flex gap-1 mt-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-foreground leading-relaxed font-mono-brutal text-sm whitespace-pre-wrap">{tweet.content}</p>
              {tweet.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {tweet.hashtags.map((hashtag, index) => (
                    <span key={index} className="border border-border bg-accent text-accent-foreground px-3 py-1 font-mono-brutal text-xs brutal-shadow-sm">
                      #{hashtag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!loading && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-brutal text-muted-foreground">CHAR_COUNT:</span>
                <span className="text-sm font-mono-brutal font-bold text-foreground">{tweet.content.length}/280</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-brutal text-muted-foreground">QUALITY_GRADE:</span>
                <span className={`text-sm font-mono-brutal font-bold ${
                  tweet.qualityScore?.grade === 'A' ? 'text-primary' :
                  tweet.qualityScore?.grade === 'B' ? 'text-secondary' :
                  tweet.qualityScore?.grade === 'C' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {tweet.qualityScore?.grade || 'N/A'}
                </span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-brutal text-muted-foreground">PERSONA:</span>
                <span className="text-sm font-mono-brutal font-bold text-foreground">
                  {personas.find(p => p.id === tweet.persona)?.name.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}