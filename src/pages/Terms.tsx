import React from 'react';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Eligibility</h2>
          <p className="text-gray-600">
            DailyRecipeGenerator is available to users aged 18 or older with a valid email address and payment account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">User Responsibilities</h2>
          <p className="text-gray-600">
            By using this tool, you agree to comply with all applicable laws and respect intellectual property rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Prohibited Activities</h2>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Misuse of the tool for fraudulent purposes.</li>
            <li>Sharing generated content that violates third-party platform rules.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Payments</h2>
          <p className="text-gray-600">
            All payments are processed via PayPal. Refund requests are subject to our refund policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Liability Limitation</h2>
          <p className="text-gray-600">
            Neomotion is not liable for any indirect, incidental, or consequential damages resulting from the use of DailyRecipeGenerator.
          </p>
        </section>

        <div className="bg-gray-50 p-6 rounded-lg mt-8">
          <p className="text-gray-600">
            For further details, please contact us at contact@neomotion.ma
          </p>
        </div>
      </div>
    </div>
  );
}