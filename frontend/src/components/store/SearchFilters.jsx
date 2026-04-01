import { Search } from "lucide-react";

export default function SearchFilters({
  search,
  category,
  sort = "popular",
  perPage = 15,
  resultCount = 0,
  categories,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onPerPageChange,
  onReset
}) {
  return (
    <div className="glass-panel sticky top-20 z-20 rounded-[26px] border border-white/10 p-4 shadow-ambient backdrop-blur">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Search and filter</p>
          <p className="mt-1 text-sm text-slate-300">
            {resultCount} product{resultCount === 1 ? "" : "s"} matched
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
        >
          Reset filters
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_150px]">
        <label className="md:col-span-2 xl:col-span-1 flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-slate-300">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search products, tags, or categories"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </label>

        <select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-white outline-none"
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
          className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-white outline-none"
        >
          <option value="popular">Most popular</option>
          <option value="rating">Top rated</option>
          <option value="price-asc">Price: Low to high</option>
          <option value="price-desc">Price: High to low</option>
        </select>

        <select
          value={perPage}
          onChange={(event) => onPerPageChange?.(Number(event.target.value))}
          className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-white outline-none"
        >
          <option value={10}>10 / page</option>
          <option value={15}>15 / page</option>
          <option value={20}>20 / page</option>
          <option value={25}>25 / page</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCategoryChange("All")}
          className={`rounded-full px-3 py-1.5 text-xs transition ${
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
            className={`rounded-full px-3 py-1.5 text-xs transition ${
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
