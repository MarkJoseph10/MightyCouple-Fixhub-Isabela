import { PlayCircle } from "lucide-react";
import { resolveMediaUrl } from "../../utils/media";

export default function ChatMessageAttachments({ attachments = [] }) {
  const items = Array.isArray(attachments) ? attachments.filter((attachment) => attachment?.url) : [];

  if (!items.length) {
    return null;
  }

  return (
    <div className={`grid gap-2 ${items.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {items.map((attachment, index) => {
        const key = `${attachment.publicId || attachment.url}-${index}`;
        const mediaUrl = resolveMediaUrl(attachment.url);

        if (attachment.type === "video") {
          return (
            <div key={key} className="overflow-hidden rounded-[18px] border border-white/10 bg-slate-950/40">
              <video
                src={mediaUrl}
                controls
                preload="metadata"
                className="max-h-[240px] w-full bg-slate-950 object-cover"
              />
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300">
                <PlayCircle size={14} className="text-brand-200" />
                <span className="truncate">{attachment.originalName || "Video attachment"}</span>
              </div>
            </div>
          );
        }

        return (
          <a
            key={key}
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-[18px] border border-white/10 bg-slate-950/40 transition hover:border-white/20"
          >
            <img
              src={mediaUrl}
              alt={attachment.originalName || "Chat attachment"}
              className="max-h-[240px] w-full object-cover"
            />
          </a>
        );
      })}
    </div>
  );
}
