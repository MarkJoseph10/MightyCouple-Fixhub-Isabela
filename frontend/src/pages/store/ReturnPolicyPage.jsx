import InfoPageShell from "../../components/common/InfoPageShell";

export default function ReturnPolicyPage() {
  return (
    <InfoPageShell
      eyebrow="Return and Refund Policy"
      title="Returns for defective gadget orders"
      description="We keep the return process simple and transparent, especially for gadgets that arrive defective or not working as expected."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Eligible returns</h2>
          <div className="mt-4 space-y-3 text-slate-300">
            <p>Returns are accepted for defective items only.</p>
            <p>The return request must be submitted within 7 days after delivery.</p>
            <p>The item must include its original accessories, packaging, and proof of purchase when possible.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">How to request a return</h2>
          <div className="mt-4 space-y-3 text-slate-300">
            <p>Email <a href="mailto:supportmightycouple@gmail.com" className="text-slate-100 hover:text-white">supportmightycouple@gmail.com</a> with your order ID, issue details, and clear photos or videos.</p>
            <p>Wait for approval before shipping the item back.</p>
            <p>Once approved, we will give you return instructions and confirm whether the item will be replaced or refunded.</p>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-semibold text-white">Refund timeframe</h2>
        <div className="mt-4 space-y-3 text-slate-300">
          <p>Approved refunds are processed after the returned item has been inspected.</p>
          <p>Refund processing usually takes 5 to 10 business days depending on the original payment method.</p>
          <p>Orders damaged due to misuse, accidental drops, or unauthorized repairs are not eligible for refund.</p>
        </div>
      </section>
    </InfoPageShell>
  );
}
