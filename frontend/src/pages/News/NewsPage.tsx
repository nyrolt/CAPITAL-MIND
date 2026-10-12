import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  Clock,
  Building2,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Tag,
  CheckCircle2,
  Info,
  X
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { newsService, NewsFilterParams } from '../../services/newsService';
import { NewsArticleItem, NewsStatusResult, ImpactDirection } from '../../types';

export const NewsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'portfolio'>('all');
  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [status, setStatus] = useState<NewsStatusResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [impactFilter, setImpactFilter] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal / Drawer state
  const [selectedArticle, setSelectedArticle] = useState<NewsArticleItem | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statusRes] = await Promise.all([
        newsService.getStatus().catch(() => null)
      ]);
      if (statusRes) setStatus(statusRes);

      if (activeTab === 'portfolio') {
        const portNews = await newsService.getPersonalizedNews(30);
        setArticles(portNews);
        setTotalCount(portNews.length);
        setTotalPages(1);
      } else {
        const params: NewsFilterParams = {
          page,
          limit: 15,
          search: search.trim() || undefined,
          impact: impactFilter || undefined,
          sector: sectorFilter || undefined,
          status: statusFilter || undefined
        };
        const feedRes = await newsService.getNewsFeed(params);
        setArticles(feedRes.items);
        setTotalPages(feedRes.pages);
        setTotalCount(feedRes.total);
      }
    } catch (err: any) {
      console.error('Failed to load news:', err);
      setError(err?.message || 'Failed to load financial news feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page, search, impactFilter, sectorFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const getImpactBadge = (direction?: ImpactDirection) => {
    switch (direction) {
      case 'POSITIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingUp className="w-3 h-3" /> Positive Impact
          </span>
        );
      case 'NEGATIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <TrendingDown className="w-3 h-3" /> Negative Impact
          </span>
        );
      case 'MIXED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> Mixed Impact
          </span>
        );
      case 'NEUTRAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3" /> Neutral
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
            Uncertain
          </span>
        );
    }
  };

  const getAnalysisStatusBadge = (article: NewsArticleItem) => {
    if (article.analysis_status === 'ANALYZED' && article.analysis) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Sparkles className="w-3 h-3 text-purple-600" /> GEMINI AI
        </span>
      );
    }
    if (article.analysis_status === 'SIMULATED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          SIMULATED
        </span>
      );
    }
    if (article.analysis_status === 'RATE_LIMITED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          RATE LIMITED
        </span>
      );
    }
    if (article.analysis_status === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          ANALYSIS UNAVAILABLE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" /> ANALYSIS PENDING
      </span>
    );
  };

  const formatPubDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-silver-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-graphite text-white flex items-center justify-center shadow-silver-sm">
                <Newspaper className="w-5 h-5 text-silver" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-graphite">Financial News & AI Market Impact</h1>
                <p className="text-xs text-muted font-medium">
                  Live verified Indian equities, NSE/BSE announcements, corporate earnings, and Google Gemini market assessments
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-silver-light border border-silver-border text-xs text-graphite font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>LIVE FEED ({status.total_articles} articles)</span>
                {status.gemini_enabled && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold ml-1">
                    GEMINI {status.gemini_model}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-silver-border text-xs font-semibold text-graphite hover:bg-silver-light transition-all shadow-silver-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-silver-border space-x-6 text-sm font-semibold">
          <button
            onClick={() => { setActiveTab('all'); setPage(1); }}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-graphite text-graphite'
                : 'border-transparent text-muted hover:text-graphite'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Market Feed
            {totalCount > 0 && activeTab === 'all' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-silver-light border border-silver-border text-graphite font-medium">
                {totalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('portfolio'); setPage(1); }}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'portfolio'
                ? 'border-graphite text-graphite'
                : 'border-transparent text-muted hover:text-graphite'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            Affecting My Portfolio & Watchlist
          </button>
        </div>

        {/* Filters Bar (Only for Market Feed) */}
        {activeTab === 'all' && (
          <div className="bg-white p-4 rounded-2xl border border-silver-border shadow-silver-sm space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search headlines, company names, RBI policy, earnings..."
                  className="w-full pl-10 pr-4 py-2 bg-silver-light/40 border border-silver-border rounded-xl text-xs text-graphite focus:outline-none focus:ring-2 focus:ring-graphite/20"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={impactFilter}
                  onChange={(e) => { setImpactFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-silver-light/40 border border-silver-border rounded-xl text-xs text-graphite font-medium focus:outline-none"
                >
                  <option value="">All Impacts</option>
                  <option value="POSITIVE">Positive Impact</option>
                  <option value="NEGATIVE">Negative Impact</option>
                  <option value="MIXED">Mixed Impact</option>
                  <option value="NEUTRAL">Neutral</option>
                  <option value="UNCERTAIN">Uncertain</option>
                </select>

                <select
                  value={sectorFilter}
                  onChange={(e) => { setSectorFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-silver-light/40 border border-silver-border rounded-xl text-xs text-graphite font-medium focus:outline-none"
                >
                  <option value="">All Sectors</option>
                  <option value="Banking">Banking</option>
                  <option value="Information Technology">IT / Software</option>
                  <option value="Energy">Energy / Oil & Gas</option>
                  <option value="Automobile">Automobile</option>
                  <option value="Pharmaceuticals">Pharma</option>
                  <option value="FMCG">FMCG</option>
                  <option value="Metals">Metals & Mining</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-silver-light/40 border border-silver-border rounded-xl text-xs text-graphite font-medium focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="ANALYZED">Analyzed by Gemini</option>
                  <option value="PENDING">Analysis Pending</option>
                  <option value="FAILED">Analysis Unavailable</option>
                </select>

                {(search || impactFilter || sectorFilter || statusFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setImpactFilter('');
                      setSectorFilter('');
                      setStatusFilter('');
                      setPage(1);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Content Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-silver-border animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                <div className="h-12 bg-slate-50 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-rose-800">{error}</p>
            <button
              onClick={() => loadData()}
              className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition-all shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center bg-white border border-silver-border rounded-2xl shadow-silver-sm">
            <Newspaper className="w-12 h-12 text-muted mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-graphite">No Articles Found</h3>
            <p className="text-xs text-muted max-w-md mx-auto mt-1">
              {activeTab === 'portfolio'
                ? "No recent news directly mentions your active portfolio holdings or watchlist symbols. Check back after next market cycle."
                : "No market articles match your current search and filter criteria."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => {
              const analysis = article.analysis;
              return (
                <div
                  key={article.id}
                  className="bg-white rounded-2xl border border-silver-border p-5 md:p-6 shadow-silver-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer relative group"
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Meta header */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-graphite bg-silver-light px-2.5 py-0.5 rounded-md border border-silver-border">
                          {article.source}
                        </span>
                        <span className="text-muted flex items-center gap-1 font-medium text-[11px]">
                          <Clock className="w-3 h-3" /> {formatPubDate(article.published_at)}
                        </span>
                        {getAnalysisStatusBadge(article)}
                        {analysis?.impact_direction && getImpactBadge(analysis.impact_direction)}
                      </div>

                      {/* Headline */}
                      <h2 className="text-base md:text-lg font-bold text-graphite group-hover:text-graphite-dark transition-colors leading-snug">
                        {article.headline}
                      </h2>

                      {/* Summary */}
                      {article.summary && (
                        <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                          {article.summary}
                        </p>
                      )}

                      {/* Gemini Insight snippet if available */}
                      {analysis && (
                        <div className="mt-3 p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Gemini Market Assessment</span>
                            <span className="text-[10px] text-purple-600 font-normal">
                              (Confidence: {(analysis.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <p className="text-xs text-purple-950 font-medium leading-relaxed">
                            {analysis.reasoning}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {analysis.sectors?.map((sec) => (
                              <span key={sec} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-purple-200 text-purple-800">
                                <Tag className="w-2.5 h-2.5 text-purple-600" /> {sec}
                              </span>
                            ))}
                            {analysis.stocks?.map((stk) => (
                              <span key={stk} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-emerald-300 text-emerald-800 shadow-xs">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> {stk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-start pt-2 md:pt-0">
                      <a
                        href={article.canonical_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-muted hover:text-graphite hover:bg-silver-light rounded-xl transition-all border border-transparent hover:border-silver-border"
                        title="Read on original publisher website"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-graphite bg-silver-light hover:bg-silver-border rounded-xl transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArticle(article);
                        }}
                      >
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {activeTab === 'all' && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-silver-border pt-6">
            <span className="text-xs text-muted font-medium">
              Showing page {page} of {totalPages} ({totalCount} total articles)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-silver-border text-xs font-semibold text-graphite hover:bg-silver-light disabled:opacity-40 transition-all"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-silver-border text-xs font-semibold text-graphite hover:bg-silver-light disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="p-4 rounded-xl bg-silver-light/60 border border-silver-border text-center text-xs text-muted">
          <p className="font-semibold text-graphite">CapitalMind Educational & Market Information Disclaimer</p>
          <p className="mt-0.5">
            News aggregation and Google Gemini AI market impact assessments are strictly for informational and research purposes.
            They do not constitute investment advice, stock recommendations, or predictive guarantees. Consult a certified SEBI financial advisor before investing.
          </p>
        </div>

        {/* Detail Modal / Drawer */}
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-graphite/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-silver-border shadow-2xl p-6 md:p-8 space-y-6 animate-scaleIn">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-silver-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-graphite bg-silver-light px-2.5 py-0.5 rounded-md border border-silver-border">
                      {selectedArticle.source}
                    </span>
                    <span className="text-muted text-[11px]">
                      Published: {formatPubDate(selectedArticle.published_at)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-graphite leading-snug">
                    {selectedArticle.headline}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="p-1.5 text-muted hover:text-graphite rounded-xl hover:bg-silver-light transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary */}
              {selectedArticle.summary && (
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-muted">Article Summary / Excerpt</h4>
                  <p className="text-xs text-graphite bg-silver-light/40 p-4 rounded-xl border border-silver-border leading-relaxed">
                    {selectedArticle.summary}
                  </p>
                </div>
              )}

              {/* Gemini AI Detailed Analysis */}
              {selectedArticle.analysis ? (
                <div className="space-y-4 p-5 rounded-2xl bg-purple-50/60 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-purple-900">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Google Gemini Market Assessment</span>
                    </div>
                    {getImpactBadge(selectedArticle.analysis.impact_direction)}
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-purple-900">Reasoning:</span>
                    <p className="text-purple-950 leading-relaxed font-medium">
                      {selectedArticle.analysis.reasoning}
                    </p>
                  </div>

                  {selectedArticle.analysis.uncertainty && (
                    <div className="space-y-1 text-xs bg-white/70 p-3 rounded-xl border border-purple-100">
                      <span className="font-bold text-purple-900 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-purple-600" /> Uncertainty & Limitations:
                      </span>
                      <p className="text-purple-900 leading-relaxed">
                        {selectedArticle.analysis.uncertainty}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1">
                      <span className="font-semibold text-muted">Potentially Affected Sectors:</span>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedArticle.analysis.sectors?.length > 0 ? (
                          selectedArticle.analysis.sectors.map((sec) => (
                            <span key={sec} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                              {sec}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted italic">Broad market</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1">
                      <span className="font-semibold text-muted">Verified Stocks (NSE/BSE):</span>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedArticle.analysis.stocks?.length > 0 ? (
                          selectedArticle.analysis.stocks.map((stk) => (
                            <span key={stk} className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              {stk}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted italic">No specific tickers isolated</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedArticle.analysis.directly_mentioned?.length > 0 && (
                    <div className="text-xs text-purple-900">
                      <span className="font-semibold">Directly Mentioned Companies: </span>
                      <span>{selectedArticle.analysis.directly_mentioned.join(', ')}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-purple-700 border-t border-purple-200/60 pt-3">
                    <span>Source: {selectedArticle.analysis.analysis_source}</span>
                    <span>Time Horizon: {selectedArticle.analysis.time_horizon}</span>
                    <span>Confidence: {(selectedArticle.analysis.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-silver-light border border-silver-border text-xs text-muted space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-graphite">
                    <Clock className="w-4 h-4 text-muted" />
                    <span>Gemini AI Analysis Pending</span>
                  </div>
                  <p>
                    This article has been ingested from verified Indian RSS feeds and is currently queued for automated Gemini AI impact processing.
                  </p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-silver-border pt-4">
                <a
                  href={selectedArticle.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-graphite text-white text-xs font-semibold rounded-xl hover:bg-graphite-dark transition-all shadow-silver-sm"
                >
                  Read Full Publisher Article <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="px-4 py-2 border border-silver-border text-xs font-semibold text-graphite rounded-xl hover:bg-silver-light transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
export default NewsPage;
