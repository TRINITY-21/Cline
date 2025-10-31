import { APP_NAME } from '@/lib/config';

export default function LegalNoticePage() {
  const appName = (APP_NAME || 'This App').trim();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 leading-relaxed">
      <h1 className="mb-6 text-3xl font-bold">LEGAL NOTICE</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{appName} Legal Notice</h2>
        <p>
          {appName} is an internet service provider that operates as a platform only displaying links
          to audiovisual content hosted on third-party servers. These streams are provided and transmitted
          entirely by external sources. {appName} cannot be held responsible for any copyrighted material,
          as we do not host, upload, or transmit any audiovisual content ourselves.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h3 className="text-lg font-semibold">Important Notice:</h3>
        <p>Before accusing {appName} of copyright infringement, please verify:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Which external website actually hosts the files or streams</li>
          <li>Whether those third-party sites have proper broadcasting rights</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h3 className="text-lg font-semibold">About the Links on This Site:</h3>
        <p>
          The links listed on {appName} are aggregated from various online streaming platforms (such as
          Ustream, Dacast, Twitch, and others). We have no knowledge of whether these platforms hold legal
          distribution rights for the paid events or content they stream.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h3 className="text-lg font-semibold">Trademarks &amp; Intellectual Property:</h3>
        <p>
          All trademarks, logos, and event names referenced on {appName} belong to their respective legal
          owners. Their use here is strictly for informational and referential purposes, in compliance with
          fair use doctrines under copyright law (e.g., U.S. §107, EU Directive 2001/29/EC).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h3 className="text-lg font-semibold">User Responsibility:</h3>
        <p>
          {appName} is not liable for any misuse of this platform’s content. All material is sourced from
          publicly available internet sites, and thus considered freely accessible. No existing legislation
          prohibits the sharing of publicly indexed links, meaning this site operates within legal boundaries.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h3 className="text-lg font-semibold">No Legal Liability:</h3>
        <p>Under no circumstances can {appName}’s owners, operators, or affiliates be held directly or indirectly responsible for:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Illegal use of information on {appName}</li>
          <li>Misinterpretation of the site’s services</li>
          <li>Content accessed via external links</li>
        </ul>
        <p>For copyright concerns or inquiries, contact us immediately for resolution.</p>
      </section>
    </main>
  )
}


