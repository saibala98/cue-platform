import type { ChatMessageView, KnowledgeMapMeta, SourceDocumentMeta } from '../../types';

interface Props {
  message: ChatMessageView;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function SourceTag({ meta }: { meta: SourceDocumentMeta }) {
  const location = [meta.pageNumber !== null ? `Page ${meta.pageNumber}` : null, meta.sectionHeader ? `Section: ${meta.sectionHeader}` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2 text-xs">
      <span className="mt-0.5">📄</span>
      <div>
        <p className="font-mono text-brand-green">Source: {meta.fileName}</p>
        {location && <p className="mt-0.5 text-brand-faint">{location}</p>}
      </div>
    </div>
  );
}

function KnowledgeMapCard({ meta }: { meta: KnowledgeMapMeta }) {
  return (
    <div className="mt-3 rounded-lg border border-brand-pink/30 bg-brand-pink/5 px-3 py-3 text-xs">
      <div className="flex items-center gap-2 font-semibold text-brand-pink">
        <span>👤</span>
        <span>Knowledge Map Entry</span>
      </div>
      <dl className="mt-2 space-y-1 text-brand-muted">
        <div>
          <dt className="inline font-medium text-white">Topic: </dt>
          <dd className="inline">{meta.topic}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-white">Go-To Contact: </dt>
          <dd className="inline">{meta.goToContact}</dd>
        </div>
        {meta.approver && (
          <div>
            <dt className="inline font-medium text-white">Approver: </dt>
            <dd className="inline">{meta.approver}</dd>
          </div>
        )}
        <div>
          <dt className="inline font-medium text-white">Last Updated: </dt>
          <dd className="inline">{new Date(meta.lastUpdatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} motion-safe:animate-fade-in`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? 'rounded-br-sm bg-brand-green text-brand-black' : 'rounded-bl-sm border border-brand-border bg-brand-dark text-white'}`}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

        {message.answerType === 'document' && message.metadata && <SourceTag meta={message.metadata as SourceDocumentMeta} />}
        {message.answerType === 'knowledge_map' && message.metadata && <KnowledgeMapCard meta={message.metadata as KnowledgeMapMeta} />}

        <p className={`mt-2 text-[10px] ${isUser ? 'text-brand-black/60' : 'text-brand-faint'}`}>{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}
