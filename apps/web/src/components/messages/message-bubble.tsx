'use client';

import { useState } from 'react';
import { Check, CheckCheck, Clock, RotateCcw } from 'lucide-react';
import { REACTION_SET } from '@ario/shared';
import { formatTime } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore, type MessageRow } from '@/stores/chat-store';
import { AttachmentView } from '@/components/media/attachment-view';
import { VoicePlayer } from '@/components/voice/voice-player';
import { isVoiceMessageType } from '@/lib/uploads';

export function MessageBubble({
  message,
  grouped,
  onReply,
  onEdit,
  onForward,
}: {
  message: MessageRow;
  grouped?: boolean;
  onReply: (m: MessageRow) => void;
  onEdit: (m: MessageRow) => void;
  onForward: (m: MessageRow) => void;
}) {
  const me = useAuthStore((s) => s.userId);
  const mine = message.sender_id === me;
  const [menu, setMenu] = useState(false);
  const react = useChatStore((s) => s.react);
  const delMe = useChatStore((s) => s.deleteForMe);
  const delAll = useChatStore((s) => s.deleteForEveryone);
  const pin = useChatStore((s) => s.pinMessage);
  const retry = useChatStore((s) => s.retry);

  if (message.deleted_for_everyone) {
    return (
      <div className={`flex ${mine ? 'justify-start' : 'justify-end'} px-ario-3`}>
        <div className="ario-type-meta rounded-ario bg-[var(--ario-accent-soft)] px-ario-3 py-ario-2 text-muted">
          این پیام حذف شد
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex ${mine ? 'justify-start' : 'justify-end'} px-ario-3`}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu(true);
      }}
    >
      <button
        type="button"
        className={`max-w-[82%] px-ario-3 py-ario-2 text-right ario-type-message ${
          mine ? 'ario-bubble-mine' : 'ario-bubble-theirs'
        } ${grouped ? 'mt-0.5' : 'mt-ario-2'} ${
          message.localStatus === 'failed' ? 'ring-1 ring-[var(--ario-danger)]' : ''
        }`}
        onClick={() => setMenu((v) => !v)}
      >
        {message.reply_to ? (
          <div
            className={`mb-ario-2 border-r-2 pr-ario-2 ario-type-meta opacity-90 ${
              mine ? 'border-white/50' : 'border-accent'
            }`}
          >
            پاسخ
          </div>
        ) : null}
        <MessageBody message={message} />
        <div
          className={`mt-1 flex items-center justify-end gap-1 ario-type-meta ${
            mine ? 'opacity-80' : 'text-muted'
          }`}
        >
          {message.edited_at ? <span>ویرایش‌شده</span> : null}
          <span>{formatTime(message.created_at)}</span>
          {mine ? <StatusIcon status={message.localStatus} /> : null}
        </div>
        {message.reactions && message.reactions.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(
              message.reactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                return acc;
              }, {}),
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className={`rounded-ario-pill px-1.5 ario-type-meta ${
                  mine ? 'bg-black/15' : 'bg-[var(--ario-accent-soft)]'
                }`}
              >
                {emoji} {count}
              </span>
            ))}
          </div>
        ) : null}
      </button>
      {menu ? (
        <div className="glass-strong absolute z-30 mt-12 w-52 rounded-ario border border-[var(--ario-glass-border-strong)] p-ario-2 shadow-ario">
          <div className="mb-ario-2 flex flex-wrap gap-1 border-b border-[var(--ario-line)] pb-ario-2">
            {REACTION_SET.map((e) => (
              <button
                key={e}
                type="button"
                className="min-h-9 rounded-ario-sm px-1.5 text-lg transition hover:bg-accent-soft"
                onClick={() => {
                  void react(message.id, e);
                  setMenu(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <MenuItem
            label="پاسخ"
            onClick={() => {
              onReply(message);
              setMenu(false);
            }}
          />
          <MenuItem
            label="رونوشت"
            onClick={() => {
              void navigator.clipboard.writeText(message.content ?? '');
              setMenu(false);
            }}
          />
          {mine ? (
            <MenuItem
              label="ویرایش"
              onClick={() => {
                onEdit(message);
                setMenu(false);
              }}
            />
          ) : null}
          <MenuItem
            label="هدایت"
            onClick={() => {
              onForward(message);
              setMenu(false);
            }}
          />
          <MenuItem
            label="سنجاق"
            onClick={() => {
              void pin(message.id, !message.pinned);
              setMenu(false);
            }}
          />
          <MenuItem
            label="حذف برای من"
            onClick={() => {
              void delMe(message.id);
              setMenu(false);
            }}
          />
          {mine ? (
            <MenuItem
              label="حذف برای همه"
              onClick={() => {
                void delAll(message.id);
                setMenu(false);
              }}
            />
          ) : null}
          {message.localStatus === 'failed' ? (
            <MenuItem
              label="تلاش دوباره"
              onClick={() => {
                void retry(message.conversation_id, message.client_id ?? message.id);
                setMenu(false);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MessageBody({ message }: { message: MessageRow }) {
  if (isVoiceMessageType(message.type) && message.attachments?.[0]) {
    return <VoicePlayer attachment={message.attachments[0]} />;
  }
  if (message.attachments && message.attachments.length > 0) {
    return (
      <div className="space-y-2">
        {message.attachments.map((a) => (
          <AttachmentView key={a.id} attachment={a} />
        ))}
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : null}
      </div>
    );
  }
  return <p className="whitespace-pre-wrap break-words">{linkify(message.content ?? '')}</p>;
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    part.startsWith('http') ? (
      <a key={i} href={part} className="ltr-isolate underline" target="_blank" rel="noreferrer">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function StatusIcon({ status }: { status?: MessageRow['localStatus'] }) {
  if (status === 'sending') return <Clock size={12} />;
  if (status === 'failed') return <RotateCcw size={12} />;
  if (status === 'read') return <CheckCheck size={12} />;
  if (status === 'delivered') return <CheckCheck size={12} className="opacity-70" />;
  return <Check size={12} />;
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="ario-type-caption block w-full rounded-ario-sm px-ario-2 py-ario-2 text-right text-ink hover:bg-accent-soft"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
