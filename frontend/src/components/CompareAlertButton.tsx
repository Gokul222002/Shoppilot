"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";
import type { Product } from "@/lib/mock-connector";
import PriceAlertModal from "./PriceAlertModal";

interface CompareAlertButtonProps {
  product: Product;
  currentPrice: number;
}

export default function CompareAlertButton({
  product,
  currentPrice,
}: CompareAlertButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-700 transition-colors"
      >
        <Bell className="w-3.5 h-3.5 text-orange-400" />
        <span>Track Price &amp; Set Alert</span>
      </button>

      <PriceAlertModal
        product={product}
        currentPrice={currentPrice}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
