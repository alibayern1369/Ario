'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Paperclip, Send, Video } from 'lucide-react';
import { useChatStore, type MessageRow } from '@/stores/chat-store';
import { useToastStore } from '@/stores/toast-store';
import { uploadAndSend } from '@/lib/uploads';
import { VoiceRecorder } from '@/components/voice/voice-recorder';
import { VideoNoteRecorder } from '@/components/media/video-note-recorder';

export function Composer({
  conversationId,
  reply,
  editing,
  onClear,
  canSend = true,
}: {
  conversationId: string;
  reply: MessageRow | null;
  editing: MessageRow | null;
  onClear: () => void;
  canSend?: boolean;
}) {
  const send = useChatStore((s) => s.sendText);
  const edit = useChatStore((s) => s.editMessage);
  const setDraft = useChatStore((s) => s.setDraft);
  const setTyping = useChatStore((s) => s.setTyping);
  const draft = useChatStore(
    (s) => s.conversations.find((c) => c.id === conversationId)?.membership?.draft ?? '',
  );
  const [text, setText] = useState(draft);
  const [voice, setVoice] = useState(false);
  const [videoNote, setVideoNote] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(editing?.content ?? draft);
  }, [editing, draft]);

  function onChange(value: string) {
    setText(value);
    setTyping(conversationId, value ? 'typing' : 'off');
  }

  async function submit() {
    const value = text.trim();
    if (!value) return;
    if (editing) await edit(editing.id, conversationId, value);
    else await send(conversationId, value, reply?.id);
    setText('');
    setTyping(conversationId, 'off');
    onClear();
  }

  return (
    <div className="glass border-t border-[var(--ario-line)] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {reply || editing ? (
        <div className="mb-2 flex items-center justify-between rounded-ario bg-accent-soft px-3 py-2 text-sm">
          <span>{editing ? 'ویرایش پیام' : 'پاسخ'}</span>
          <button onClick={onClear}>بستن</button>
        </div>
      ) : null}
      {voice ? (
        <VoiceRecorder
          conversationId={conversationId}
          onClose={() => {
            setVoice(false);
            setTyping(conversationId, 'off');
          }}
        />
      ) : videoNote ? (
        <VideoNoteRecorder
          conversationId={conversationId}
          onClose={() => {
            setVideoNote(false);
            setTyping(conversationId, 'off');
          }}
        />
      ) : (
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              if (!files.length) return;
              setTyping(conversationId, 'uploading');
              try {
                await uploadAndSend(conversationId, files, text);
                setText('');
              } catch {
                useToastStore.getState().push('بارگذاری انجام نشد.');
              } finally {
                setTyping(conversationId, 'off');
                e.target.value = '';
              }
            }}
          />
          <button className="ario-btn ario-btn-ghost px-3" onClick={() => fileRef.current?.click()} disabled={!canSend}>
            <Paperclip size={18} />
          </button>
          <textarea
            className="ario-field max-h-32 min-h-[44px] flex-1 resize-none"
            rows={1}
            value={text}
            disabled={!canSend}
            placeholder={canSend ? 'پیام بنویسید…' : 'ارسال پیام برای شما غیرفعال است'}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => void setDraft(conversationId, text)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          {text.trim() ? (
            <button className="ario-btn ario-btn-primary px-3" onClick={() => void submit()} disabled={!canSend}>
              <Send size={18} />
            </button>
          ) : (
            <>
              <button
                className="ario-btn ario-btn-ghost px-3"
                disabled={!canSend}
                onClick={() => {
                  setTyping(conversationId, 'recording');
                  setVoice(true);
                }}
              >
                <Mic size={18} />
              </button>
              <button className="ario-btn ario-btn-ghost px-3" disabled={!canSend} onClick={() => setVideoNote(true)}>
                <Video size={18} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
