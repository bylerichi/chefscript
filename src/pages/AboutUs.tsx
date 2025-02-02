import React from 'react';

export default function AboutUs() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">About Us</h1>
      <div className="prose prose-lg">
        <p className="mb-6">
          Welcome to DailyRecipeGenerator, a cutting-edge tool brought to you by Neomotion, a creative company based in Rabat, Morocco. Neomotion specializes in audiovisual production, filmmaking, graphic design, and 3D artistry.
        </p>
        <p className="mb-6">
          With a strong passion for innovation, we developed DailyRecipeGenerator to empower food bloggers and content creators by simplifying the process of generating high-quality recipe posts for platforms like Facebook, Pinterest, and WordPress.
        </p>
        <p className="mb-6">
          Our mission is to provide bloggers with a time-saving, intuitive tool to help them focus on their creativity and audience growth. Whether you're managing a busy schedule or striving for consistent posting, DailyRecipeGenerator is here to assist you every step of the way.
        </p>
        <div className="bg-gray-50 p-6 rounded-lg mt-8">
          <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
          <p>Email: contact@neomotion.ma</p>
        </div>
      </div>
    </div>
  );
}