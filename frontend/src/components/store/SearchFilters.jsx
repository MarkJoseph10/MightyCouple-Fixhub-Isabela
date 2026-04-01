import { Search } from "lucide-react";

export default function SearchFilters({
  search,
  category,
  sort = "popular",
  categories,
  onSearchChange,
  onCategoryChange,
  onSortChange
}) {
  return (
    <div className="glass-panel rounded-[26px] p-4 shadow-ambient">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_200px]">
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
      </div>
    </div>
  );
}
