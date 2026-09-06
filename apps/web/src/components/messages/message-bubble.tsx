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
      <div className={`flex ${mine ? 'justify-start' : 'justify-end'} px-3`}>
        <div className="rounded-ario bg-[var(--ario-accent-soft)] px-3 py-2 text-xs text-muted">
          این پیام حذف شد
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex ${mine ? 'justify-start' : 'justify-end'} px-3`}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu(true);
      }}
    >
      <button
        type="button"
        className={`max-w-[82%] rounded-[20px] px-3 py-2 text-right shadow-sm ${
          mine ? 'bg-mine text-[var(--ario-mine-text)]' : 'bg-theirs text-[var(--ario-theirs-text)]'
        } ${grouped ? 'mt-0.5' : 'mt-2'}`}
        onClick={() => setMenu((v) => !v)}
      >
        {message.reply_to ? (
          <div className="mb-1 border-r-2 border-gold pr-2 text-xs opacity-80">پاسخ</div>
        ) : null}
        <MessageBody message={message} />
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-80">
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
              <span key={emoji} className="rounded-full bg-black/10 px-1.5 text-xs">
                {emoji} {count}
              </span>
            ))}
          </div>
        ) : null}
      </button>
      {menu ? (
        <div className="absolute z-30 mt-12 w-52 rounded-ario bg-[var(--ario-surface-solid)] p-2 shadow-ario-lg">
          <div className="mb-2 flex flex-wrap gap-1">
            {REACTION_SET.map((e) => (
              <button key={e} className="text-lg" onClick={() => void react(message.id, e)}>
                {e}
              </button>
            ))}
          </div>
          <MenuItem label="پاسخ" onClick={() => onReply(message)} />
          <MenuItem
            label="رونوشت"
            onClick={() => void navigator.clipboard.writeText(message.content ?? '')}
          />
          {mine ? <MenuItem label="ویرایش" onClick={() => onEdit(message)} /> : null}
          <MenuItem label="هدایت" onClick={() => onForward(message)} />
          <MenuItem label="سنجاق" onClick={() => void pin(message.id, !message.pinned)} />
          <MenuItem label="حذف برای من" onClick={() => void delMe(message.id)} />
          {mine ? <MenuItem label="حذف برای همه" onClick={() => void delAll(message.id)} /> : null}
          {message.localStatus === 'failed' ? (
            <MenuItem
              label="تلاش دوباره"
              onClick={() => void retry(message.conversation_id, message.client_id ?? message.id)}
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
        {message.content ? <p className="whitespace-pre-wrap break-words">{message.content}</p> : null}
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
    <button className="block w-full rounded-xl px-2 py-2 text-right text-sm hover:bg-accent-soft" onClick={onClick}>
      {label}
    </button>
  );
}
