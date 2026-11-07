import Link from "next/link";
import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import type { Product } from "@/lib/mock-connector";

interface ProductCardProps {
  product: Product;
}

const STORE_COLORS: Record<string, string> = {
  "Amazon.in": "bg-orange-500",
  "Flipkart":  "bg-blue-600",
  "Myntra":    "bg-pink-600",
  "Croma":     "bg-green-600",
  "Tata CLiQ": "bg-purple-600",
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${
            s <= Math.round(rating)
              ? "fill-orange-400 text-orange-400"
              : "fill-gray-700 text-gray-700"
          }`}
        />
      ))}
    </span>
  );
}

export default function ProductCard({ product }: ProductCardProps) {
  const bestOffer = product.offers.reduce((a, b) => (a.price < b.price ? a : b));
  const bestDiscount = Math.max(...product.offers.map((o) => o.discountPct));

  return (
    <article className="group relative flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
      {/* Discount Badge */}
      {bestDiscount >= 10 && (
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{bestDiscount}%
          </span>
        </div>
      )}

      {/* Product Image */}
      <div className="relative aspect-square w-full bg-gray-800 overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Brand */}
        <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
          {product.brand}
        </span>

        {/* Product Name */}
        <h3 className="text-sm font-medium text-gray-100 leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <RatingStars rating={product.rating} />
          <span className="text-xs text-gray-400">
            {product.rating} ({product.reviewCount.toLocaleString("en-IN")})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-bold text-white">
            ₹{bestOffer.price.toLocaleString("en-IN")}
          </span>
          <span className="text-sm text-gray-500 line-through">
            ₹{bestOffer.mrp.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Store Pills */}
        <div className="flex flex-wrap gap-1.5">
          {product.offers.slice(0, 3).map((offer) => (
            <span
              key={offer.store}
              className={`text-[10px] font-semibold text-white px-2 py-0.5 rounded-full ${
                STORE_COLORS[offer.store] ?? "bg-gray-700"
              }`}
            >
              {offer.store}
            </span>
          ))}
          {product.offers.length > 3 && (
            <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">
              +{product.offers.length - 3} more
            </span>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/compare?q=${encodeURIComponent(product.slug)}`}
          className="mt-auto flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors duration-200"
        >
          Compare Prices
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}
