"use client";

/**
 * Audio Transcript Display
 *
 * Shows lesson content as a transcript with clickable timestamps
 * that sync with the TTS player.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";

interface TranscriptSegment {
  id: number;
  text: string;
  estimatedStartTime: number; // in seconds
  estimatedDuration: number; // in seconds
}

interface AudioTranscriptProps {
  content: string;
  currentSegmentIndex: number;
  isPlaying: boolean;
  rate: number;
  onSegmentClick: (index: number) => void;
  className?: string;
}

// Average words per minute for TTS at 1x speed
const BASE_WPM = 150;

/**
 * Parse content into transcript segments with estimated timestamps
 */
function parseTranscript(content: string, rate: number): TranscriptSegment[] {
  // Strip HTML and normalize whitespace
  const text = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

  // Calculate word count and duration for each sentence
  const wpm = BASE_WPM * rate;
  let currentTime = 0;

  return sentences.map((sentence, index) => {
    const wordCount = sentence.split(/\s+/).length;
    const duration = (wordCount / wpm) * 60; // Convert to seconds

    const segment: TranscriptSegment = {
      id: index,
      text: sentence.trim(),
      estimatedStartTime: currentTime,
      estimatedDuration: duration,
    };

    currentTime += duration;
    return segment;
  });
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioTranscript({
  content,
  currentSegmentIndex,
  isPlaying,
  rate,
  onSegmentClick,
  className = "",
}: AudioTranscriptProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const currentSegmentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse content into segments
  const segments = useMemo(() => parseTranscript(content, rate), [content, rate]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (segments.length === 0) return 0;
    const lastSegment = segments[segments.length - 1];
    return lastSegment.estimatedStartTime + lastSegment.estimatedDuration;
  }, [segments]);

  // Auto-scroll to current segment when playing
  useEffect(() => {
    if (isPlaying && currentSegmentRef.current && containerRef.current) {
      const container = containerRef.current;
      const segment = currentSegmentRef.current;

      const containerRect = container.getBoundingClientRect();
      const segmentRect = segment.getBoundingClientRect();

      // Check if segment is outside visible area
      const isAbove = segmentRect.top < containerRect.top;
      const isBelow = segmentRect.bottom > containerRect.bottom;

      if (isAbove || isBelow) {
        segment.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentSegmentIndex, isPlaying]);

  if (segments.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Audio transcript"
      className={`rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Transcript</h3>
          <span className="text-sm text-gray-500">
            ({segments.length} segments, ~{formatTime(totalDuration)} total)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Transcript Content */}
      {isExpanded && (
        <div
          ref={containerRef}
          className="max-h-96 overflow-y-auto border-t border-gray-200 dark:border-gray-700"
          role="list"
          aria-label="Transcript segments"
        >
          {segments.map((segment) => (
            <TranscriptSegmentItem
              key={segment.id}
              segment={segment}
              isActive={segment.id === currentSegmentIndex}
              isPlaying={isPlaying}
              onClick={() => onSegmentClick(segment.id)}
              ref={segment.id === currentSegmentIndex ? currentSegmentRef : null}
            />
          ))}
        </div>
      )}

      {/* Footer with help text */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-2 text-center text-xs text-gray-500 dark:border-gray-700">
          Click any timestamp to jump to that segment
        </div>
      )}
    </section>
  );
}

/**
 * Individual transcript segment with timestamp
 */
interface TranscriptSegmentItemProps {
  segment: TranscriptSegment;
  isActive: boolean;
  isPlaying: boolean;
  onClick: () => void;
}

import { forwardRef } from "react";

const TranscriptSegmentItem = forwardRef<HTMLDivElement, TranscriptSegmentItemProps>(
  function TranscriptSegmentItem({ segment, isActive, isPlaying, onClick }, ref) {
    return (
      <div
        ref={ref}
        role="listitem"
        className={`flex gap-3 p-3 transition-colors ${
          isActive
            ? isPlaying
              ? "bg-blue-100 dark:bg-blue-900/30"
              : "bg-blue-50 dark:bg-blue-900/20"
            : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
        }`}
      >
        {/* Timestamp Button */}
        <button
          onClick={onClick}
          className={`flex-shrink-0 rounded px-2 py-1 font-mono text-xs transition-colors ${
            isActive
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
          }`}
          aria-label={`Jump to ${formatTime(segment.estimatedStartTime)}`}
          title={`Jump to segment ${segment.id + 1}`}
        >
          {formatTime(segment.estimatedStartTime)}
        </button>

        {/* Segment Text */}
        <p
          className={`flex-1 text-sm leading-relaxed ${
            isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {segment.text}
        </p>

        {/* Active Indicator */}
        {isActive && isPlaying && (
          <span className="flex-shrink-0" aria-label="Currently playing">
            <span className="flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-blue-500" />
            </span>
          </span>
        )}
      </div>
    );
  }
);

/**
 * Compact transcript view showing only current and surrounding segments
 */
interface CompactTranscriptProps {
  content: string;
  currentSegmentIndex: number;
  isPlaying: boolean;
  rate: number;
  onSegmentClick: (index: number) => void;
  contextSegments?: number; // Number of segments to show before/after current
}

export function CompactTranscript({
  content,
  currentSegmentIndex,
  isPlaying: _isPlaying,
  rate,
  onSegmentClick,
  contextSegments = 1,
}: CompactTranscriptProps) {
  const segments = useMemo(() => parseTranscript(content, rate), [content, rate]);

  if (segments.length === 0) {
    return null;
  }

  // Calculate visible range
  const start = Math.max(0, currentSegmentIndex - contextSegments);
  const end = Math.min(segments.length, currentSegmentIndex + contextSegments + 1);
  const visibleSegments = segments.slice(start, end);

  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
      aria-label="Compact transcript view"
    >
      <div className="space-y-2">
        {start > 0 && (
          <button
            onClick={() => onSegmentClick(start - 1)}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ▲ {start} more segment{start !== 1 ? "s" : ""} above
          </button>
        )}

        {visibleSegments.map((segment) => (
          <div
            key={segment.id}
            className={`flex items-start gap-2 rounded p-2 text-sm ${
              segment.id === currentSegmentIndex
                ? "bg-blue-100 dark:bg-blue-900/30"
                : "bg-white dark:bg-gray-700"
            }`}
          >
            <button
              onClick={() => onSegmentClick(segment.id)}
              className={`flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${
                segment.id === currentSegmentIndex
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400"
              }`}
            >
              {formatTime(segment.estimatedStartTime)}
            </button>
            <span
              className={
                segment.id === currentSegmentIndex
                  ? "font-medium text-gray-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400"
              }
            >
              {segment.text.length > 100 ? segment.text.substring(0, 100) + "..." : segment.text}
            </span>
          </div>
        ))}

        {end < segments.length && (
          <button
            onClick={() => onSegmentClick(end)}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ▼ {segments.length - end} more segment{segments.length - end !== 1 ? "s" : ""} below
          </button>
        )}
      </div>
    </div>
  );
}

export type { TranscriptSegment };
