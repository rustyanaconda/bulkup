import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    heading: 'What data we collect',
    intro: 'When you use BulkUp, we collect:',
    bullets: [
      'Account information you provide: your name and email address',
      'Health and fitness data you enter: weight, height, age, sex, meal selections, calorie targets, and weight goals',
      'Data from connected devices: if you choose to connect your Whoop, we receive your daily calorie burn, strain data, and basic body measurements',
      'Basic usage data: how you interact with the app, which we use to fix bugs and improve features',
    ],
  },
  {
    heading: 'How we use your data',
    intro: 'We use the data above to:',
    bullets: [
      'Calculate your personalized daily calorie targets based on your body metrics and activity level',
      'Build and adjust your meal plans',
      'Show you your progress over time',
      'Connect to third-party services like Whoop when you choose to do so',
      'Improve the app based on how people use it',
    ],
  },
  {
    heading: 'Who we share data with',
    body: [
      'We do not sell your data. We do not share it with advertisers. We do not use it for any purpose other than running BulkUp.',
      'The only third parties involved in processing your data are:',
    ],
    bullets: [
      'Our hosting providers, Railway and Vercel, who run the servers that store and serve your data',
      'Whoop, only if you choose to connect your Whoop device, in which case we exchange the data needed to pull your calorie burn',
    ],
  },
  {
    heading: 'Your rights and choices',
    intro: 'You can:',
    bullets: [
      'Delete your account and all associated data at any time by contacting us',
      'Disconnect your Whoop at any time from within the app',
      'Request a copy of the data we have about you by emailing us',
      'Update or correct your information at any time through the app',
    ],
  },
  {
    heading: 'Data security',
    body: [
      'We use industry-standard security practices to protect your data, including encrypted connections and secure storage. No system is perfectly secure, but we take reasonable steps to protect your information.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'We may update this policy as the app evolves. When we do, we\'ll update the date at the top and, if the changes are significant, notify you through the app or by email.',
    ],
  },
]

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0D1A12] px-5 py-8 max-w-md mx-auto">

      {/* Back link */}
      <Link
        to="/profile"
        className="inline-flex items-center gap-1.5 text-[#5C8C6E] text-sm mb-6
                   hover:text-[#A3CEB5] transition-colors"
      >
        ← Back
      </Link>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-1">Privacy Policy</h1>
      <p className="text-xs text-[#5C8C6E] mb-5">Last updated: May 19, 2026</p>

      {/* Intro */}
      <p className="text-sm text-[#A3CEB5] leading-relaxed mb-8">
        Welcome to BulkUp. This policy explains what data we collect, how we use it,
        and the choices you have. We've tried to keep it simple and direct.
      </p>

      {/* Sections */}
      <div className="space-y-8">
        {SECTIONS.map(({ heading, intro, body, bullets }) => (
          <section key={heading}>
            <h2 className="text-base font-semibold text-white mb-2">{heading}</h2>

            {intro && (
              <p className="text-sm text-[#A3CEB5] leading-relaxed mb-2">{intro}</p>
            )}

            {body && body.map((p, i) => (
              <p key={i} className="text-sm text-[#A3CEB5] leading-relaxed mb-2">{p}</p>
            ))}

            {bullets && (
              <ul className="space-y-1.5">
                {bullets.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#A3CEB5] leading-relaxed">
                    <span className="text-[#3A5C48] mt-0.5 flex-shrink-0">–</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* Contact — separate because it has a mailto link */}
        <section>
          <h2 className="text-base font-semibold text-white mb-2">Contact</h2>
          <p className="text-sm text-[#A3CEB5] leading-relaxed">
            Questions about this policy or your data? Email us at:{' '}
            <a
              href="mailto:patmcguigan98@gmail.com"
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              patmcguigan98@gmail.com
            </a>
          </p>
        </section>
      </div>

      {/* Bottom breathing room */}
      <div className="h-12" />
    </div>
  )
}
