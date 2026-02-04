"use client";

/* eslint-disable react-hooks/set-state-in-effect */
// Disabling this rule because we legitimately need to:
// 1. Detect browser TTS support on client-side mount
// 2. Restore user preferences (voice, rate) from localStorage

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface TTSPlayerProps {
  content: string;
  title?: string;
  onPositionChange?: (position: number) => void;
  initialPosition?: number;
}

interface VoiceOption {
  voice: SpeechSynthesisVoice;
  label: string;
}

// Check TTS support outside component to avoid effect issues
function checkTTSSupport(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

export function TTSPlayer({
  content,
  title,
  onPositionChange,
  initialPosition = 0,
}: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>("");
  const [rate, setRate] = useState(1);
  const [currentParagraph, setCurrentParagraph] = useState(initialPosition);
  const [progress, setProgress] = useState(0);
  const [currentText, setCurrentText] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  // Parse content into paragraphs for tracking - use useMemo so it's available during render
  const paragraphs = useMemo(() => {
    const text = content
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  }, [content]);

  // Mark as client-side rendered
  useEffect(() => {
    setIsClient(true);
  }, []);

  const isSupported = isClient && checkTTSSupport();

  // Load voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      const englishVoices = availableVoices
        .filter((v) => v.lang.startsWith("en"))
        .map((voice) => ({
          voice,
          label: `${voice.name} (${voice.lang})${voice.default ? " - Default" : ""}`,
        }));

      setVoices(englishVoices);

      const savedVoice = localStorage.getItem("tts-voice");
      if (savedVoice && englishVoices.find((v) => v.voice.voiceURI === savedVoice)) {
        setSelectedVoiceUri(savedVoice);
      } else if (englishVoices.length > 0) {
        const defaultVoice = englishVoices.find((v) => v.voice.default) || englishVoices[0];
        setSelectedVoiceUri(defaultVoice.voice.voiceURI);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    const savedRate = localStorage.getItem("tts-rate");
    if (savedRate) {
      setRate(parseFloat(savedRate));
    }

    return () => {
      speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speak = useCallback(
    (startIndex: number = 0) => {
      if (!isSupported || paragraphs.length === 0) return;

      speechSynthesis.cancel();
      setIsPlaying(true);
      setIsPaused(false);

      const speakChunk = (index: number) => {
        if (index >= paragraphs.length) {
          setIsPlaying(false);
          setCurrentParagraph(0);
          setProgress(100);
          setCurrentText("");
          return;
        }

        const chunkText = paragraphs[index];
        const utterance = new SpeechSynthesisUtterance(chunkText);

        const selectedVoice = voices.find((v) => v.voice.voiceURI === selectedVoiceUri);
        if (selectedVoice) {
          utterance.voice = selectedVoice.voice;
        }

        utterance.rate = rate;
        utterance.pitch = 1;

        utterance.onstart = () => {
          setCurrentParagraph(index);
          setCurrentText(chunkText);
          setProgress(Math.round((index / paragraphs.length) * 100));
          onPositionChange?.(index);
        };

        utterance.onend = () => {
          speakChunk(index + 1);
        };

        utterance.onerror = (event) => {
          if (event.error !== "interrupted" && event.error !== "canceled") {
            console.error("TTS Error:", event.error);
            setIsPlaying(false);
          }
        };

        speechSynthesis.speak(utterance);
      };

      speakChunk(startIndex);
    },
    [isSupported, paragraphs, voices, selectedVoiceUri, rate, onPositionChange]
  );

  const handlePlay = () => {
    if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    } else {
      speak(currentParagraph);
    }
  };

  const handlePause = () => {
    speechSynthesis.pause();
    setIsPaused(true);
  };

  const handleStop = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentParagraph(0);
    setProgress(0);
    setCurrentText("");
  };

  const handleVoiceChange = (voiceUri: string) => {
    setSelectedVoiceUri(voiceUri);
    localStorage.setItem("tts-voice", voiceUri);

    if (isPlaying) {
      speechSynthesis.cancel();
      setTimeout(() => speak(currentParagraph), 100);
    }
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    localStorage.setItem("tts-rate", newRate.toString());

    if (isPlaying) {
      speechSynthesis.cancel();
      setTimeout(() => speak(currentParagraph), 100);
    }
  };

  const handleSkipBack = () => {
    const newIndex = Math.max(0, currentParagraph - 1);
    setCurrentParagraph(newIndex);
    if (isPlaying) {
      speechSynthesis.cancel();
      speak(newIndex);
    }
  };

  const handleSkipForward = () => {
    const newIndex = Math.min(paragraphs.length - 1, currentParagraph + 1);
    setCurrentParagraph(newIndex);
    if (isPlaying) {
      speechSynthesis.cancel();
      speak(newIndex);
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Text-to-speech is not supported in your browser. Please use a modern browser like Chrome,
          Firefox, or Safari for audio playback.
        </p>
      </div>
    );
  }

  const totalSentences = paragraphs.length || 1;

  return (
    <section
      aria-label="Text-to-speech audio player"
      className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      {title && (
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Listen to Lesson
        </h3>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Playback progress: ${progress}%`}
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span aria-live="polite">
            {currentParagraph + 1} / {totalSentences} sentences
          </span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div
        className="mb-4 flex flex-wrap items-center justify-center gap-2"
        role="group"
        aria-label="Playback controls"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkipBack}
          disabled={currentParagraph === 0}
          aria-label="Previous sentence"
        >
          <span aria-hidden="true">⏮</span>
        </Button>

        {isPlaying && !isPaused ? (
          <Button onClick={handlePause} size="sm" className="w-20" aria-label="Pause audio">
            Pause
          </Button>
        ) : (
          <Button
            onClick={handlePlay}
            size="sm"
            className="w-20"
            aria-label={isPaused ? "Resume audio" : "Play audio"}
          >
            {isPaused ? "Resume" : "Play"}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          disabled={!isPlaying && !isPaused}
          aria-label="Stop audio"
        >
          <span aria-hidden="true">⏹</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSkipForward}
          disabled={currentParagraph >= paragraphs.length - 1}
          aria-label="Next sentence"
        >
          <span aria-hidden="true">⏭</span>
        </Button>
      </div>

      {/* Speed Control */}
      <div className="mb-3">
        <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
          Speed: {rate}x
        </label>
        <div className="flex gap-1">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
            <button
              key={r}
              onClick={() => handleRateChange(r)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                rate === r
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {r}x
            </button>
          ))}
        </div>
      </div>

      {/* Voice Selection */}
      {voices.length > 0 && (
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Voice</label>
          <select
            value={selectedVoiceUri}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {voices.map((v) => (
              <option key={v.voice.voiceURI} value={v.voice.voiceURI}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Currently Speaking */}
      {isPlaying && currentText && (
        <div
          className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-xs text-blue-600 dark:text-blue-400">Now speaking:</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            &quot;{currentText.substring(0, 150)}
            {currentText.length > 150 ? "..." : ""}&quot;
          </p>
        </div>
      )}
    </section>
  );
}
