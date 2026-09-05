'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { signedUrl } from '@/lib/storage/client';
import type { MessageRow } from '@/stores/chat-store';

let shared: HTMLAudioElement | null = null;

export function VoicePlayer({
  attachment,
}: {
  attachment: NonNullable<MessageRow['attachments']>[number];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState((attachment.duration_ms ?? 0) / 1000);

  useEffect(() => {
    void signedUrl(attachment.bucket, attachment.path).then(setUrl);
  }, [attachment.bucket, attachment.path]);

  useEffect(() => {
    if (!url) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration || duration);
    audio.ontimeupdate = () => setProgress(audio.currentTime);
    audio.onended = () => setPlaying(false);
    return () => {
      audio.pause();
    };
  }, [url, duration]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (shared && shared !== audio) {
      shared.pause();
    }
    if (playing) audio.pause();
    else {
      void audio.play();
      shared = audio;
    }
    setPlaying(!playing);
  }

  function cycleRate() {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  return (
    <div className="flex min-w-[220px] items-center gap-2">
      <button className="ario-btn ario-btn-ghost px-3" onClick={toggle}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 1}
        value={progress}
        className="flex-1"
        onChange={(e) => {
          const v = Number(e.target.value);
          if (audioRef.current) audioRef.current.currentTime = v;
          setProgress(v);
        }}
      />
      <span className="text-[11px]">{formatDuration(progress)}</span>
      <button className="text-[11px] font-bold" onClick={cycleRate}>
        {rate}x
      </button>
    </div>
  );
}
