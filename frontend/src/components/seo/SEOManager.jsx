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

  const fetchSEOData = async () => {
    try {
      const response = await api.get('/seo/settings');
      setSeoData(response.data.seoData || seoData);
    } catch (error) {
      console.error('Failed to fetch SEO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeSEO = async () => {
    try {
      const response = await api.post('/seo/analyze', seoData);
      setAnalysis(response.data.analysis);
    } catch (error) {
      toast.error('Failed to analyze SEO');
    }
  };

  const saveSEO = async () => {
    try {
      await api.put('/seo/settings', seoData);
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
          <Globe className="text-[var(--color-primary)]-600" size={20} />
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
          <Search className="text-green-600" size={20} />
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
          <BarChart3 className="text-purple-600" size={20} />
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
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
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
                  issue.severity === 'error' ? 'bg-red-50' :
                  issue.severity === 'warning' ? 'bg-yellow-50' :
                  'bg-green-50'
                }`}
              >
                {issue.severity === 'error' ? (
                  <AlertCircle className="text-red-600 mt-0.5" size={16} />
                ) : (
                  <Check className="text-green-600 mt-0.5" size={16} />
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
