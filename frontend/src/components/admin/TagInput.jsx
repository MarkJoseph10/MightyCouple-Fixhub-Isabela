import { AnimatePresence, motion } from "framer-motion";
import { Hash, Plus, TrendingUp, X } from "lucide-react";
import { useMemo, useState } from "react";

function normalizeTag(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-");

  return normalized ? `#${normalized}` : "";
}

export default function TagInput({ tags = [], onChange, suggestions = [] }) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const filteredSuggestions = useMemo(() => {
    const currentQuery = normalizeTag(inputValue).replace(/^#/, "");

    return suggestions.filter((suggestion) => {
      if (tags.includes(suggestion.tag)) {
        return false;
      }

      if (!currentQuery) {
        return true;
      }

      return suggestion.tag.toLowerCase().includes(currentQuery);
    });
  }, [inputValue, suggestions, tags]);

  function pushTag(nextTag) {
    const normalized = normalizeTag(nextTag);

    if (!normalized || tags.includes(normalized)) {
      return;
    }

    onChange([...tags, normalized]);
    setInputValue("");
  }

  function removeTag(tagToRemove) {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  }

  function handleDelimitedInput(value) {
    const parts = String(value || "")
      .split(",")
      .map((part) => normalizeTag(part))
      .filter(Boolean);

    if (!parts.length) {
      setInputValue(value);
      return;
    }

    const nextTags = [...tags];

    parts.forEach((tag) => {
      if (!nextTags.includes(tag)) {
        nextTags.push(tag);
      }
    });

    onChange(nextTags);
    setInputValue("");
  }

  function handleKeyDown(event) {
    if (["Enter", "Tab", ","].includes(event.key)) {
      event.preventDefault();
      pushTag(inputValue);
    }

    if (event.key === "Backspace" && !inputValue && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[28px] border border-white/10 bg-slate-950/40 p-3">
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {tags.map((tag) => (
              <motion.button
                key={tag}
                type="button"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => removeTag(tag)}
                className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/15 px-3 py-2 text-sm text-brand-50"
              >
                <Hash size={14} />
                <span>{tag.replace(/^#/, "")}</span>
                <X size={14} />
              </motion.button>
            ))}
          </AnimatePresence>

          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
            <Hash size={16} className="text-slate-500" />
            <input
              value={inputValue}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 120)}
              onChange={(event) => {
                const nextValue = event.target.value;

                if (nextValue.includes(",")) {
                  handleDelimitedInput(nextValue);
                  return;
                }

                setInputValue(nextValue);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Add tags like trending, budgettech, iphone"
              className="w-full bg-transparent text-white outline-none"
            />
            <button
              type="button"
              onClick={() => pushTag(inputValue)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 transition duration-300 hover:bg-brand-500"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFocused && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-ambient"
          >
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
              <TrendingUp size={14} className="text-orange-300" />
              Suggested tags
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredSuggestions.slice(0, 10).map((suggestion) => (
                <button
                  key={suggestion.tag}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pushTag(suggestion.tag)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition duration-300 ${
                    suggestion.trending
                      ? "border border-orange-400/20 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20"
                      : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <span>{suggestion.tag}</span>
                  {suggestion.trending && <span className="rounded-full bg-orange-400/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]">Hot</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
