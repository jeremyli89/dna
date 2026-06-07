import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import type { IngestStatus } from "../types";

interface ImportResult {
  total_entries: number;
  valid_entries: number;
  skipped_short_plays: number;
  streams_inserted: number;
  duplicates: number;
  message: string;
}

interface UploadProgress {
  current: number;
  total: number;
  filename: string;
}

function isAudioFile(name: string): boolean {
  return /streaming_history_audio.*\.json$/i.test(name) ||
         /endsong.*\.json$/i.test(name);
}

async function collectFilesFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((f) => resolve([f]), () => resolve([]));
    });
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    return new Promise((resolve) => {
      const all: File[] = [];
      const readNext = () => {
        reader.readEntries(async (entries) => {
          if (!entries.length) { resolve(all); return; }
          for (const e of entries) {
            const files = await collectFilesFromEntry(e);
            all.push(...files);
          }
          readNext();
        }, () => resolve(all));
      };
      readNext();
    });
  }
  return [];
}

export function Import() {
  const { user } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<IngestStatus | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const loadStatus = () => api.ingest.status().then(setStatus).catch(() => {});
  useEffect(() => { loadStatus(); }, []);

  const uploadFiles = async (files: File[]) => {
    const audioFiles = files.filter((f) => isAudioFile(f.name));
    const ignored = files.filter((f) => !isAudioFile(f.name)).map((f) => f.name);

    setSkippedFiles(ignored);

    if (audioFiles.length === 0) {
      setError("No audio streaming history files found. Make sure to select files named Streaming_History_Audio_*.json");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const totals = {
      total_entries: 0,
      valid_entries: 0,
      skipped_short_plays: 0,
      streams_inserted: 0,
      duplicates: 0,
    };

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      setProgress({ current: i + 1, total: audioFiles.length, filename: file.name });
      try {
        const res = await api.ingest.uploadHistory(file) as ImportResult;
        totals.total_entries += res.total_entries ?? 0;
        totals.valid_entries += res.valid_entries ?? 0;
        totals.skipped_short_plays += res.skipped_short_plays ?? 0;
        totals.streams_inserted += res.streams_inserted ?? 0;
        totals.duplicates += res.duplicates ?? 0;
      } catch (e: any) {
        setError(`Failed on ${file.name}: ${e.message}`);
        setUploading(false);
        setProgress(null);
        return;
      }
    }

    setProgress(null);
    setUploading(false);
    setResult({
      ...totals,
      message: `Imported ${audioFiles.length} file${audioFiles.length > 1 ? "s" : ""}. Enrichment running in background.`,
    });
    loadStatus();
  };

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);

    const items = Array.from(e.dataTransfer.items);
    const allFiles: File[] = [];

    for (const item of items) {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        const files = await collectFilesFromEntry(entry);
        allFiles.push(...files);
      }
    }

    // Fallback for browsers that don't support webkitGetAsEntry
    if (allFiles.length === 0) {
      allFiles.push(...Array.from(e.dataTransfer.files));
    }

    if (allFiles.length > 0) {
      uploadFiles(allFiles);
    } else {
      setError("Could not read the dropped files.");
    }
  }, []);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadFiles(files);
    e.target.value = "";
  };

  const pollRecent = async () => {
    setPolling(true);
    setError(null);
    try {
      const res = await api.ingest.poll();
      const fetched = res.fetched ?? 0;
      const newTracks = res.new_tracks ?? 0;
      setResult({
        total_entries: fetched,
        valid_entries: fetched,
        skipped_short_plays: 0,
        streams_inserted: newTracks,
        duplicates: fetched - newTracks,
        message: fetched === 0
          ? "No new tracks found. You're up to date."
          : `Fetched ${fetched} recent tracks, added ${newTracks} new.`,
      });
      loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-dna-bg">
      <Navbar user={user} />

      <main className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Import Your History</h1>
          <p className="text-dna-muted">
            Drop your Spotify data folder or select the audio history files.
            Video files and other data are ignored automatically.
          </p>
        </div>

        {/* Current status */}
        {status && status.total_streams > 0 && (
          <div className="card">
            <p className="label mb-3">Current Data</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Total Streams" value={status.total_streams.toLocaleString()} />
              <Stat label="History" value={status.history_streams.toLocaleString()} />
              <Stat label="Via API" value={status.api_streams.toLocaleString()} />
              <Stat label="Unenriched" value={status.unenriched.toLocaleString()} color={status.unenriched > 0 ? "#f59e0b" : "#1db954"} />
            </div>
            {status.oldest_stream && (
              <p className="mt-3 text-xs text-dna-muted">
                {new Date(status.oldest_stream).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                {" → "}
                {new Date(status.newest_stream!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="card bg-gradient-card">
          <p className="label mb-3">How to Get Your Extended History</p>
          <ol className="space-y-2 text-sm text-dna-muted list-none">
            {[
              "Go to spotify.com/account/privacy and log in.",
              'Scroll to "Download your data" and select Extended Streaming History.',
              "Wait up to 30 days for Spotify to email you a download link.",
              "Unzip the package — you'll get a folder with multiple JSON files.",
              "Drop the entire folder below. Audio files are imported; video files are skipped.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-dna-accent/20 text-dna-accent text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200
            ${dragging ? "border-dna-accent bg-dna-accent/5" : "border-dna-border hover:border-dna-accent/50 hover:bg-dna-surface"}
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          {uploading && progress ? (
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-dna-border border-t-dna-accent" />
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-xs text-dna-muted mb-1.5">
                  <span className="truncate max-w-[200px]">{progress.filename}</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-dna-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-dna-accent transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-dna-muted">Importing audio files…</p>
            </div>
          ) : (
            <>
              <p className="text-4xl mb-3">📁</p>
              <p className="text-base font-medium text-white mb-1">
                Drop your Spotify data folder here
              </p>
              <p className="text-sm text-dna-muted mb-6">
                Audio files are imported automatically · Video files skipped
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="btn-primary text-sm"
                >
                  Select Folder
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-sm"
                >
                  Select Files
                </button>
              </div>
            </>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          multiple
          className="hidden"
          onChange={onFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          // @ts-expect-error – webkitdirectory is non-standard but universally supported
          webkitdirectory=""
          onChange={onFileInputChange}
        />

        {/* Skipped files notice */}
        {skippedFiles.length > 0 && (
          <div className="card border-dna-border">
            <p className="text-xs text-dna-muted mb-2">
              Skipped {skippedFiles.length} non-audio file{skippedFiles.length > 1 ? "s" : ""}:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skippedFiles.map((name) => (
                <span key={name} className="text-xs bg-dna-surface text-dna-muted px-2 py-0.5 rounded font-mono">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="card border-dna-accent/30 bg-dna-accent/5 animate-slide-up">
            <p className="text-sm font-semibold text-dna-accent mb-3">✓ Import Complete</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Total Entries" value={result.total_entries.toLocaleString()} />
              <Stat label="Valid Plays" value={result.valid_entries.toLocaleString()} />
              <Stat label="Inserted" value={result.streams_inserted.toLocaleString()} color="#1db954" />
              <Stat label="Skipped (<30s)" value={result.skipped_short_plays.toLocaleString()} />
              <Stat label="Duplicates" value={result.duplicates.toLocaleString()} />
            </div>
            <p className="mt-3 text-xs text-dna-muted">{result.message}</p>
            <Link to="/dashboard" className="mt-4 btn-primary inline-block text-sm">
              View Dashboard →
            </Link>
          </div>
        )}

        {error && (
          <div className="card border-red-500/30 bg-red-500/5">
            <p className="text-sm text-red-400">⚠ {error}</p>
          </div>
        )}

        {/* Sync recent */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold mb-1">Sync Recent Tracks</p>
              <p className="text-sm text-dna-muted">
                Fetch up to 50 recently played tracks from the Spotify API to keep
                your data current after your initial import.
              </p>
            </div>
            <button
              onClick={pollRecent}
              disabled={polling}
              className="btn-secondary text-sm flex-shrink-0 ml-4"
            >
              {polling ? "Syncing…" : "Sync Now"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="label mb-0.5">{label}</p>
      <p className="text-xl font-bold font-mono" style={{ color: color || "#ffffff" }}>
        {value}
      </p>
    </div>
  );
}
