'use client';

import { create } from 'zustand';
import { hasSupabaseConfig, publicEnv } from '@/lib/env';
import { callsChannelName, realtimeHub } from '@/lib/realtime/channel-manager';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from './auth-store';
import { useToastStore } from './toast-store';

type CallKind = 'audio' | 'video';
type CallPhase =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'active'
  | 'reconnecting'
  | 'ended'
  | 'failed';

type CallState = {
  phase: CallPhase;
  kind: CallKind;
  peerId: string | null;
  peerName: string;
  callId: string | null;
  conversationId: string | null;
  muted: boolean;
  cameraOff: boolean;
  startedAt: number | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  listen: (userId: string) => (() => void) | undefined;
  start: (input: {
    peerId: string;
    peerName: string;
    kind: CallKind;
    conversationId?: string;
  }) => Promise<void>;
  accept: () => Promise<void>;
  decline: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
};

let pc: RTCPeerConnection | null = null;
let signalRelease: (() => void) | null = null;
let signalTopic: string | null = null;

function iceServers(): RTCIceServer[] {
  return publicEnv().stunUrls.map((urls) => ({ urls }));
}

async function attachTurn(servers: RTCIceServer[]) {
  try {
    const res = await fetch('/api/turn');
    if (!res.ok) return servers;
    const data = (await res.json()) as { iceServers?: RTCIceServer[] };
    return [...servers, ...(data.iceServers ?? [])];
  } catch {
    return servers;
  }
}

function webrtcSupported() {
  return typeof RTCPeerConnection !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

function signalName(a: string, b: string) {
  return `signal:${[a, b].sort().join(':')}`;
}

async function sendCallEvent(peerId: string, event: string, payload: Record<string, unknown>) {
  await realtimeHub.send(callsChannelName(peerId), event, payload);
}

export const useCallStore = create<CallState>((set, get) => ({
  phase: 'idle',
  kind: 'audio',
  peerId: null,
  peerName: '',
  callId: null,
  conversationId: null,
  muted: false,
  cameraOff: false,
  startedAt: null,
  localStream: null,
  remoteStream: null,
  listen: (userId) => {
    if (!hasSupabaseConfig() || !userId) return undefined;
    const { release } = realtimeHub.acquire(callsChannelName(userId), (ch) => {
      ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
        const p = payload as {
          from: string;
          name: string;
          kind: CallKind;
          callId: string;
          conversationId?: string;
        };
        if (get().phase !== 'idle') return;
        set({
          phase: 'incoming',
          kind: p.kind,
          peerId: p.from,
          peerName: p.name,
          callId: p.callId,
          conversationId: p.conversationId ?? null,
        });
      });
      ch.on('broadcast', { event: 'hangup' }, () => {
        void cleanup('ended');
      });
      ch.on('broadcast', { event: 'decline' }, () => {
        void cleanup('ended');
      });
    });
    return () => release();
  },
  start: async ({ peerId, peerName, kind, conversationId }) => {
    if (!webrtcSupported()) {
      useToastStore.getState().push('این مرورگر از تماس پشتیبانی نمی‌کند.');
      return;
    }
    const me = useAuthStore.getState();
    if (!me.userId) return;
    try {
      const supabase = createClient();
      const { data: blocked } = await supabase.rpc('is_blocked_either', {
        a: me.userId,
        b: peerId,
      });
      if (blocked) {
        useToastStore.getState().push('امکان تماس با این کاربر وجود ندارد.');
        return;
      }
      const { data: peerPrivacy } = await supabase
        .from('privacy_settings')
        .select('calls')
        .eq('user_id', peerId)
        .maybeSingle();
      if (peerPrivacy?.calls === 'nobody') {
        useToastStore.getState().push('این کاربر تماس دریافت نمی‌کند.');
        return;
      }
      if (peerPrivacy?.calls === 'contacts') {
        const { data: contacts } = await supabase.rpc('are_direct_contacts', {
          a: me.userId,
          b: peerId,
        });
        if (!contacts) {
          useToastStore.getState().push('این کاربر فقط از مخاطبین تماس می‌پذیرد.');
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video',
      });
      const { data: call } = await supabase
        .from('calls')
        .insert({ kind, initiator_id: me.userId, conversation_id: conversationId ?? null })
        .select('id')
        .single();
      set({
        phase: 'outgoing',
        kind,
        peerId,
        peerName,
        callId: call?.id ?? crypto.randomUUID(),
        conversationId: conversationId ?? null,
        localStream: stream,
      });
      await sendCallEvent(peerId, 'ring', {
        from: me.userId,
        name: me.profile?.display_name ?? 'ARIO',
        kind,
        callId: get().callId,
        conversationId,
      });
      await setupPeer(true);
    } catch (err) {
      const name = (err as Error).name;
      set({ phase: 'failed' });
      useToastStore
        .getState()
        .push(name === 'NotAllowedError' ? 'دسترسی میکروفون یا دوربین داده نشد.' : 'تماس شروع نشد.');
    }
  },
  accept: async () => {
    if (!webrtcSupported()) {
      useToastStore.getState().push('این مرورگر از تماس پشتیبانی نمی‌کند.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: get().kind === 'video',
      });
      set({ localStream: stream, phase: 'connecting' });
      await setupPeer(false);
    } catch {
      set({ phase: 'failed' });
    }
  },
  decline: async () => {
    const { peerId } = get();
    if (peerId && hasSupabaseConfig()) {
      await sendCallEvent(peerId, 'decline', {});
    }
    await cleanup('ended');
  },
  hangup: async () => {
    const state = get();
    const me = useAuthStore.getState().userId;
    if (state.peerId && hasSupabaseConfig()) {
      await sendCallEvent(state.peerId, 'hangup', {});
    }
    if (state.callId && me && hasSupabaseConfig()) {
      const started = state.startedAt ?? Date.now();
      const duration = Math.max(0, Math.round((Date.now() - started) / 1000));
      const answered = state.phase === 'active' || state.phase === 'reconnecting';
      await createClient()
        .from('calls')
        .update({
          ended_at: new Date().toISOString(),
          answered_at: answered ? new Date(started).toISOString() : null,
          duration_seconds: duration,
        })
        .eq('id', state.callId);
      await createClient().from('call_participants').upsert([
        {
          call_id: state.callId,
          user_id: me,
          outcome: state.phase === 'incoming' ? 'incoming' : 'outgoing',
        },
        {
          call_id: state.callId,
          user_id: state.peerId ?? me,
          outcome: answered ? 'incoming' : 'missed',
        },
      ]);
    }
    await cleanup('ended');
  },
  toggleMute: () => {
    const stream = get().localStream;
    stream?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    set({ muted: !get().muted });
  },
  toggleCamera: () => {
    const stream = get().localStream;
    stream?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    set({ cameraOff: !get().cameraOff });
  },
  switchCamera: async () => {
    const stream = get().localStream;
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    const facing = track.getSettings().facingMode === 'user' ? 'environment' : 'user';
    const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
    const newTrack = next.getVideoTracks()[0];
    if (!newTrack) return;
    stream?.removeTrack(track);
    stream?.addTrack(newTrack);
    const sender = pc?.getSenders().find((s) => s.track?.kind === 'video');
    await sender?.replaceTrack(newTrack);
    track.stop();
  },
}));

async function setupPeer(isInitiator: boolean) {
  const state = useCallStore.getState();
  const me = useAuthStore.getState().userId;
  if (!state.peerId || !me) return;
  const servers = await attachTurn(iceServers());
  pc = new RTCPeerConnection({ iceServers: servers });
  state.localStream?.getTracks().forEach((t) => pc?.addTrack(t, state.localStream!));
  const remote = new MediaStream();
  pc.ontrack = (ev) => {
    ev.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
    useCallStore.setState({ remoteStream: remote, phase: 'active', startedAt: Date.now() });
  };
  pc.oniceconnectionstatechange = () => {
    const s = pc?.iceConnectionState;
    if (s === 'disconnected') {
      useCallStore.setState({ phase: 'reconnecting' });
      try {
        pc?.restartIce();
      } catch {
        /* ignore */
      }
    }
    if (s === 'failed') useCallStore.setState({ phase: 'failed' });
    if (s === 'connected') useCallStore.setState({ phase: 'active', startedAt: Date.now() });
  };

  signalTopic = signalName(me, state.peerId);
  const acquired = realtimeHub.acquire(signalTopic, (ch) => {
    ch.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const data = payload as { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
      if (data.sdp) {
        await pc?.setRemoteDescription(data.sdp);
        if (data.sdp.type === 'offer') {
          const answer = await pc?.createAnswer();
          if (answer) {
            await pc?.setLocalDescription(answer);
            await realtimeHub.send(signalTopic!, 'signal', { sdp: answer });
          }
        }
      }
      if (data.candidate) await pc?.addIceCandidate(data.candidate);
    });
  });
  signalRelease = acquired.release;
  await acquired.ready;

  pc.onicecandidate = (ev) => {
    if (ev.candidate && signalTopic) {
      void realtimeHub.send(signalTopic, 'signal', { candidate: ev.candidate.toJSON() });
    }
  };
  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await realtimeHub.send(signalTopic, 'signal', { sdp: offer });
  }
}

async function cleanup(phase: CallPhase) {
  pc?.close();
  pc = null;
  signalRelease?.();
  signalRelease = null;
  signalTopic = null;
  useCallStore.getState().localStream?.getTracks().forEach((t) => t.stop());
  useCallStore.setState({
    phase,
    localStream: null,
    remoteStream: null,
    muted: false,
    cameraOff: false,
    startedAt: null,
    peerId: null,
    callId: null,
  });
  window.setTimeout(() => {
    if (useCallStore.getState().phase === 'ended' || useCallStore.getState().phase === 'failed') {
      useCallStore.setState({ phase: 'idle' });
    }
  }, 1600);
}
