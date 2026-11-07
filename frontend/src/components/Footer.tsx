import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Affiliate Disclosure */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
          <p className="text-xs text-gray-400 leading-relaxed text-center">
            <span className="font-semibold text-orange-400">Affiliate Disclosure: </span>
            ShopPilot earns a commission on purchases made through links on this site.
            Prices and availability are subject to change. Always verify the final price on
            the retailer&apos;s website before purchase. ShopPilot does not sell products directly
            and is not responsible for third-party store content.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            <span className="text-lg font-bold text-white">
              Shop<span className="text-orange-500">Pilot</span>
            </span>
            <span className="text-xs text-gray-500 ml-1">Price Comparison</span>
          </div>

          {/* Footer Links */}
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <Link href="/about" className="hover:text-orange-400 transition-colors duration-200">
              About
            </Link>
            <Link href="/privacy" className="hover:text-orange-400 transition-colors duration-200">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-orange-400 transition-colors duration-200">
              Terms
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-gray-600">
            © 2026 ShopPilot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
