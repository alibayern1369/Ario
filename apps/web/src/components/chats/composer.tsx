'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Paperclip, Send, Video, X } from 'lucide-react';
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
    <div className="glass-medium border-t border-[var(--ario-glass-border)] px-ario-3 pt-ario-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {reply || editing ? (
        <div className="mb-ario-2 flex items-center justify-between gap-ario-2 rounded-ario border border-[var(--ario-line)] bg-[var(--ario-accent-soft)] px-ario-3 py-ario-2">
          <div className="min-w-0">
            <div className="ario-type-meta text-accent">{editing ? 'ویرایش پیام' : 'پاسخ'}</div>
            <p className="ario-type-caption truncate text-soft">
              {(editing ?? reply)?.content?.slice(0, 80) || 'رسانه'}
            </p>
          </div>
          <button type="button" className="ario-btn ario-btn-icon !min-h-9 !w-9" onClick={onClear} aria-label="بستن">
            <X size={16} />
          </button>
        </div>
      ) : null}
      {voice ? (
        <div className="rise rounded-ario-lg bg-[var(--ario-surface-elevated)] p-ario-2">
          <VoiceRecorder
            conversationId={conversationId}
            onClose={() => {
              setVoice(false);
              setTyping(conversationId, 'off');
            }}
          />
        </div>
      ) : videoNote ? (
        <div className="rise rounded-ario-lg bg-[var(--ario-surface-elevated)] p-ario-2">
          <VideoNoteRecorder
            conversationId={conversationId}
            onClose={() => {
              setVideoNote(false);
              setTyping(conversationId, 'off');
            }}
          />
        </div>
      ) : (
        <div className="flex items-end gap-ario-2">
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
          <button
            type="button"
            className="ario-btn ario-btn-icon shrink-0"
            onClick={() => fileRef.current?.click()}
            disabled={!canSend}
            aria-label="پیوست"
          >
            <Paperclip size={18} />
          </button>
          <textarea
            className="ario-field ario-field-composer max-h-32 min-h-[44px] flex-1 resize-none"
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
            <button
              type="button"
              className="ario-btn ario-btn-primary !min-h-11 !w-11 shrink-0 !px-0"
              onClick={() => void submit()}
              disabled={!canSend}
              aria-label="ارسال"
            >
              <Send size={18} />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ario-btn ario-btn-icon shrink-0"
                disabled={!canSend}
                aria-label="پیام صوتی"
                onClick={() => {
                  setTyping(conversationId, 'recording');
                  setVoice(true);
                }}
              >
                <Mic size={18} />
              </button>
              <button
                type="button"
                className="ario-btn ario-btn-icon shrink-0"
                disabled={!canSend}
                aria-label="ویدیو نوت"
                onClick={() => setVideoNote(true)}
              >
                <Video size={18} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
