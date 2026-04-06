import { Film, Image as ImageIcon, X } from "lucide-react";

function formatFileSize(sizeBytes = 0) {
  const size = Number(sizeBytes || 0);

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

export default function ChatPendingAttachments({ files = [], onRemove }) {
  if (!files.length) {
    return null;
  }

  return (
    <div className="mb-3 space-y-2 rounded-[22px] border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Attachments ready</p>
        <p className="text-[11px] text-slate-500">Up to 4 files</p>
      </div>
      <div className="space-y-2">
        {files.map((file, index) => {
          const isVideo = file.type.startsWith("video/");

          return (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/25 px-3 py-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-brand-100">
                {isVideo ? <Film size={15} /> : <ImageIcon size={15} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {isVideo ? "Video" : "Image"} • {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                title="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
