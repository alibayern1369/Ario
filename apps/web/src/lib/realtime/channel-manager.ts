import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type ChannelStatus = 'idle' | 'subscribing' | 'subscribed' | 'error' | 'closed';

type ManagedChannel = {
  name: string;
  channel: RealtimeChannel;
  status: ChannelStatus;
  refCount: number;
  ready: Promise<RealtimeChannel>;
  resolveReady: (ch: RealtimeChannel) => void;
  rejectReady: (err: Error) => void;
};

/**
 * Shared realtime layer: one managed channel per topic, subscribe-before-send,
 * ref-counted cleanup, and safe remount on auth changes.
 */
class RealtimeHub {
  private client: SupabaseClient | null = null;
  private channels = new Map<string, ManagedChannel>();
  private userId: string | null = null;

  private getClient() {
    if (!this.client) this.client = createClient();
    return this.client;
  }

  /** Drop all channels (logout / user switch). */
  reset(nextUserId: string | null = null) {
    const supabase = this.client;
    this.channels.forEach((entry) => {
      entry.status = 'closed';
      if (supabase) void supabase.removeChannel(entry.channel);
    });
    this.channels.clear();
    this.userId = nextUserId;
    this.client = null;
  }

  setUser(userId: string | null) {
    if (this.userId === userId) return;
    this.reset(userId);
  }

  /**
   * Acquire a channel. Configures handlers via `setup` only on first create.
   * Returns unsubscribe that decrements refcount and removes when zero.
   */
  acquire(
    name: string,
    setup: (channel: RealtimeChannel) => void,
    opts?: { presenceKey?: string },
  ): { channel: RealtimeChannel; ready: Promise<RealtimeChannel>; release: () => void } {
    let entry = this.channels.get(name);
    if (!entry || entry.status === 'closed' || entry.status === 'error') {
      if (entry) {
        void this.getClient().removeChannel(entry.channel);
        this.channels.delete(name);
      }
      let resolveReady!: (ch: RealtimeChannel) => void;
      let rejectReady!: (err: Error) => void;
      const ready = new Promise<RealtimeChannel>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const channel = opts?.presenceKey
        ? this.getClient().channel(name, { config: { presence: { key: opts.presenceKey } } })
        : this.getClient().channel(name);
      entry = {
        name,
        channel,
        status: 'idle',
        refCount: 0,
        ready,
        resolveReady,
        rejectReady,
      };
      setup(channel);
      entry.status = 'subscribing';
      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          entry!.status = 'subscribed';
          entry!.resolveReady(channel);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          entry!.status = 'error';
          entry!.rejectReady(err ?? new Error(`channel ${name} failed: ${status}`));
        } else if (status === 'CLOSED') {
          entry!.status = 'closed';
        }
      });
      this.channels.set(name, entry);
    }

    entry.refCount += 1;
    const release = () => {
      const current = this.channels.get(name);
      if (!current) return;
      current.refCount = Math.max(0, current.refCount - 1);
      if (current.refCount === 0) {
        current.status = 'closed';
        void this.getClient().removeChannel(current.channel);
        this.channels.delete(name);
      }
    };

    return { channel: entry.channel, ready: entry.ready, release };
  }

  /** Send broadcast only after the channel is subscribed. */
  async send(
    name: string,
    event: string,
    payload: Record<string, unknown>,
    setupIfMissing?: (channel: RealtimeChannel) => void,
  ) {
    let entry = this.channels.get(name);
    if (!entry || entry.status === 'closed' || entry.status === 'error') {
      const acquired = this.acquire(name, setupIfMissing ?? (() => undefined));
      entry = this.channels.get(name)!;
      // Keep a soft hold so transient send does not immediately tear down.
      // Caller of listen should still own the long-lived ref.
      window.setTimeout(() => acquired.release(), 15_000);
    }
    await entry.ready;
    await entry.channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  get(name: string) {
    return this.channels.get(name)?.channel ?? null;
  }
}

export const realtimeHub = new RealtimeHub();

export function conversationChannelName(conversationId: string) {
  return `conv:${conversationId}`;
}

export function callsChannelName(userId: string) {
  return `calls:${userId}`;
}

export const PRESENCE_CHANNEL = 'ario-presence';
