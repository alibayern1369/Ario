'use client';

import { useEffect, useRef } from 'react';
import { formatDuration } from '@/lib/format';
import { useCallStore } from '@/stores/call-store';

export function CallOverlay() {
  const state = useCallStore();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = state.localStream;
    if (remoteRef.current) remoteRef.current.srcObject = state.remoteStream;
  }, [state.localStream, state.remoteStream]);

  if (state.phase === 'idle') return null;

  const label =
    state.phase === 'outgoing'
      ? 'در حال زنگ خوردن…'
      : state.phase === 'incoming'
        ? 'تماس ورودی'
        : state.phase === 'connecting'
          ? 'در حال اتصال…'
          : state.phase === 'reconnecting'
            ? 'اتصال دوباره…'
            : state.phase === 'failed'
              ? 'تماس برقرار نشد'
              : state.phase === 'ended'
                ? 'تماس پایان یافت'
                : state.startedAt
                  ? formatDuration((Date.now() - state.startedAt) / 1000)
                  : 'متصل';

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-[#0c0b09] text-[#f4efe6]">
      {state.kind === 'video' ? (
        <video ref={remoteRef} className="absolute inset-0 h-full w-full object-cover" autoPlay playsInline />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-28 w-28 rounded-full bg-accent" />
          <h2 className="text-2xl font-bold">{state.peerName}</h2>
          <p className="text-soft">{label}</p>
        </div>
      )}
      {state.kind === 'video' ? (
        <video
          ref={localRef}
          className="absolute bottom-28 left-4 h-36 w-28 rounded-ario object-cover"
          autoPlay
          muted
          playsInline
        />
      ) : null}
      <div className="relative z-10 mt-auto flex justify-center gap-3 p-6">
        {state.phase === 'incoming' ? (
          <>
            <button className="ario-btn bg-[var(--ario-danger)] text-white" onClick={() => void state.decline()}>
              رد
            </button>
            <button className="ario-btn bg-[var(--ario-success)] text-white" onClick={() => void state.accept()}>
              پذیرش
            </button>
          </>
        ) : (
          <>
            <button className="ario-btn ario-btn-ghost" onClick={state.toggleMute}>
              {state.muted ? 'صدا باز' : 'قطع صدا'}
            </button>
            {state.kind === 'video' ? (
              <>
                <button className="ario-btn ario-btn-ghost" onClick={state.toggleCamera}>
                  دوربین
                </button>
                <button className="ario-btn ario-btn-ghost" onClick={() => void state.switchCamera()}>
                  تعویض
                </button>
              </>
            ) : null}
            <button className="ario-btn bg-[var(--ario-danger)] text-white" onClick={() => void state.hangup()}>
              پایان
            </button>
          </>
        )}
      </div>
    </div>
  );
}
