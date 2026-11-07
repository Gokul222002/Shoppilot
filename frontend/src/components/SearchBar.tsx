"use client";

import React, { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight } from "lucide-react";

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  size?: "sm" | "md" | "lg";
  targetRoute?: string;
}

export default function SearchBar({
  initialQuery = "",
  placeholder = "Search phones, laptops, fans, kitchen appliances…",
  className = "",
  autoFocus = false,
  size = "md",
  targetRoute = "/search",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`${targetRoute}?q=${encodeURIComponent(q)}`);
    }
  }

  const sizeStyles = {
    sm: "py-2 pl-9 pr-20 text-xs",
    md: "py-2.5 pl-10 pr-24 text-sm",
    lg: "py-3.5 pl-12 pr-28 text-base",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5 left-3",
    md: "w-4 h-4 left-3.5",
    lg: "w-5 h-5 left-4",
  };

  const btnStyles = {
    sm: "px-3 py-1 text-xs right-1.5",
    md: "px-4 py-1.5 text-xs right-2",
    lg: "px-5 py-2 text-sm right-2.5",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center w-full group ${className}`}
      role="search"
    >
      <label htmlFor="search-input" className="sr-only">
        Search products across multiple stores
      </label>

      {/* Search Icon */}
      <Search
        className={`absolute top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-400 pointer-events-none transition-colors duration-200 ${iconSizes[size]}`}
      />

      {/* Input Field */}
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full bg-gray-900 border border-gray-700/80 hover:border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-gray-100 placeholder:text-gray-500 rounded-xl outline-none transition-all duration-200 ${sizeStyles[size]}`}
      />

      {/* Clear Button */}
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-20 text-gray-400 hover:text-gray-200 p-1"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className={`absolute top-1/2 -translate-y-1/2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-semibold rounded-lg flex items-center gap-1 transition-all duration-200 shadow-sm shadow-orange-500/20 ${btnStyles[size]}`}
      >
        <span>Compare</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}
