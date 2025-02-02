import React from 'react';

export default function Disclaimer() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Disclaimer</h1>
      <div className="space-y-6">
        <p className="text-gray-600">
          DailyRecipeGenerator is a tool designed to help bloggers create engaging recipe posts efficiently. While we strive to provide accurate and high-quality results, users are responsible for how the generated content is used, including compliance with third-party platform guidelines (e.g., Facebook, Pinterest, WordPress).
        </p>

        <p className="text-gray-600">
          We are not affiliated with these platforms, and their respective trademarks are owned by their companies. Payments processed via PayPal are subject to their terms and conditions. Refund policies and terms of use are outlined in our Terms of Service.
        </p>

        <div className="bg-gray-50 p-6 rounded-lg mt-8">
          <p className="text-gray-600">
            For any issues or inquiries, please contact us at contact@neomotion.ma
          </p>
        </div>
      </div>
    </div>
  );
}