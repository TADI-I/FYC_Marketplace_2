// ProductAnalytics.tsx - Component to show analytics for each product
import React, { useState, useEffect } from 'react';
import { Eye, MessageCircle, TrendingUp, Calendar } from 'lucide-react';
import { getProductAnalytics } from './api';

interface ProductAnalyticsProps {
  productId: string;
  productTitle: string;
}

interface AnalyticsData {
  totalWhatsAppClicks: number;
  totalViews: number;
  lastRedirectAt: string | null;
  createdAt: string;
  recentRedirects: Array<{
    timestamp: string;
    userAgent: string;
  }>;
}

const ProductAnalytics: React.FC<ProductAnalyticsProps> = ({ productId, productTitle }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await getProductAnalytics(productId);
        setAnalytics(response.analytics);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const conversionRate = analytics.totalViews > 0 
    ? ((analytics.totalWhatsAppClicks / analytics.totalViews) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="apple-surface product-analytics bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        Analytics: {productTitle}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Views */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Views</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {analytics.totalViews}
              </p>
            </div>
            <div className="bg-blue-200 rounded-full p-3">
              <Eye className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </div>

        {/* WhatsApp Clicks */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">WhatsApp Clicks</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {analytics.totalWhatsAppClicks}
              </p>
            </div>
            <div className="bg-blue-200 rounded-full p-3">
              <MessageCircle className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Click Rate</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {conversionRate}%
              </p>
            </div>
            <div className="bg-purple-200 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-purple-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Last Activity */}
      {analytics.lastRedirectAt && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Last WhatsApp click: {new Date(analytics.lastRedirectAt).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {analytics.recentRedirects && analytics.recentRedirects.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3 text-gray-700">Recent Activity (Last 30 Days)</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {analytics.recentRedirects.slice(0, 10).map((redirect, index) => (
              <div key={index} className="bg-gray-50 rounded p-3 text-xs flex justify-between items-center">
                <span className="text-gray-600">
                  {new Date(redirect.timestamp).toLocaleString()}
                </span>
                <span className="text-gray-400 truncate max-w-xs ml-2">
                  {redirect.userAgent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAnalytics;
