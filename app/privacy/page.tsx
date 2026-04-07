// app/privacy/page.tsx
'use client';

import NavigationLayout from '@/components/NavigationLayout';

export default function PrivacyPage() {
  return (
    <NavigationLayout>
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-zinc-900 mb-4">Privacy Policy</h1>
          <p className="text-lg text-zinc-600">Last updated: April 7, 2026</p>
        </div>

        <div className="prose prose-zinc max-w-none prose-headings:text-zinc-900 prose-headings:font-semibold prose-p:text-zinc-700 prose-li:text-zinc-700 prose-a:text-zinc-900 hover:prose-a:underline">
          <p>
            This Privacy Policy describes how AutoGrowth AI ("we," "us," or "our") collects, uses, and shares your personal information when you use our platform to automate LinkedIn and Twitter content.
          </p>

          <h2>1. Information We Collect</h2>
          <p>We collect several types of information to provide and improve our service:</p>
          <h3>1.1 Account Information</h3>
          <ul>
            <li>Name, email address, and profile picture when you sign up</li>
            <li>Authentication tokens for connected social accounts (LinkedIn, Twitter)</li>
            <li>Profile information from your connected social accounts</li>
          </ul>
          <h3>1.2 Content and Usage Data</h3>
          <ul>
            <li>Posts, articles, and content you create or schedule through our platform</li>
            <li>Analytics on engagement, reach, and performance of your content</li>
            <li>Preferences and settings for AI-generated content</li>
            <li>Log data including IP address, browser type, pages visited, and timestamps</li>
          </ul>
          <h3>1.3 AI Training Data</h3>
          <ul>
            <li>Public content from your connected accounts to understand your writing style</li>
            <li>Industry keywords and topics you specify for persona creation</li>
            <li>Feedback on AI-generated content to improve recommendations</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li><strong>Service Delivery:</strong> To create and schedule content, generate AI personas, and automate posting</li>
            <li><strong>Improvement:</strong> To train our AI models and enhance content generation quality</li>
            <li><strong>Communication:</strong> To send service updates, security alerts, and support messages</li>
            <li><strong>Analytics:</strong> To provide insights into content performance and audience engagement</li>
            <li><strong>Security:</strong> To detect and prevent fraud, abuse, and unauthorized access</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>We do not sell your personal information. We may share information in limited circumstances:</p>
          <ul>
            <li><strong>With your consent:</strong> When you connect social accounts, we share content as you direct</li>
            <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our platform (e.g., hosting, analytics)</li>
            <li><strong>Legal Compliance:</strong> When required by law, subpoena, or legal process</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We implement industry-standard security measures including encryption, access controls, and regular security assessments. However, no method of transmission over the internet is 100% secure.
          </p>

          <h2>5. Your Rights</h2>
          <p>Depending on your location, you may have rights to:</p>
          <ul>
            <li>Access, correct, or delete your personal information</li>
            <li>Export your data in a portable format</li>
            <li>Opt-out of certain data processing activities</li>
            <li>Withdraw consent where processing is based on consent</li>
          </ul>
          <p>To exercise these rights, contact us at privacy@autogrowth.ai.</p>

          <h2>6. Data Retention</h2>
          <p>
            We retain your information as long as your account is active or as needed to provide services. You may request account deletion at any time, which will remove your personal data within 30 days.
          </p>

          <h2>7. Third-Party Services</h2>
          <p>
            Our platform integrates with LinkedIn and Twitter. Their privacy policies govern data collected by those platforms. We encourage you to review their privacy policies.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            Our service is not intended for users under 18. We do not knowingly collect personal information from children.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, contact us at:<br />
            AutoGrowth AI<br />
            Email: privacy@autogrowth.ai<br />
            Address: [Your Business Address]
          </p>
        </div>
      </div>
    </NavigationLayout>
  );
}