import InfoPageShell from "../../components/common/InfoPageShell";

export default function TermsPage() {
  return (
    <InfoPageShell
      eyebrow="Terms of Service"
      title="Terms for using Mighty Couple"
      description="These terms explain how customers can browse, order, pay, and request support on the store."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Account and orders</h2>
          <div className="mt-4 space-y-3 text-slate-300">
            <p>You agree to provide accurate account, contact, and shipping information when placing an order.</p>
            <p>We may cancel or hold orders if payment verification, fraud checks, or address issues need review.</p>
            <p>Prices, stock, and promotions may change without notice until an order is confirmed.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Payments and fulfillment</h2>
          <div className="mt-4 space-y-3 text-slate-300">
            <p>Accepted payment options, installment rules, and refund eligibility are shown in the store settings and product pages.</p>
            <p>Fulfillment timelines depend on stock, verification, shipping location, and courier availability.</p>
            <p>Refunds, when allowed, follow the posted return and shipping policy pages.</p>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-semibold text-white">Support and updates</h2>
        <div className="mt-4 space-y-3 text-slate-300">
          <p>We may update the store, these pages, or the order flow as needed to keep the site working and secure.</p>
          <p>If you have concerns about an order or account action, contact support so we can help review it.</p>
        </div>
      </section>
    </InfoPageShell>
  );
}
