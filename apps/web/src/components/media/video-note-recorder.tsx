'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadAndSend } from '@/lib/uploads';
import { useToastStore } from '@/stores/toast-store';

export function VideoNoteRecorder({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [supported, setSupported] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSupported(false);
      return;
    }
    let stream: MediaStream | null = null;
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: 480, height: 480 }, audio: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {
        setSupported(false);
        useToastStore.getState().push('دسترسی دوربین داده نشد. می‌توانید ویدیوی معمولی پیوست کنید.');
      });
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [facing]);

  function start() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    chunks.current = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: rec.mimeType || 'video/webm' });
      setPreview(URL.createObjectURL(blob));
    };
    rec.start();
    recRef.current = rec;
  }

  async function send() {
    if (!chunks.current.length) return;
    const blob = new Blob(chunks.current, { type: 'video/webm' });
    const file = new File([blob], `note-${Date.now()}.webm`, { type: blob.type });
    await uploadAndSend(conversationId, [file]);
    onClose();
  }

  if (!supported) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-soft">پیام ویدیویی دایره‌ای در این دستگاه در دسترس نیست. از پیوست ویدیو استفاده کنید.</p>
        <button className="ario-btn ario-btn-ghost" onClick={onClose}>
          بستن
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {preview ? (
        <video src={preview} className="h-48 w-48 rounded-full object-cover" controls playsInline />
      ) : (
        <video ref={videoRef} className="h-48 w-48 rounded-full object-cover" autoPlay muted playsInline />
      )}
      <div className="flex gap-2">
        <button className="ario-btn ario-btn-ghost" onClick={onClose}>
          انصراف
        </button>
        <button className="ario-btn ario-btn-ghost" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}>
          تعویض دوربین
        </button>
        {!preview ? (
          <>
            <button className="ario-btn ario-btn-primary" onClick={start}>
              ضبط
            </button>
            <button className="ario-btn ario-btn-primary" onClick={() => recRef.current?.stop()}>
              پایان
            </button>
          </>
        ) : (
          <button className="ario-btn ario-btn-primary" onClick={() => void send()}>
            ارسال
          </button>
        )}
      </div>
    </div>
  );
}
