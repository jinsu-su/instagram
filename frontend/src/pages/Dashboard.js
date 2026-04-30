import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, MessageSquare, Workflow, Megaphone, Users, FileText,
  BarChart3, Settings, Menu, X, Bell, ChevronDown, LogOut,
  AlertCircle, CheckCircle, Clock, TrendingUp, Zap, ThumbsUp,
  ThumbsDown, HelpCircle, Meh, Heart, Reply, Palette, Sparkles,
  ShieldCheck, UploadCloud, Loader2, Check, Copy, Camera,
  ChevronLeft, ChevronRight, Bot, Key, Lock, Plus, Trash2, Link as LinkIcon,
  LayoutGrid, Grid, ArrowLeft, Image as ImageIcon, ArrowRight,
  Search, Tag, Filter, User, UserCheck, MoreHorizontal, Activity, BrainCircuit,
  MessageCircle, Instagram, CheckCircle2, Lightbulb, LayoutDashboard, RefreshCw, RefreshCcw, RotateCw, Info,
  DollarSign, Star, ArrowUpRight, Send, Upload, BookOpen, Layout, MessageSquareText,
  Target, Shuffle, CreditCard, Square, Bookmark, Eye, EyeOff, Share2, ImagePlus, Type, AlignLeft, UserPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { INSTAGRAM_API_BASE_URL } from '../lib/config';
import { apiFetch, safeFetch, safeString, clearSessionAndRedirect } from '../lib/api';
import Subscription from './Subscription'; // PortOne Payment Page
import Campaigns from './Campaigns';
import DashboardErrorBoundary from './dashboard/DashboardErrorBoundary';
import PremiumFeatureLock from './dashboard/PremiumFeatureLock';
import { REPLY_PRESETS, FOLLOW_REMINDER_PRESETS } from './dashboard/presets';
import SubscriptionView from './dashboard/views/SubscriptionView';
import DashboardMainView from './dashboard/views/DashboardMainView';
import DataErrorState from './dashboard/components/DataErrorState';
import LoadingScreen from './dashboard/components/LoadingScreen';
import OnboardingView from './dashboard/components/OnboardingView';
import EmergencyModal from './dashboard/components/EmergencyModal';
import SubscriptionModalOverlay from './dashboard/components/SubscriptionModalOverlay';
import DashboardViewContent from './dashboard/components/DashboardViewContent';
import BasicKpiDetailModal from './dashboard/components/BasicKpiDetailModal';
import DashboardOverlays from './dashboard/components/DashboardOverlays';
import UsageWarningBanner from './dashboard/components/UsageWarningBanner';
import MessagingEligibilityBanner from './dashboard/components/MessagingEligibilityBanner';
import menuItems from './dashboard/menuItems';
import SidebarNav from './dashboard/components/SidebarNav';
import DashboardTopNav from './dashboard/components/DashboardTopNav';
import NotificationToast from './dashboard/components/NotificationToast';
import { getPlanAccessState } from './dashboard/planAccess';
import ContactDetailModal from './dashboard/components/ContactDetailModal';
import MainContentArea from './dashboard/components/MainContentArea';
import PostAnalysisView from './dashboard/views/PostAnalysisView';
import InsightsView from './dashboard/views/InsightsView';
import TemplatesView from './dashboard/views/TemplatesView';
import FlowsView from './dashboard/views/FlowsView';
import CommentsView from './dashboard/views/CommentsView';
import AiGuardView from './dashboard/views/AiGuardView';
import ContactsView from './dashboard/views/ContactsView';
import InboxView from './dashboard/views/InboxView';
import PlaceholderView from './dashboard/views/PlaceholderView';
import AutomationCenterView from './dashboard/views/AutomationCenterView';
import AiViralPostMakerView from './dashboard/views/AiViralPostMakerView';
import AiSettingsView from './dashboard/views/AiSettingsView';
import AiKbModalView from './dashboard/views/AiKbModalView';
import FlowModalView from './dashboard/views/FlowModalView';
import PresetSelectorModal from './dashboard/components/PresetSelectorModal';
import KeywordSettingsView from './dashboard/views/KeywordSettingsView';
import MobileSimulatorView from './dashboard/views/MobileSimulatorView';
import PostPickerModalView from './dashboard/components/PostPickerModalView';
import TargetPostPreviewModalView from './dashboard/components/TargetPostPreviewModalView';
import TargetPostsPreviewModalView from './dashboard/components/TargetPostsPreviewModalView';
import ScenarioModalView from './dashboard/components/ScenarioModalView';
import AccountModal from './dashboard/components/AccountModal';
import ConversationDeleteModal from './dashboard/components/ConversationDeleteModal';
import KeywordDeleteConfirmModal from './dashboard/components/KeywordDeleteConfirmModal';
import FlowDeleteConfirmModal from './dashboard/components/FlowDeleteConfirmModal';
import ModerationConfirmModal from './dashboard/components/ModerationConfirmModal';
import DisconnectConfirmModal from './dashboard/components/DisconnectConfirmModal';
import TransferConfirmModal from './dashboard/components/TransferConfirmModal';

function Dashboard() {
  const navigate = useNavigate();


  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSubscriptionMenu, setShowSubscriptionMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const subscriptionMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);

  // Resilience Shield: Track which sections of the dashboard failed to load
  const [sectionErrors, setSectionErrors] = useState({
    stats: false,
    insights: false,
    activities: false,
    automation: false,
    keyword: false,
    subscription: false,
    webhook: false,
    eligibility: false,
    conversations: false,
    ig_insights: false,
    page_insights: false,
    ai_settings: false,
    flows: false,
    comments: false
  });

  // Keyword Reply UI State
  const [activeTabMap, setActiveTabMap] = useState({});
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetModalType, setPresetModalType] = useState('reply');
  const [targetReplyForModal, setTargetReplyForModal] = useState(null);
  // Synchronous URL parsing for production-grade UX (Eliminates flicker)
  const queryParams = new URLSearchParams(window.location.search);

  // NOTE: Token extraction is now handled by PrivateRoute to avoid redirect loops.
  const initialCustomerId = queryParams.get('customer_id') || localStorage.getItem('customer_id') || '';
  const initialShowTransfer = queryParams.get('confirm_transfer') === 'true' && queryParams.has('target_page_id');
  const initialPendingPageId = queryParams.get('target_page_id');

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'insights', 'comments', 'inbox', etc.
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [pageLoading, setPageLoading] = useState(true);
  const [initializationError, setInitializationError] = useState(null); // SaaS Resilience: Handle backend connection failures
  const [customerInfo, setCustomerInfo] = useState(null);
  const [messagingAllowed, setMessagingAllowed] = useState(false);
  const [messagingDetail, _setMessagingDetail] = useState('');

  // Safety wrapper for messagingDetail
  const setMessagingDetail = (val) => {
    if (val && typeof val !== 'string') {
      try {
        _setMessagingDetail(val.detail || val.message || JSON.stringify(val));
      } catch (e) {
        _setMessagingDetail('상태 정보를 불러올 수 없습니다.');
      }
    } else {
      _setMessagingDetail(val);
    }
  };
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResubscribeLoading, setWebhookResubscribeLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [igInsights, setIgInsights] = useState(null);
  const [igInsightsLoading, setIgInsightsLoading] = useState(false);
  const [performanceReport, setPerformanceReport] = useState(null);
  const [performanceReportLoading, setPerformanceReportLoading] = useState(false);
  const [igComments, setIgComments] = useState(null);
  const [igCommentsLoading, setIgCommentsLoading] = useState(false);
  const [customerStatus, setCustomerStatus] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [styleLabLoading, setStyleLabLoading] = useState(false);
  const [styleLabIgLoading, setStyleLabIgLoading] = useState(false);
  const [styleLabImages, setStyleLabImages] = useState([]);
  const [styleLabError, setStyleLabError] = useState('');
  const [styleLabResult, setStyleLabResult] = useState(initialShowTransfer ? null : null);
  const styleLabScrollRef = useRef(null);

  // Chat list state (only shows messages via webhook)
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showConversationDeleteModal, setShowConversationDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [ourAccountIds, setOurAccountIds] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('당신은 브랜드 공식 AI 어시스턴트입니다. 항상 친절하고 전문적인 어투를 사용하며 고객의 문의에 답변해주세요.');
  const [isAiActive, setIsAiActive] = useState(true);
  const [aiOperateStart, setAiOperateStart] = useState('00:00');
  const [aiOperateEnd, setAiOperateEnd] = useState('23:59');
  const [aiPromptLoading, setAiPromptLoading] = useState(false);
  const [aiPromptSaving, setAiPromptSaving] = useState(false);
  const [aiKnowledgeBaseUrl, setAiKnowledgeBaseUrl] = useState(null);
  const [aiKnowledgeBaseFilename, _setAiKnowledgeBaseFilename] = useState(null);

  // Helper: extract user-friendly filename from URL or stored filename
  // URL structure is: .../folder/uuid/original_name so we grab the last segment
  const getDisplayFilename = (storedFilename, url) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    // If stored filename exists and is NOT a UUID-like string, use it directly
    if (storedFilename && typeof storedFilename === 'string' && storedFilename.trim()) {
      const nameOnly = storedFilename.replace(/\.[^.]+$/, ''); // strip extension for UUID check
      if (!uuidRegex.test(nameOnly)) {
        return storedFilename;
      }
    }
    // Try to extract original filename from the URL path (uuid/original_name structure)
    if (url && typeof url === 'string') {
      try {
        const urlPath = new URL(url).pathname;
        const segments = urlPath.split('/').filter(Boolean);
        if (segments.length >= 2) {
          const lastSegment = decodeURIComponent(segments[segments.length - 1]);
          const secondLast = segments[segments.length - 2];
          // If second-to-last segment is a UUID, the last segment is the original filename
          if (uuidRegex.test(secondLast) && lastSegment && !uuidRegex.test(lastSegment.replace(/\.[^.]+$/, ''))) {
            return lastSegment;
          }
        }
        // Fallback: just use the last segment of the URL
        const lastSeg = decodeURIComponent(segments[segments.length - 1] || '');
        if (lastSeg && !uuidRegex.test(lastSeg.replace(/\.[^.]+$/, ''))) {
          return lastSeg;
        }
      } catch (e) { /* URL parsing failed, continue to fallback */ }
    }
    // Final fallback: show a friendly generic name with extension if possible
    const ext = (storedFilename || url || '').match(/\.([a-zA-Z0-9]+)$/)?.[1];
    return ext ? `참조 파일.${ext}` : '참조 파일';
  };

  // Safety wrapper for filename state
  const setAiKnowledgeBaseFilename = (val) => {
    if (val && typeof val !== 'string') {
      try {
        _setAiKnowledgeBaseFilename(val.filename || val.name || JSON.stringify(val));
      } catch (e) {
        _setAiKnowledgeBaseFilename('Unknown File');
      }
    } else {
      _setAiKnowledgeBaseFilename(val);
    }
  };
  const [aiKbUploading, setAiKbUploading] = useState(false);
  const [showAiKbModal, setShowAiKbModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [accountOptions, setAccountOptions] = useState([]);
  const [showTransferConfirm, setShowTransferConfirm] = useState(initialShowTransfer);
  const [pendingTransferPageId, setPendingTransferPageId] = useState(initialPendingPageId);
  const [accountOptionsLoading, setAccountOptionsLoading] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages, currentView]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (subscriptionMenuRef.current && !subscriptionMenuRef.current.contains(event.target)) {
        setShowSubscriptionMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setShowNotificationMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {

    setShowProfileMenu(false);
    setShowSubscriptionMenu(false);
    setShowNotificationMenu(false);
  }, [currentView]);
  const [keywordReplies, setKeywordReplies] = useState([]);
  const [keywordRepliesLoading, setKeywordRepliesLoading] = useState(true);
  const [keywordRepliesSaving, setKeywordRepliesSaving] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [basicSummary, setBasicSummary] = useState(null);
  const [basicSummaryLoading, setBasicSummaryLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [automationStats, setAutomationStats] = useState(null);
  const [automationStatsLoading, setAutomationStatsLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Keyword Deletion Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [keywordToDelete, setKeywordToDelete] = useState(null);

  // Moderation Auto Loader
  useEffect(() => {
    if (customerId && (currentView === 'comments' || currentView === 'aiguard')) {
      loadGalleryPosts(customerId);
      loadRecentPostsForAnalysis(customerId); // Ensure this view also refreshes
      loadModerationSettings(customerId);
    }
    
    // Auto-refresh summary and builder media when switching to automation/dashboard
    if (customerId && (currentView === 'dashboard' || currentView === 'automation')) {
      loadBasicDashboardSummary(customerId);
      loadAutomationStats(customerId);
      if (currentView === 'automation' && automationView === 'builder') {
        loadUserMedia(customerId);
      }
    }
  }, [customerId, currentView]);



  // Media Post List State
  const [mediaList, setMediaList] = useState([]);
  const [mediaListLoading, setMediaListLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null); // null means 'Global' (All Posts)
  // Removed isRepliesTransitioning explicitly
  const [flows, setFlows] = useState([]);
  const [flowsLoading, setFlowsLoading] = useState(false);
  const [flowsSaving, setFlowsSaving] = useState(false);

  // New Comment Analysis State
  const [analysisSelectedPostId, setAnalysisSelectedPostId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [recentPostsForAnalysis, setRecentPostsForAnalysis] = useState([]);
  const [recentPostsLoading, setRecentPostsLoading] = useState(false);
  const [analysisMediaIndex, setAnalysisMediaIndex] = useState(0);
  const [analysisFilterCategory, setAnalysisFilterCategory] = useState('ALL');
  const [analysisSearchTerm, setAnalysisSearchTerm] = useState('');
  const [dashboardViewFilter, setDashboardViewFilter] = useState('TOTAL');
  const [dashboardSearchTerm, setDashboardSearchTerm] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('ALL');

  // AI Clean Guard (Moderation) State
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPostAnalyzing, setIsPostAnalyzing] = useState(false);
  const [postAnalysisResult, setPostAnalysisResult] = useState(null);
  const [moderationSubFilter, setModerationSubFilter] = useState('ALL');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCommentIds, setSelectedCommentIds] = useState(new Set());
  const [idsToConfirmDelete, setIdsToConfirmDelete] = useState([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [moderationActionType, setModerationActionType] = useState('DELETE'); // 'DELETE', 'HIDE', 'UNHIDE'
  const [isModerationActionLoading, setIsModerationActionLoading] = useState(false);
  const [showFlowDeleteConfirm, setShowFlowDeleteConfirm] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState(null);
  const [isDeletingFlow, setIsDeletingFlow] = useState(false);
  const [isModerationAlertActive, setIsModerationAlertActive] = useState(false);
  const [galleryPosts, setGalleryPosts] = useState([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [lastGalleryRefreshTime, setLastGalleryRefreshTime] = useState(0);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [flowForm, setFlowForm] = useState({
    name: '',
    trigger_type: 'keyword',
    trigger_source: 'all',
    match_type: 'contains', // 'exact', 'contains', 'ai_semantic'
    keyword: '',
    nodes: [],
    is_active: true
  });
  const [automationView, setAutomationView] = useState('active'); // 'active', 'templates', 'keyword'
  const [showPostPicker, setShowPostPicker] = useState(false);
  const [showTargetPostPreview, setShowTargetPostPreview] = useState(false);
  const [targetPostPreview, setTargetPostPreview] = useState(null);
  const [showTargetPostsPreview, setShowTargetPostsPreview] = useState(false);
  const [targetPostsPreview, setTargetPostsPreview] = useState([]);
  const [showBasicKpiDetailModal, setShowBasicKpiDetailModal] = useState(false);
  const [basicKpiDetail, setBasicKpiDetail] = useState(null);
  const MAX_SIMPLE_AUTOMATION_POSTS = 5;
  const [builderTargetPosts, setBuilderTargetPosts] = useState([]); // Array of { id, media_url, caption, permalink }
  const [builderKeywords, setBuilderKeywords] = useState(['링크', '구매']); // Array of keywords
  const [builderEditIndex, setBuilderEditIndex] = useState(null);
  const [keywordInputValue, setKeywordInputValue] = useState('');
  const [builderFollowCheck, setBuilderFollowCheck] = useState(false);
  const [builderFollowMessage, setBuilderFollowMessage] = useState('댓글을 남겨주셔서 감사합니다! 팔로우 확인을 위해 아래 버튼을 눌러주세요! 팔로우가 확인되면 요청하신 정보가 즉시 전송됩니다 😆');
  const [builderFollowButtonText, setBuilderFollowButtonText] = useState('팔로우 확인 및 정보 받기');
  const [builderDmMessage, setBuilderDmMessage] = useState('안녕하세요! 요청하신 시크릿 링크를 보내드립니다 😆\n\n👇 아래 링크를 클릭해주세요!');
  const [nextCursor, setNextCursor] = useState(null);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);

  // Handle Instagram Business Login (Step 1)
  const handleInstagramLogin = () => {
    const onboardPath = '/dashboard';
    const redirectUri = `${window.location.origin}${onboardPath}`;

    // 운영 환경에서 신뢰성이 높은 직접 리다이렉트 방식으로 변경
    // 백엔드에서 302 Redirect를 통해 인스타그램 로그인 페이지로 바로 이동합니다.
    const authUrl = `${INSTAGRAM_API_BASE_URL}/auth/instagram-basic/login/redirect?customer_id=${customerId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  // Handle Full Meta OAuth (Step 2 - Facebook Page Connection)
  const handleMetaLogin = () => {
    const onboardPath = '/dashboard';
    const redirectUri = `${window.location.origin}${onboardPath}`;

    // 운영 환경에서 신뢰성이 높은 직접 리다이렉트 방식으로 변경
    // 백엔드에서 302 Redirect를 통해 메타(페이스북) 로그인 페이지로 바로 이동합니다.
    const authUrl = `${INSTAGRAM_API_BASE_URL}/auth/meta/login/redirect?redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  // AI Viral Post Maker State
  const viralPostScrollRef = useRef(null);
  const [viralPostMedia, setViralPostMedia] = useState([]);
  const [viralPostIntent, setViralPostIntent] = useState("");
  const [viralPostLoading, setViralPostLoading] = useState(false);
  const [viralPostResult, setViralPostResult] = useState(null);
  const [viralPostError, setViralPostError] = useState(null);
  const [activeCaptionTab, setActiveCaptionTab] = useState('engagement');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // AI CRM (Contacts) State
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // Notification close timer ref
  const notificationTimerRef = useRef(null);

  const showNotify = (message, type = 'success', description = '', actionButton = null) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);

    // Immediate sanitization ensures no objects ever enter the notification state
    const displayMessage = safeString(message);
    const displayDescription = safeString(description);

    setNotification({
      show: true,
      message: displayMessage || (type === 'error' ? '오류가 발생했습니다.' : ''),
      type,
      description: displayDescription,
      actionButton,
    });

    notificationTimerRef.current = setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success', description: '', actionButton: null });
    }, 6000); // 6 seconds to allow time to click the button
  };

  // Premium lock toast with payment CTA
  const showPremiumLockToast = (msg = null) => {
    showNotify(
      msg || '프리미엄 요금제로 연장해야 이용할 수 있습니다.',
      'error',
      '',
      {
        label: '결제하러 가기',
        onClick: () => {
          setCurrentView('subscription');
          setShowScenarioModal(false);
          setShowFlowModal(false);
        }
      }
    );
  };

  const loadAccountOptions = async () => {
    try {
      setAccountOptionsLoading(true);
      const res = await apiFetch('/instagram/accounts/connect/options');
      if (res.ok) {
        const data = await res.json();
        setAccountOptions(data.options || []);
      }
    } catch (err) {

    } finally {
      setAccountOptionsLoading(false);
    }
  };

  const handleDisconnectAccount = async () => {
    try {
      const res = await apiFetch('/instagram/accounts/disconnect', { method: 'POST' });
      if (res.ok) {
        showNotify('인스타그램 계정 연결이 해제되었습니다.');
        setShowDisconnectConfirm(false);
        setShowAccountModal(false);
        // Reset only Instagram connection state (keep app login)
        setCustomerStatus(prev => prev ? {
          ...prev,
          integration_status: 'PENDING',
          instagram_account: null,
        } : prev);
        setIgInsights(null);
        // Show Instagram connect screen (account modal)
        setShowAccountModal(true);
      } else {
        throw new Error('Disconnect failed');
      }
    } catch (err) {
      showNotify('계정 연결 해제 중 오류가 발생했습니다.', 'error');
    }
  };

  const [contactsSearch, setContactsSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [filterTags, setFilterTags] = useState([]);
  const [filterEngagement, setFilterEngagement] = useState(0); // Minimum score
  const [activeSegment, setActiveSegment] = useState('all'); // 'all', 'vip', 'potential', 'inquiry'


  const renderDataError = (sectionName, retryFn) => (
    <DataErrorState retryFn={retryFn} />
  );

  // Check messaging eligibility
  const loadMessagingEligibility = async (id) => {
    try {
      setEligibilityLoading(true);
      const res = await apiFetch(`/admin/customers/${id}/messaging-eligibility`);
      if (!res.ok) {
        // If public endpoint is 404, check integration_status from customerStatus
        if (res.status === 404) {
          // Allow if customerStatus exists and is APPROVED
          if (customerStatus?.integration_status === 'APPROVED') {
            setMessagingAllowed(true);
            setMessagingDetail('');
            return;
          }
          setMessagingAllowed(false);
          setMessagingDetail('Customer information not found. Please try re-linking your account.');
          return;
        }
        throw new Error('Could not verify admin approval status.');
      }
      const data = await res.json();
      setMessagingAllowed(Boolean(data.allowed));
      setMessagingDetail(data.detail || '');
      setCustomerInfo((prev) => ({
        ...(prev || {}),
        integration_status: data.status,
      }));
    } catch (err) {

      // Allow if customerStatus is APPROVED even if error occurs
      if (customerStatus?.integration_status === 'APPROVED') {
        setMessagingAllowed(true);
        setMessagingDetail('');
      } else {
        setMessagingAllowed(false);
        setMessagingDetail('Failed to load admin approval information.');
      }
    } finally {
      setEligibilityLoading(false);
    }
  };

  const loadContacts = async (id) => {
    try {
      setContactsLoading(true);
      const res = await apiFetch(`/contacts/list`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {

    } finally {
      setContactsLoading(false);
    }
  };

  const loadAiSettings = async (id) => {
    try {
      setAiPromptLoading(true);
      const res = await apiFetch(`/instagram/accounts/ai-settings`);
      if (res.ok) {
        const data = await res.json();
        setAiPrompt(data.system_prompt);
        setIsAiActive(data.is_ai_active);
        setAiOperateStart(data.ai_operate_start || '00:00');
        setAiOperateEnd(data.ai_operate_end || '23:59');
        setAiKnowledgeBaseUrl(data.ai_knowledge_base_url);
        setAiKnowledgeBaseFilename(data.ai_knowledge_base_filename);
      }
    } catch (err) {

    } finally {
      setAiPromptLoading(false);
    }
  };

  const saveAiSettings = async (explicitActiveState = null) => {
    if (!customerId) return;
    if (isPremiumFeatureLocked) {
      showPremiumLockToast('프리미엄 요금제로 연장해야 AI 설정을 저장할 수 있습니다.');
      return;
    }
    try {
      setAiPromptSaving(true);
      // Ensure we only use explicitActiveState if it's strictly a boolean (not a React event)
      const activeState = (typeof explicitActiveState === 'boolean') ? explicitActiveState : isAiActive;

      const res = await apiFetch(`/instagram/accounts/ai-settings`, {
        method: 'POST',
        body: JSON.stringify({
          system_prompt: aiPrompt,
          is_ai_active: activeState,
          ai_operate_start: aiOperateStart,
          ai_operate_end: aiOperateEnd,
          ai_knowledge_base_url: aiKnowledgeBaseUrl,
          ai_knowledge_base_filename: aiKnowledgeBaseFilename,
        }),
      });
      if (res.ok) {
        showNotify('AI 설정이 성공적으로 저장되었습니다.');
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {

      showNotify('AI 설정 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setAiPromptSaving(false);
    }
  };

  const handleAiKbUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setAiKbUploading(true);
      const res = await apiFetch(`/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAiKnowledgeBaseUrl(data.url);
        setAiKnowledgeBaseFilename(data.filename);
        showNotify('참조 파일이 업로드되었습니다. 저장 버튼을 눌러 확정해주세요.');
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotify(errData.detail || '파일 업로드 실패', 'error');
      }
    } catch (err) {

      showNotify('파일 업로드 중 오류가 발생했습니다.', 'error');
    } finally {
      setAiKbUploading(false);
    }
  };

  const removeAiKb = () => {
    setAiKnowledgeBaseUrl(null);
    setAiKnowledgeBaseFilename(null);
    showNotify('참조 파일이 해제되었습니다. 저장 버튼을 눌러 확정해주세요.');
  };

  const loadFlows = async (id) => {
    try {
      setFlowsLoading(true);
      const res = await apiFetch(`/instagram/flows`);
      if (res.ok) {
        const data = await res.json();
        setFlows(data);
      }
    } catch (err) {

    } finally {
      setFlowsLoading(false);
    }
  };

  const GROWTH_TEMPLATES = [
    {
      id: 'giveaway',
      name: '🎁 인스타그램 선물 이벤트',
      description: '댓글을 단 고객에게 자동으로 이벤트 참여 링크와 안내 메시지를 보냅니다.',
      category: '마케팅',
      keyword: '이벤트',
      nodes: [
        {
          id: '1', type: 'message', content: '방가와요! 🎁 이벤트에 관심을 가져주셔서 감사합니다.\n\n참여를 완료하시려면 아래 버튼을 눌러 정보를 입력해주세요!', buttons: [
            { id: 'b1', label: '참여 링크 확인', url: 'https://example.com/giveaway' },
            { id: 'b2', label: '참여 방법 안내', response: '어떻게 참여하나요?' }
          ]
        },
        { id: '2', type: 'tag', tag: '이벤트참여자' }
      ]
    },
    {
      id: 'waitlist',
      name: '⏳ 제품 출시 대기명단',
      description: '출시 예정 제품의 대기명단 등록을 유도하고 고객 리스트를 확보합니다.',
      category: '판매',
      keyword: '대기',
      nodes: [
        {
          id: '1', type: 'message', content: '출시 소식을 누구보다 빠르게 알려드릴게요! 🚀\n\n대기명단에 이름을 올리시겠어요?', buttons: [
            { id: 'b1', label: '지금 바로 등록', url: 'https://example.com/waitlist' }
          ]
        },
        { id: '2', type: 'delay', content: '2' },
        { id: '3', type: 'message', content: '등록하시면 출시 당일 특별 할인 쿠폰도 함께 보내드려요!' },
        { id: '4', type: 'tag', tag: '출시대기자' }
      ]
    },
    {
      id: 'coupon',
      name: '🏷️ 자동 할인쿠폰 발송',
      description: '키워드를 보낸 고객에게 시크릿 할인 쿠폰 코드를 즉시 전송합니다.',
      category: '전환',
      keyword: '쿠폰',
      nodes: [
        {
          id: '1', type: 'message', content: '축하드립니다! 🎉 고객님만을 위한 15% 시크릿 쿠폰이 도착했습니다.\n\n코드: SECRET15\n\n지금 바로 쇼핑을 즐겨보세요!', buttons: [
            { id: 'b1', label: '사이트 이동하기', url: 'https://myshop.com' }
          ]
        },
        { id: '2', type: 'tag', tag: '쿠폰발급자' }
      ]
    },
    {
      id: 'lead_magnet',
      name: '📘 리드 마그넷 (E-북 증정)',
      description: '가이드를 신청한 잠재 고객의 이메일을 수집하거나 자료 링크를 전송합니다.',
      category: '리드 수집',
      keyword: '가이드',
      nodes: [
        {
          id: '1', type: 'message', content: '신청하신 [SNS 마케팅 가이드 A to Z] 자료입니다! 📘\n\n아래 버튼을 눌러 바로 다운로드 받으실 수 있습니다.', buttons: [
            { id: 'b1', label: '자료 다운로드', url: 'https://example.com/guide-pdf' }
          ]
        },
        { id: '2', type: 'delay', content: '3' },
        { id: '3', type: 'message', content: '자료를 보시고 궁금한 점이 생기시면 언제든 메시지 남겨주세요!' },
        { id: '4', type: 'tag', tag: '고관여리드' }
      ]
    }
  ];

  const saveFlow = async (flowData) => {
    if (!customerId) return;
    if (isPremiumFeatureLocked) {
      showPremiumLockToast('프리미엄 요금제로 연장해야 플로우를 저장할 수 있습니다.');
      return;
    }
    try {
      setFlowsSaving(true);
      const url = flowData.id
        ? `/instagram/flows/${flowData.id}`
        : `/instagram/flows`;

      const res = await apiFetch(url, {
        method: flowData.id ? 'PUT' : 'POST',
        body: JSON.stringify(flowData)
      });

      if (res.ok) {
        await loadFlows(customerId);
        return true;
      }
    } catch (err) {

    } finally {
      setFlowsSaving(false);
    }
    return false;
  };

  const deleteFlow = async (flowId) => {
    if (isPremiumFeatureLocked) {
      showPremiumLockToast('프리미엄 요금제로 연장해야 플로우를 삭제할 수 있습니다.');
      return;
    }

    // Instead of window.confirm, use our custom modal
    setFlowToDelete(flowId);
    setShowFlowDeleteConfirm(true);
  };

  const executeDeleteFlow = async () => {
    if (!flowToDelete) return;
    try {
      setIsDeletingFlow(true);
      const res = await apiFetch(`/instagram/flows/${flowToDelete}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadFlows(customerId);
        showNotify('플로우가 삭제되었습니다.');
        setShowFlowDeleteConfirm(false);
        setFlowToDelete(null);
      }
    } catch (err) {
      showNotify('플로우 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDeletingFlow(false);
    }
  };

  const toggleFlowActive = async (flow) => {
    await saveFlow({ ...flow, is_active: !flow.is_active });
  };

  const loadKeywordSettings = async (id) => {
    const targetId = (id && String(id).toLowerCase() !== 'null') ? id : customerId;
    if (!targetId) {
      return;
    }

    try {
      setKeywordRepliesLoading(true);
      const res = await apiFetch(`/instagram/accounts/keyword-settings?customer_id=${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setKeywordReplies(data.keyword_replies || []);
      }
    } finally {
      setKeywordRepliesLoading(false);
    }
  };

  const handleCreateSimpleFlow = async () => {
    if (!customerId) return;
    if (builderTargetPosts.length === 0) {
      showNotify('게시물을 먼저 선택해주세요.', 'warning');
      return;
    }
    if (builderTargetPosts.length > MAX_SIMPLE_AUTOMATION_POSTS) {
      showNotify(`초간편 자동화는 최대 ${MAX_SIMPLE_AUTOMATION_POSTS}개의 게시물까지만 선택할 수 있습니다.`, 'warning');
      return;
    }
    if (builderKeywords.length === 0) {
      showNotify('최소 1개 이상의 키워드를 추가해주세요.', 'warning');
      return;
    }
    if (!builderDmMessage.trim()) {
      showNotify('발송할 메시지를 입력하세요.', 'warning');
      return;
    }

    try {
      setFlowsSaving(true);

      const newRule = {
        keyword: builderKeywords[0] || "",
        keywords: builderKeywords,
        message: builderDmMessage,
        media_ids: builderTargetPosts.map(p => p.id),
        // Keep backward compatibility with APIs that still persist single target as media_id.
        media_id: builderTargetPosts.length === 1 ? builderTargetPosts[0].id : null,
        // Persist minimal post info so previews work even before mediaList loads.
        media_previews: builderTargetPosts.map(p => ({
          id: p.id,
          media_url: p.media_url,
          thumbnail_url: p.thumbnail_url,
          caption: p.caption,
          permalink: p.permalink,
          url: p.url,
        })),
        is_active: true,
        interaction_type: builderFollowCheck ? 'follow_check' : 'immediate',
        follow_fail_message: builderFollowCheck ? builderFollowMessage : null,
        // When follow check is on, these are shown on the initial 'verification' card
        card_title: builderFollowCheck ? '팔로우 확인이 필요합니다 🔓' : null,
        card_subtitle: builderFollowCheck ? builderFollowMessage : null,
        button_text: builderFollowCheck ? builderFollowButtonText : '자세히 보기 🔍',
        created_at: new Date().toISOString()
      };

      // Get current rules to append or edit
      const res = await apiFetch(`/instagram/accounts/keyword-settings?customer_id=${customerId}`);
      let currentReplies = [];
      if (res.ok) {
        const data = await res.json();
        currentReplies = data.keyword_replies || [];
      }

      let updatedReplies = [...currentReplies];
      if (builderEditIndex !== null && builderEditIndex >= 0 && builderEditIndex < updatedReplies.length) {
        // Keep the old created_at if editing
        newRule.created_at = updatedReplies[builderEditIndex].created_at || newRule.created_at;
        updatedReplies[builderEditIndex] = newRule;
      } else {
        // Append the new rule
        updatedReplies.push(newRule);
      }

      const saveRes = await apiFetch(`/instagram/accounts/keyword-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerId,
          keyword_replies: updatedReplies
        })
      });

      if (saveRes.ok) {
        showNotify(`초간편 자동화가 ${builderEditIndex !== null ? '수정' : '생성'}되었습니다!`, 'success', `${builderTargetPosts.length}개의 게시물에 적용되었습니다.`);
        // Reset builder state
        setBuilderTargetPosts([]);
        setBuilderKeywords(['링크', '구매']);
        setBuilderDmMessage('안녕하세요! 요청하신 시크릿 링크를 보내드립니다 😆\n\n👇 아래 링크를 클릭해주세요!');
        setBuilderFollowCheck(false);
        setBuilderEditIndex(null);
        // Reload all keyword data
        await loadKeywordSettings(customerId);
        setAutomationView('active');

      } else {
        throw new Error('Failed to save simple flow');
      }
    } catch (err) {
      showNotify('자동화 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setFlowsSaving(false);
    }
  };

  const [keywordImageUploading, setKeywordImageUploading] = useState({});

  const handleKeywordImageUpload = async (e, masterIndex) => {
    const targetReply = keywordReplies[masterIndex];
    if (!targetReply) return;

    const allImages = [...(targetReply.image_urls || []), ...(targetReply.image_url ? [targetReply.image_url] : [])];
    const uniqueImages = [...new Set(allImages)].filter(Boolean);
    const currentCount = uniqueImages.length;

    if (currentCount >= 3) {
      showNotify('최대 3장까지만 첨부할 수 있습니다.', 'warning');
      e.target.value = ''; // Reset input
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Reset input immediately so the next file selection always triggers onChange.
    e.target.value = '';

    // Basic validation
    if (!file.type.startsWith('image/')) {
      showNotify('이미지 파일만 업로드 가능합니다.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const actualIndex = masterIndex;

    try {
      setKeywordImageUploading(prev => ({ ...prev, [actualIndex]: true }));
      const response = await safeFetch(`${INSTAGRAM_API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      const fullUrl = `${INSTAGRAM_API_BASE_URL}${data.url}`;

      // Use functional update to avoid stale closures, and capture the result for saving
      let freshNextReplies;
      setKeywordReplies(prev => {
        freshNextReplies = prev.map((r, i) => {
          if (i !== actualIndex) return r;

          const currentUrls = [...(r.image_urls || [])];
          // Migrate legacy single image_url to image_urls list if it exists
          if (r.image_url && !currentUrls.includes(r.image_url)) {
            currentUrls.push(r.image_url);
          }

          return {
            ...r,
            image_url: null,
            image_urls: [...new Set([...currentUrls, fullUrl])].filter(Boolean)
          };
        });
        return freshNextReplies;
      });

      // Auto-save the update using the strictly calculated fresh state
      if (freshNextReplies) {
        await saveKeywordSettings(freshNextReplies);
      }
      showNotify('이미지가 성공적으로 추가되었습니다.');
    } catch (error) {
      showNotify('이미지 업로드에 실패했습니다.', 'error');
      // Ensure input is cleared even on error so user can retry
      e.target.value = '';
    } finally {
      setKeywordImageUploading(prev => ({ ...prev, [actualIndex]: false }));
    }
  };

  const saveKeywordSettings = async (updatedReplies = null) => {
    if (!customerId) return;
    if (isPremiumFeatureLocked) {
      showPremiumLockToast('프리미엄 요금제로 연장해야 키워드 설정을 저장할 수 있습니다.');
      return;
    }
    try {
      setKeywordRepliesSaving(true);
      const finalReplies = Array.isArray(updatedReplies) ? updatedReplies : keywordReplies;

      const invalidKeyword = finalReplies.find(r => r.is_active && (!r.keyword || r.keyword.trim() === ""));
      if (invalidKeyword) {
        showNotify("감지할 키워드를 입력해주세요.", "error");
        setKeywordRepliesSaving(false);
        return;
      }

      const invalidMessage = finalReplies.find(r => r.is_active && (!r.message || r.message.trim() === ""));
      if (invalidMessage) {
        showNotify("DM 전송 문구를 입력해주세요.", "error");
        setKeywordRepliesSaving(false);
        return;
      }

      const targetId = (customerId && String(customerId).toLowerCase() !== 'null') ? customerId : null;
      if (!targetId) {
        showNotify("고객 정보가 확인되지 않아 저장할 수 없습니다.", "error");
        return;
      }

      const res = await apiFetch(`/instagram/accounts/keyword-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword_replies: finalReplies,
          customer_id: targetId
        }),
      });
      if (res.ok) {
        // Only show if it's NOT an internal array update (like auto-saving after image upload)
        if (!Array.isArray(updatedReplies)) {
          showNotify('키워드 응답 설정이 성공적으로 저장되었습니다. ✅');
        }
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      showNotify('키워드 설정 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setKeywordRepliesSaving(false);
    }
  };

  const loadUserMedia = async (id, after = null) => {
    try {
      if (after) {
        setIsMoreLoading(true);
      } else {
        setMediaListLoading(true);
        setNextCursor(null); // Reset when loading new list
      }

      const baseUrl = `${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-media?limit=24`;
      const url = after ? `${baseUrl}&after=${after}` : baseUrl;

      const res = await safeFetch(url);
      if (res.ok) {
        const data = await res.json();
        let newMedia = data.images || [];

        // Normalize media data to ensure 'media_url' is always present
        newMedia = newMedia.map(item => ({
          ...item,
          media_url: item.media_url || item.url || item.thumbnail_url
        }));

        if (after) {
          setMediaList(prev => [...prev, ...newMedia]);
        } else {
          setMediaList(newMedia);
        }

        // Update cursor for next page if available
        setNextCursor(data.paging?.cursors?.after || null);
        return data;
      }
      return null;
    } catch (err) {
      // Fallback: Use dashboard top posts if API fails
      if (!after && basicSummary && basicSummary.top_posts && basicSummary.top_posts.length > 0) {
        setMediaList(basicSummary.top_posts);
      }
      return null;
    } finally {
      if (after) {
        setIsMoreLoading(false);
      } else {
        setMediaListLoading(false);
      }
    }
  };

  const loadDashboardStats = async (id) => {
    try {
      setSectionErrors(prev => ({ ...prev, stats: false }));
      const res = await apiFetch(`/admin/customers/${id}/dashboard-stats`);
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data || { total_comments: 0, total_automated: 0, growth_rate: 0 });
      } else {
        setSectionErrors(prev => ({ ...prev, stats: true }));
      }
    } catch (err) {
      setSectionErrors(prev => ({ ...prev, stats: true }));
      if (!dashboardStats) setDashboardStats({ total_comments: 0, total_automated: 0, growth_rate: 0, error: true });
    }
  };

  const loadSubscriptionStatus = async (id = null) => {
    try {
      setSubscriptionLoading(true);
      setSectionErrors(prev => ({ ...prev, subscription: false }));
      
      let statusData = { plan_name: 'free', status: 'expired' };
      let historyData = [];

      try {
        const [statusRes, historyRes] = await Promise.all([
          apiFetch('/api/subscription/status'),
          apiFetch('/api/subscription/history')
        ]);

        if (statusRes.ok) statusData = await statusRes.json();
        if (historyRes.ok) {
          historyData = await historyRes.json();
          setPaymentHistory(historyData);
        }

        // [CENTRAL SYNC] Force override if history shows success
        const hasPaidHistory = historyData && historyData.length > 0 && historyData[0].status === 'paid';
        if (hasPaidHistory) {
          const nextBillDate = new Date(historyData[0].paid_at);
          nextBillDate.setMonth(nextBillDate.getMonth() + 1);

          statusData = {
            ...statusData,
            plan_name: 'basic-starter',
            status: 'active',
            last_payment_date: historyData[0].paid_at,
            next_billing_date: statusData?.next_billing_date || nextBillDate.toISOString(),
            payment_method: historyData[0].pay_method,
            card_name: historyData[0].card_name,
            card_number: historyData[0].card_number
          };
        }
        setSubscriptionStatus(statusData);
      } catch (e) {
        setSubscriptionStatus({ plan_name: 'free', status: 'expired', error: true });
      }
    } catch (err) {
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const loadAiInsights = async (id) => {
    setAiInsightsLoading(true);
    setSectionErrors(prev => ({ ...prev, insights: false }));
    try {
      const res = await apiFetch(`/admin/customers/${id}/ai-insights`);
      if (res.ok) {
        const data = await res.json();
        const fallbackMsg = "최근 분석된 데이터가 없습니다. 자동화를 시작해보세요!";
        if (data?.trends?.summary?.includes("최근 대화가 없어") && aiInsights?.trends?.summary) {
          // Keep existing
        } else {
          setAiInsights(data || { trends: { summary: fallbackMsg }, metrics: [] });
        }
      } else {
        setSectionErrors(prev => ({ ...prev, insights: true }));
        let errorMsg = 'AI 인사이트를 불러올 수 없습니다.';
        try {
          const errData = await res.json();
          errorMsg = errData.detail?.message || errData.detail || errData.message || errorMsg;
        } catch (e) { }
        setAiInsights({ error: errorMsg });
      }
    } catch (e) {
      setSectionErrors(prev => ({ ...prev, insights: true }));
      setAiInsights({ error: '네트워크 연결 상태를 확인해주세요.' });
    } finally {
      setAiInsightsLoading(false);
    }
  };

  const loadAutomationStats = async (id) => {
    try {
      setAutomationStatsLoading(true);
      setSectionErrors(prev => ({ ...prev, automation: false }));
      const res = await apiFetch(`/admin/customers/${id}/automation-stats?days=30`);
      if (res.ok) {
        const data = await res.json();
        setAutomationStats(data || { active_flows: 0, triggered_today: 0 });
      } else {
        setSectionErrors(prev => ({ ...prev, automation: true }));
      }
    } catch (err) {
      setSectionErrors(prev => ({ ...prev, automation: true }));
      if (!automationStats) setAutomationStats({ active_flows: 0, triggered_today: 0, error: true });
    } finally {
      setAutomationStatsLoading(false);
    }
  };

  const loadBasicDashboardSummary = async (id) => {
    try {
      setBasicSummaryLoading(true);
      const res = await apiFetch(`/admin/customers/${id}/basic-dashboard-summary?days=7`);
      if (res.ok) {
        const data = await res.json();
        setBasicSummary(data || { today_automated: 0, today_failed: 0, last7_daily_automated: [], top_posts: [] });
      }
    } catch (err) {
      if (!basicSummary) setBasicSummary({ today_automated: 0, today_failed: 0, last7_daily_automated: [], top_posts: [] });
    } finally {
      setBasicSummaryLoading(false);
    }
  };

  const loadActivities = async (id) => {
    try {
      setActivitiesLoading(true);
      const res = await apiFetch(`/admin/customers/${id}/activities?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (e) {

    } finally {
      setActivitiesLoading(false);
    }
  };

  // NEW: Optimized Initial Customer Data Loader (Combines Status and Profile)
  const loadInitialCustomerData = async (id) => {
    try {
      setCustomerLoading(true);
      setProfileLoading(true);

      const res = await apiFetch(`/admin/customers/${id}?t=${Date.now()}`);

      if (res.status === 401 || res.status === 404) {
        clearSessionAndRedirect();
        return null;
      }

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      setCustomerStatus(data);
      setCustomerInfo(data);
      return data;
    } catch (err) {
      // Fail explicitly for initializeError display
      setInitializationError("사용자 정보를 불러올 수 없습니다. 로그인을 다시 시도해주세요.");
      if (err.message?.includes('401') || err.message?.includes('404')) {
        clearSessionAndRedirect();
        return null;
      }
      setCustomerStatus((prev) => prev || { error: 'Failed to verify session.' });
      throw err;
    } finally {
      setCustomerLoading(false);
      setProfileLoading(false);
    }
  };

  // Check webhook status
  const loadWebhookStatus = async (id) => {
    try {
      setWebhookLoading(true);
      setSectionErrors(prev => ({ ...prev, webhook: false }));
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/webhook-status`);
      if (!res.ok) throw new Error('Failed to load webhook status.');
      const data = await res.json();
      setWebhookStatus(data);
    } catch (err) {
      setSectionErrors(prev => ({ ...prev, webhook: true }));
      setWebhookStatus({ error: 'Failed to load webhook status.' });
    } finally {
      setWebhookLoading(false);
    }
  };

  const retryWebhookSubscribe = async (id) => {
    try {
      setWebhookResubscribeLoading(true);
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/subscribe-webhook`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail || 'Failed to subscribe to webhook.';
        setWebhookStatus({
          ...(webhookStatus || {}),
          error: detail,
          webhook_subscribed: false,
        });
        return;
      }
      // Reflect subscription success immediately
      setWebhookStatus({
        ...(webhookStatus || {}),
        webhook_subscribed: Boolean(data.success),
        message: data.message,
        page_id: data.page_id || (webhookStatus && webhookStatus.page_id),
      });
    } catch (err) {

      setWebhookStatus({
        ...(webhookStatus || {}),
        error: 'An error occurred while re-subscribing to the webhook.',
      });
    } finally {
      setWebhookResubscribeLoading(false);
    }
  };

  // Load conversation list
  const loadConversations = async (id = null) => {
    const targetId = id || customerId;
    if (!targetId) return;
    try {
      setConversationsLoading(true);
      setSectionErrors(prev => ({ ...prev, conversations: false }));
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/conversations?customer_id=${targetId}&include_latest_message=true&limit=25`);
      if (!res.ok) {
        throw new Error('Failed to load conversations');
      }
      const data = await res.json();
      if (data.success && data.our_account_ids) {
        setOurAccountIds(data.our_account_ids);
      }

      const getTime = (conv) => {
        if (conv.latest_message?.created_time) {
          try {
            const time = new Date(conv.latest_message.created_time).getTime();
            if (!isNaN(time) && time > 0) return time;
          } catch (e) { }
        }
        if (conv.updated_time) {
          try {
            const time = new Date(conv.updated_time).getTime();
            if (!isNaN(time) && time > 0) return time;
          } catch (e) { }
        }
        return 0;
      };

      const sortedConversations = [...(data.conversations || [])].sort((a, b) => getTime(b) - getTime(a));

      // Normalize username-based identity first to prevent same-account split.
      const normalizeIdentity = (value) => {
        if (!value || typeof value !== 'string') return '';
        return value.trim().replace(/^@/, '').toLowerCase();
      };
      const ourIds = new Set((data.our_account_ids || []).map((idValue) => String(idValue)));
      const selfInstagramId = customerStatus?.instagram_account?.instagram_user_id || igInsights?.instagram_user_id;
      const selfInstagramUsername = customerStatus?.instagram_account?.instagram_username || igInsights?.username;
      if (selfInstagramId) ourIds.add(String(selfInstagramId));
      const selfUsernameNorm = normalizeIdentity(selfInstagramUsername);

      const getCounterpartKey = (conv) => {
        const participants = conv?.participants?.data || [];
        const otherParticipant = participants.find((p) => {
          const pid = String(p?.id || '');
          const pun = normalizeIdentity(p?.username || p?.name || '');
          const isSelfById = pid && ourIds.has(pid);
          const isSelfByUsername = selfUsernameNorm && pun && pun === selfUsernameNorm;
          return !isSelfById && !isSelfByUsername;
        }) || participants[0];

        const participantUsername = normalizeIdentity(otherParticipant?.username || otherParticipant?.name || '');
        const contactUsername = normalizeIdentity(conv?.contact?.username || conv?.contact?.name || '');
        const participantId = String(otherParticipant?.id || '');
        const contactId = String(conv?.contact?.id || '');
        const fallbackId = String(conv?.id || '');

        if (participantUsername) return `u:${participantUsername}`;
        if (contactUsername) return `u:${contactUsername}`;
        if (participantId) return `id:${participantId}`;
        if (contactId) return `id:${contactId}`;
        return `conv:${fallbackId}`;
      };

      const uniqueByCounterpart = new Map();
      sortedConversations.forEach((conv) => {
        const key = getCounterpartKey(conv);
        if (!uniqueByCounterpart.has(key)) {
          uniqueByCounterpart.set(key, conv);
        }
      });
      const uniqueConversations = Array.from(uniqueByCounterpart.values());

      setConversations(uniqueConversations);
      setSelectedConversation((prevSelected) => {
        if (!prevSelected) return prevSelected;
        const selectedKey = getCounterpartKey(prevSelected);
        const canonical = uniqueByCounterpart.get(selectedKey);
        if (!canonical) {
          setConversationMessages([]);
          return null;
        }
        return canonical;
      });
    } catch (err) {
      setSectionErrors(prev => ({ ...prev, conversations: true }));
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  };

  // Load conversation messages
  const loadConversationMessages = async (conversationId) => {
    if (!customerId) return;
    try {
      setMessagesLoading(true);
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/conversations/${conversationId}/messages?customer_id=${customerId}&limit=50`);
      if (!res.ok) {
        throw new Error('Failed to load messages');
      }
      const data = await res.json();
      if (data.success && data.messages) {
        // Sort - oldest first
        const sorted = [...data.messages].sort((a, b) => {
          return new Date(a.created_time).getTime() - new Date(b.created_time).getTime();
        });
        setConversationMessages(sorted);
      }
    } catch (err) {

    } finally {
      setMessagesLoading(false);
    }
  };

  // Delete conversation (opens modal)
  const handleDeleteConversation = async (e, conversationId) => {
    e.stopPropagation(); // prevent opening the conversation
    setConversationToDelete(conversationId);
    setShowConversationDeleteModal(true);
  };

  const executeDeleteConversation = async () => {
    if (!conversationToDelete) return;

    try {
      setIsDeletingConversation(true);
      const res = await fetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/conversations/${conversationToDelete}?customer_id=${customerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.detail || data.message || '채팅방 삭제 중 오류가 발생했습니다.');
      }

      // Remove from state
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete));

      // Clear if it was selected
      if (selectedConversation && selectedConversation.id === conversationToDelete) {
        setSelectedConversation(null);
        setConversationMessages([]);
      }

      showNotify('채팅방이 성공적으로 삭제되었습니다.', 'success');

    } catch (err) {
      showNotify('삭제 실패', 'error', err.message);
    } finally {
      setIsDeletingConversation(false);
      setShowConversationDeleteModal(false);
      setConversationToDelete(null);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sendingMessage) return;
    if (isPremiumFeatureLocked) {
      showPremiumLockToast('프리미엄 요금제로 연장해야 메시지를 보낼 수 있습니다.');
      return;
    }
    try {
      setSendingMessage(true);

      // Find recipient (the one who is not us)
      const participants = selectedConversation.participants?.data || [];
      const recipient = participants.find((p) => !ourAccountIds.includes(p.id));

      if (!recipient || !recipient.id) {
        showNotify('전송 대상을 찾을 수 없습니다.', 'error');
        return;
      }

      const params = new URLSearchParams({
        customer_id: customerId,
        recipient_instagram_id: recipient.id,
        message: newMessage.trim(),
      });

      const res = await safeFetch(
        `${INSTAGRAM_API_BASE_URL}/instagram/accounts/send-message?${params.toString()}`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || '메시지 전송 실패');
      }

      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        // Reload messages to show the new one
        loadConversationMessages(selectedConversation.id);
        showNotify('메시지가 성공적으로 전송되었습니다.');
      }
    } catch (err) {

      showNotify(err.message, 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  // Page Insights
  const loadPageInsights = async (id) => {
    try {
      setInsightsLoading(true);
      setSectionErrors(prev => ({ ...prev, page_insights: false }));
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/page-insights`);
      if (!res.ok) throw new Error('Failed to load insights.');
      const data = await res.json();
      setInsights(data);
    } catch (err) {
      setSectionErrors(prev => ({ ...prev, page_insights: true }));
      setInsights({ error: 'Failed to load insights.' });
    } finally {
      setInsightsLoading(false);
    }
  };

  const loadPerformanceReport = async (id, forceRefresh = false) => {
    try {
      setPerformanceReportLoading(true);
      setSectionErrors(prev => ({ ...prev, insights: false }));
      const url = `${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/performance-report${forceRefresh ? '?force_refresh=true' : ''}`;
      const res = await safeFetch(url);
      if (!res.ok) {
        let errorMsg = 'AI 분석 보고서를 불러오지 못했습니다.';
        try {
          const errData = await res.json();
          if (errData.detail && errData.detail.message) {
            errorMsg = errData.detail.message;
          } else if (errData.message) {
            errorMsg = errData.message;
          } else if (typeof errData.detail === 'string') {
            errorMsg = errData.detail;
          }
        } catch (e) { }
        setPerformanceReport({ error: errorMsg });
        setSectionErrors(prev => ({ ...prev, insights: true }));
        return;
      }
      const result = await res.json();
      if (result.success) {
        setPerformanceReport(result.data);
      } else {
        setPerformanceReport({
          error: result.message || 'AI 분석 보고서를 생성할 수 없습니다.',
          isLimitReached: result.error === 'subscription_required'
        });
        setSectionErrors(prev => ({ ...prev, insights: true }));
      }
    } catch (err) {
      setSectionErrors(prev => ({ ...prev, insights: true }));
      setPerformanceReport({ error: '데이터 통신 중 오류가 발생했습니다.' });
    } finally {
      setPerformanceReportLoading(false);
    }
  };

  const loadIgInsights = async (id) => {
    try {
      setIgInsightsLoading(true);
      setSectionErrors(prev => ({ ...prev, ig_insights: false }));
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-insights`);
      if (!res.ok) throw new Error('Failed to load IG information.');
      const data = await res.json();

      setIgInsights(prev => {
        if (data.cached && (!data.recent_media || data.recent_media.length === 0)) {
          return {
            ...data,
            recent_media: (prev?.recent_media && prev.recent_media.length > 0) ? prev.recent_media : []
          };
        }
        return data;
      });
    } catch (err) {
      setSectionErrors(prev => ({ ...prev, ig_insights: true }));
      setIgInsights({ error: 'Failed to load IG information.' });
    } finally {
      setIgInsightsLoading(false);
    }
  };

  const loadRecentPostsForAnalysis = async (id) => {
    try {
      setRecentPostsLoading(true);
      setSectionErrors(prev => ({ ...prev, comments: false }));
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-media?limit=12`);
      
      if (!res.ok) {
        // Fallback: If analyzer fetch fails, try to use dashboard top posts
        if (basicSummary && basicSummary.top_posts && basicSummary.top_posts.length > 0) {
          setRecentPostsForAnalysis(basicSummary.top_posts);
          return;
        }
        throw new Error('Failed to load recent posts.');
      }
      
      const data = await res.json();
      setRecentPostsForAnalysis(data.images || []);
    } catch (err) {
      // Final fallback to ensure customer sees something
      if (basicSummary && basicSummary.top_posts && basicSummary.top_posts.length > 0) {
        setRecentPostsForAnalysis(basicSummary.top_posts);
      } else {
        setSectionErrors(prev => ({ ...prev, comments: true }));
        setRecentPostsForAnalysis([]);
      }
    } finally {
      setRecentPostsLoading(false);
    }
  };

  const analyzePost = async (postId, forceRefresh = false) => {
    if (!customerId) return;
    if (isPremiumFeatureLocked) {
      showPremiumLockToast('프리미엄 요금제로 연장해야 게시물을 분석할 수 있습니다.');
      return;
    }
    if (isAiPremiumLocked) {
      showPremiumLockToast('AI 댓글 분석은 AI 요금제 전용 기능입니다.');
      return;
    }
    try {
      if (!forceRefresh) {
        setAnalysisLoading(true);
        setAnalysisSelectedPostId(postId);
        setAnalysisMediaIndex(0);
        setAnalysisFilterCategory('ALL');
        setAnalysisSearchTerm('');
      } else {
        // For forced refresh, we show a smaller loading state or just keep the current modal
        setAnalysisLoading(true);
      }
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${customerId}/analyze-post/${postId}${forceRefresh ? '?force_refresh=true' : ''}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || '분석에 실패했습니다.');
      }
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {

      setAnalysisResult({ error: err.message });
    } finally {
      setAnalysisLoading(false);
    }
  };

  // --- AI Clean Guard (Moderation) Functions ---
  const loadGalleryPosts = async (id) => {
    // SaaS Performance: Rate limit refreshes to once every 10 seconds to prevent API abuse
    const now = Date.now();
    if (now - lastGalleryRefreshTime < 10000) {
      console.log('Skipping gallery refresh: too frequent (rate limit 10s)');
      return;
    }

    try {
      setIsGalleryLoading(true);
      setSectionErrors(prev => ({ ...prev, aiguard: false }));
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-media?limit=12`);
      
      if (!res.ok) {
        // Fallback: If specific gallery fetch fails, try to use already loaded dashboard top posts
        if (basicSummary && basicSummary.top_posts && basicSummary.top_posts.length > 0) {
          setGalleryPosts(basicSummary.top_posts);
          return;
        }
        throw new Error('Failed to load recent posts.');
      }
      
      const data = await res.json();
      setGalleryPosts(data.images || []);
      setLastGalleryRefreshTime(now);
    } catch (err) {
      // Final fallback search in basicSummary if everything else fails
      if (basicSummary && basicSummary.top_posts && basicSummary.top_posts.length > 0) {
        setGalleryPosts(basicSummary.top_posts);
      } else {
        setSectionErrors(prev => ({ ...prev, aiguard: true }));
        setGalleryPosts([]);
      }
    } finally {
      setIsGalleryLoading(false);
    }
  };
  const handleModerationAction = async () => {
    if (!selectedPost || idsToConfirmDelete.length === 0 || isModerationActionLoading) return;

    setIsModerationActionLoading(true);
    try {
      const postId = selectedPost.id;

      if (moderationActionType === 'DELETE') {
        const res = await apiFetch(`/instagram/accounts/${customerId}/posts/${postId}/comments/bulk-delete`, {
          method: 'POST',
          body: JSON.stringify({ comment_ids: idsToConfirmDelete }),
        });
        if (!res.ok) throw new Error('댓글 삭제에 실패했습니다.');
        const data = await res.json();
        showNotify(`${data.success_count}개의 댓글이 삭제되었습니다.`);
      } else if (moderationActionType === 'HIDE' || moderationActionType === 'UNHIDE') {
        const isHide = moderationActionType === 'HIDE';
        // Hide API is individual for now in backend, we call in parallel for bulk
        await Promise.all(idsToConfirmDelete.map(commentId =>
          apiFetch(`/instagram/accounts/${customerId}/posts/${postId}/comments/${commentId}/hide`, {
            method: 'POST',
            body: JSON.stringify({ hide: isHide }),
          })
        ));
        showNotify(`${idsToConfirmDelete.length}개의 댓글이 ${isHide ? '숨김' : '표시'} 처리되었습니다.`);
      }

      // Update local state after success
      if (postAnalysisResult) {
        let updatedComments = [...postAnalysisResult.comments];
        if (moderationActionType === 'DELETE') {
          updatedComments = updatedComments.filter(c => !idsToConfirmDelete.includes(c.id));
        } else {
          // For hide, we'll remove them from the 'flagged' list view to keep it clean.
          updatedComments = updatedComments.filter(c => !idsToConfirmDelete.includes(c.id));
        }

        setPostAnalysisResult({
          ...postAnalysisResult,
          comments: updatedComments
        });
      }

      setShowDeleteConfirmModal(false);
      setIdsToConfirmDelete([]);
      setSelectedCommentIds(new Set());
      setIsSelectionMode(false);
    } catch (err) {
      showNotify('작업 중 오류가 발생했습니다.', 'error', err.message);
    } finally {
      setIsModerationActionLoading(false);
    }
  };


  const handlePostAnalysis = async (post) => {
    if (!customerId) return;
    if (isPremiumFeatureLocked) {
      showPremiumLockToast('프리미엄 요금제로 연장해야 포스트를 분석할 수 있습니다.');
      return;
    }
    if (isAiPremiumLocked) {
      showPremiumLockToast('AI 댓글 분석은 AI 요금제부터 이용 가능한 프리미엄 기능입니다.');
      return;
    }
    try {
      setSelectedPost(post);
      setIsPostAnalyzing(true);
      setPostAnalysisResult(null);
      setModerationSubFilter('ALL');
      setIsSelectionMode(false);
      setSelectedCommentIds(new Set());

      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${customerId}/analyze-post/${post.id}`);
      if (!res.ok) throw new Error('분석 요청에 실패했습니다.');
      const data = await res.json();
      setPostAnalysisResult(data);
    } catch (err) {

      showNotify(err.message, 'error');
    } finally {
      setIsPostAnalyzing(false);
    }
  };

  const deleteComments = async (commentIds) => {
    if (!customerId || !selectedPost || !commentIds.length) return;
    try {
      const res = await apiFetch(`/instagram/accounts/${customerId}/posts/${selectedPost.id}/comments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_ids: commentIds }),
      });

      if (!res.ok) throw new Error('댓글 삭제에 실패했습니다.');
      const data = await res.json();

      if (data.success) {
        showNotify(data.message || `${data.deleted_count}개의 댓글이 삭제되었습니다.`);
        // Refresh analysis result
        if (postAnalysisResult) {
          const newComments = postAnalysisResult.comments.filter(c => !commentIds.includes(c.id));
          setPostAnalysisResult(prev => ({ ...prev, comments: newComments }));
        }
        setIsSelectionMode(false);
        setSelectedCommentIds(new Set());
      } else {
        showNotify(data.message || '삭제 실패', 'error');
      }
    } catch (err) {

      showNotify(err.message, 'error');
    }
  };

  const saveModerationSettings = async (isActive) => {
    if (!customerId) return;
    if (isPremiumFeatureLocked) {
      showPremiumLockToast('프리미엄 요금제로 연장해야 설정을 변경할 수 있습니다.');
      return;
    }
    try {
      await apiFetch(`/instagram/accounts/moderation-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_moderation_alert_active: isActive })
      });
      // Update local state in customerStatus to keep in sync
      setCustomerStatus(prev => prev ? { ...prev, is_moderation_alert_active: isActive } : prev);
    } catch (err) {

    }
  };

  const loadModerationSettings = (id) => {
    if (customerStatus && customerStatus.is_moderation_alert_active !== undefined) {
      setIsModerationAlertActive(customerStatus.is_moderation_alert_active);
    } else {
      const saved = localStorage.getItem(`moderation_active_${id}`);
      setIsModerationAlertActive(saved === 'true');
    }
  };


  const loadIgComments = async (id) => {
    setSectionErrors(prev => ({ ...prev, comments: false }));
    loadRecentPostsForAnalysis(id);
  };

  // Logout function
  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('customer_id');
    localStorage.removeItem('token_type');

    // Clear state
    setCustomerId(null);
    setCustomerStatus(null);

    // Redirect to home screen
    window.location.href = '/';
  };

  // Render Dashboard View (Overview - AI Summary + Key Metrics)
  const renderDashboard = () => {
    return (
      <DashboardMainView
        dashboardStats={dashboardStats}
        customerStatus={customerStatus}
        conversations={conversations}
        safeString={safeString}
        basicSummary={basicSummary}
        activities={activities}
        setBasicKpiDetail={setBasicKpiDetail}
        setShowBasicKpiDetailModal={setShowBasicKpiDetailModal}
        flows={flows}
        keywordReplies={keywordReplies}
        dashboardSearchTerm={dashboardSearchTerm}
        activitySearchTerm={activitySearchTerm}
        setDashboardViewFilter={setDashboardViewFilter}
        dashboardViewFilter={dashboardViewFilter}
        sectionErrors={sectionErrors}
        renderDataError={renderDataError}
        loadDashboardStats={loadDashboardStats}
        loadAiInsights={loadAiInsights}
        loadAutomationStats={loadAutomationStats}
        loadActivities={loadActivities}
        loadConversations={loadConversations}
        loadPageInsights={loadPageInsights}
        loadIgInsights={loadIgInsights}
        loadSubscriptionStatus={loadSubscriptionStatus}
        isPremiumFeatureLocked={isPremiumFeatureLocked}
        showPremiumLockToast={showPremiumLockToast}
        showNotify={showNotify}
        igInsightsLoading={igInsightsLoading}
        basicSummaryLoading={basicSummaryLoading}
        activityTypeFilter={activityTypeFilter}
        setActivityTypeFilter={setActivityTypeFilter}
        setDashboardSearchTerm={setDashboardSearchTerm}
        setActivitySearchTerm={setActivitySearchTerm}
        activitiesLoading={activitiesLoading}
        aiInsights={aiInsights}
        aiInsightsLoading={aiInsightsLoading}
        isAiPremiumLocked={isAiPremiumLocked}
        setCurrentView={setCurrentView}
        customerId={customerId}
      />
    );
  };

  const renderSubscription = () => {
    return <SubscriptionView customerId={customerId} subscriptionStatus={subscriptionStatus} showNotify={showNotify} />;
  };




  // Render Insights View (Account Status + Insights)
  const renderInsights = () => (
    <InsightsView
      igInsights={igInsights}
      customerStatus={customerStatus}
      webhookStatus={webhookStatus}
      isPremiumFeatureLocked={isPremiumFeatureLocked}
      showPremiumLockToast={showPremiumLockToast}
      showNotify={showNotify}
      loadIgInsights={loadIgInsights}
      customerId={customerId}
      loadPerformanceReport={loadPerformanceReport}
      igInsightsLoading={igInsightsLoading}
      performanceReportLoading={performanceReportLoading}
      automationStatsLoading={automationStatsLoading}
      automationStats={automationStats}
      sectionErrors={sectionErrors}
      renderDataError={renderDataError}
      loadAutomationStats={loadAutomationStats}
      safeString={safeString}
      isAiPremiumLocked={isAiPremiumLocked}
      setCurrentView={setCurrentView}
      performanceReport={performanceReport}
      loadAiInsights={loadAiInsights}
    />
  );

  // --- AI Clean Guard (Moderation) UI Components ---
  const renderPostAnalysis = () => (
    <PostAnalysisView
      postAnalysisResult={postAnalysisResult}
      isAiPremiumLocked={isAiPremiumLocked}
      moderationSubFilter={moderationSubFilter}
      setModerationSubFilter={setModerationSubFilter}
      setIsSelectionMode={setIsSelectionMode}
      setSelectedCommentIds={setSelectedCommentIds}
      isSelectionMode={isSelectionMode}
      selectedCommentIds={selectedCommentIds}
      setModerationActionType={setModerationActionType}
      setIdsToConfirmDelete={setIdsToConfirmDelete}
      setShowDeleteConfirmModal={setShowDeleteConfirmModal}
      setSelectedPost={setSelectedPost}
      setPostAnalysisResult={setPostAnalysisResult}
      setCurrentView={setCurrentView}
    />
  );



  const renderComments = () => {
    return (
      <CommentsView
        igInsights={igInsights}
        analysisSelectedPostId={analysisSelectedPostId}
        setAnalysisSelectedPostId={setAnalysisSelectedPostId}
        sectionErrors={sectionErrors}
        renderDataError={renderDataError}
        loadIgComments={loadIgComments}
        customerId={customerId}
        igComments={igComments}
        igCommentsLoading={igCommentsLoading}
        selectedPost={selectedPost}
        setSelectedPost={setSelectedPost}
        setCurrentView={setCurrentView}
        isAiPremiumLocked={isAiPremiumLocked}
        isPremiumFeatureLocked={isPremiumFeatureLocked}
        showPremiumLockToast={showPremiumLockToast}
        loadRecentPostsForAnalysis={loadRecentPostsForAnalysis}
        loadIgInsights={loadIgInsights}
        igInsightsLoading={igInsightsLoading}
        analyzePost={analyzePost}
        analysisLoading={analysisLoading}
        analysisResult={analysisResult}
        analysisMediaIndex={analysisMediaIndex}
        setAnalysisMediaIndex={setAnalysisMediaIndex}
        analysisFilterCategory={analysisFilterCategory}
        setAnalysisFilterCategory={setAnalysisFilterCategory}
        analysisSearchTerm={analysisSearchTerm}
        setAnalysisSearchTerm={setAnalysisSearchTerm}
      />
    );
  };


  const renderAiGuard = () => {
    return (
      <AiGuardView
        selectedPost={selectedPost}
        isPostAnalyzing={isPostAnalyzing}
        renderPostAnalysis={renderPostAnalysis}
        isModerationAlertActive={isModerationAlertActive}
        setIsModerationAlertActive={setIsModerationAlertActive}
        saveModerationSettings={saveModerationSettings}
        isGalleryLoading={isGalleryLoading}
        galleryPosts={galleryPosts}
        isPremiumFeatureLocked={isPremiumFeatureLocked}
        showPremiumLockToast={showPremiumLockToast}
        isAiPremiumLocked={isAiPremiumLocked}
        handlePostAnalysis={handlePostAnalysis}
        loadGalleryPosts={loadGalleryPosts}
        customerId={customerId}
      />
    );
  };

  // Render AI Style Lab (Real-time Style Coach Before Upload)
  // Render AI Viral Post Maker
  const renderAiViralPostMaker = () => {
    return (
      <AiViralPostMakerView
        safeFetch={safeFetch}
        INSTAGRAM_API_BASE_URL={INSTAGRAM_API_BASE_URL}
        viralPostMedia={viralPostMedia}
        setViralPostMedia={setViralPostMedia}
        setViralPostError={setViralPostError}
        setIsUploading={setIsUploading}
        fileInputRef={fileInputRef}
        setViralPostLoading={setViralPostLoading}
        setViralPostResult={setViralPostResult}
        viralPostIntent={viralPostIntent}
        customerId={customerId}
        apiFetch={apiFetch}
        showNotify={showNotify}
        viralPostScrollRef={viralPostScrollRef}
        viralPostResult={viralPostResult}
        isPremiumFeatureLocked={isPremiumFeatureLocked}
        showPremiumLockToast={showPremiumLockToast}
        viralPostLoading={viralPostLoading}
        isUploading={isUploading}
        setViralPostIntent={setViralPostIntent}
        activeCaptionTab={activeCaptionTab}
        setActiveCaptionTab={setActiveCaptionTab}
        viralPostError={viralPostError}
        safeString={safeString}
      />
    );
  };

  const renderContacts = () => {
    return (
      <ContactsView
        contacts={contacts}
        contactsSearch={contactsSearch}
        setContactsSearch={setContactsSearch}
        activeSegment={activeSegment}
        setActiveSegment={setActiveSegment}
        filterTags={filterTags}
        setFilterTags={setFilterTags}
        filterEngagement={filterEngagement}
        setFilterEngagement={setFilterEngagement}
        isAiPremiumLocked={isAiPremiumLocked}
        dashboardStats={dashboardStats}
        setCurrentView={setCurrentView}
        contactsLoading={contactsLoading}
        selectedContact={selectedContact}
        setSelectedContact={setSelectedContact}
        showPremiumLockToast={showPremiumLockToast}
        loadContacts={loadContacts}
        customerId={customerId}
      />
    );
  };

  // Render Inbox View with Message Sending
  const renderInbox = () => {
    return (
      <InboxView
        customerStatus={customerStatus}
        webhookStatus={webhookStatus}
        igInsights={igInsights}
        loadConversations={loadConversations}
        conversationsLoading={conversationsLoading}
        conversations={conversations}
        selectedConversation={selectedConversation}
        setSelectedConversation={setSelectedConversation}
        loadConversationMessages={loadConversationMessages}
        messagesLoading={messagesLoading}
        conversationMessages={conversationMessages}
        ourAccountIds={ourAccountIds}
        displayName={displayName}
        messagesEndRef={messagesEndRef}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        sendingMessage={sendingMessage}
        handleDeleteConversation={handleDeleteConversation}
      />
    );
  };

  // Render Placeholder View for other sections
  const renderTemplates = () => {
    return (
      <TemplatesView
        GROWTH_TEMPLATES={GROWTH_TEMPLATES}
        safeString={safeString}
        setFlowForm={setFlowForm}
        setShowFlowModal={setShowFlowModal}
        setCurrentView={setCurrentView}
        setShowScenarioModal={setShowScenarioModal}
      />
    );
  };

  const renderPlaceholder = (title, description) => (
    <PlaceholderView title={title} description={description} />
  );

  const renderFlows = () => {
    return (
      <FlowsView
        flows={flows}
        keywordReplies={keywordReplies}
        flowsLoading={flowsLoading}
        keywordRepliesLoading={keywordRepliesLoading}
        safeString={safeString}
        mediaList={mediaList}
        customerId={customerId}
        loadUserMedia={loadUserMedia}
        setTargetPostPreview={setTargetPostPreview}
        setShowTargetPostPreview={setShowTargetPostPreview}
        showNotify={showNotify}
        setTargetPostsPreview={setTargetPostsPreview}
        setShowTargetPostsPreview={setShowTargetPostsPreview}
        toggleFlowActive={toggleFlowActive}
        setKeywordReplies={setKeywordReplies}
        saveKeywordSettings={saveKeywordSettings}
        setFlowForm={setFlowForm}
        setShowFlowModal={setShowFlowModal}
        setBuilderEditIndex={setBuilderEditIndex}
        setBuilderTargetPosts={setBuilderTargetPosts}
        setBuilderKeywords={setBuilderKeywords}
        setBuilderDmMessage={setBuilderDmMessage}
        setBuilderFollowCheck={setBuilderFollowCheck}
        setBuilderFollowMessage={setBuilderFollowMessage}
        setBuilderFollowButtonText={setBuilderFollowButtonText}
        setAutomationView={setAutomationView}
        setFlowToDelete={setFlowToDelete}
        setShowFlowDeleteConfirm={setShowFlowDeleteConfirm}
        setKeywordToDelete={setKeywordToDelete}
        setShowDeleteConfirm={setShowDeleteConfirm}
        setShowScenarioModal={setShowScenarioModal}
        setCurrentView={setCurrentView}
      />
    );
  };

  const renderPostPickerModal = () => {
    return (
      <PostPickerModalView
        showPostPicker={showPostPicker}
        setShowPostPicker={setShowPostPicker}
        mediaList={mediaList}
        mediaListLoading={mediaListLoading}
        builderTargetPosts={builderTargetPosts}
        setBuilderTargetPosts={setBuilderTargetPosts}
        MAX_SIMPLE_AUTOMATION_POSTS={MAX_SIMPLE_AUTOMATION_POSTS}
        showNotify={showNotify}
        nextCursor={nextCursor}
        loadUserMedia={loadUserMedia}
        customerId={customerId}
        isMoreLoading={isMoreLoading}
      />
    );
  };

  const renderTargetPostPreviewModal = () => {
    return (
      <TargetPostPreviewModalView
        showTargetPostPreview={showTargetPostPreview}
        targetPostPreview={targetPostPreview}
        setShowTargetPostPreview={setShowTargetPostPreview}
        setShowPostPicker={setShowPostPicker}
      />
    );
  };

  const renderTargetPostsPreviewModal = () => {
    return (
      <TargetPostsPreviewModalView
        showTargetPostsPreview={showTargetPostsPreview}
        targetPostsPreview={targetPostsPreview}
        setShowTargetPostsPreview={setShowTargetPostsPreview}
        setShowPostPicker={setShowPostPicker}
        setTargetPostPreview={setTargetPostPreview}
        setShowTargetPostPreview={setShowTargetPostPreview}
      />
    );
  };

  const renderScenarioModal = () => {
    return (
      <ScenarioModalView
        showScenarioModal={showScenarioModal}
        setShowScenarioModal={setShowScenarioModal}
        isPremiumFeatureLocked={isPremiumFeatureLocked}
        showPremiumLockToast={showPremiumLockToast}
        setFlowForm={setFlowForm}
        setShowFlowModal={setShowFlowModal}
      />
    );
  };

  const renderFlowModal = () => {
    return (
      <FlowModalView
        flowForm={flowForm}
        showNotify={showNotify}
        isAiPremiumLocked={isAiPremiumLocked}
        showPremiumLockToast={showPremiumLockToast}
        setFlowForm={setFlowForm}
        safeFetch={safeFetch}
        INSTAGRAM_API_BASE_URL={INSTAGRAM_API_BASE_URL}
        setShowFlowModal={setShowFlowModal}
        saveFlow={saveFlow}
        flowsSaving={flowsSaving}
        loadFlows={loadFlows}
        customerId={customerId}
        renderMobileSimulator={renderMobileSimulator}
      />
    );
  };

  const renderAiKbModal = () => {
    return (
      <AiKbModalView
        setShowAiKbModal={setShowAiKbModal}
        aiKnowledgeBaseUrl={aiKnowledgeBaseUrl}
        getDisplayFilename={getDisplayFilename}
        aiKnowledgeBaseFilename={aiKnowledgeBaseFilename}
        removeAiKb={removeAiKb}
        handleAiKbUpload={handleAiKbUpload}
        aiKbUploading={aiKbUploading}
        saveAiSettings={saveAiSettings}
      />
    );
  };

  const renderKeywordSettings = () => {
    return (
      <KeywordSettingsView
        keywordReplies={keywordReplies}
        selectedMedia={selectedMedia}
        setSelectedMedia={setSelectedMedia}
        mediaListLoading={mediaListLoading}
        mediaList={mediaList}
        setKeywordReplies={setKeywordReplies}
        keywordRepliesLoading={keywordRepliesLoading}
        activeTabMap={activeTabMap}
        setActiveTabMap={setActiveTabMap}
        saveKeywordSettings={saveKeywordSettings}
        setKeywordToDelete={setKeywordToDelete}
        setShowDeleteConfirm={setShowDeleteConfirm}
        setTargetReplyForModal={setTargetReplyForModal}
        setPresetModalType={setPresetModalType}
        setShowPresetModal={setShowPresetModal}
        showPresetModal={showPresetModal}
        presetModalType={presetModalType}
        targetReplyForModal={targetReplyForModal}
        keywordRepliesSaving={keywordRepliesSaving}
        handleKeywordImageUpload={handleKeywordImageUpload}
        keywordImageUploading={keywordImageUploading}
        apiFetch={apiFetch}
        showNotify={showNotify}
        INSTAGRAM_API_BASE_URL={INSTAGRAM_API_BASE_URL}
        safeString={safeString}
      />
    );
  };

  // Render AI Settings
  const renderAiSettings = () => (
    <AiSettingsView
      isAiActive={isAiActive}
      setIsAiActive={setIsAiActive}
      saveAiSettings={saveAiSettings}
      aiOperateStart={aiOperateStart}
      setAiOperateStart={setAiOperateStart}
      aiOperateEnd={aiOperateEnd}
      setAiOperateEnd={setAiOperateEnd}
      aiPromptSaving={aiPromptSaving}
      setShowAiKbModal={setShowAiKbModal}
      aiPrompt={aiPrompt}
      setAiPrompt={setAiPrompt}
      aiPromptLoading={aiPromptLoading}
      builderEditIndex={builderEditIndex}
    />
  );


  const renderMobileSimulator = (messages = []) => {
    return <MobileSimulatorView customerStatus={customerStatus} messages={messages} />;
  };

  const renderNotification = () => {
    return (
      <NotificationToast
        notification={notification}
        safeString={safeString}
        onClose={() => setNotification({ ...notification, show: false })}
        onAction={() => {
          notification.actionButton.onClick();
          setNotification({ ...notification, show: false });
        }}
      />
    );
  };

  const renderAutomationCenter = () => {
    return (
      <AutomationCenterView
        automationView={automationView}
        setAutomationView={setAutomationView}
        setBuilderEditIndex={setBuilderEditIndex}
        setBuilderTargetPosts={setBuilderTargetPosts}
        setBuilderKeywords={setBuilderKeywords}
        setBuilderDmMessage={setBuilderDmMessage}
        setBuilderFollowCheck={setBuilderFollowCheck}
        renderFlows={renderFlows}
        builderEditIndex={builderEditIndex}
        mediaList={mediaList}
        loadUserMedia={loadUserMedia}
        customerId={customerId}
        setShowPostPicker={setShowPostPicker}
        builderTargetPosts={builderTargetPosts}
        setShowTargetPostPreview={setShowTargetPostPreview}
        setTargetPostPreview={setTargetPostPreview}
        setShowTargetPostsPreview={setShowTargetPostsPreview}
        setTargetPostsPreview={setTargetPostsPreview}
        setShowPresetModal={setShowPresetModal}
        setPresetModalType={setPresetModalType}
        setTargetReplyForModal={setTargetReplyForModal}
        keywordReplies={keywordReplies}
        setKeywordReplies={setKeywordReplies}
        saveKeywordSettings={saveKeywordSettings}
        keywordRepliesSaving={keywordRepliesSaving}
        showPresetModal={showPresetModal}
        presetModalType={presetModalType}
        targetReplyForModal={targetReplyForModal}
        renderMobileSimulator={renderMobileSimulator}
        renderTemplates={renderTemplates}
        renderPlaceholder={renderPlaceholder}
        setBuilderFollowMessage={setBuilderFollowMessage}
        setBuilderFollowButtonText={setBuilderFollowButtonText}
        isPremiumFeatureLocked={isPremiumFeatureLocked}
        setCurrentView={setCurrentView}
        builderKeywords={builderKeywords}
        keywordInputValue={keywordInputValue}
        setKeywordInputValue={setKeywordInputValue}
        builderDmMessage={builderDmMessage}
        builderFollowCheck={builderFollowCheck}
        builderFollowMessage={builderFollowMessage}
        builderFollowButtonText={builderFollowButtonText}
        handleCreateSimpleFlow={handleCreateSimpleFlow}
        flowsSaving={flowsSaving}
        setFlowForm={setFlowForm}
        setShowFlowModal={setShowFlowModal}
      />
    );
  };

  const handleLinkAccount = async (opt) => {
    try {
      const checkRes = await apiFetch('/instagram/accounts/check-duplicate', {
        method: 'POST',
        body: JSON.stringify({ page_id: opt.page_id })
      });

      if (!checkRes.ok) throw new Error('중복 확인 중 오류가 발생했습니다.');
      const checkData = await checkRes.json();

      if (checkData.is_duplicate) {
        if (!window.confirm(`⚠️ 이 계정(@${checkData.existing_account.instagram_username})은 이미 다른 AIDM 계정에 연결되어 있습니다.\n\n계속하시면 기존 연결이 해제되고 현재 계정으로 이동됩니다.\n\n진행하시겠습니까?`)) {
          return;
        }
      }

      const res = await apiFetch('/instagram/accounts/link', {
        method: 'POST',
        body: JSON.stringify({ page_id: opt.page_id })
      });
      if (res.ok) {
        showNotify(`${opt.instagram_username} 계정이 연결되었습니다.`);
        loadInitialCustomerData(customerId);
        loadAccountOptions();
      } else {
        throw new Error('계정 연결 실패');
      }
    } catch (err) {
      showNotify('계정 연결 중 오류가 발생했습니다.', 'error');
    }
  };

  const renderAccountModal = () => {
    return (
      <AccountModal
        setShowAccountModal={setShowAccountModal}
        customerStatus={customerStatus}
        profileImage={profileImage}
        setShowDisconnectConfirm={setShowDisconnectConfirm}
        accountOptions={accountOptions}
        onLinkAccount={handleLinkAccount}
        showNotify={showNotify}
        handleInstagramLogin={handleInstagramLogin}
      />
    );
  };

  const renderFlowDeleteConfirmModal = () => {
    return (
      <FlowDeleteConfirmModal
        showFlowDeleteConfirm={showFlowDeleteConfirm}
        setShowFlowDeleteConfirm={setShowFlowDeleteConfirm}
        executeDeleteFlow={executeDeleteFlow}
        isDeletingFlow={isDeletingFlow}
      />
    );
  };

  const renderConversationDeleteModal = () => {
    return (
      <ConversationDeleteModal
        showConversationDeleteModal={showConversationDeleteModal}
        isDeletingConversation={isDeletingConversation}
        setShowConversationDeleteModal={setShowConversationDeleteModal}
        executeDeleteConversation={executeDeleteConversation}
      />
    );
  };

  const renderDeleteConfirmModal = () => {
    return (
      <KeywordDeleteConfirmModal
        showDeleteConfirm={showDeleteConfirm}
        keywordToDelete={keywordToDelete}
        setShowDeleteConfirm={setShowDeleteConfirm}
        setKeywordToDelete={setKeywordToDelete}
        keywordReplies={keywordReplies}
        setKeywordReplies={setKeywordReplies}
        saveKeywordSettings={saveKeywordSettings}
        showNotify={showNotify}
      />
    );
  };

  const renderModerationConfirmModal = () => {
    return (
      <ModerationConfirmModal
        showDeleteConfirmModal={showDeleteConfirmModal}
        moderationActionType={moderationActionType}
        idsToConfirmDelete={idsToConfirmDelete}
        isModerationActionLoading={isModerationActionLoading}
        setShowDeleteConfirmModal={setShowDeleteConfirmModal}
        setIdsToConfirmDelete={setIdsToConfirmDelete}
        handleModerationAction={handleModerationAction}
      />
    );
  };


  const handleForcedTransfer = async () => {
    if (!pendingTransferPageId) return;
    try {
      setLoginLoading(true);
      const res = await apiFetch('/instagram/accounts/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          page_id: pendingTransferPageId,
          force_transfer: true
        })
      });

      if (res.ok) {
        showNotify('인스타그램 계정이 성공적으로 이전되었습니다.');
        setShowTransferConfirm(false);
        setPendingTransferPageId(null);
        loadInitialCustomerData(customerId);
      } else {
        const err = await res.json();
        throw new Error(err.detail || '이전 실패');
      }
    } catch (err) {

      showNotify('계정 이전 중 오류가 발생했습니다: ' + err.message, 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const displayName =
    (customerStatus?.instagram_account?.instagram_username && customerStatus.instagram_account.instagram_username.trim()) ||
    (customerStatus?.name && customerStatus.name.trim()) ||
    (customerStatus?.email ? customerStatus.email.split('@')[0] : '') ||
    '사용자';
  const profileImage =
    customerStatus?.instagram_account?.profile_picture_url ||
    customerStatus?.profile_picture ||
    customerInfo?.profile_picture ||
    '';

  // REFACTORED: Initial Data Fetching with race-condition prevention
  useEffect(() => {
    const cid = customerId || initialCustomerId;
    if (!cid) {
      setPageLoading(false);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchAllData = async () => {
      if (!isMounted) return;

      try {
        // Step 1: STRICT Session Verification (Verify-First)
        // Dashboard will NOT be revealed until this succeeds.
        const sessionData = await loadInitialCustomerData(cid);

        // If sessionData is null (due to 401/404 redirect), stop here.
        if (!sessionData) return;

        // Step 2: REVEAL UI (Load-After)
        // Now that we've verified the user actually exists in the DB, show the dashboard.
        if (isMounted) setPageLoading(false);

        // Step 3: BACKGROUND Loading (Non-blocking content)
        // All existing functions are preserved and run in parallel now.
        const backgroundTasks = [
          loadWebhookStatus(cid),
          loadSubscriptionStatus(cid),
          loadKeywordSettings(cid),
          loadDashboardStats(cid),
          loadAiInsights(cid),
          loadAutomationStats(cid),
          loadBasicDashboardSummary(cid),
          loadActivities(cid),
          loadPageInsights(cid),
          loadIgInsights(cid).then(() => {
            if (isMounted) loadPerformanceReport(cid);
          }),
          loadIgComments(cid),
          loadMessagingEligibility(cid),
          loadAiSettings(cid),
          loadFlows(cid),
          loadConversations(cid)
        ];

        Promise.all(backgroundTasks).catch(err => {
          if (err.name !== 'AbortError' && isMounted) {
          }
        });

      } catch (error) {
        if (isMounted) {
          // SaaS Standard: Distinguish between Auth error and Connection error
          if (error.message?.includes('401') || error.message?.includes('404')) {
            // Handled by loadInitialCustomerData redirect
          } else {
            setInitializationError('서버와 연결할 수 없습니다.');
          }
          setPageLoading(false);
        }
      }
    };

    const init = async () => {
      await fetchAllData();
    };
    init();

    // Clean up OAuth search params once handled
    const params = new URLSearchParams(window.location.search);
    if (params.has('customer_id') || params.has('access_token') || params.has('confirm_transfer')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [customerId]); // Run when customerId changes (e.g. login/switch)




  // View-specific data fetching
  useEffect(() => {
    if (!customerId) return;

    if (currentView === 'keywordsettings' || (currentView === 'automation' && automationView === 'keyword')) {
      loadUserMedia(customerId);
    }
    if (currentView === 'contacts') {
      if (!isAiPremiumLocked) {
        loadContacts(customerId);
      }
    }
  }, [currentView, automationView, customerId]);

  // When customerStatus changes, update messagingAllowed (if APPROVED)
  useEffect(() => {
    if (customerStatus?.integration_status === 'APPROVED') {
      setMessagingAllowed(true);
      setMessagingDetail('');
    }
  }, [customerStatus?.integration_status]);

  // Load conversation list for Inbox and Dashboard
  useEffect(() => {
    if (!customerId) return;
    if ((currentView === 'inbox' || currentView === 'dashboard') && customerStatus?.integration_status === 'APPROVED') {
      loadConversations();
    }
  }, [currentView, customerId, customerStatus?.integration_status]);

  // Load messages for selected conversation
  useEffect(() => {
    if (selectedConversation && customerId) {
      loadConversationMessages(selectedConversation.id);
    }
  }, [selectedConversation, customerId]);

  // Pre-calculated variables
  const showOnboarding = customerStatus && !customerStatus.instagram_account;
  const pageConnected = Boolean(customerStatus?.instagram_account?.page_id);

  // Robust Plan Weight and Access Control
  const {
    planId,
    planWeight,
    userTrack,
    isFreePlan,
    isExpiredPaidPlan,
    isPremiumFeatureLocked,
    isAiPremiumLocked,
    usageLocked,
  } = getPlanAccessState(subscriptionStatus);

  // Previously this auto-redirected users, but we now use a Post-Subscription Data Retention Policy.
  // Users can view their historical dashboard data, but actions will be blocked via 'isPremiumFeatureLocked'.
  useEffect(() => {
    // Only redirect if absolutely necessary (e.g., they try to access a strictly locked route directly)
    // For now, we allow them to stay on their current view and let local components handle the block.
  }, [usageLocked, currentView, showOnboarding]);



  return (
    <div className="min-h-screen bg-white relative overflow-hidden font-sans selection:bg-purple-100">
      {(pageLoading || initializationError) && (
        <LoadingScreen
          initializationError={initializationError}
          onRetry={() => {
            setInitializationError(null);
            setPageLoading(true);
            // Trigger reload via cid reset logic or direct call
            window.location.reload();
          }}
        />
      )}
      {renderNotification()}
      {/* Ambient Background (Matching Home) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-l from-blue-100/40 to-cyan-100/40 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150"></div>
      </div>

      {/* Top Navigation */}
      <DashboardTopNav
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        navigate={navigate}
        customerStatus={customerStatus}
        loadAccountOptions={loadAccountOptions}
        setShowAccountModal={setShowAccountModal}
        subscriptionMenuRef={subscriptionMenuRef}
        subscriptionLoading={subscriptionLoading}
        subscriptionStatus={subscriptionStatus}
        paymentHistory={paymentHistory}
        showSubscriptionMenu={showSubscriptionMenu}
        setShowSubscriptionMenu={setShowSubscriptionMenu}
        setShowSubscriptionModal={setShowSubscriptionModal}
        notificationMenuRef={notificationMenuRef}
        showNotificationMenu={showNotificationMenu}
        setShowNotificationMenu={setShowNotificationMenu}
        activities={activities}
        setSelectedContact={setSelectedContact}
        setCurrentView={setCurrentView}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        profileImage={profileImage}
        displayName={displayName}
        handleLogout={handleLogout}
      />

      <SidebarNav
        sidebarCollapsed={sidebarCollapsed}
        menuItems={menuItems}
        showOnboarding={showOnboarding}
        currentView={currentView}
        customerStatus={customerStatus}
        messagingAllowed={messagingAllowed}
        setCurrentView={setCurrentView}
      />

      <MainContentArea
        sidebarCollapsed={sidebarCollapsed}
        usageLocked={usageLocked}
        isExpiredPaidPlan={isExpiredPaidPlan}
        currentView={currentView}
        setCurrentView={setCurrentView}
        showOnboarding={showOnboarding}
        pageConnected={pageConnected}
        messagingAllowed={messagingAllowed}
        eligibilityLoading={eligibilityLoading}
        messagingDetailText={safeString(messagingDetail) || '계정 연결은 완료되었습니다. 관리자 승인 후 모든 기능을 사용할 수 있습니다.'}
        renderOnboarding={() => (
          <OnboardingView handleInstagramLogin={handleInstagramLogin} loginLoading={loginLoading} />
        )}
        renderDashboard={renderDashboard}
        renderInsights={renderInsights}
        renderComments={renderComments}
        renderAiGuard={renderAiGuard}
        renderInbox={renderInbox}
        renderAutomationCenter={renderAutomationCenter}
        renderContacts={renderContacts}
        renderTemplates={renderTemplates}
        renderKeywordSettings={renderKeywordSettings}
        renderAiSettings={renderAiSettings}
        renderAiViralPostMaker={renderAiViralPostMaker}
        renderSubscription={renderSubscription}
      />

      <DashboardOverlays
        showScenarioModal={showScenarioModal}
        renderScenarioModal={renderScenarioModal}
        showPostPicker={showPostPicker}
        renderPostPickerModal={renderPostPickerModal}
        showTargetPostPreview={showTargetPostPreview}
        renderTargetPostPreviewModal={renderTargetPostPreviewModal}
        showTargetPostsPreview={showTargetPostsPreview}
        renderTargetPostsPreviewModal={renderTargetPostsPreviewModal}
        showFlowModal={showFlowModal}
        renderFlowModal={renderFlowModal}
        showAiKbModal={showAiKbModal}
        renderAiKbModal={renderAiKbModal}
        showAccountModal={showAccountModal}
        renderAccountModal={renderAccountModal}
        renderFlowDeleteConfirmModal={renderFlowDeleteConfirmModal}
        renderConversationDeleteModal={renderConversationDeleteModal}
        showDisconnectConfirm={showDisconnectConfirm}
        renderDisconnectConfirmModal={() => (
          <DisconnectConfirmModal
            setShowDisconnectConfirm={setShowDisconnectConfirm}
            handleDisconnectAccount={handleDisconnectAccount}
          />
        )}
        showTransferConfirm={showTransferConfirm}
        renderTransferConfirmModal={() => (
          <TransferConfirmModal
            setShowTransferConfirm={setShowTransferConfirm}
            setPendingTransferPageId={setPendingTransferPageId}
            handleForcedTransfer={handleForcedTransfer}
            loginLoading={loginLoading}
          />
        )}
        renderEmergencyModal={() => (
          <EmergencyModal
            connectionStatus={customerStatus?.instagram_account?.connection_status}
            handleInstagramLogin={handleInstagramLogin}
          />
        )}
        renderDeleteConfirmModal={renderDeleteConfirmModal}
        renderModerationConfirmModal={renderModerationConfirmModal}
        renderContactDetailModal={() => (
          <ContactDetailModal
            contact={selectedContact}
            isOpen={!!selectedContact}
            onClose={() => setSelectedContact(null)}
            onStartDirectMessage={() => {
              setSelectedConversation({
                id: selectedContact.instagram_id,
                username: selectedContact.username || selectedContact.instagram_id,
                profile_picture: selectedContact.profile_pic
              });
              setCurrentView('inbox');
              setSelectedContact(null);
            }}
          />
        )}
        renderSubscriptionModalOverlay={() => (
          <SubscriptionModalOverlay
            showSubscriptionModal={showSubscriptionModal}
            setShowSubscriptionModal={setShowSubscriptionModal}
            customerId={customerId}
            subscriptionStatus={subscriptionStatus}
            showNotify={showNotify}
            setCurrentView={setCurrentView}
          />
        )}
        renderBasicKpiDetailModal={() => (
          <BasicKpiDetailModal
            showBasicKpiDetailModal={showBasicKpiDetailModal}
            setShowBasicKpiDetailModal={setShowBasicKpiDetailModal}
            basicKpiDetail={basicKpiDetail}
          />
        )}
      />
    </div>
  );
};

// Wrap Dashboard with ErrorBoundary for crash protection
export default function DashboardWithErrorBoundary() {
  return (
    <DashboardErrorBoundary>
      <Dashboard />
    </DashboardErrorBoundary>
  );
}
