import { createFileRoute, Link } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { PROHIBITED } from "@/lib/content-policy"
import { seo } from "@/lib/seo"

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: seo({
      title: "Terms and Conditions",
      description:
        "The fine print for making stickers, buying wall placements, and keeping Cool Things on the Internet fun for everyone.",
    }),
  }),
  component: TermsPage,
})

const LAST_UPDATED = "October 26, 2026"

function TermsPage() {
  return (
    <AppChrome>
      <div className="nk-page max-w-2xl">
        <header className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#0071e3]">
            Last updated {LAST_UPDATED}
          </p>
          <h1 className="nk-title">Terms and Conditions</h1>
          <p className="nk-subtitle">
            The agreement between you and Cool Things on the Internet when you
            make stickers, buy spots on the wall, or list anything here.
          </p>
        </header>

        <div className="flex flex-col gap-9 text-[15px] leading-relaxed tracking-[-0.01em] text-neutral-600">
          <Section n={1} title="Agreeing to these terms">
            <p>
              Cool Things on the Internet (&quot;we&quot;, &quot;us&quot;) runs
              this website, the sticker maker and the shared wall (together, the
              &quot;Service&quot;). By using the Service or creating an account,
              you agree to these Terms. If you don&apos;t agree, please
              don&apos;t use the Service.
            </p>
          </Section>

          <Section n={2} title="Who can use the Service">
            <ul>
              <li>
                You must be at least 18, or the age of majority where you live,
                to create an account or pay for anything.
              </li>
              <li>
                Give accurate account details and keep your password safe. You
                are responsible for everything done with your account.
              </li>
              <li>
                If you list something on behalf of a company or another person,
                you confirm you&apos;re allowed to act for them.
              </li>
            </ul>
          </Section>

          <Section n={3} title="What you're buying">
            <p>
              A spot is a paid placement of your sticker on the wall, as
              described in the <InlineLink to="/rules">Rules</InlineLink>. It is
              a licence to display your sticker. It is not ownership of any part
              of the Service, and it is not property you can resell or transfer.
            </p>
            <ul>
              <li>
                Newer stickers can cover yours. That is how the wall works, and
                it is not a fault in the Service.
              </li>
              <li>
                We don&apos;t promise any amount of visibility, traffic, clicks,
                sales or ranking.
              </li>
              <li>
                Spots don&apos;t expire for as long as we run the Service.
              </li>
            </ul>
          </Section>

          <Section n={4} title="Payments and refunds">
            <ul>
              <li>
                Prices are shown in US dollars before you pay. Spots cost $1 per
                square unit. Restores and new spots are priced as described in
                the Rules.
              </li>
              <li>
                Every payment is a one-time charge. There are no subscriptions.
              </li>
              <li>
                Payments are handled by our payment provider. We don&apos;t
                store your full card details.
              </li>
              <li>
                Your spot is delivered as soon as payment succeeds, so all sales
                are final. Being covered, moved down the rankings, or choosing
                to archive or move a sticker is not a reason for a refund.
              </li>
              <li>
                We will refund duplicate charges, and payments for spots we
                failed to deliver because of an error on our side.
              </li>
              <li>
                If we remove content for breaking these Terms, you won&apos;t
                get a refund.
              </li>
            </ul>
          </Section>

          <Section n={5} title="Your content">
            <p>
              You keep ownership of the images, names, descriptions and links
              you upload (&quot;Your Content&quot;). You give us a worldwide,
              non-exclusive, royalty-free licence to host, copy, resize, crop,
              display and share Your Content to run and promote the Service.
              This includes showing it on the wall, in listings, in rankings,
              and in screenshots or posts about the wall. The licence ends when
              Your Content is removed, except for copies already shared or kept
              in backups.
            </p>
            <p>You confirm that:</p>
            <ul>
              <li>
                You own Your Content or have permission to use it, including any
                logos, trademarks, artwork and photos of people.
              </li>
              <li>
                Your Content and the website it links to are accurate and follow
                the law and these Terms.
              </li>
              <li>
                Your link won&apos;t be changed later to point to something
                these Terms don&apos;t allow.
              </li>
            </ul>
          </Section>

          <Section n={6} title="What can be on the wall">
            <p>
              Stickers are for the things people make: products, apps, tools,
              services, companies, personal brands, newsletters, communities,
              creative work and side projects. These are not allowed in a
              sticker, its listing, or the site it links to:
            </p>
            <ul className="!mt-4 grid !list-none gap-2.5 !space-y-0 !pl-0 sm:grid-cols-2">
              {PROHIBITED.map((item) => (
                <li
                  key={item.title}
                  className="rounded-[16px] bg-[#f5f5f7] px-4 py-3"
                >
                  <p className="text-[14px] font-semibold tracking-[-0.01em] text-neutral-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-neutral-500">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
            <p>
              We may also remove spam, misleading content, and anything we
              reasonably believe puts people, the Service or our payment
              providers at risk.
            </p>
          </Section>

          <Section n={7} title="How we enforce these Terms">
            <p>
              We can review any sticker, listing or link at any time. If
              something breaks these Terms, we may hide or remove it from the
              wall and the directory, reset its ranking, or suspend or close the
              account. Serious or repeated violations lose access without
              warning. We may report illegal content to the authorities.
            </p>
            <p>
              See something that breaks these rules? Use Report on the sticker
              page. We review those reports and can take the sticker down.
              Content that infringes your rights can also be sent that way, or{" "}
              <ContactLink>contact us</ContactLink> with a link to the sticker.
            </p>
          </Section>

          <Section n={8} title="Using the Service fairly">
            <p>Don&apos;t:</p>
            <ul>
              <li>
                Use bots or scripts to buy spots, scrape the Service, or
                manipulate rankings.
              </li>
              <li>
                Try to get around payment, break security, or access other
                people&apos;s accounts.
              </li>
              <li>
                Overload or disrupt the Service, or upload files that contain
                malware.
              </li>
            </ul>
          </Section>

          <Section n={9} title="Other websites">
            <p>
              Stickers link to sites run by other people. We don&apos;t control
              or endorse them and aren&apos;t responsible for what they offer.
              Visiting them is at your own risk.
            </p>
          </Section>

          <Section n={10} title="Changes to the Service">
            <p>
              We may change, pause or stop parts of the Service, including how
              the wall looks, how rankings are shown and how prices work for new
              purchases. Price changes never affect a spot you&apos;ve already
              paid for. If we shut the Service down entirely, we&apos;ll give
              reasonable notice where we can.
            </p>
          </Section>

          <Section n={11} title="Disclaimers">
            <p>
              The Service is provided &quot;as is&quot; and &quot;as
              available&quot;. As far as the law allows, we make no promises
              that it will be uninterrupted, error-free, or meet your goals.
            </p>
          </Section>

          <Section n={12} title="Limitation of liability">
            <p>
              As far as the law allows, we aren&apos;t liable for indirect or
              consequential losses, such as lost profits, revenue or data. Our
              total liability to you for any claim is limited to what you paid
              us in the 12 months before the claim. Nothing here limits
              liability that can&apos;t be limited by law.
            </p>
          </Section>

          <Section n={13} title="Indemnity">
            <p>
              If someone makes a claim against us because of Your Content, the
              site you link to, or your breach of these Terms, you agree to
              cover our reasonable costs, including legal fees.
            </p>
          </Section>

          <Section n={14} title="Closing your account">
            <p>
              You can stop using the Service at any time, and you can delete
              your account yourself from Edit Profile. Deleting it removes your
              profile, email, password, sessions, stickers, wall plots and
              uploaded files. Spots you&apos;ve already paid for aren&apos;t
              refunded, and the deletion can&apos;t be undone. Short-lived
              backup copies may remain until those backups expire. Sections 4,
              5, 11, 12 and 13 still apply after your account is closed.
            </p>
          </Section>

          <Section n={15} title="Changes to these Terms">
            <p>
              We may update these Terms. We&apos;ll change the date at the top,
              and for significant changes we&apos;ll let account holders know
              before they take effect. Using the Service after that means you
              accept the new Terms.
            </p>
          </Section>

          <Section n={16} title="Contact">
            <p>
              Questions about these Terms?{" "}
              <ContactLink>Reach us on X</ContactLink>.
            </p>
          </Section>
        </div>
      </div>
    </AppChrome>
  )
}

function Section({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:marker:text-neutral-300">
      <h2 className="text-[20px] leading-tight font-semibold tracking-[-0.025em] text-neutral-900">
        <span className="mr-1.5 text-neutral-400 tabular-nums">{n}.</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function InlineLink({
  to,
  children,
}: {
  to: "/rules"
  children: React.ReactNode
}) {
  return (
    <Link to={to} className="font-medium text-[#0071e3] hover:underline">
      {children}
    </Link>
  )
}

function ContactLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="https://x.com/ekmigasari"
      target="_blank"
      rel="noreferrer"
      className="font-medium text-[#0071e3] hover:underline"
    >
      {children}
    </a>
  )
}
