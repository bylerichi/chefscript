import React from 'react';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Data Collection</h2>
          <p className="text-gray-600">
            We collect basic information such as email addresses for communication and payment details processed via PayPal. No sensitive payment data is stored on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Third-party Services</h2>
          <p className="text-gray-600">
            We integrate PayPal for payment processing and may use tools like Google Analytics to enhance user experience.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Data Usage</h2>
          <p className="text-gray-600">
            Your data is used solely for providing and improving our services. It is never sold or shared with unauthorized third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">User Rights</h2>
          <p className="text-gray-600">
            You may request to update or delete your data at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          <p className="text-gray-600">
            We implement robust security measures to protect your information.
          </p>
        </section>

        <div className="bg-gray-50 p-6 rounded-lg mt-8">
          <p className="text-gray-600">
            For any questions, contact us at contact@neomotion.ma
          </p>
        </div>
      </div>
    </div>
  );
}