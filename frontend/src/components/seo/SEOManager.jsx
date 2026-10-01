import { useState, useEffect } from 'react';
import { Search, Globe, BarChart3, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SEOManager = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [seoData, setSeoData] = useState({
    metaTitle: '',
    metaDescription: '',
    keywords: [],
    ogImage: '',
    canonicalUrl: '',
    robots: 'index,follow',
    sitemapEnabled: true
  });
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSEOData();
  }, []);

  // SEO values persist as church settings under seo_* keys
  const SEO_KEY_MAP = {
    metaTitle: 'seo_meta_title',
    metaDescription: 'seo_meta_description',
    keywords: 'seo_keywords',
    ogImage: 'seo_og_image',
    canonicalUrl: 'seo_canonical_url',
    robots: 'seo_robots',
    sitemapEnabled: 'seo_sitemap_enabled',
  };

  const fetchSEOData = async () => {
    try {
      const response = await api.get('/settings');
      const list = response.data?.data?.settings || response.data?.settings || [];
      const saved = {};
      (Array.isArray(list) ? list : []).forEach((s) => {
        Object.entries(SEO_KEY_MAP).forEach(([field, key]) => {
          if (s.key === key) {
            saved[field] = field === 'keywords'
              ? (Array.isArray(s.value) ? s.value : String(s.value).split(',').map(k => k.trim()).filter(Boolean))
              : field === 'sitemapEnabled'
                ? s.value === true || s.value === 'true'
                : s.value;
          }
        });
      });
      if (Object.keys(saved).length) setSeoData((prev) => ({ ...prev, ...saved }));
    } catch (error) {
      console.error('Failed to fetch SEO data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real heuristic analysis — no backend round-trip needed
  const analyzeSEO = () => {
    const issues = [];
    const t = seoData.metaTitle.trim();
    const d = seoData.metaDescription.trim();

    if (!t) issues.push({ severity: 'error', title: 'Missing meta title', description: 'Every page needs a title tag — it is the first thing searchers see.' });
    else if (t.length < 30) issues.push({ severity: 'warning', title: 'Meta title too short', description: `${t.length} characters — aim for 30–60.` });
    else if (t.length > 60) issues.push({ severity: 'warning', title: 'Meta title too long', description: `${t.length} characters — Google truncates past ~60.` });
    else issues.push({ severity: 'ok', title: 'Meta title length is good', description: `${t.length} characters.` });

    if (!d) issues.push({ severity: 'error', title: 'Missing meta description', description: 'Search engines show this as the page snippet.' });
    else if (d.length < 120) issues.push({ severity: 'warning', title: 'Meta description too short', description: `${d.length} characters — aim for 120–160.` });
    else if (d.length > 160) issues.push({ severity: 'warning', title: 'Meta description too long', description: `${d.length} characters — it will be truncated.` });
    else issues.push({ severity: 'ok', title: 'Meta description length is good', description: `${d.length} characters.` });

    issues.push(seoData.keywords.length === 0
      ? { severity: 'warning', title: 'No keywords set', description: 'Add a few terms members and visitors might search for.' }
      : { severity: 'ok', title: 'Keywords configured', description: `${seoData.keywords.length} keyword(s).` });

    issues.push(!seoData.ogImage
      ? { severity: 'warning', title: 'No Open Graph image', description: 'Links shared on social media will have no preview image.' }
      : { severity: 'ok', title: 'OG image configured', description: 'Social shares will show a preview image.' });

    if (seoData.canonicalUrl) {
      try { new URL(seoData.canonicalUrl); issues.push({ severity: 'ok', title: 'Canonical URL valid', description: seoData.canonicalUrl }); }
      catch { issues.push({ severity: 'error', title: 'Canonical URL invalid', description: 'Must be a full URL like https://example.com/page' }); }
    }

    setAnalysis({ issues });
  };

  const saveSEO = async () => {
    try {
      const settings = Object.entries(SEO_KEY_MAP).map(([field, key]) => ({
        key,
        value: field === 'keywords' ? seoData.keywords.join(', ') : String(seoData[field]),
      }));
      await api.put('/settings/bulk', { settings });
      toast.success('SEO settings saved');
    } catch (error) {
      toast.error('Failed to save SEO settings');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading SEO settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">SEO Manager</h2>

      {/* Meta Tags */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="text-[var(--color-primary)]" size={20} />
          <h3 className="font-semibold">Meta Tags</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Meta Title</label>
            <input
              type="text"
              value={seoData.metaTitle}
              onChange={(e) => setSeoData({ ...seoData, metaTitle: e.target.value })}
              placeholder="Page title (50-60 characters recommended)"
              className="w-full p-2 border rounded-lg"
            />
            <div className="text-sm text-[var(--color-textSecondary)] mt-1">
              {seoData.metaTitle.length}/60 characters
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Meta Description</label>
            <textarea
              value={seoData.metaDescription}
              onChange={(e) => setSeoData({ ...seoData, metaDescription: e.target.value })}
              placeholder="Page description (150-160 characters recommended)"
              className="w-full p-2 border rounded-lg h-24 resize-none"
            />
            <div className="text-sm text-[var(--color-textSecondary)] mt-1">
              {seoData.metaDescription.length}/160 characters
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Keywords (comma-separated)</label>
            <input
              type="text"
              value={seoData.keywords.join(', ')}
              onChange={(e) => setSeoData({ ...seoData, keywords: e.target.value.split(',').map(k => k.trim()) })}
              placeholder="keyword1, keyword2, keyword3"
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Open Graph */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="text-[var(--color-success)]" size={20} />
          <h3 className="font-semibold">Open Graph</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">OG Image URL</label>
            <input
              type="text"
              value={seoData.ogImage}
              onChange={(e) => setSeoData({ ...seoData, ogImage: e.target.value })}
              placeholder="https://example.com/og-image.jpg"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Canonical URL</label>
            <input
              type="text"
              value={seoData.canonicalUrl}
              onChange={(e) => setSeoData({ ...seoData, canonicalUrl: e.target.value })}
              placeholder="https://example.com/page"
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Robots & Sitemap */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="text-[var(--color-accent)]" size={20} />
          <h3 className="font-semibold">Robots & Sitemap</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Robots Meta Tag</label>
            <select
              value={seoData.robots}
              onChange={(e) => setSeoData({ ...seoData, robots: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="index,follow">Index, Follow</option>
              <option value="noindex,follow">No Index, Follow</option>
              <option value="index,nofollow">Index, No Follow</option>
              <option value="noindex,nofollow">No Index, No Follow</option>
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={seoData.sitemapEnabled}
              onChange={(e) => setSeoData({ ...seoData, sitemapEnabled: e.target.checked })}
            />
            Enable XML Sitemap
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={analyzeSEO}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
        >
          <BarChart3 size={16} />
          Analyze SEO
        </button>
        <button
          onClick={saveSEO}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]"
        >
          <Check size={16} />
          Save Settings
        </button>
      </div>

      {/* SEO Analysis Results */}
      {analysis && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <h3 className="font-semibold mb-4">SEO Analysis</h3>
          <div className="space-y-3">
            {analysis.issues.map((issue, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  issue.severity === 'error' ? 'bg-[var(--color-error-light)]' :
                  issue.severity === 'warning' ? 'bg-[var(--color-warning-light)]' :
                  'bg-[var(--color-success-light)]'
                }`}
              >
                {issue.severity === 'error' ? (
                  <AlertCircle className="text-[var(--color-error)] mt-0.5" size={16} />
                ) : (
                  <Check className="text-[var(--color-success)] mt-0.5" size={16} />
                )}
                <div>
                  <div className="font-medium">{issue.title}</div>
                  <div className="text-sm text-[var(--color-textSecondary)]">{issue.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SEOManager;
