import React, { useState, useEffect } from 'react';
import {
    Zap, Clock, ShoppingCart, MessageCircle,
    CheckCircle, AlertCircle, Plus, ToggleLeft, ToggleRight,
    TrendingUp, Users, Calendar, Instagram, Sparkles, X, Settings, Upload,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { INSTAGRAM_API_BASE_URL } from '../lib/config';
import { apiFetch } from '../lib/api';

// Safe string utility to prevent React Child error
const safeString = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);

    try {
        if (Array.isArray(val)) {
            if (val.length === 0) return '';
            const first = val[0];
            if (typeof first === 'object' && first !== null) {
                const extracted = first.msg || first.message || first.detail || JSON.stringify(first);
                return typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
            }
            return String(first);
        }
        if (typeof val === 'object') {
            const best = val.detail || val.message || val.msg || JSON.stringify(val);
            return typeof best === 'string' ? best : JSON.stringify(best);
        }
        return String(val);
    } catch (e) {
        return 'Error';
    }
};

// Premium Bento Grid UI Concept
export default function Campaigns({ customerId, onPromoteToFlow }) {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newCampaign, setNewCampaign] = useState({
        type: 'CUSTOM',
        name: '',
        message: '',
        keyword_trigger: '',
        auto_reply_comment: '',
        buttons: '', // Comma separated
        coupon_code: '',
        image_url: '',
        scheduled_at: '',
        send_now: true,
        _originalConfig: {} // To preserve fields not in UI
    });
    const [uploading, setUploading] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9; // 3 rows × 3 columns

    // Broadcast-specific state
    const [broadcastSegment, setBroadcastSegment] = useState({
        tags: [],
        last_active_days: 'all',
        min_engagement_score: 0
    });
    const [previewAudience, setPreviewAudience] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);


    // Load campaigns on mount
    useEffect(() => {
        if (customerId) {
            loadCampaigns();
        }
    }, [customerId]);

    const loadCampaigns = async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`/campaigns/list`);
            if (res.ok) {
                const data = await res.json();
                // Valid types and their order
                const validOrder = ['WELCOME', 'STORY_MENTION', 'COMMENT_GROWTH', 'BROADCAST'];

                // Filter out legacy types that are no longer supported
                const filtered = (data.campaigns || []).filter(c =>
                    validOrder.includes(c.type) || c.type === 'CUSTOM'
                );

                // Sort: predefined order first, then CUSTOM at the end
                const sorted = filtered.sort((a, b) => {
                    const idxA = validOrder.indexOf(a.type);
                    const idxB = validOrder.indexOf(b.type);

                    // If both are in validOrder, use that order
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    // If only A is in validOrder, A comes first
                    if (idxA !== -1) return -1;
                    // If only B is in validOrder, B comes first
                    if (idxB !== -1) return 1;
                    // Both are CUSTOM, sort by creation date (newest first)
                    return new Date(b.created_at) - new Date(a.created_at);
                });

                setCampaigns(sorted);
            }
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    const toggleCampaign = async (campaign) => {
        const isTurningOn = !campaign.is_active;
        const targetType = campaign.type;

        // Optimistic Update Setup
        let previousCampaigns = [...campaigns];

        // 1. Update State Optimistically
        setCampaigns(prev => prev.map(c => {
            if (c.id === campaign.id) {
                return { ...c, is_active: isTurningOn };
            }
            // If turning ON, disable others of same type
            if (isTurningOn && c.type === targetType && c.is_active) {
                return { ...c, is_active: false };
            }
            return c;
        }));

        try {
            // 2. Send Request for Target Campaign
            await apiFetch(`/campaigns/${campaign.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: isTurningOn })
            });

            // 3. If turning ON, deactivate others in background
            if (isTurningOn) {
                const othersToDeactivate = previousCampaigns.filter(c =>
                    c.id !== campaign.id && c.type === targetType && c.is_active
                );

                // Fire and forget deactivation requests
                othersToDeactivate.forEach(other => {
                    apiFetch(`/campaigns/${other.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ is_active: false })
                    }).catch(e => { });
                });
            }
        } catch (error) {

            // Revert on failure (simple revert)
            setCampaigns(previousCampaigns);
            alert("상태 변경에 실패했습니다.");
        }
    };
    const handlePreviewAudience = async () => {
        try {
            setLoadingPreview(true);
            const res = await apiFetch(`/campaigns/broadcast/preview`, {
                method: 'POST',
                body: JSON.stringify({
                    customer_id: customerId,
                    segment: {
                        tags: broadcastSegment.tags,
                        last_active_days: broadcastSegment.last_active_days === 'all' ? undefined : parseInt(broadcastSegment.last_active_days),
                        min_engagement_score: broadcastSegment.min_engagement_score
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                setPreviewAudience(data);
            }
        } catch (error) {

        } finally {
            setLoadingPreview(false);
        }
    };

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            const url = isEditMode
                ? `/campaigns/${editingId}`
                : `/campaigns/create`;

            const method = isEditMode ? 'PATCH' : 'POST';

            let payload;

            if (newCampaign.type === 'BROADCAST') {
                payload = {
                    type: 'BROADCAST',
                    config: {
                        name: newCampaign.name,
                        message: newCampaign.message,
                        image_url: newCampaign.image_url || undefined
                        // No buttons for broadacst yet in simple UI, or can be added
                    },
                    target_segment: {
                        tags: broadcastSegment.tags,
                        last_active_days: broadcastSegment.last_active_days === 'all' ? undefined : parseInt(broadcastSegment.last_active_days),
                        min_engagement_score: broadcastSegment.min_engagement_score
                    },
                    is_active: true // Active by default to show in list
                };
            } else {
                payload = isEditMode ? {
                    config: {
                        ...newCampaign._originalConfig,
                        name: newCampaign.name,
                        message: newCampaign.message,
                        keyword_trigger: newCampaign.keyword_trigger,
                        auto_reply_comment: newCampaign.auto_reply_comment,
                        buttons: newCampaign.buttons ? newCampaign.buttons.split(',').map(b => b.trim()) : undefined,
                        coupon_code: newCampaign.coupon_code || undefined,
                        image_url: newCampaign.image_url || undefined
                    }
                } : {
                    type: newCampaign.type,
                    config: {
                        name: newCampaign.name,
                        message: newCampaign.message,
                        keyword_trigger: newCampaign.keyword_trigger,
                        auto_reply_comment: newCampaign.auto_reply_comment,
                        buttons: newCampaign.buttons ? newCampaign.buttons.split(',').map(b => b.trim()) : undefined,
                        coupon_code: newCampaign.coupon_code || undefined,
                        image_url: newCampaign.image_url || undefined
                    },
                    is_active: false
                };
            }

            const res = await apiFetch(url, {
                method,
                body: JSON.stringify(isEditMode ? payload : { ...payload, customer_id: customerId })
            });

            if (res.ok) {
                const data = await res.json();

                // If it's a broadcast and we are creating (not editing) and send立即 is true
                if (newCampaign.type === 'BROADCAST' && !isEditMode) {
                    // Call Send API
                    // Note: In simple mode we send immediately if not scheduled
                    await apiFetch(`/campaigns/broadcast/send`, {
                        method: 'POST',
                        body: JSON.stringify({
                            campaign_id: data.id,
                            send_now: !newCampaign.scheduled_at,
                            scheduled_at: newCampaign.scheduled_at
                        })
                    });

                    // Reload campaigns to get updated stats
                    loadCampaigns();
                } else {
                    if (isEditMode) {
                        setCampaigns(prev => prev.map(c => c.id === editingId ? data : c));
                    } else {
                        setCampaigns(prev => [...prev, data]);
                    }
                }

                setIsModalOpen(false);
                resetForm();
            }
        } catch (error) {

        } finally {
            setIsCreating(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const res = await apiFetch(`/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                // If the URL is relative, prepend base URL
                const absoluteUrl = data.url.startsWith('http')
                    ? data.url
                    : `${INSTAGRAM_API_BASE_URL}${data.url}`;

                setNewCampaign(prev => ({ ...prev, image_url: absoluteUrl }));
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.detail || "파일 업로드에 실패했습니다.");
            }
        } catch (error) {

            alert("파일 업로드 중 오류가 발생했습니다.");
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setNewCampaign({
            type: 'CUSTOM', name: '', message: '',
            keyword_trigger: '', auto_reply_comment: '',
            buttons: '', coupon_code: '', image_url: '',
            scheduled_at: '', send_now: true,
            _originalConfig: {}
        });
        setIsEditMode(false);
        setEditingId(null);
    };

    const openEditModal = (campaign) => {
        setNewCampaign({
            type: campaign.type,
            name: campaign.type === 'CUSTOM' ? campaign.config?.name : getCampaignTitle(campaign),
            message: campaign.config?.message || '',
            keyword_trigger: campaign.config?.keyword_trigger || '',
            auto_reply_comment: campaign.config?.auto_reply_comment || '',
            buttons: Array.isArray(campaign.config?.buttons) ? campaign.config.buttons.join(', ') : '',
            coupon_code: campaign.config?.coupon_code || '',
            image_url: campaign.config?.image_url || '',
            scheduled_at: campaign.scheduled_at || '',
            send_now: !campaign.scheduled_at,
            _originalConfig: campaign.config || {}
        });
        setEditingId(campaign.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const getCampaignIcon = (type) => {
        switch (type) {
            case 'WELCOME': return <Zap className="w-8 h-8 text-green-400" />;
            case 'STORY_MENTION': return <Instagram className="w-8 h-8 text-pink-500" />;
            case 'COMMENT_GROWTH': return <TrendingUp className="w-8 h-8 text-blue-500" />;
            case 'BROADCAST': return <Users className="w-8 h-8 text-orange-500" />;
            case 'CUSTOM': return <Sparkles className="w-8 h-8 text-indigo-500" />;
            default: return <Zap className="w-8 h-8" />;
        }
    };

    const getCampaignTitle = (campaign) => {
        if (campaign.type === 'CUSTOM') return campaign.config?.name || '커스텀 캠페인';
        if (campaign.type === 'BROADCAST') return campaign.config?.name || '브로드캐스트';
        switch (campaign.type) {
            case 'WELCOME': return '웰컴 메시지';
            case 'STORY_MENTION': return '스토리 답장';
            case 'COMMENT_GROWTH': return '댓글-DM 성장 비서';
            default: return campaign.type;
        }
    };

    const getSubTitle = (type) => {
        switch (type) {
            case 'WELCOME': return 'Welcome Message';
            case 'STORY_MENTION': return 'Story Reply';
            case 'COMMENT_GROWTH': return 'Viral Comment Growth';
            case 'BROADCAST': return 'Bulk Messaging';
            case 'CUSTOM': return 'Custom Campaign';
            default: return '';
        }
    };

    const getCampaignUsage = (type) => {
        switch (type) {
            case 'WELCOME': return '처음 DM을 보낸 모든 고객에게 발송';
            case 'BROADCAST': return '선택한 세그먼트에게 일괄 발송';
            case 'STORY_MENTION': return '나를 태그한 스토리가 업로드되면 발송';
            case 'COMMENT_GROWTH': return '게시물에 댓글을 달면 자동으로 상세 정보를 DM으로 발송';
            case 'CUSTOM': return '설정한 조건에 맞춰 자동으로 발송';
            default: return '';
        }
    };

    const getCampaignDesc = (campaign) => {
        if (campaign.type === 'CUSTOM') return campaign.config?.message || '설정한 메시지를 자동으로 발송합니다.';
        switch (campaign.type) {
            case 'WELCOME': return '첫 DM 고객에게 자동으로 인사하고 브랜드 소개를 전달합니다.';
            case 'STORY_MENTION': return '스토리에 태그해주신 고객님께 감사 인사와 쿠폰을 보냅니다.';
            case 'COMMENT_GROWTH': return '인공지능이 댓글을 감지해 정보를 보내고 게시물 노출을 폭발시킵니다.';
            default: return '';
        }
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="font-medium text-purple-600">Autopilot 준비 중...</p>
                </div>
            </div>
        );
    }

    // Pagination calculations
    const totalPages = Math.ceil(campaigns.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentCampaigns = campaigns.slice(startIndex, endIndex);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="space-y-8 p-0 sm:p-2">
            <div className="flex justify-end mb-6">
                <Button
                    onClick={openCreateModal}
                    className="bg-gray-900 text-white hover:bg-black h-9 px-4 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
                >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> 새 캠페인 생성
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentCampaigns.map((campaign) => (
                    <div
                        key={campaign.id}
                        className={`
                            group relative overflow-hidden rounded-[2rem] p-6 border transition-all duration-500 bg-white
                            ${campaign.is_active
                                ? 'border-indigo-100 shadow-[0_15px_40px_rgba(99,102,241,0.08)]'
                                : 'border-gray-100 shadow-sm'}
                        `}
                    >
                        {/* Static white background to ensure no transparency */}
                        <div className="absolute inset-0 bg-white z-0 pointer-events-none"></div>

                        {/* Content */}
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-5">
                                {/* Left Side: Secondary Actions */}
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => {
                                            if (campaign.type === 'BROADCAST' && campaign.sent_at) return;
                                            openEditModal(campaign);
                                        }}
                                        className={`p-3 rounded-xl bg-gray-50 text-gray-400 transition-all border border-transparent shadow-sm 
                                            ${(campaign.type === 'BROADCAST' && campaign.sent_at)
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100'}`}
                                        title={campaign.type === 'BROADCAST' && campaign.sent_at ? "발송 완료된 캠페인은 수정할 수 없습니다" : "설정 변경"}
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>

                                </div>

                                {/* Right Side: Primary Action / Status */}
                                <div>
                                    {campaign.type === 'BROADCAST' ? (
                                        <div className="flex flex-col items-end gap-1">
                                            {campaign.sent_at ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 whitespace-nowrap">
                                                    발송됨
                                                </div>
                                            ) : campaign.scheduled_at ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 rounded-full text-[10px] font-bold text-orange-600 whitespace-nowrap">
                                                    예약됨
                                                </div>
                                            ) : (
                                                <div className="px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-400 whitespace-nowrap">
                                                    준비 중
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => toggleCampaign(campaign)}
                                            className="transition-transform active:scale-90 focus:outline-none"
                                        >
                                            {campaign.is_active
                                                ? <ToggleRight className="w-12 h-12 text-indigo-600 drop-shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-300" />
                                                : <ToggleLeft className="w-12 h-12 text-gray-300 transition-all duration-300 hover:text-gray-400" />
                                            }
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mb-1.5">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight">{safeString(getCampaignTitle(campaign))}</h3>
                                <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">{getSubTitle(campaign.type)}</div>
                            </div>

                            <p className="text-gray-500 text-[13px] mb-6 font-medium">
                                <span
                                    style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {safeString(getCampaignDesc(campaign))}
                                </span>
                            </p>

                            {/* Current Configuration Preview (Compact Bento) */}
                            <div className={`mb-6 p-5 rounded-[1.5rem] border transition-all duration-500 ${campaign.is_active ? 'bg-white border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="space-y-4">
                                    {/* Message Preview */}
                                    {campaign.config?.message && (
                                        <div className="bg-white p-3.5 rounded-2xl text-xs text-gray-800 font-semibold border border-indigo-50 shadow-sm">
                                            <span
                                                style={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    wordBreak: 'break-word',
                                                }}
                                            >
                                                {safeString(campaign.config.message)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Image Preview on Card */}
                                    {campaign.config?.image_url && (
                                        <div className="relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm h-24 w-full">
                                            <img
                                                src={campaign.config.image_url}
                                                alt="Campaign"
                                                className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        {campaign.type === 'COMMENT_GROWTH' && campaign.config?.keyword_trigger && (
                                            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm">
                                                <div className="text-[9px] font-black text-indigo-500 uppercase mb-0.5">Keyword</div>
                                                <div className="text-[11px] font-bold text-gray-900 truncate">{safeString(campaign.config.keyword_trigger)}</div>
                                            </div>
                                        )}
                                        {campaign.type === 'STORY_MENTION' && campaign.config?.coupon_code && (
                                            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm">
                                                <div className="text-[9px] font-black text-indigo-500 uppercase mb-0.5">Coupon</div>
                                                <div className="text-[11px] font-bold text-gray-900 truncate">{safeString(campaign.config.coupon_code)}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-100 rounded-2xl p-4 mb-8 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                    How it works
                                </div>
                                <div className="text-[13px] font-bold text-gray-700 leading-snug">
                                    {safeString(getCampaignUsage(campaign.type))}
                                </div>
                            </div>

                            {/* Live Stats */}
                            <div className="mt-auto pt-6 border-t border-gray-100 flex gap-6 items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Sent</span>
                                    <span className="text-xl font-mono font-bold text-gray-900 leading-none">
                                        {safeString(campaign.stats?.sent?.toLocaleString() || 0)}
                                    </span>
                                </div>
                                <div className="w-px h-8 bg-gray-100"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Clicks</span>
                                    <span className="text-xl font-mono font-bold text-gray-900 leading-none">
                                        {safeString(campaign.stats?.clicked?.toLocaleString() || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                    {/* Previous Button */}
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === 1
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-900 hover:text-white border border-gray-200 hover:border-gray-900 shadow-sm active:scale-95'
                            }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === page
                                ? 'bg-gray-900 text-white shadow-lg scale-105'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm active:scale-95'
                                }`}
                        >
                            {page}
                        </button>
                    ))}

                    {/* Next Button */}
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === totalPages
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-900 hover:text-white border border-gray-200 hover:border-gray-900 shadow-sm active:scale-95'
                            }`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Create Campaign Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] overflow-y-auto">
                        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                        <div className="flex min-h-full items-center justify-center p-4 sm:p-10 pointer-events-none">
                            <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] p-0 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-300 pointer-events-auto flex flex-col h-fit max-h-[90vh] my-auto overflow-hidden">
                                <div className="flex justify-between items-center p-8 pb-4 border-b border-gray-50">
                                    <h2 className="text-3xl font-black text-gray-900">{isEditMode ? '캠페인 설정' : '새 캠페인 생성'}</h2>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                        <X className="w-6 h-6 text-gray-400" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateCampaign} className="flex-1 overflow-y-scroll p-8 space-y-6">
                                    {!isEditMode && (
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4 ml-1">캠페인 유형 선택</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { id: 'WELCOME', label: '웰컴 메시지', icon: <Zap className="w-4 h-4" />, color: 'bg-green-50 text-green-600 border-green-100' },
                                                    { id: 'STORY_MENTION', label: '스토리 언급', icon: <Instagram className="w-4 h-4" />, color: 'bg-pink-50 text-pink-600 border-pink-100' },
                                                    { id: 'COMMENT_GROWTH', label: '댓글 성장', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                                                    { id: 'BROADCAST', label: '브로드캐스트', icon: <Users className="w-4 h-4" />, color: 'bg-orange-50 text-orange-600 border-orange-100' },
                                                ].map((type) => (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => setNewCampaign({ ...newCampaign, type: type.id })}
                                                        className={`
                                                        flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-sm
                                                        ${newCampaign.type === type.id
                                                                ? `${type.color.replace('50', '100')} border-current shadow-sm scale-[1.02]`
                                                                : 'bg-white border-gray-50 text-gray-400 hover:border-gray-100'}
                                                    `}
                                                    >
                                                        <div className={`p-2 rounded-xl ${newCampaign.type === type.id ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                                                            {type.icon}
                                                        </div>
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">캠페인 이름</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: 팔로워 감사 쿠폰 이벤트"
                                            className="w-full bg-gray-50 border-0 rounded-2xl p-4 text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                                            value={newCampaign.name}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">자동 발송 메시지</label>
                                        <textarea
                                            required
                                            rows={4}
                                            placeholder="고객에게 자동으로 발송될 메시지를 입력하세요."
                                            className="w-full bg-gray-50 border-0 rounded-2xl p-4 text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-purple-500 transition-all font-medium resize-none"
                                            value={newCampaign.message}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                                        />
                                    </div>

                                    {newCampaign.type === 'WELCOME' && (
                                        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-4">
                                            <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100/50">
                                                <label className="block text-xs font-bold text-green-600 mb-2">하단 버튼 (콤마로 구분)</label>
                                                <input
                                                    type="text"
                                                    placeholder="예: 위치 보기, 가격 문의, 예약하기"
                                                    className="w-full bg-white border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500 font-medium"
                                                    value={newCampaign.buttons}
                                                    onChange={(e) => setNewCampaign({ ...newCampaign, buttons: e.target.value })}
                                                />
                                                <p className="text-[10px] text-green-500/70 mt-2 ml-1">메시지 하단에 표시될 바로가기 버튼입니다.</p>
                                            </div>

                                            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                                <label className="block text-xs font-bold text-gray-400 mb-2">웰컴 이미지 (추천: 1080x1080)</label>
                                                <div className="flex gap-2 mb-3">
                                                    <input
                                                        type="text"
                                                        placeholder="https://example.com/welcome.jpg"
                                                        className="flex-1 bg-white border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 font-medium"
                                                        value={newCampaign.image_url}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, image_url: e.target.value })}
                                                    />
                                                    <label className="flex items-center gap-2 px-4 bg-purple-100 text-purple-600 rounded-xl font-bold text-sm cursor-pointer hover:bg-purple-200 transition-colors">
                                                        <Upload className="w-4 h-4" />
                                                        {uploading ? '...' : '이미지'}
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                                    </label>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-2 ml-1">첫 인사와 함께 전송될 이미지 링크 또는 파일입니다.</p>
                                                {newCampaign.image_url && (
                                                    <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-100 h-32 w-full group">
                                                        <img
                                                            src={newCampaign.image_url}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => e.target.src = 'https://placehold.co/600x400?text=Invalid+Image+URL'}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {newCampaign.type === 'STORY_MENTION' && (
                                        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-4">
                                            <div className="p-4 bg-pink-50/50 rounded-2xl border border-pink-100/50">
                                                <label className="block text-xs font-bold text-pink-600 mb-2">할인 쿠폰 코드</label>
                                                <input
                                                    type="text"
                                                    placeholder="예: WELCOME10, THANKYOU5"
                                                    className="w-full bg-white border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-pink-500 font-medium"
                                                    value={newCampaign.coupon_code}
                                                    onChange={(e) => setNewCampaign({ ...newCampaign, coupon_code: e.target.value })}
                                                />
                                                <p className="text-[10px] text-pink-500/70 mt-2 ml-1">스토리 언급 시 발송될 쿠폰 코드입니다.</p>
                                            </div>

                                            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                                <label className="block text-xs font-bold text-gray-400 mb-2">이미지 (쿠폰/홍보 이미지)</label>
                                                <div className="flex gap-2 mb-3">
                                                    <input
                                                        type="text"
                                                        placeholder="https://example.com/coupon.jpg"
                                                        className="flex-1 bg-white border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 font-medium"
                                                        value={newCampaign.image_url}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, image_url: e.target.value })}
                                                    />
                                                    <label className="flex items-center gap-2 px-4 bg-purple-100 text-purple-600 rounded-xl font-bold text-sm cursor-pointer hover:bg-purple-200 transition-colors">
                                                        <Upload className="w-4 h-4" />
                                                        {uploading ? '...' : '이미지'}
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                                    </label>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-2 ml-1">이미지 주소를 직접 넣거나 PC에서 파일을 선택하세요.</p>
                                                {newCampaign.image_url && (
                                                    <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-100 h-32 w-full group">
                                                        <img
                                                            src={newCampaign.image_url}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => e.target.src = 'https://placehold.co/600x400?text=Invalid+Image+URL'}
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-white text-[10px] font-bold">이미지 미리보기</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {newCampaign.type === 'COMMENT_GROWTH' && (
                                        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4">
                                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <TrendingUp className="w-4 h-4 text-blue-500" />
                                                    <span className="text-xs font-bold text-blue-600">성장 필터 설정 (ManyChat 스타일)</span>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">트리거 키워드 (선택)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="예: 쿠폰, 정보, 참여"
                                                            className="w-full bg-white border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-blue-200"
                                                            value={newCampaign.keyword_trigger}
                                                            onChange={(e) => setNewCampaign({ ...newCampaign, keyword_trigger: e.target.value })}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-2">댓글 자동 답장 (DM 발송 후 남길 공개 댓글)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="예: 디엠(DM)으로 정보를 보내드렸습니다! ✨"
                                                            className="w-full bg-white border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                                                            value={newCampaign.auto_reply_comment}
                                                            onChange={(e) => setNewCampaign({ ...newCampaign, auto_reply_comment: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                                <label className="block text-xs font-bold text-gray-400 mb-2">상세 정보 이미지 (추천: 1080x1350)</label>
                                                <div className="flex gap-2 mb-3">
                                                    <input
                                                        type="text"
                                                        placeholder="https://example.com/product-info.jpg"
                                                        className="flex-1 bg-white border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 font-medium"
                                                        value={newCampaign.image_url}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, image_url: e.target.value })}
                                                    />
                                                    <label className="flex items-center gap-2 px-4 bg-purple-100 text-purple-600 rounded-xl font-bold text-sm cursor-pointer hover:bg-purple-200 transition-colors">
                                                        <Upload className="w-4 h-4" />
                                                        {uploading ? '...' : '이미지'}
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                                    </label>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-2 ml-1">상세 정보 DM과 함께 전송될 이미지 링크 또는 파일입니다.</p>
                                                {newCampaign.image_url && (
                                                    <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-100 h-32 w-full group">
                                                        <img
                                                            src={newCampaign.image_url}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => e.target.src = 'https://placehold.co/600x400?text=Invalid+Image+URL'}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {newCampaign.type === 'BROADCAST' && (
                                        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4">
                                            <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Users className="w-4 h-4 text-orange-500" />
                                                    <span className="text-xs font-bold text-orange-600">타겟 세그먼트 설정</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">활동 고객 기준</label>
                                                        <select
                                                            className="w-full bg-white border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 font-medium"
                                                            value={broadcastSegment.last_active_days}
                                                            onChange={(e) => setBroadcastSegment({ ...broadcastSegment, last_active_days: e.target.value })}
                                                        >
                                                            <option value="all">전체 팔로워</option>
                                                            <option value="7">최근 7일 활성</option>
                                                            <option value="30">최근 30일 활성</option>
                                                            <option value="90">최근 90일 활성</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">최소 관여도 (점)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            className="w-full bg-white border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 font-medium"
                                                            value={broadcastSegment.min_engagement_score}
                                                            onChange={(e) => setBroadcastSegment({ ...broadcastSegment, min_engagement_score: parseInt(e.target.value) })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-purple-500" />
                                                        <span className="text-xs font-bold text-gray-600">발송 스케줄</span>
                                                    </div>
                                                    <div className="flex bg-white/50 p-1 rounded-xl border border-gray-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewCampaign({ ...newCampaign, send_now: true, scheduled_at: '' })}
                                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${newCampaign.send_now ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            즉시 발송
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewCampaign({ ...newCampaign, send_now: false })}
                                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!newCampaign.send_now ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            예약 발송
                                                        </button>
                                                    </div>
                                                </div>

                                                {!newCampaign.send_now && (
                                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-200">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">날짜 선택</label>
                                                            <div className="relative">
                                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                                <input
                                                                    type="date"
                                                                    className="w-full bg-white border-0 rounded-xl pl-11 p-4 text-sm focus:ring-2 focus:ring-purple-500 font-bold text-gray-700"
                                                                    value={newCampaign.scheduled_at?.split('T')[0] || ''}
                                                                    onChange={(e) => {
                                                                        const timePart = newCampaign.scheduled_at?.split('T')[1] || '09:00:00';
                                                                        setNewCampaign({ ...newCampaign, scheduled_at: `${e.target.value}T${timePart}` });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">시간 선택</label>
                                                            <div className="relative">
                                                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                                <select
                                                                    className="w-full bg-white border-0 rounded-xl pl-11 p-4 text-sm focus:ring-2 focus:ring-purple-500 font-bold text-gray-700 appearance-none cursor-pointer"
                                                                    value={newCampaign.scheduled_at?.split('T')[1]?.substring(0, 5) || '09:00'}
                                                                    onChange={(e) => {
                                                                        const datePart = newCampaign.scheduled_at?.split('T')[0] || new Date().toISOString().split('T')[0];
                                                                        setNewCampaign({ ...newCampaign, scheduled_at: `${datePart}T${e.target.value}:00` });
                                                                    }}
                                                                >
                                                                    {Array.from({ length: 48 }).map((_, i) => {
                                                                        const h = Math.floor(i / 2).toString().padStart(2, '0');
                                                                        const m = (i % 2 === 0 ? '00' : '30');
                                                                        const time = `${h}:${m}`;
                                                                        const ampm = i < 24 ? '오전' : '오후';
                                                                        const displayHour = i === 0 ? 12 : (i > 24 ? Math.floor(i / 2) - 12 : Math.floor(i / 2));
                                                                        const finalHour = displayHour === 0 ? 12 : displayHour;
                                                                        return (
                                                                            <option key={time} value={time}>
                                                                                {ampm} {finalHour}:{m} ({time})
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2 mt-4 px-1">
                                                            {[
                                                                {
                                                                    label: '🚀 +1시간 뒤', onClick: () => {
                                                                        const d = new Date(); d.setHours(d.getHours() + 1); d.setMinutes(0);
                                                                        const datePart = d.toLocaleDateString('en-CA');
                                                                        const timePart = d.toTimeString().split(' ')[0].substring(0, 5);
                                                                        setNewCampaign({ ...newCampaign, scheduled_at: `${datePart}T${timePart}:00` });
                                                                    }
                                                                },
                                                                {
                                                                    label: '🌙 오늘 저녁 18:00', onClick: () => {
                                                                        const d = new Date();
                                                                        const datePart = d.toLocaleDateString('en-CA');
                                                                        setNewCampaign({ ...newCampaign, scheduled_at: `${datePart}T18:00:00` });
                                                                    }
                                                                },
                                                                {
                                                                    label: '☀️ 내일 오전 10:00', onClick: () => {
                                                                        const d = new Date(); d.setDate(d.getDate() + 1);
                                                                        const datePart = d.toLocaleDateString('en-CA');
                                                                        setNewCampaign({ ...newCampaign, scheduled_at: `${datePart}T10:00:00` });
                                                                    }
                                                                }
                                                            ].map((pick, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    onClick={pick.onClick}
                                                                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black border border-purple-100/50 transition-all active:scale-95 shadow-sm"
                                                                >
                                                                    {pick.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 flex gap-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1 h-14 rounded-2xl border-2 border-gray-100 font-bold hover:bg-gray-50"
                                            onClick={() => setIsModalOpen(false)}
                                        >
                                            취소
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isCreating}
                                            className="flex-1 bg-gray-900 text-white hover:bg-black h-14 rounded-2xl font-black shadow-lg shadow-gray-200"
                                        >
                                            {isCreating ? '처리 중...' : (
                                                isEditMode
                                                    ? '설정 저장하기'
                                                    : (newCampaign.type === 'BROADCAST'
                                                        ? (newCampaign.scheduled_at ? '예약 발송하기' : '지금 즉시 발송하기')
                                                        : '캠페인 생성하기'
                                                    )
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
