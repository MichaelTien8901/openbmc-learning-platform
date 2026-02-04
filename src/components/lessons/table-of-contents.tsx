"use client";

import { useState, useEffect, useCallback } from "react";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

export function TableOfContents({ content, className = "" }: TableOfContentsProps) {
  const [items, setItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Extract headings from markdown content
  const extractHeadings = useCallback((markdown: string): TOCItem[] => {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const headings: TOCItem[] = [];
    let match;

    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      headings.push({ id, text, level });
    }

    return headings;
  }, []);

  useEffect(() => {
    setItems(extractHeadings(content));
  }, [content, extractHeadings]);

  // Set up intersection observer for scroll sync
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0px -80% 0px",
        threshold: 0,
      }
    );

    // Observe all heading elements
    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100; // Account for fixed header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveId(id);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 ${className}`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="font-medium text-gray-900 dark:text-white">Table of Contents</span>
        <span className="text-gray-500">{isCollapsed ? "+" : "−"}</span>
      </button>

      {!isCollapsed && (
        <nav className="border-t border-gray-200 px-4 pb-4 dark:border-gray-800">
          <ul className="space-y-1 pt-2">
            {items.map((item) => (
              <li key={item.id} style={{ paddingLeft: `${(item.level - 1) * 12}px` }}>
                <button
                  onClick={() => scrollToHeading(item.id)}
                  className={`block w-full rounded px-2 py-1 text-left text-sm transition-colors ${
                    activeId === item.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  {item.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
