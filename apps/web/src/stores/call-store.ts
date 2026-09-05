'use client';

import { create } from 'zustand';
import { hasSupabaseConfig, publicEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from './auth-store';
import { useToastStore } from './toast-store';

type CallKind = 'audio' | 'video';
type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'reconnecting' | 'ended' | 'failed';

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
  listen: () => (() => void) | undefined;
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
let signalChannel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;

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
  listen: () => {
    if (!hasSupabaseConfig()) return undefined;
    const userId = useAuthStore.getState().userId;
    if (!userId) return undefined;
    const supabase = createClient();
    const ch = supabase.channel(`calls:${userId}`);
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
      void get().hangup();
    });
    ch.subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  },
  start: async ({ peerId, peerName, kind, conversationId }) => {
    if (!webrtcSupported()) {
      useToastStore.getState().push('این مرورگر از تماس پشتیبانی نمی‌کند.');
      return;
    }
    const me = useAuthStore.getState();
    if (!me.userId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video',
      });
      const supabase = createClient();
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
      await supabase.channel(`calls:${peerId}`).send({
        type: 'broadcast',
        event: 'ring',
        payload: {
          from: me.userId,
          name: me.profile?.display_name ?? 'ARIO',
          kind,
          callId: get().callId,
          conversationId,
        },
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
      await createClient().channel(`calls:${peerId}`).send({
        type: 'broadcast',
        event: 'hangup',
        payload: {},
      });
    }
    await cleanup('ended');
  },
  hangup: async () => {
    const state = get();
    const me = useAuthStore.getState().userId;
    if (state.peerId && hasSupabaseConfig()) {
      await createClient().channel(`calls:${state.peerId}`).send({
        type: 'broadcast',
        event: 'hangup',
        payload: {},
      });
    }
    if (state.callId && me && hasSupabaseConfig()) {
      const started = state.startedAt ?? Date.now();
      const duration = Math.max(0, Math.round((Date.now() - started) / 1000));
      await createClient()
        .from('calls')
        .update({
          ended_at: new Date().toISOString(),
          answered_at: state.phase === 'active' ? new Date(started).toISOString() : null,
          duration_seconds: duration,
        })
        .eq('id', state.callId);
      await createClient().from('call_participants').upsert([
        {
          call_id: state.callId,
          user_id: me,
          outcome: 'outgoing',
        },
        {
          call_id: state.callId,
          user_id: state.peerId ?? me,
          outcome: state.phase === 'incoming' || state.phase === 'outgoing' ? 'missed' : 'incoming',
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
    if (s === 'disconnected') useCallStore.setState({ phase: 'reconnecting' });
    if (s === 'failed') useCallStore.setState({ phase: 'failed' });
    if (s === 'connected') useCallStore.setState({ phase: 'active', startedAt: Date.now() });
  };
  const supabase = createClient();
  signalChannel = supabase.channel(`signal:${[me, state.peerId].sort().join(':')}`);
  signalChannel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
    const data = payload as { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
    if (data.sdp) {
      await pc?.setRemoteDescription(data.sdp);
      if (data.sdp.type === 'offer') {
        const answer = await pc?.createAnswer();
        if (answer) {
          await pc?.setLocalDescription(answer);
          await signalChannel?.send({ type: 'broadcast', event: 'signal', payload: { sdp: answer } });
        }
      }
    }
    if (data.candidate) await pc?.addIceCandidate(data.candidate);
  });
  await new Promise<void>((resolve) => {
    signalChannel?.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
    });
  });
  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      void signalChannel?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { candidate: ev.candidate.toJSON() },
      });
    }
  };
  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await signalChannel.send({ type: 'broadcast', event: 'signal', payload: { sdp: offer } });
  }
}

async function cleanup(phase: CallPhase) {
  pc?.close();
  pc = null;
  if (signalChannel && hasSupabaseConfig()) {
    void createClient().removeChannel(signalChannel);
  }
  signalChannel = null;
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
