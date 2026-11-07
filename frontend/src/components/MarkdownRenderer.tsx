"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  // Split into lines to parse headings, tables, bullet points, and paragraphs
  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: number) => {
    if (inTable && tableHeader.length > 0) {
      renderedElements.push(
        <div key={`table-${key}`} className="overflow-x-auto my-3">
          <table className="w-full text-left text-xs border border-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-800 text-gray-200">
              <tr>
                {tableHeader.map((h, i) => (
                  <th key={i} className="p-2 border-b border-gray-700 font-semibold">
                    {parseInlineMarkdown(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-gray-800/30">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 text-gray-300">
                      {parseInlineMarkdown(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableHeader = [];
      tableRows = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Markdown Table Row
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      // Check if it's the divider row (e.g. |:---|:---|)
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        // Divider row, ignore
        return;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      flushTable(index);
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      renderedElements.push(
        <h3 key={index} className="text-base font-bold text-white mt-3 mb-1.5 flex items-center gap-1.5">
          {parseInlineMarkdown(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith("#### ")) {
      renderedElements.push(
        <h4 key={index} className="text-sm font-semibold text-orange-300 mt-2.5 mb-1">
          {parseInlineMarkdown(trimmed.replace(/^####\s+/, ""))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      renderedElements.push(
        <h2 key={index} className="text-lg font-extrabold text-white mt-4 mb-2">
          {parseInlineMarkdown(trimmed.replace(/^##\s+/, ""))}
        </h2>
      );
      return;
    }

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      renderedElements.push(
        <div key={index} className="flex items-start gap-2 text-xs sm:text-sm text-gray-200 ml-2 my-1">
          <span className="text-orange-400 font-bold select-none">•</span>
          <span className="flex-1">{parseInlineMarkdown(trimmed.replace(/^[-*•]\s+/, ""))}</span>
        </div>
      );
      return;
    }

    // Sub-bullets
    if (trimmed.startsWith("• ") || line.startsWith("  • ")) {
      renderedElements.push(
        <div key={index} className="flex items-start gap-2 text-xs text-gray-300 ml-6 my-0.5">
          <span className="text-gray-500 select-none">◦</span>
          <span className="flex-1">{parseInlineMarkdown(trimmed.replace(/^•\s+/, ""))}</span>
        </div>
      );
      return;
    }

    // Blank lines
    if (!trimmed) {
      renderedElements.push(<div key={index} className="h-1.5" />);
      return;
    }

    // Normal paragraph
    renderedElements.push(
      <p key={index} className="text-xs sm:text-sm text-gray-200 leading-relaxed my-1">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  });

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className={`space-y-1 ${className}`}>{renderedElements}</div>;
}

/**
 * Parses inline bold (**text**), italics (*text*), and links ([label](url)).
 */
function parseInlineMarkdown(text: string): React.ReactNode {
  if (!text) return "";

  // Split by bold patterns: **bold text**
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);

  return boldParts.map((part, pIdx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={pIdx} className="font-bold text-white">
          {boldText}
        </strong>
      );
    }

    // Split by italics: *italic text*
    const italicParts = part.split(/(\*[^*]+\*)/g);
    return italicParts.map((subPart, sIdx) => {
      if (subPart.startsWith("*") && subPart.endsWith("*") && subPart.length > 2) {
        return (
          <em key={`${pIdx}-${sIdx}`} className="italic text-gray-300">
            {subPart.slice(1, -1)}
          </em>
        );
      }
      return subPart;
    });
  });
}
