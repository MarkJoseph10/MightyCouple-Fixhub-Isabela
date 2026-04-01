import { Search } from "lucide-react";

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
  onPerPageChange
}) {
  return (
    <div id={containerId} className="glass-panel sticky top-20 z-20 scroll-mt-28 rounded-[22px] border border-white/10 px-4 py-2.5 shadow-ambient backdrop-blur">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.55fr)_180px_180px_130px]">
        <label className="flex min-w-0 items-center gap-2.5 rounded-[16px] border border-white/10 bg-slate-950/40 px-3 py-2 text-slate-300">
          <Search size={15} />
          <input
            id={searchInputId}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search products, tags, or categories"
            className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-slate-500"
          />
        </label>

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
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onCategoryChange("All")}
          className={`rounded-full px-2.5 py-1 text-[11px] transition ${
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
            className={`rounded-full px-2.5 py-1 text-[11px] transition ${
              category === item
                ? "bg-brand-500 text-white"
                : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
