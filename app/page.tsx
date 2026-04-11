"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import NavigationLayout from "@/components/NavigationLayout";
import {
  DashboardHeader,
  ImpactMetrics,
  RecentPosts,
  AIProfilesList,
  TopPerformer,
  Composer,
} from "@/components/dashboard";
import { toast } from "sonner";

interface Tweet {
  id: string;
  content: string;
  status: string;
  created_at: string;
  posted_at?: string;
  persona?: string;
  connected_account_id?: string;
  content_type?: string;
  image_url?: string;
  thread_id?: string;
  thread_sequence?: number;
}

interface Persona {
  id: string;
  key?: string;
  name: string;
  emoji: string;
  description?: string;
  is_active?: boolean;
  connected_account_id: string;
  topics?: string[];
}

interface Account {
  id: string;
  name: string;
  platform: string;
  account_username: string;
  profile_image_url?: string;
}

interface PipelineStats {
  drafts: number;
  ready: number;
  scheduled: number;
  posted: number;
}

interface PersonaStats {
  personaId: string;
  todayGenerated: number;
  todayPosted: number;
  lastActivity: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (personas.length > 0 && !selectedVoiceId) {
      const defaultVoice = personas.find((p) => p.is_active) || personas[0];
      setSelectedVoiceId(defaultVoice.id);
    }
  }, [personas, selectedVoiceId]);

  async function fetchDashboardData() {
    try {
      const dashboardRes = await fetch("/api/dashboard?page=1&limit=50");

      const dashboardData = await dashboardRes.json();

      if (dashboardData.error) {
        console.error("Dashboard error:", dashboardData.error);
      }

      setTweets(dashboardData.tweets?.data || []);
      setPersonas(dashboardData.personas || []);
      setAccounts(dashboardData.accounts || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const pipelineStats = useMemo((): PipelineStats => {
    return tweets.reduce(
      (acc, tweet) => {
        if (tweet.status === "draft") acc.drafts++;
        else if (tweet.status === "ready" || tweet.status === "scheduled")
          acc.ready++;
        else if (tweet.status === "posted") acc.posted++;
        return acc;
      },
      { drafts: 0, ready: 0, scheduled: 0, posted: 0 },
    );
  }, [tweets]);

  const personaStats = useMemo((): Map<string, PersonaStats> => {
    const stats = new Map<string, PersonaStats>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    personas.forEach((persona) => {
      stats.set(persona.id, {
        personaId: persona.id,
        todayGenerated: 0,
        todayPosted: 0,
        lastActivity: "",
      });
    });

    tweets.forEach((tweet) => {
      const createdDate = new Date(tweet.created_at);
      const isToday = createdDate >= today;

      if (tweet.persona && stats.has(tweet.persona)) {
        const stat = stats.get(tweet.persona)!;
        if (isToday) stat.todayGenerated++;
        if (tweet.status === "posted" && isToday) stat.todayPosted++;
        if (!stat.lastActivity || createdDate > new Date(stat.lastActivity)) {
          stat.lastActivity = tweet.created_at;
        }
      }
    });

    return stats;
  }, [tweets, personas]);

  const threadsInProgress = useMemo(() => {
    return tweets.filter(
      (t) =>
        t.thread_id && t.content_type === "thread" && t.status !== "posted",
    );
  }, [tweets]);

  const topPerformingTweet = useMemo(() => {
    return tweets.find((t) => t.status === "posted" && t.posted_at);
  }, [tweets]);

  const topPersona = personas[0];
  const topPersonaAccount = topPersona
    ? accounts.find((a) => a.id === topPersona.connected_account_id)
    : undefined;

  async function handleGenerate() {
    if (generating) return;

    const voiceId = selectedVoiceId || personas[0]?.id;
    if (!voiceId) {
      toast.error("No AI Profile selected. Create one first.");
      return;
    }

    const selectedVoice = personas.find((p) => p.id === voiceId);
    if (!selectedVoice) {
      toast.error("AI Profile not found");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          connected_account_id: selectedVoice.connected_account_id,
          persona: selectedVoice.id,
          persona_key: selectedVoice.key,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Handle both single post and thread responses
        if (data.tweets && data.tweets.length > 0) {
          // Thread response
          setTweets((prev) => [...data.tweets, ...prev]);
          toast.success(`Thread generated via ${selectedVoice.name}!`);
        } else if (data.post) {
          // Single post response
          setTweets((prev) => [data.post, ...prev]);
          toast.success(`Content generated via ${selectedVoice.name}!`);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to generate");
      }
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("Failed to generate content");
    } finally {
      setGenerating(false);
    }
  }

  const activePersonas = personas.filter((p) => p.is_active);

  const personaStatsMap = useMemo(() => {
    const map = new Map<string, { todayPosted: number; lastActivity?: string }>();
    personaStats.forEach((stat, id) => {
      map.set(id, {
        todayPosted: stat.todayPosted,
        lastActivity: stat.lastActivity || undefined,
      });
    });
    return map;
  }, [personaStats]);

  if (loading) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-6xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="h-6 bg-zinc-100 rounded w-32 animate-pulse" />
            <div className="h-10 bg-zinc-100 rounded w-80 animate-pulse" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 bg-zinc-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="w-full max-w-6xl mx-auto space-y-8 pb-24">
        <DashboardHeader activeCount={activePersonas.length} />

        <ImpactMetrics
          stats={pipelineStats}
          threadsInProgress={threadsInProgress.length}
          topPersona={topPersona}
          topPersonaAccount={topPersonaAccount}
        />

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <RecentPosts
              tweets={tweets}
              personas={personas}
              accounts={accounts}
            />
          </div>

          <div className="space-y-6">
            <AIProfilesList
              personas={personas}
              accounts={accounts}
              stats={personaStatsMap}
            />
            {topPerformingTweet && (
              <TopPerformer content={topPerformingTweet.content} />
            )}
          </div>
        </div>

        <Composer
          personas={personas}
          accounts={accounts}
          selectedVoiceId={selectedVoiceId}
          onVoiceChange={setSelectedVoiceId}
          onGenerate={handleGenerate}
          generating={generating}
        />
      </div>
    </NavigationLayout>
  );
}