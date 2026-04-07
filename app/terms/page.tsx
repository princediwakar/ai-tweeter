import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service — AutoGrowth AI',
  description: 'Read the terms and conditions for using AutoGrowth AI.',
};

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-zinc-500 text-lg">
              Last updated: April 7, 2026
            </p>
          </div>

          <div className="space-y-8">
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <p className="text-zinc-700 leading-relaxed text-lg">
                Welcome to AutoGrowth AI. By accessing or using our platform, you agree to be bound by these Terms of Service. If you disagree with any part, you may not use our service.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">1. Definitions</h2>
              <ul className="space-y-3 text-zinc-600">
                <li><strong className="text-zinc-900">"Platform"</strong> — refers to the AutoGrowth AI website, application, and services.</li>
                <li><strong className="text-zinc-900">"User," "You," "Your"</strong> — refers to the individual or entity using the Platform.</li>
                <li><strong className="text-zinc-900">"Content"</strong> — refers to text, images, videos, and other materials created, uploaded, or scheduled through the Platform.</li>
                <li><strong className="text-zinc-900">"AI-Generated Content"</strong> — refers to content created by our artificial intelligence models.</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">2. Eligibility</h2>
              <p className="text-zinc-700 leading-relaxed">
                You must be at least 18 years old and have the legal capacity to enter into contracts. By using the Platform, you represent that you meet these requirements.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">3. Account Registration</h2>
              <p className="text-zinc-700 leading-relaxed">
                You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. Notify us immediately of any unauthorized use.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">4. Service Description</h2>
              <p className="text-zinc-700 leading-relaxed">
                AutoGrowth AI provides tools to automate social media content creation and scheduling for LinkedIn and Twitter. Our AI generates content based on your inputs and preferences. You retain full control over what content is posted.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">5. User Responsibilities</h2>
              <ul className="space-y-3 text-zinc-600 list-disc list-inside">
                <li>You agree to comply with all applicable laws, including data protection and intellectual property laws.</li>
                <li>You will not use the Platform to post illegal, harmful, defamatory, or infringing content.</li>
                <li>You are solely responsible for all Content you create, schedule, or publish through the Platform.</li>
                <li>You must respect the terms of service of LinkedIn, Twitter, and other third-party platforms.</li>
                <li>You will not attempt to reverse engineer, decompile, or hack the Platform.</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">6. Intellectual Property</h2>
              <h3 className="text-lg font-medium text-zinc-900 mb-3 mt-6">6.1 Your Content</h3>
              <p className="text-zinc-700 leading-relaxed mb-4">
                You retain ownership of all Content you upload or create using the Platform. By using the Platform, you grant us a worldwide, non-exclusive, royalty-free license to store, process, and transmit your Content solely to provide the service.
              </p>
              <h3 className="text-lg font-medium text-zinc-900 mb-3 mt-6">6.2 AI-Generated Content</h3>
              <p className="text-zinc-700 leading-relaxed mb-4">
                AI-Generated Content is based on your inputs and our proprietary models. You own the AI-Generated Content created for you, subject to these Terms. We retain ownership of our AI models, algorithms, and underlying technology.
              </p>
              <h3 className="text-lg font-medium text-zinc-900 mb-3 mt-6">6.3 Platform IP</h3>
              <p className="text-zinc-700 leading-relaxed">
                All software, designs, trademarks, and other materials on the Platform are our property or licensed to us. You may not use them without our prior written consent.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">7. Third-Party Platforms</h2>
              <p className="text-zinc-700 leading-relaxed">
                The Platform integrates with LinkedIn, Twitter, and other services. You are responsible for complying with their terms. We are not liable for any actions taken by third-party platforms regarding your account or content.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">8. Fees and Payment</h2>
              <p className="text-zinc-700 leading-relaxed">
                Some features may require payment. Fees are described on our pricing page. We may change fees with notice. Payments are non-refundable unless required by law.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">9. Termination</h2>
              <p className="text-zinc-700 leading-relaxed">
                We may suspend or terminate your account for violation of these Terms. You may delete your account at any time. Upon termination, we will delete your data according to our <Link href="/privacy" className="text-zinc-900 underline hover:text-zinc-700">Privacy Policy</Link>.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">10. Disclaimers</h2>
              <p className="text-zinc-700 leading-relaxed">
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE." WE MAKE NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">11. Limitation of Liability</h2>
              <p className="text-zinc-700 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">12. Indemnification</h2>
              <p className="text-zinc-700 leading-relaxed">
                You agree to indemnify and hold us harmless from any claims, damages, or losses arising from your use of the Platform, your Content, or your violation of these Terms.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">13. Governing Law</h2>
              <p className="text-zinc-700 leading-relaxed">
                These Terms shall be governed by the laws of [Your State/Country], without regard to conflict of law principles.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">14. Dispute Resolution</h2>
              <p className="text-zinc-700 leading-relaxed">
                Any disputes shall be resolved through binding arbitration in [Your City, State] under the rules of the American Arbitration Association. You waive the right to participate in class actions.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">15. Changes to Terms</h2>
              <p className="text-zinc-700 leading-relaxed">
                We may modify these Terms at any time. We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">16. Contact Information</h2>
              <p className="text-zinc-700 leading-relaxed">
                For questions about these Terms, contact us at:<br />
                <span className="font-medium">AutoGrowth AI</span><br />
                Email: <a href="mailto:legal@autogrowth.ai" className="text-zinc-900 underline hover:text-zinc-700">legal@autogrowth.ai</a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}