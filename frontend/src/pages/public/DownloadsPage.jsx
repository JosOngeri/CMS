import { useEffect, useState } from 'react';
import { Download, Smartphone, History, Tag, Calendar, FileText } from 'lucide-react';
import axios from 'axios';

function DownloadsPage() {
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/apk/versions')
      .then(res => {
        setManifest(res.data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Unable to load version data');
        setLoading(false);
      });
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes) return '— MB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderLatest = () => {
    if (!manifest?.latest) return null;
    const v = manifest.latest;
    return (
      <section className="bg-[var(--color-primary)] text-white rounded-2xl p-8 md:p-12 mb-16 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="p-4 bg-white/10 rounded-2xl">
            <Smartphone className="w-12 h-12" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">KMainCMS Android App</h1>
            <p className="text-white/90 max-w-2xl">
              Download the official Kiserian Main SDA Church management app. Connect to your church, manage members, payments, events, and departments.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-2xl font-bold">v{v.version}</div>
            <div className="text-white/80 text-sm flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {v.date}
            </div>
            {v.size && <div className="text-white/70 text-sm">{formatBytes(v.size)}</div>}
            <a
              href={`/api/apk/download/${v.version}`}
              className="mt-4 inline-flex items-center gap-2 bg-white text-[var(--color-primary)] px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-colors shadow-lg"
            >
              <Download className="w-5 h-5" />
              Download Latest
            </a>
          </div>
        </div>
      </section>
    );
  };

  const renderChangelog = (entry) => {
    if (!entry?.changes?.length) return null;
    return (
      <ul className="mt-3 text-sm text-[var(--color-textSecondary)] list-disc pl-5 space-y-1">
        {entry.changes.map((c, i) => <li key={i}>{c}</li>)}
      </ul>
    );
  };

  const renderArchive = () => {
    if (!manifest?.archive?.length) return null;
    return (
      <section>
        <h2 className="text-2xl font-bold text-[var(--color-textPrimary)] mb-6 flex items-center gap-2">
          <History className="w-6 h-6" />
          Previous Versions
        </h2>
        <div className="grid gap-4">
          {manifest.archive.map((v) => (
            <div
              key={v.version}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Tag className="w-5 h-5 text-[var(--color-primary)]" />
                    <h3 className="text-xl font-bold text-[var(--color-textPrimary)]">v{v.version}</h3>
                    <span className="text-sm text-[var(--color-textSecondary)] flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {v.date}
                    </span>
                  </div>
                  {renderChangelog(v)}
                </div>
                <div className="flex items-center gap-4">
                  {v.size && <span className="text-sm text-[var(--color-textSecondary)]">{formatBytes(v.size)}</span>}
                  <a
                    href={`/api/apk/download/${v.version}`}
                    className="inline-flex items-center gap-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center text-[var(--color-textSecondary)]">Loading versions…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-[var(--color-error)] mb-4">Could not load downloads</h1>
          <p className="text-[var(--color-textSecondary)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {renderLatest()}

        {manifest?.latest && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-[var(--color-textPrimary)] mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              What’s New in v{manifest.latest.version}
            </h2>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
              {renderChangelog(manifest.latest)}
            </div>
          </section>
        )}

        {renderArchive()}

        <section className="mt-16 text-center">
          <p className="text-[var(--color-textSecondary)] text-sm">
            APKs are versioned, archived, and served from the KMainCMS server.
            The latest build is always available at <code>/downloads</code>.
          </p>
        </section>
      </div>
    </div>
  );
}

export default DownloadsPage;
