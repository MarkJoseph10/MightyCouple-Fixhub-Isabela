import InfoPageShell from "../../components/common/InfoPageShell";

export default function PrivacyPolicyPage() {
  return (
    <InfoPageShell
      eyebrow="Privacy Policy"
      title="How Mighty Couple handles customer data"
      description="We only collect the information needed to process orders, support customers, and keep the store operating smoothly."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Information we collect</h2>
          <div className="mt-4 space-y-3 text-slate-300">
            <p>We collect your name, email address, phone number, shipping address, and order details when you create an account or place an order.</p>
            <p>We may also keep payment-related proof submissions and order tracking updates for verification and support.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">How your data is used</h2>
          <div className="mt-4 space-y-3 text-slate-300">
            <p>Your data is used to process orders, confirm payments, arrange delivery, provide customer support, and improve store operations.</p>
            <p>We may use trusted third-party services such as payment gateways, courier tools, hosting providers, and dropshipping integrations when needed.</p>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-semibold text-white">Your privacy matters</h2>
        <div className="mt-4 space-y-3 text-slate-300">
          <p>We do not sell your personal data to other companies.</p>
          <p>We only share information when it is necessary to complete your order, verify payments, or comply with legal obligations.</p>
          <p>If you have privacy questions, contact us at <a href="mailto:support@mightycouple.com" className="text-slate-100 hover:text-white">support@mightycouple.com</a>.</p>
        </div>
      </section>
    </InfoPageShell>
  );
}
