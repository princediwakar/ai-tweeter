import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — AutoGrowth AI',
  description: 'Learn how AutoGrowth AI protects your data and privacy.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <Link 
            href="/" 
            className="text-xl font-bold text-zinc-900 hover:opacity-80 transition-opacity"
          >
            AutoGrowth AI
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-4 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-zinc-500 text-lg">
              Last updated: April 7, 2026
            </p>
          </div>

          <div className="space-y-8">
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <p className="text-zinc-700 leading-relaxed text-lg">
                This Privacy Policy describes how AutoGrowth AI ("we," "us," or "our") collects, uses, and shares your personal information when you use our platform to automate LinkedIn and Twitter content.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">1. Information We Collect</h2>
              <p className="text-zinc-700 mb-4">We collect several types of information to provide and improve our service:</p>
              <h3 className="text-lg font-medium text-zinc-900 mb-3 mt-6">1.1 Account Information</h3>
              <ul className="space-y-2 text-zinc-600 list-disc list-inside">
                <li>Name, email address, and profile picture when you sign up</li>
                <li>Authentication tokens for connected social accounts (LinkedIn, Twitter)</li>
                <li>Profile information from your connected social accounts</li>
              </ul>
              <h3 className="text-lg font-medium text-zinc-900 mb-3 mt-6">1.2 Content and Usage Data</h3>
              <ul className="space-y-2 text-zinc-600 list-disc list-inside">
                <li>Posts, articles, and content you create or schedule through our platform</li>
                <li>Analytics on engagement, reach, and performance of your content</li>
                <li>Preferences and settings for AI-generated content</li>
                <li>Log data including IP address, browser type, pages visited, and timestamps</li>
              </ul>
              <h3 className="text-lg font-medium text-zinc-900 mb-3 mt-6">1.3 AI Training Data</h3>
              <ul className="space-y-2 text-zinc-600 list-disc list-inside">
                <li>Public content from your connected accounts to understand your writing style</li>
                <li>Industry keywords and topics you specify for persona creation</li>
                <li>Feedback on AI-generated content to improve recommendations</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">2. How We Use Your Information</h2>
              <ul className="space-y-3 text-zinc-600">
                <li><strong className="text-zinc-900">Service Delivery:</strong> To create and schedule content, generate AI personas, and automate posting</li>
                <li><strong className="text-zinc-900">Improvement:</strong> To train our AI models and enhance content generation quality</li>
                <li><strong className="text-zinc-900">Communication:</strong> To send service updates, security alerts, and support messages</li>
                <li><strong className="text-zinc-900">Analytics:</strong> To provide insights into content performance and audience engagement</li>
                <li><strong className="text-zinc-900">Security:</strong> To detect and prevent fraud, abuse, and unauthorized access</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">3. Information Sharing</h2>
              <p className="text-zinc-700 mb-4">We do not sell your personal information. We may share information in limited circumstances:</p>
              <ul className="space-y-3 text-zinc-600">
                <li><strong className="text-zinc-900">With your consent:</strong> When you connect social accounts, we share content as you direct</li>
                <li><strong className="text-zinc-900">Service Providers:</strong> With trusted third parties who assist in operating our platform (e.g., hosting, analytics)</li>
                <li><strong className="text-zinc-900">Legal Compliance:</strong> When required by law, subpoena, or legal process</li>
                <li><strong className="text-zinc-900">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">4. Data Security</h2>
              <p className="text-zinc-700 leading-relaxed">
                We implement industry-standard security measures including encryption, access controls, and regular security assessments. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">5. Your Rights</h2>
              <p className="text-zinc-700 mb-4">Depending on your location, you may have rights to:</p>
              <ul className="space-y-2 text-zinc-600 list-disc list-inside mb-4">
                <li>Access, correct, or delete your personal information</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of certain data processing activities</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-zinc-600">
                To exercise these rights, contact us at <a href="mailto:privacy@autogrowth.ai" className="text-zinc-900 underline hover:text-zinc-700">privacy@autogrowth.ai</a>.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">6. Data Retention</h2>
              <p className="text-zinc-700 leading-relaxed">
                We retain your information as long as your account is active or as needed to provide services. You may request account deletion at any time, which will remove your personal data within 30 days.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">7. Third-Party Services</h2>
              <p className="text-zinc-700 leading-relaxed">
                Our platform integrates with LinkedIn and Twitter. Their privacy policies govern data collected by those platforms. We encourage you to review their privacy policies.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">8. Children's Privacy</h2>
              <p className="text-zinc-700 leading-relaxed">
                Our service is not intended for users under 18. We do not knowingly collect personal information from children.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">9. Changes to This Policy</h2>
              <p className="text-zinc-700 leading-relaxed">
                We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">10. Contact Us</h2>
              <p className="text-zinc-700 leading-relaxed">
                If you have questions about this Privacy Policy, contact us at:<br />
                <span className="font-medium">AutoGrowth AI</span><br />
                Email: <a href="mailto:privacy@autogrowth.ai" className="text-zinc-900 underline hover:text-zinc-700">privacy@autogrowth.ai</a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}