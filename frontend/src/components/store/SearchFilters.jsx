import { useMemo, useState } from "react";
import { ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";

export default function SearchFilters({
  containerId,
  searchInputId,
  search,
  category,
  sort = "popular",
  perPage = 15,
  categories,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onPerPageChange,
  nativeCompact = false
}) {
  const hasActiveFilters = useMemo(
    () => search.trim() || category !== "All" || sort !== "popular" || Number(perPage) !== 15,
    [category, perPage, search, sort]
  );
  const [nativeExpanded, setNativeExpanded] = useState(false);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (category !== "All") count += 1;
    if (sort !== "popular") count += 1;
    if (Number(perPage) !== 15) count += 1;
    return count;
  }, [category, perPage, search, sort]);

  const showExpandedControls = !nativeCompact || nativeExpanded;

  return (
    <div
      id={containerId}
      className={`glass-panel sticky z-20 scroll-mt-28 border border-white/10 shadow-ambient backdrop-blur ${
        nativeCompact
          ? "top-[72px] rounded-[24px] px-3 py-3"
          : "top-20 rounded-[22px] px-4 py-2.5"
      }`}
    >
      <div className={`grid gap-2 ${nativeCompact ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1.55fr)_180px_180px_130px]"}`}>
        <div className={`flex min-w-0 items-center gap-2 ${nativeCompact ? "w-full" : ""}`}>
          <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[16px] border border-white/10 bg-slate-950/40 px-3 py-2 text-slate-300">
            <Search size={15} />
            <input
              id={searchInputId}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onFocus={() => nativeCompact && setNativeExpanded(true)}
              placeholder="Search products, tags, or categories"
              className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-slate-500"
            />
          </label>
          {nativeCompact ? (
            <button
              type="button"
              onClick={() => setNativeExpanded((value) => !value)}
              className="inline-flex min-w-[86px] shrink-0 items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-slate-950/40 px-3 py-2 text-[12px] font-medium text-slate-200 transition hover:bg-white/10"
              aria-label={nativeExpanded ? "Hide filters" : "Show filters"}
            >
              <SlidersHorizontal size={14} />
              <span>{activeFilterCount ? `${activeFilterCount} active` : "Filters"}</span>
            </button>
          ) : null}
        </div>

        {showExpandedControls ? (
          <>
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="min-h-[40px] w-full rounded-[16px] border border-white/10 bg-slate-950/40 px-3 py-2 text-[13px] text-white outline-none"
            >
              <option value="All">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(event) => onSortChange?.(event.target.value)}
              className="min-h-[40px] w-full rounded-[16px] border border-white/10 bg-slate-950/40 px-3 py-2 text-[13px] text-white outline-none"
            >
              <option value="popular">Most popular</option>
              <option value="rating">Top rated</option>
              <option value="price-asc">Price: Low to high</option>
              <option value="price-desc">Price: High to low</option>
            </select>

            <select
              value={perPage}
              onChange={(event) => onPerPageChange?.(Number(event.target.value))}
              className="min-h-[40px] w-full rounded-[16px] border border-white/10 bg-slate-950/40 px-3 py-2 text-[13px] text-white outline-none"
            >
              <option value={10}>10 / page</option>
              <option value={15}>15 / page</option>
              <option value={20}>20 / page</option>
              <option value={25}>25 / page</option>
            </select>
          </>
        ) : null}
      </div>

      {nativeCompact && hasActiveFilters && !nativeExpanded ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-slate-950/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-500">Current filters</p>
            <p className="truncate text-[12px] text-slate-200">
              {[
                search.trim() ? `"${search.trim()}"` : null,
                category !== "All" ? category : null,
                sort !== "popular" ? sort.replaceAll("-", " ") : null,
                Number(perPage) !== 15 ? `${perPage}/page` : null
              ]
                .filter(Boolean)
                .join(" • ") || "No filters applied"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onCategoryChange("All");
              onSortChange?.("popular");
              onPerPageChange?.(15);
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
            aria-label="Reset filters"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {showExpandedControls ? (
        <>
          <div className={`mt-2 flex gap-1.5 ${nativeCompact ? "overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "flex-wrap"}`}>
            <button
              type="button"
              onClick={() => onCategoryChange("All")}
              className={`rounded-full px-2.5 py-1 text-[11px] transition ${nativeCompact ? "shrink-0 whitespace-nowrap" : ""} ${
                category === "All"
                  ? "bg-brand-500 text-white"
                  : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              All
            </button>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onCategoryChange(item)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition ${nativeCompact ? "shrink-0 whitespace-nowrap" : ""} ${
                  category === item
                    ? "bg-brand-500 text-white"
                    : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          {nativeCompact ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onCategoryChange("All");
                  onSortChange?.("popular");
                  onPerPageChange?.(15);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-slate-200 transition hover:bg-white/10"
              >
                <X size={13} />
                Reset
              </button>
              <button
                type="button"
                onClick={() => setNativeExpanded(false)}
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-brand-600"
              >
                Hide filters
                <ChevronUp size={13} />
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
