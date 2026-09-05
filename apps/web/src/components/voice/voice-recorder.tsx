'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Send, Trash2 } from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { uploadAndSend } from '@/lib/uploads';
import { useToastStore } from '@/stores/toast-store';

export function VoiceRecorder({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [supported, setSupported] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'rec' | 'paused' | 'preview'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSupported(false);
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      recRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        setBlob(new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' }));
        setPhase('preview');
      };
      rec.start();
      recRef.current = rec;
      setPhase('rec');
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      useToastStore.getState().push('برای ضبط صدا به میکروفون اجازه دهید.');
    }
  }

  function pause() {
    recRef.current?.pause();
    setPhase('paused');
    if (timer.current) window.clearInterval(timer.current);
  }

  function resume() {
    recRef.current?.resume();
    setPhase('rec');
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stop() {
    recRef.current?.stop();
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (timer.current) window.clearInterval(timer.current);
  }

  async function send() {
    if (!blob) return;
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
    await uploadAndSend(conversationId, [file]);
    onClose();
  }

  if (!supported) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-soft">ضبط صدا در این مرورگر پشتیبانی نمی‌شود.</p>
        <button className="ario-btn ario-btn-ghost" onClick={onClose}>
          بستن
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button className="ario-btn ario-btn-ghost px-3 text-[var(--ario-danger)]" onClick={onClose}>
        <Trash2 size={16} />
      </button>
      <div className="flex-1 text-sm">
        {phase === 'idle' ? 'برای شروع ضبط دکمه را بزنید' : formatDuration(seconds)}
      </div>
      {phase === 'idle' ? (
        <button className="ario-btn ario-btn-primary" onClick={() => void start()}>
          شروع ضبط
        </button>
      ) : null}
      {phase === 'rec' ? (
        <>
          <button className="ario-btn ario-btn-ghost" onClick={pause}>
            <Pause size={16} />
          </button>
          <button className="ario-btn ario-btn-primary" onClick={stop}>
            پایان
          </button>
        </>
      ) : null}
      {phase === 'paused' ? (
        <button className="ario-btn ario-btn-primary" onClick={resume}>
          <Play size={16} />
        </button>
      ) : null}
      {phase === 'preview' && blob ? (
        <>
          <audio src={URL.createObjectURL(blob)} controls className="h-10 max-w-[180px]" />
          <button className="ario-btn ario-btn-primary px-3" onClick={() => void send()}>
            <Send size={16} />
          </button>
        </>
      ) : null}
    </div>
  );
}
