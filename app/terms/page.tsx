// app/terms/page.tsx
'use client';

import NavigationLayout from '@/components/NavigationLayout';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <NavigationLayout>
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-zinc-900 mb-4">Terms of Service</h1>
          <p className="text-lg text-zinc-600">Last updated: April 7, 2026</p>
        </div>

        <div className="prose prose-zinc max-w-none prose-headings:text-zinc-900 prose-headings:font-semibold prose-p:text-zinc-700 prose-li:text-zinc-700 prose-a:text-zinc-900 hover:prose-a:underline">
          <p>
            Welcome to AutoGrowth AI. By accessing or using our platform, you agree to be bound by these Terms of Service. If you disagree with any part, you may not use our service.
          </p>

          <h2>1. Definitions</h2>
          <ul>
            <li><strong>"Platform"</strong> refers to the AutoGrowth AI website, application, and services.</li>
            <li><strong>"User," "You," "Your"</strong> refers to the individual or entity using the Platform.</li>
            <li><strong>"Content"</strong> refers to text, images, videos, and other materials created, uploaded, or scheduled through the Platform.</li>
            <li><strong>"AI-Generated Content"</strong> refers to content created by our artificial intelligence models.</li>
          </ul>

          <h2>2. Eligibility</h2>
          <p>You must be at least 18 years old and have the legal capacity to enter into contracts. By using the Platform, you represent that you meet these requirements.</p>

          <h2>3. Account Registration</h2>
          <p>
            You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. Notify us immediately of any unauthorized use.
          </p>

          <h2>4. Service Description</h2>
          <p>
            AutoGrowth AI provides tools to automate social media content creation and scheduling for LinkedIn and Twitter. Our AI generates content based on your inputs and preferences. You retain full control over what content is posted.
          </p>

          <h2>5. User Responsibilities</h2>
          <ul>
            <li>You agree to comply with all applicable laws, including data protection and intellectual property laws.</li>
            <li>You will not use the Platform to post illegal, harmful, defamatory, or infringing content.</li>
            <li>You are solely responsible for all Content you create, schedule, or publish through the Platform.</li>
            <li>You must respect the terms of service of LinkedIn, Twitter, and other third-party platforms.</li>
            <li>You will not attempt to reverse engineer, decompile, or hack the Platform.</li>
          </ul>

          <h2>6. Intellectual Property</h2>
          <h3>6.1 Your Content</h3>
          <p>
            You retain ownership of all Content you upload or create using the Platform. By using the Platform, you grant us a worldwide, non-exclusive, royalty-free license to store, process, and transmit your Content solely to provide the service.
          </p>
          <h3>6.2 AI-Generated Content</h3>
          <p>
            AI-Generated Content is based on your inputs and our proprietary models. You own the AI-Generated Content created for you, subject to these Terms. We retain ownership of our AI models, algorithms, and underlying technology.
          </p>
          <h3>6.3 Platform IP</h3>
          <p>
            All software, designs, trademarks, and other materials on the Platform are our property or licensed to us. You may not use them without our prior written consent.
          </p>

          <h2>7. Third-Party Platforms</h2>
          <p>
            The Platform integrates with LinkedIn, Twitter, and other services. You are responsible for complying with their terms. We are not liable for any actions taken by third-party platforms regarding your account or content.
          </p>

          <h2>8. Fees and Payment</h2>
          <p>
            Some features may require payment. Fees are described on our pricing page. We may change fees with notice. Payments are non-refundable unless required by law.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may suspend or terminate your account for violation of these Terms. You may delete your account at any time. Upon termination, we will delete your data according to our <Link href="/privacy">Privacy Policy</Link>.
          </p>

          <h2>10. Disclaimers</h2>
          <p>
            THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE." WE MAKE NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold us harmless from any claims, damages, or losses arising from your use of the Platform, your Content, or your violation of these Terms.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by the laws of [Your State/Country], without regard to conflict of law principles.
          </p>

          <h2>14. Dispute Resolution</h2>
          <p>
            Any disputes shall be resolved through binding arbitration in [Your City, State] under the rules of the American Arbitration Association. You waive the right to participate in class actions.
          </p>

          <h2>15. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance.
          </p>

          <h2>16. Contact Information</h2>
          <p>
            For questions about these Terms, contact us at:<br />
            AutoGrowth AI<br />
            Email: legal@autogrowth.ai<br />
            Address: [Your Business Address]
          </p>
        </div>
      </div>
    </NavigationLayout>
  );
}