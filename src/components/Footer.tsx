import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              <Link to="/about" className="hover:text-primary">About Us</Link>
            </h3>
            <p className="text-sm text-gray-600">
              ChefScript is the ultimate AI-powered tool for food bloggers, helping you create engaging content efficiently.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              <Link to="/terms" className="hover:text-primary">Terms of Service</Link>
            </h3>
            <p className="text-sm text-gray-600">
              By using our service, you agree to our terms and conditions.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              <Link to="/privacy" className="hover:text-primary">Privacy Policy</Link>
            </h3>
            <p className="text-sm text-gray-600">
              We take your privacy seriously. Learn how we protect your data.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              <Link to="/disclaimer" className="hover:text-primary">Disclaimer</Link>
            </h3>
            <p className="text-sm text-gray-600">
              Results may vary. Our AI-generated content requires human review.
            </p>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} ChefScript by Neomotion. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}