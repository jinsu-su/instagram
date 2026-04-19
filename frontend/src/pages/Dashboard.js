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
  MessageCircle, Instagram, CheckCircle2, Lightbulb, LayoutDashboard, RefreshCw, RefreshCcw, RotateCw,
  DollarSign, Star, ArrowUpRight, Send, Upload, BookOpen, Layout, MessageSquareText,
  Target, Shuffle, CreditCard, Square, Bookmark, Eye, EyeOff, Share2, ImagePlus, Type, AlignLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { INSTAGRAM_API_BASE_URL } from '../lib/config';
import { apiFetch, safeFetch, safeString, clearSessionAndRedirect } from '../lib/api';
import Subscription from './Subscription'; // PortOne Payment Page
import Campaigns from './Campaigns';




class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {

  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#e11d48', marginBottom: '16px' }}>화면 렌더링 오류</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            일시적인 오류가 발생했습니다. 페이지를 새로고침해주세요.
          </p>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '16px' }}>
            {String(this.state.error?.message || '')}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            style={{ padding: '12px 32px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const REPLY_PRESETS = [
  "1분 내로 링크가 담긴 DM을 받으실 거예요~ 🎇",
  "1분 내로 링크가 포함된 DM을 받으실 수 있을 거예요~ ✨",
  "1분 안에 링크가 포함된 DM이 도착할 거예요~ ✨",
  "1분 안에 링크가 포함된 DM이 발송될 거니 확인 부탁드려요~ ✨",
  "1분 이내로 링크를 포함한 DM이 전달될 예정입니다~ ✨",
  "DM 먼저 도착했을 수 있으니 편지함부터 열어보세요 📬",
  "DM 먼저 보는 분들이 이득 보실 거예요 💡",
  "DM 먼저 보는 사람이 승자! 🏆",
  "DM 먼저 체크하면 시간 절약 가능해요 ⏱️",
  "DM 먼저 확인해주세요 ✅",
  "DM 메세지 보내드렸어요. 🙂 확인 부탁드려요!",
  "DM 보내드렸어요, 인박스 확인해 주세요. 😊",
  "DM 보냈습니다. 🙂 확인해주시면 감사하겠습니다!",
  "DM 보냈으니 인박스를 확인해 주실래요? 😊",
  "DM 속 정보가 더 알찹니다 🧠",
  "DM 속에 소문난 꿀팁 들어있어요 🍯",
  "DM 속에서 기다리고 있을게요 🐾",
  "DM 안 보면 서운해요 😭",
  "DM 알림이 늦을 수 있어요 ⏳ 직접 들어가서 확인해주세요.",
  "DM 열어보면 좋은 정보 놓치지 않아요 🔥",
  "DM 쪽으로 자세한 안내를 드렸어요, 꼭 확인해주세요!",
  "DM 편지함에 깜짝 소식 하나 남겼어요 🎉",
  "DM 편지함에서 깜짝 메시지 기다려요 🎁",
  "DM 편지함에서 깜짝 메시지가 기다리고 있을지도 몰라요 🎁",
  "DM 편지함에서 중요한 메시지가 기다리고 있어요 🔔",
  "DM 확인 부탁드립니다! 🙂 감사드리며 메세지 남겨두었어요.",
  "DM 확인해보세요~ 📨",
  "DM 확인해주세요~ 📨",
  "DM에 모든 게 담겨 있어요 📦",
  "DM에서 더 많은 정보를 준비했어요 🗂️ 한 번 확인해보세요.",
  "DM에서만 볼 수 있는 내용이에요 🕵️ 한 번 확인해주세요.",
  "DM에서만 확인할 수 있는 내용이에요 👑",
  "DM으로 꿀정보 보냈어요 🌟 놓치지 마세요!",
  "DM으로 자세한 내용 드렸어요, 살펴봐주세요 🙂",
  "DM으로 조금 더 자세한 안내를 드렸어요 🔍",
  "DM으로 중요한 링크 보냈어요 🔗 놓치지 마세요!",
  "DM으로만 알려드리는 정보 있어요 🐱",
  "DM을 먼저 봐야 유리해요 😉",
  "DM이 가고 있습니다~ 뿅 🌠",
  "DM이 가고 있어요~ 뿅 🌠",
  "DM이 날아갑니다. 쓔웅 🚀",
  "DM이 런칭되었습니다. 쓔웅 🚀",
  "DM이 발송됐습니다, 인박스 한 번 확인해 보세요. 😊",
  "DM이 방금 갔어요! 인박스에서 확인해 보세요. 😊",
  "DM이 방금 전송됐어요, 인박스 확인 부탁드립니다. 😊",
  "DM이 전달되었어요, 인박스에서 확인 부탁드려요. 😊",
  "ㅋㅋ 댓글 감사~ 📩 자료는 DM 속에 있어요!",
  "ㅋㅋ 댓글 고마워요~ 📬 자료는 DM에서 기다리는 중~",
  "감사합니다! 🙂 DM으로 메세지 드렸는데, 한 번 확인 보시겠어요?",
  "감사합니다! 🙂 DM으로 보냈으니 한 번 체크 부탁드립니다.",
  "감사합니다! 📩 DM으로 자료 전달드릴게요. 좋은 하루 보내세요.",
  "감사합니다. 🙂 DM 확인해주실 수 있나요? 메세지 보냈습니다!",
  "감사합니다. 🙂 DM에 메세지 보내드렸으니 확인 부탁드릴께요!",
  "감사합니다. 🙂 DM에 메세지를 보냈으니 한 번 봐주실 수 있을까요?",
  "감사합니다. 🙂 메세지 DM으로 보냈으니 확인 부탁드려요!",
  "감사합니다😉 DM이 금방 도착할 거예요!",
  "감사합니다😉 DM이 금방 도착할 테니 잠시만 기다려 주세요!",
  "감사합니다😉 DM이 바로 도착할 예정이에요!",
  "고마워요! 📩 DM으로 자료 바로 쏴드릴게요~",
  "고마워요! 💌 자료는 DM으로 바로 가요~",
  "고마워요😉 DM이 바로 도착할 테니 기다려 주세요!",
  "고마워요😉 곧 DM에서 확인하실 수 있을 거예요!",
  "고마워요😉 곧 DM으로 메세지 보내드릴게요!",
  "고마워요😉 곧 DM이 도착할 거예요!",
  "고마워요😉 잠시만 기다리면 DM이 올 거예요!",
  "고맙습니다! 🙏 DM 확인해 주시면 자료 보실 수 있어요.",
  "고맙습니다😉 DM을 곧 보내드릴게요!",
  "고맙습니다😉 조금만 기다리시면 DM이 도착할 거예요!",
  "곧 링크가 담긴 DM이 1분 안에 도착할 거예요~ ✨",
  "꿀팁은 DM으로 보냈어요 🍯 얼른 확인해보세요!",
  "놓치지 말고 DM 먼저 열어보세요 🏁",
  "놓치지 않으려면 DM 확인부터! 🚀",
  "답변은 DM으로 보냈어요 ✅ 편지함을 살짝 확인해보세요.",
  "답은 DM에 있어요 🔍",
  "댓글 감사드려요 💬 DM 보냈으니 꼭 열어보세요.",
  "댓글 감사합니다 🙌 DM 편지함을 한 번 확인해보세요!",
  "댓글 감사합니다 😍 DM 확인해 보세요~",
  "댓글 감사합니다 🥰 DM으로 자료 보내드릴게요.",
  "댓글 감사합니다 💌 곧 DM 확인해 주세요. 행복한 하루 보내세요!",
  "댓글 감사합니다 😊 곧 DM으로 자료 보내드릴게요. 좋은 하루 되세요!",
  "댓글 감사해요 😍 자료는 DM으로 전송됩니다!",
  "댓글 고마워요 🎯 DM에 자료 넣어뒀어요~",
  "댓글 고마워요 😊 DM으로 자료 금방 갈 거예요~",
  "댓글 고마워요 🙏 DM으로 자료 바로 가요~",
  "댓글 고마워요 📬 DM으로 자료 보내드렸습니다~",
  "댓글 고마워요 😍 DM으로 자료 지금 바로~",
  "댓글 고마워요~ 🥰 DM 고고씽~",
  "댓글 고맙습니다아~ 😎 DM은 이미 발사 완료!",
  "댓글 남겨주셔서 감사드려요 📩 DM에서 확인해 주세요~",
  "댓글 남겨주셔서 감사합니다 🥰 자료는 DM에서 확인해 주세요~",
  "댓글 남겨주셔서 감사합니다! 📨 DM 확인 부탁드려요~",
  "댓글 남겨주셔서 감사해요 💌 곧 DM 확인해 주세요~",
  "댓글 남겨주셔서 감사해요 📬 자료는 DM으로 보내드립니다.",
  "댓글 남겨주셔서 고마워요 🌼 DM도 한 번 봐주세요.",
  "댓글 남겨주셔서 너무 감사해요 🌸 DM으로 답장 드렸어요.",
  "댓글 남겨주셔서 정말 감사해요 💖 DM도 꼭 봐주세요.",
  "댓글 너무 고마워요 😍 DM으로 답장 드렸어요.",
  "댓글 너무 반가워요 ✨ DM 편지함도 들러주세요.",
  "댓글 너무 반가워요 🤗 DM도 확인하시면 좋을 거예요.",
  "댓글 너무 소중해요 💕 DM 보냈으니 꼭 확인해보세요.",
  "댓글 달아주셔서 감사해요 🙌 DM 확인하시면 돼요~",
  "댓글 달아주셔서 정말 감사해요 🙌 DM 확인 부탁드립니다!",
  "댓글 달아주신 거 보고 깜놀 🤩 자료 DM 고고~",
  "댓글 땡큐~ 📩 자료는 DM 속에 숨어있음ㅋㅋ",
  "댓글 보고 심쿵 😍 자료는 DM에 준비 완료~",
  "댓글도 좋지만 DM엔 더 재밌는 게 있어요 😂",
  "댓글보다 DM 먼저 보면 놀랄지도 몰라요 🤭",
  "댓글보다 DM 먼저 열어보면 좋을 것 같아요 🏃",
  "댓글보다 DM 먼저 읽어보세요 🔑",
  "댓글보다 먼저 도착한 DM 💌",
  "더 자세한 내용은 DM에서 알려드릴게요 👀",
  "디엠 먼저 보고 판단해보세요 🧐",
  "디엠 보내드렸어요~ ⚡",
  "디엠 보내드렸어요~ 짠⚡",
  "디엠 알림 놓치지 마세요 🔔",
  "디엠 알림 안 오면 직접 들어가서 체크하세요 📬",
  "디엠 편지함 체크 필수! 📌",
  "디엠 편지함이 오늘의 보물상자 🎁",
  "디엠에 귀여운 메시지 하나 넣어놨어요 🎀",
  "디엠에 더 자세한 이야기 넣어뒀어요 📘",
  "디엠에 몰래 담아놨어요 🗝️ 편지함으로 슝!",
  "디엠에 숨겨둔 메시지가 있어요 🗝️",
  "디엠에서 더 많은 정보를 볼 수 있어요 📚",
  "디엠에서만 공개하는 비밀 정보 🔒",
  "디엠에서만 공개하는 특별한 정보 있어요 🎉",
  "디엠에서만 볼 수 있는 비밀 파일 첨부했어요 🗂️",
  "디엠에서만 알려드리는 정보가 있어요 📌 확인해보세요.",
  "디엠으로 꿀팁 보냈어요 🍯 꼭 확인해보세요!",
  "디엠으로 몰래 메시지 보냈어요 🎁 확인 안 하면 아쉬워요!",
  "디엠으로 비밀 메시지 보냈어요 🤫 체크해보세요!",
  "디엠으로 살짝 귀띔해드렸어요 😏",
  "디엠으로 살짝 보냈으니 꼭 체크해주세요 🙌",
  "디엠으로만 드리는 정보예요 📢 편지함 확인 필수!",
  "디엠을 열면 새로운 세상이 펼쳐질지도 🤩",
  "링크가 포함된 DM이 1분 내로 도착할 예정이니 기다려 주세요~ ✨",
  "마지막으로, DM 편지함 한 번만 열어보세요 🙏",
  "메세지 보내드렸습니다! 🙂 DM 확인해주시면 감사하겠습니다.",
  "메세지 보내드렸어요~ 📇",
  "메세지 보내드릴께요, 잠시만요~ 📇",
  "방금 DM 보냈어요 📮 편지함에 살짝 들어가보세요.",
  "방금 DM 보냈어요 📩 확인해주시면 좋아요.",
  "방금 DM 보냈어요, 놓치면 아쉬울 수도 있어요 😎",
  "방금 DM 보냈어요! 혹시 스팸함으로 가지 않았는지도 체크해주세요 🙏",
  "방금 DM 쏴드렸어요 📩",
  "방금 DM으로 살짝 전달드렸어요 🐾",
  "방금 보낸 DM 안에 답이 있어요 🧩",
  "방금 보낸 DM 안에 중요한 힌트 있어요 🧩",
  "방금 보낸 DM! 열어보세요 💌",
  "방금 보낸 DM에 답변을 남겼어요 💬 편지함에서 확인해보세요.",
  "비밀 링크는 DM 속에 있어요 🔗",
  "비밀 정보는 DM에 담았어요 😎 편지함으로 GO!",
  "비밀스러운 소식은 DM에… 🤐",
  "비밀은 DM 속에… 🤫",
  "비밀은 DM에… 😉 한 번 열어보세요!",
  "비밀은 댓글이 아니라 DM에 숨겨놨어요 😜",
  "살짝 DM으로만 드리는 정보예요 😏",
  "소중한 댓글 감사합니다 💛 DM 확인 부탁드려요.",
  "소중한 분이라 DM으로 바로 안내드렸어요 💌",
  "소중한 인연 감사해요 🥰 DM 편지함도 같이 열어보세요.",
  "소중한 정보는 DM 속에서만 👑",
  "아하! 댓글 고맙습니다 🙌 DM으로 자료 넣어놨어요~",
  "알림이 누락될 수 있어요 😢 DM함 직접 체크해보세요.",
  "알림이 누락될 수 있어요 😱 직접 확인해보세요.",
  "알림이 안 올 수 있어요 😭 직접 DM 편지함에 들어가서 확인해보세요.",
  "앗 댓글! 😆 DM으로 자료 바로 날아가요~",
  "야호 🙌 댓글 고마워요~ DM으로 자료 슝~",
  "오 댓글 감사해요! 💙 DM으로 자료 보내드릴게요~",
  "오~ 댓글 달아주셨네요? 😎 DM으로 바로 쏴줄께요!",
  "오늘도 댓글 남겨주셔서 감사해요 🌸 DM도 한 번 봐주세요.",
  "오오~ 댓글 남겨주셨군요 😍 DM 확인해 보세욧!",
  "오옷 댓글 실화인가요? 😆 자료는 DM으로 이미 출발!",
  "오호라~ 댓글 고마워요 💌 DM 확인하러 가실래요?",
  "와우! 댓글 달아주다니… 멋져요 💖 DM 확인 ㄱㄱ~",
  "으악! 댓글 감사합니다~ 😜 DM 확인해 주세요~",
  "이 댓글보다 DM이 더 빨리 갔을 거예요 🚀",
  "이 댓글보다 DM이 먼저 도착했을 가능성이 높아요 🏃♀️",
  "이 댓글보다 빠른 DM 🚀 먼저 열어보세요.",
  "이번 DM은 안 보면 진짜 손해예요 🛎️",
  "인박스로 DM 발송했어요! 한번 체크해 주세요. 😊",
  "인박스로 DM 보냈어요! 확인 부탁드려요. 😊",
  "인박스에 DM 도착했어요! 확인 부탁드릴게요. 😊",
  "인박스에 DM이 도착했어요! 확인해 주세요. 😊",
  "잠깐! DM 먼저 체크해보시면 도움이 될 거예요 💡",
  "잠깐만 기다려 주세요, 1분 내로 링크 DM을 받으실 거예요~ ✨",
  "잠시만 기다리시면, 1분 안에 링크를 담은 DM이 발송될 거예요~ ✨",
  "조금만 기다려 주세요! 1분 안에 링크가 담긴 DM이 가요~ ✨",
  "좋은 건 DM에 숨겨놨어요 🎁",
  "좋은 건 DM으로 먼저 갑니다 ⚡",
  "좋은 소식은 DM에 숨겨놨어요 🎁",
  "좋은 소식은 DM에 있어요 📥 확인해보세요.",
  "좋은 소식은 DM으로 ✨ 한 번 체크해보세요.",
  "좋은 하루 되세요 ☀️ DM 편지함도 체크!",
  "중요한 공지는 DM으로만 전달 중이에요 📢",
  "중요한 내용 DM으로 남겼어요 📨 확인 부탁드려요.",
  "중요한 단서가 DM 속에 있어요 🧩",
  "중요한 소식은 DM에서만! 🚀 꼭 확인해주세요.",
  "편지함만 열면 바로 확인 가능해요 🚪",
  "한 번만 DM 열어보시면 아실 거예요 😍",
  "혹시 DM 먼저 도착했을 수도 있어요! 확인해보실래요?",
  "혹시 DM 먼저 확인해보실래요? 좋은 소식 있어요 🙌",
  "혹시 DM 안 보면 놓칠 수도 있어요 ⚡",
  "혹시 DM 알림이 안 뜰 수도 있어요 😅 편지함 들어가서 확인해보세요.",
  "혹시 DM 열어보셨나요? 깜짝 놀랄 거예요 👀",
  "혹시 DM함을 놓치셨을 수도 있어요! 한 번 들어가 보실래요?",
  "혹시 모를 DM을 위해 편지함 한 번 열어보세요 💌",
  "혹시 스팸함으로 갔을 수도 있어요 😅 한번 체크!",
  "확인 안 하면 아쉬운 내용이에요 😢 DM 체크!",
  "📨 감사해요! DM으로 자료 바로 보내드릴게요. 오늘도 파이팅하세요!",
  "👍 감사해요! 자료는 DM으로 곧 받아보실 수 있습니다.",
  "😎 댓글 감사! 자료는 DM에 준비돼 있어요~",
  "📝 댓글 감사드려요! DM으로 자료 발송 예정입니다.",
  "💬 댓글 감사드려요! 요청하신 자료는 DM에서 확인 가능합니다.",
  "🎯 댓글 감사드립니다! DM에 자료 넣어드렸어요.",
  "💙 댓글 감사합니다~ 자료는 DM으로 전송될 예정이에요!",
  "😎 댓글 고마워요! DM으로 자료 발송 완료했습니다.",
  "😄 댓글 고맙습니다! 요청하신 자료 DM으로 곧 보내드릴게요.",
  "🥳 댓글 고맙습니다~ 자료는 DM에 도착했습니다!",
  "👍 댓글 남겨주셔서 감사! 자료는 DM으로 보내드렸어요~",
  "🙏 댓글 남겨주셔서 감사드려요! 요청하신 자료는 DM으로 곧 전송됩니다.",
  "🙌 댓글 남겨주셔서 감사드려요! 자료는 DM에서 확인하세요.",
  "📨 댓글 남겨주셔서 감사해요! DM 확인 꼭 해주세요~",
  "🤗 댓글 달아주셔서 행복 뿜뿜~ DM으로 자료 보냈어요!",
  "😄 댓글 완전 감사합니다~ 자료는 DM에서 만나보세요!",
  "🙌 와 댓글 감사합니다! 자료는 DM으로 보내드릴게요~",
  "🙋♂️ 댓글 고맙습니다! DM 확인해 주세요~",
  "🙋♂️ 댓글 완전 반가워요! 자료는 DM으로~"
];

const FOLLOW_REMINDER_PRESETS = [
  "먼저 저희 계정을 팔로우해주셔야 정보를 드릴 수 있어요! 팔로우 후 다시 눌러주세요! 🙏",
  "앗! 아직 팔로우를 안 하셨네요. 🥺 저희 계정 팔로우 후 버튼을 누르면 링크가 즉시 전송됩니다!",
  "반가워요! 선착순 정보 제공을 위해 팔로우 확인이 필요합니다. 저희 계정 팔로우 후 다시 시도해주세요. ✨",
  "죄송합니다! 이 정보는 팔로워 분들께만 먼저 공개되고 있어요. 🎁 팔로우 버튼을 꾹 눌러주세요!",
  "팔로우가 확인되지 않았습니다. 🔍 저희 계정을 팔로우 하시면 요청하신 상세 페이지 링크를 바로 보내드릴게요!",
  "아직 저희와 팔로우 사이가 아니시네요! 🤝 팔로우 하시고 다시 한번 아래 버튼을 클릭해주세요.",
  "잠시만요! ✋ 정보를 안전하게 전달드리기 위해 팔로우 확인이 필요해요. 팔로우 후 다시 클릭 부탁드려요!",
  "저희 팔로워가 되시면 모든 자동화 링크를 즉시 받아보실 수 있습니다. 지금 바로 팔로우 해주세요! 🔥",
  "원활한 안내를 위해 팔로우가 필요합니다. 😊 저희 계정을 팔로우 하고 다시 요청해주세요!",
  "팔로우 하시면 기다리시는 정보를 바로 전송해 드립니다! 💌 팔로우 후 버튼을 눌러주세요."
];

function Dashboard() {
  const navigate = useNavigate();


  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSubscriptionMenu, setShowSubscriptionMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const subscriptionMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);

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
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [automationStats, setAutomationStats] = useState(null);
  const [automationStatsLoading, setAutomationStatsLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // Keyword Deletion Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [keywordToDelete, setKeywordToDelete] = useState(null);

  // Moderation Auto Loader
  useEffect(() => {
    if (customerId && (currentView === 'comments' || currentView === 'aiguard')) {
      loadGalleryPosts(customerId);
      loadModerationSettings(customerId);
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
      { label: '결제하러 가기', onClick: () => setCurrentView('subscription') }
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


  const renderLoadingScreen = () => {
    if (initializationError) {
      return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center animate-in fade-in duration-500 p-6 text-center">
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 max-w-md w-full shadow-xl shadow-red-50/50">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">연결에 실패했습니다</h2>
            <p className="text-gray-600 font-bold mb-8 leading-relaxed">
              {initializationError}<br />
              서버가 점검 중이거나 일시적인 장애가 있을 수 있습니다.
            </p>
            <Button 
              onClick={() => {
                setInitializationError(null);
                setPageLoading(true);
                // Trigger reload via cid reset logic or direct call
                window.location.reload(); 
              }}
              className="w-full rounded-2xl bg-gray-900 text-white h-14 font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200"
            >
              다시 연결 시도
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="relative animate-pulse mb-0">
          <img
            src="/assets/aidm-logo-ultra.png"
            alt="AIDM"
            className="h-32 w-auto object-contain"
          />
        </div>
        <div className="-mt-4 text-center space-y-0.5">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight m-0">잠시만 기다려주세요</h2>
          <p className="text-gray-500 font-bold m-0">AIDM 연결을 준비하고 있습니다...</p>
        </div>
      </div>
    );
  };

  const renderOnboarding = () => (
    <>
      <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in zoom-in duration-700">
        <Card className="w-full max-w-2xl shadow-2xl border border-white/50 bg-white/70 backdrop-blur-2xl relative z-10 rounded-[3rem] overflow-hidden p-6 md:p-12">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-10 p-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[2.5rem] w-fit shadow-2xl shadow-purple-200 animate-float">
              <Instagram className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-6">
              시작해볼까요?
            </h2>
            <p className="text-gray-500 font-bold text-xl leading-relaxed">
              AIDM의 강력한 AI 기능을 위해<br />
              먼저 <strong>인스타그램 계정</strong>을 안전하게 연결해 주세요.
            </p>
          </CardHeader>
          <CardContent className="space-y-10">
            <div className="space-y-4">
              <button
                onClick={handleInstagramLogin}
                disabled={loginLoading}
                className="group relative w-full py-8 bg-gradient-to-br from-[#7C3AED] to-[#DB2777] text-white rounded-[2.5rem] font-black text-2xl shadow-[0_25px_60px_-15px_rgba(124,58,237,0.5)] hover:shadow-[0_30px_70px_-10px_rgba(219,39,119,0.5)] transition-all duration-500 hover:scale-[1.03] active:scale-95 overflow-hidden border border-white/30 flex items-center justify-center gap-4"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                {loginLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Instagram className="w-8 h-8" />}
                {loginLoading ? '준비 중...' : 'Instagram 연결하기'}
              </button>
              <p className="text-center text-xs text-gray-400 font-bold tracking-tight">
                인스타그램 계정으로 로그인하여 댓글 분석 및 자동 답장 기능을 활성화합니다.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 text-center opacity-20 pointer-events-none select-none">
          <h3 className="text-9xl font-black text-gray-200 tracking-tighter">AIDM</h3>
        </div>
      </div>
    </>
  );

  const renderEmergencyModal = () => {
    const status = customerStatus?.instagram_account?.connection_status;
    const isDisconnected = status === 'DISCONNECTED';
    const isExpired = status === 'EXPIRED';
    
    if (!isDisconnected && !isExpired) return null;

    if (isExpired) {
      return (
        <div className="fixed inset-0 z-[1110] bg-black/60 backdrop-blur-xl overflow-y-auto custom-scrollbar flex justify-center p-4 py-12 animate-in fade-in duration-700">
          <div className="max-w-md w-full bg-white rounded-[3.5rem] p-10 shadow-[0_35px_100px_-15px_rgba(59,130,246,0.3)] border border-blue-100 relative overflow-hidden animate-in zoom-in-95 duration-300 h-fit my-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner ring-8 ring-blue-50/50 animate-float">
                <ShieldCheck className="w-12 h-12 text-blue-600" />
              </div>

              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
                보안 재인증이 필요합니다
              </h2>

              <p className="text-gray-500 font-bold leading-relaxed mb-10 px-2 whitespace-pre-line">
                Meta(인스타그램) 개인정보 보호 정책에 따라,{"\n"}안전을 위해 주기적인 재인증을 진행해 주세요.
              </p>

              <div className="space-y-4 w-full">
                <button
                  onClick={handleInstagramLogin}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white h-20 rounded-[2rem] font-black text-xl transition-all shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] hover:shadow-[0_25px_50px_-10px_rgba(79,70,229,0.5)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 border border-white/20"
                >
                  <Lock className="w-6 h-6" />
                  1초만에 안전하게 갱신하기
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[1110] bg-black/80 backdrop-blur-3xl overflow-y-auto custom-scrollbar flex justify-center p-4 py-12 animate-in fade-in duration-700">
        <div className="max-w-md w-full bg-white rounded-[3.5rem] p-10 shadow-[0_35px_100px_-15px_rgba(239,68,68,0.3)] border border-red-100 relative overflow-hidden animate-in zoom-in-95 duration-300 h-fit my-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-rose-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner ring-8 ring-red-50/50 animate-float">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>

            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
              연결이 중단되었습니다
            </h2>

            <p className="text-gray-500 font-bold leading-relaxed mb-10 px-2 whitespace-pre-line">
              비밀번호 변경 등으로 인해{"\n"}인스타그램 연동이 해제되었습니다.
            </p>

            <div className="space-y-4 w-full">
              <button
                onClick={handleInstagramLogin}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white h-20 rounded-[2rem] font-black text-xl transition-all shadow-[0_20px_40px_-10px_rgba(225,29,72,0.4)] hover:shadow-[0_25px_50px_-10px_rgba(225,29,72,0.5)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 border border-white/20"
              >
                <Instagram className="w-7 h-7" />
                지금 다시 연결하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  const loadUserMedia = async (id) => {
    try {
      setMediaListLoading(true);
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-media?limit=25`);
      if (res.ok) {
        const data = await res.json();
        setMediaList(data.images || []);
      }
    } catch (err) {

    } finally {
      setMediaListLoading(false);
    }
  };

  const loadDashboardStats = async (id) => {
    try {
      const res = await apiFetch(`/admin/customers/${id}/dashboard-stats`);
      if (!res.ok) throw new Error('Failed to load dashboard stats.');
      const data = await res.json();
      setDashboardStats(data);
    } catch (err) {

    }
  };

  const loadSubscriptionStatus = async (id = null) => {
    try {
      setSubscriptionLoading(true);
      const res = await apiFetch('/api/subscription/status');
      if (!res.ok) throw new Error('Failed to load subscription status.');
      const data = await res.json();
      setSubscriptionStatus(data);
    } catch (err) {

    } finally {
      setSubscriptionLoading(false);
    }
  };

  const loadAiInsights = async (id) => {
    setAiInsightsLoading(true);
    try {
      const res = await apiFetch(`/admin/customers/${id}/ai-insights`);
      if (res.ok) {
        const data = await res.json();
        // If the new data says "no conversations", but we already HAVE insights, keep the old ones.
        if (data?.trends?.summary?.includes("최근 대화가 없어") && aiInsights?.trends?.summary) {

        } else {
          setAiInsights(data);
        }
      } else {
        // Handle 403/429 etc
        let errorMsg = 'AI 인사이트를 불러올 수 없습니다.';
        try {
          const errData = await res.json();
          errorMsg = errData.detail?.message || errData.detail || errData.message || errorMsg;
        } catch (e) { }
        setAiInsights({ error: errorMsg });
      }
    } catch (e) {

    } finally {
      setAiInsightsLoading(false);
    }
  };

  const loadAutomationStats = async (id) => {
    setAutomationStatsLoading(true);
    try {
      const res = await apiFetch(`/admin/customers/${id}/automation-stats?days=30`);
      if (res.ok) {
        const data = await res.json();
        setAutomationStats(data);
      }
    } catch (e) {
      // automation stats failed silently
    } finally {
      setAutomationStatsLoading(false);
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
      
      // Standard SaaS Flow: Initial Session Verification
      // Using cache-busting timestamp to prevent "Ghost Dashboard" from disk cache
      const res = await apiFetch(`/admin/customers/${id}?t=${Date.now()}`);
      
      // If the user no longer exists (404) or is unauthorized (401), force logout immediately
      if (res.status === 401 || res.status === 404) {
        console.warn('Session invalid or user not found. Redirecting to landing page...');
        clearSessionAndRedirect();
        return null;
      }
      
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      
      // Successfully verified user session
      setCustomerStatus(data);
      setCustomerInfo(data);
      return data;
    } catch (err) {
      console.error('Critical Error loading initial customer data:', err);
      // If it's a critical auth error, don't allow staying in the ghost dashboard
      if (err.message?.includes('401') || err.message?.includes('404')) {
        clearSessionAndRedirect();
      }
      setCustomerStatus((prev) => prev || { error: 'Failed to verify session.' });
      return null;
    } finally {
      setCustomerLoading(false);
      setProfileLoading(false);
    }
  };

  // Check webhook status
  const loadWebhookStatus = async (id) => {
    try {
      setWebhookLoading(true);
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/webhook-status`);
      if (!res.ok) throw new Error('Failed to load webhook status.');
      const data = await res.json();
      setWebhookStatus(data);
    } catch (err) {

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
      // Load conversation list with latest messages for sorting
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/conversations?customer_id=${targetId}&include_latest_message=true&limit=25`);
      if (!res.ok) {
        throw new Error('Failed to load conversations');
      }
      const data = await res.json();
      if (data.success && data.our_account_ids) {
        setOurAccountIds(data.our_account_ids);
      }



      // Time extraction function
      const getTime = (conv) => {
        // Priority 1: latest_message.created_time
        if (conv.latest_message?.created_time) {
          try {
            const time = new Date(conv.latest_message.created_time).getTime();
            if (!isNaN(time) && time > 0) {
              return time;
            }
          } catch (e) {

          }
        }
        // Priority 2: updated_time
        if (conv.updated_time) {
          try {
            const time = new Date(conv.updated_time).getTime();
            if (!isNaN(time) && time > 0) {
              return time;
            }
          } catch (e) {

          }
        }
        // Default: 0 (treated as oldest)
        return 0;
      };

      // Logging before sorting (first 5 only)

      (data.conversations || []).slice(0, 5).forEach((conv, idx) => {
        const time = getTime(conv);
        const timeStr = conv.latest_message?.created_time || conv.updated_time || 'N/A';

      });

      // Sort - descending (newest at top)
      const sortedConversations = [...(data.conversations || [])].sort((a, b) => {
        const aTime = getTime(a);
        const bTime = getTime(b);
        const result = bTime - aTime; // Descending

        // Log only first 5 comparisons
        if ((data.conversations || []).indexOf(a) < 5 || (data.conversations || []).indexOf(b) < 5) {
          const aTimeStr = a.latest_message?.created_time || a.updated_time || 'N/A';
          const bTimeStr = b.latest_message?.created_time || b.updated_time || 'N/A';

        }

        return result;
      });

      // Logging after sorting (first 5 only)

      sortedConversations.slice(0, 5).forEach((conv, idx) => {
        const time = getTime(conv);
        const timeStr = conv.latest_message?.created_time || conv.updated_time || 'N/A';

      });

      // Sort verification
      if (sortedConversations.length > 0) {
        const firstTime = getTime(sortedConversations[0]);
        const lastTime = getTime(sortedConversations[sortedConversations.length - 1]);

      }


      setConversations(sortedConversations);
    } catch (err) {

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
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/page-insights`);
      if (!res.ok) throw new Error('Failed to load insights.');
      const data = await res.json();
      setInsights(data);
    } catch (err) {

      setInsights({ error: 'Failed to load insights.' });
    } finally {
      setInsightsLoading(false);
    }
  };

  const loadPerformanceReport = async (id, forceRefresh = false) => {
    try {
      setPerformanceReportLoading(true);
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
        } catch (e) {
          // ignore parse error, use default
        }
        setPerformanceReport({ error: errorMsg });
        return;
      }
      const data = await res.json();
      setPerformanceReport(data);
    } catch (err) {
      setPerformanceReport({ error: '데이터 통신 중 오류가 발생했습니다.' });
    } finally {
      setPerformanceReportLoading(false);
    }
  };

  const loadIgInsights = async (id) => {
    try {
      setIgInsightsLoading(true);
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-insights`);
      if (!res.ok) throw new Error('Failed to load IG information.');
      const data = await res.json();


      // Rate Limit으로 인해 캐시된 응답(빈 미디어)이 왔을 경우 기존 데이터 유지
      // 특히 React Strict Mode에서 useEffect가 2번 실행될 때 데이터 소실 방지
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

      setIgInsights({ error: 'Failed to load IG information.' });
    } finally {
      setIgInsightsLoading(false);
    }
  };

  const loadRecentPostsForAnalysis = async (id) => {
    try {
      setRecentPostsLoading(true);
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-media?limit=12`);
      if (!res.ok) throw new Error('Failed to load recent posts.');
      const data = await res.json();
      setRecentPostsForAnalysis(data.images || []);
    } catch (err) {

      setRecentPostsForAnalysis([]);
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
    try {
      setIsGalleryLoading(true);
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-media?limit=12`);
      if (!res.ok) throw new Error('Failed to load recent posts.');
      const data = await res.json();
      setGalleryPosts(data.images || []);
    } catch (err) {

      setGalleryPosts([]);
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
    // Legacy loadIgComments kept for backward compatibility if needed, 
    // but we will primarily use loadRecentPostsForAnalysis now.
    // We can also trigger loadRecentPostsForAnalysis here initially.
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

  const menuItems = [
    {
      icon: Home,
      label: '종합 대시보드',
      description: '실시간 현황 & AI 요약',
      view: 'dashboard',
      color: 'text-purple-600'
    },
    {
      icon: BarChart3,
      label: '인사이트',
      description: '계정/웹훅 상태 & 인사이트',
      view: 'insights',
      color: 'text-blue-600'
    },

    {
      icon: MessageCircle,
      label: '댓글 분석',
      description: 'IG 댓글 분석 & AI 요약',
      view: 'comments',
      color: 'text-pink-600'
    },
    {
      icon: ShieldCheck,
      label: 'AI Guard',
      description: '악플 및 스팸 실시간 탐지',
      view: 'aiguard',
      color: 'text-green-600'
    },
    {
      icon: Send,
      label: '통합 인박스',
      description: '메시지 & 우선순위 큐',
      view: 'inbox',
      color: 'text-pink-600',
      requiresApproval: true
    },
    {
      icon: Bot,
      label: 'AI 설정',
      description: '나만의 AI 어시스턴트 정의',
      view: 'aisettings',
      color: 'text-indigo-600',
      requiresApproval: true
    },
    {
      icon: Zap,
      label: '자동 응답 시나리오',
      description: '나만의 자동화 흐름 설계',
      view: 'automation',
      color: 'text-indigo-600',
      requiresApproval: true
    },
    {
      icon: MessageSquareText,
      label: '키워드 답장',
      description: '반복되는 문의 자동 대응',
      view: 'keywordsettings',
      color: 'text-indigo-600',
      requiresApproval: true
    },
    {
      icon: Users,
      label: '고객 관리',
      description: '고객 정보 및 세그먼트 관리',
      view: 'contacts',
      color: 'text-pink-600',
      requiresApproval: true
    },
    {
      icon: CreditCard,
      label: '요금제 및 결제',
      description: '구독 관리 및 결제',
      view: 'subscription',
      color: 'text-indigo-600',
      requiresApproval: false
    },

  ];


  // Render Dashboard View (Overview - AI Summary + Key Metrics)
  const renderDashboard = () => {
    // 1. Calculate Active Metrics
    const activeCampaignCount = dashboardStats?.active_automations || 0;
    const totalContacts = dashboardStats?.total_contacts || 0;
    const totalAiReplies = dashboardStats?.total_ai_replies || 0;
    const totalFlowTriggers = dashboardStats?.total_flow_triggers || 0;
    // Use followers_count from customerStatus.instagram_account instead of separate API call
    const totalFollowers = customerStatus?.instagram_account?.followers_count?.toLocaleString() || '-';

    // 2. Recent Message Stats (Last 24h)
    const now = new Date().getTime();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentMessages = conversations.filter(c => {
      const t = c.latest_message?.created_time ? new Date(c.latest_message.created_time).getTime() : 0;
      return t > oneDayAgo;
    });
    const recentMessageCount = recentMessages.length;

    // 3. Urgent Items (Unread DM or #응대필요 tagged contacts)
    const urgentConversations = conversations.filter(c =>
      (c.unread_count && c.unread_count > 0) ||
      (c.contact?.tags?.includes('응대필요'))
    ).slice(0, 4);

    const statsCards = [
      {
        title: 'AI 자동응답',
        value: safeString(totalAiReplies.toLocaleString()),
        change: 'Smart',
        icon: Sparkles,
        color: 'text-indigo-600',
        bgColor: 'bg-white border border-gray-100 drop-shadow-sm'
      },
      {
        title: '인스타 팔로워',
        value: safeString(totalFollowers),
        change: 'Live',
        icon: Instagram,
        imageUrl: '/assets/instagram-logo.svg',
        imageClassName: 'w-[52px] h-[52px] object-contain drop-shadow-sm',
        noBg: true,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50 border border-pink-100'
      },
      {
        title: '종합 누적 고객',
        value: safeString(totalContacts.toLocaleString()),
        change: 'Growth',
        icon: Users,
        color: 'text-gray-700',
        bgColor: 'bg-white border border-gray-100'
      },
      {
        title: '24h 유입 문의',
        value: safeString(recentMessageCount.toLocaleString()),
        change: 'Traffic',
        icon: MessageCircle,
        color: 'text-gray-700',
        bgColor: 'bg-white border border-gray-100'
      },
    ];

    const filteredActivities = activities.filter(a => {
      if (a.event_type === 'HUMAN_INTERVENTION_NEEDED') return false;

      // Search Match
      const searchLower = dashboardSearchTerm.toLowerCase();
      const activitySearchLower = activitySearchTerm.toLowerCase();

      const globalSearchMatch = !dashboardSearchTerm || (a.contact_username || '').toLowerCase().includes(searchLower);
      const specificSearchMatch = !activitySearchTerm ||
        (a.contact_username || '').toLowerCase().includes(activitySearchLower) ||
        (a.action_text || '').toLowerCase().includes(activitySearchLower);

      if (!globalSearchMatch || !specificSearchMatch) return false;

      // Type Match
      let typeMatch = true;
      if (activityTypeFilter === 'SCENARIO') {
        typeMatch = a.event_type === 'FLOW_TRIGGER';
      } else if (activityTypeFilter === 'AI') {
        typeMatch = a.event_type === 'AI_CHAT_REPLY' || a.event_type === 'AI_COMMENT_REPLY';
      } else if (activityTypeFilter === 'KEYWORD') {
        typeMatch = !['FLOW_TRIGGER', 'AI_CHAT_REPLY', 'AI_COMMENT_REPLY'].includes(a.event_type);
      }

      return typeMatch;
    });

    const filteredOpportunities = (aiInsights?.opportunities || []).filter(opp => {
      const searchLower = dashboardSearchTerm.toLowerCase();
      return !dashboardSearchTerm || (opp.username || '').toLowerCase().includes(searchLower);
    });

    return (
      <>
        {/* Header */}
        <div className="mb-12 flex flex-col items-center justify-center text-center relative border-b border-gray-100 pb-10 w-full mx-auto">
          <div className="w-full flex flex-col items-center justify-center text-center space-y-4">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none text-center w-full">
              종합 대시보드
            </h1>
            <div className="flex items-center justify-center gap-3 text-center w-full">
              <p className="text-gray-500 font-bold text-sm text-center">실시간 현황 & AI 요약</p>
            </div>
          </div>


          <div className="absolute right-0 bottom-10 flex items-center gap-4 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
            <div className="text-right px-3 hidden md:block">
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Last Synced</div>
              <div className="text-xs font-black text-gray-900">{new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <Button
              variant="white"
              onClick={() => {
                if (isPremiumFeatureLocked) {
                  showPremiumLockToast('프리미엄 요금제로 연장해야 데이터를 동기화할 수 있습니다.');
                  return;
                }
                const cid = localStorage.getItem('customer_id');
                if (cid) {
                  loadDashboardStats(cid);
                  loadAiInsights(cid);
                  loadAutomationStats(cid);
                  loadActivities(cid);
                  loadConversations();
                  loadPageInsights(cid);
                  loadIgInsights(cid);
                  loadSubscriptionStatus();
                }
              }}
              className="rounded-xl bg-white border border-gray-200 text-gray-900 font-bold h-11 px-5 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm flex items-center gap-2 group"
            >
              <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 duration-500 ${igInsightsLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm">데이터 동기화</span>
            </Button>
          </div>
        </div>

        {/* Dashboard Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 bg-white/50 backdrop-blur-xl p-2 rounded-[2.5rem] border border-gray-100 shadow-sm sticky top-20 z-30">
          <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl w-full md:w-auto">
            {[
              { id: 'TOTAL', label: '종합 현황' },
              { id: 'ACTIVITY', label: '자동화 활동' },
              { id: 'OPPORTUNITY', label: '비즈니스 기회' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDashboardViewFilter(tab.id)}
                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${dashboardViewFilter === tab.id
                  ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 translate-y-[-1px]'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="계정명(username) 검색..."
              value={dashboardSearchTerm}
              onChange={(e) => setDashboardSearchTerm(e.target.value)}
              className="w-full pl-11 pr-5 py-3.5 bg-gray-50 border border-transparent rounded-[1.5rem] text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/20 outline-none transition-all placeholder:text-gray-300"
            />
            {dashboardSearchTerm && (
              <button
                onClick={() => setDashboardSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {/* Stats Cards (Bento Grid Style) */}
        {dashboardViewFilter === 'TOTAL' && !dashboardSearchTerm && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {statsCards.map((stat, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Subtle Gradient Background Blob */}
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity ${stat.changeType === 'positive' ? 'bg-emerald-400' : 'bg-indigo-400'}`}></div>

                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className={`${stat.noBg ? '' : `p-3.5 rounded-2xl ${stat.bgColor}`} group-hover:scale-110 transition-transform duration-300 flex justify-center items-center`}>
                    {stat.imageUrl ? (
                      <img src={stat.imageUrl} alt={stat.title} className={stat.imageClassName || "w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-sm"} />
                    ) : (
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    )}
                  </div>
                  <p className="text-right text-sm font-bold text-gray-400 tracking-wide uppercase text-[11px] pt-1">{stat.title}</p>
                </div>

                <div className="relative z-10">
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Insights & Activity Sections */}
        <div className="space-y-6 mb-8">


          {(dashboardViewFilter === 'TOTAL' || dashboardViewFilter === 'ACTIVITY') && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden mb-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  실시간 자동화 활동 ({filteredActivities.length})
                </h3>

                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl self-start sm:self-auto border border-gray-100">
                  {[
                    { id: 'ALL', label: '전체' },
                    { id: 'SCENARIO', label: '시나리오' },
                    { id: 'KEYWORD', label: '키워드' },
                    { id: 'AI', label: 'AI 응답' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActivityTypeFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${activityTypeFilter === cat.id
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 ml-auto sm:ml-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="아이디 또는 내용 검색..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-48 transition-all"
                    />
                    {activitySearchTerm && (
                      <button
                        onClick={() => setActivitySearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <Button
                    variant="white"
                    size="sm"
                    onClick={() => {
                      const storedCustomerId = localStorage.getItem('customer_id');
                      if (storedCustomerId) loadActivities(storedCustomerId);
                    }}
                    disabled={activitiesLoading}
                    className="rounded-xl bg-white border border-gray-200 text-gray-900 font-bold h-9 px-4 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm flex items-center gap-2 group"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${activitiesLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                    <span className="text-xs sm:inline hidden">새로고침</span>
                  </Button>
                </div>
              </div>

              {/* Timeline Stream Style */}
              <div className="relative">
                {/* Scrollable Container */}
                <div className="p-0 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {activitiesLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                      <Loader2 className="w-8 h-8 mb-2 animate-spin text-indigo-500" />
                      <p className="text-sm">활동 내역을 불러오는 중...</p>
                    </div>
                  ) : filteredActivities.length > 0 ? (
                    <div className="relative">
                      {/* Timeline connector line */}
                      <div className="absolute left-[2.25rem] top-8 bottom-8 w-px bg-gradient-to-b from-gray-200 via-gray-100 to-transparent"></div>

                      <div className="space-y-0">
                        {filteredActivities
                          .map((activity) => (
                            <div key={activity.id} className="relative p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6 group">
                              {/* Timeline Dot & Icon */}
                              <div className={`
                                relative z-10 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border-2 border-white ring-1 ring-gray-100
                                ${activity.event_type === 'AI_CHAT_REPLY' || activity.event_type === 'AI_COMMENT_REPLY' ? 'bg-indigo-50 text-indigo-600' :
                                  activity.event_type === 'FLOW_TRIGGER' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-blue-50 text-blue-600'}
                              `}>
                                {activity.event_type === 'AI_CHAT_REPLY' || activity.event_type === 'AI_COMMENT_REPLY' ? <Sparkles className="w-5 h-5" /> :
                                  activity.event_type === 'FLOW_TRIGGER' ? <Zap className="w-5 h-5" /> :
                                    <MessageSquareText className="w-5 h-5" />}
                              </div>

                              <div className="flex-1 min-w-0 pt-1">
                                <div className="flex justify-between items-start mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-gray-900">@{activity.contact_username || '고객'}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border-0 tracking-tight ${(activity.event_type === 'AI_CHAT_REPLY' || activity.event_type === 'AI_COMMENT_REPLY') ? 'bg-indigo-600 text-white' :
                                      activity.event_type === 'FLOW_TRIGGER' ? 'bg-emerald-500 text-white' :
                                        'bg-blue-500 text-white'
                                      }`}>
                                      {(activity.event_type === 'AI_CHAT_REPLY' || activity.event_type === 'AI_COMMENT_REPLY') ? 'AI RESPONSE' :
                                        activity.event_type === 'FLOW_TRIGGER' ? 'SCENARIO' :
                                          'KEYWORD REPLY'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-medium tabular-nums">{new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                    수신: <span className="text-gray-700 font-medium truncate">{safeString(activity.trigger_text) || '(내용 없음)'}</span>
                                  </p>
                                  <p className="text-sm font-bold text-indigo-600 flex items-start gap-1">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                    <span>{safeString(activity.action_text)}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-gray-50/30">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Clock className="w-8 h-8 mb-2 text-gray-200" />
                        <p className="text-sm">{dashboardSearchTerm ? '검색 결과가 없습니다.' : '아직 기록된 자동화 활동이 없습니다.'}</p>
                        <p className="text-xs mt-1">{dashboardSearchTerm ? '계정명을 다시 확인해 주세요.' : '인스타그램 대화가 발생하면 이곳에 타임라인으로 표시됩니다.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. Missed Business Opportunities (AI) */}
          {(dashboardViewFilter === 'TOTAL' || dashboardViewFilter === 'OPPORTUNITY') && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden mb-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

              <div className="relative z-10 flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="bg-gray-900 rounded-lg p-1.5">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">놓친 비즈니스 기회 ({filteredOpportunities.length})</h2>
                </div>
                <Button
                  variant="white"
                  size="sm"
                  onClick={() => { loadAiInsights(customerId); loadAutomationStats(customerId); }}
                  disabled={aiInsightsLoading}
                  className="rounded-xl bg-white border border-gray-200 text-gray-900 font-bold h-9 px-4 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm flex items-center gap-2 group"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${aiInsightsLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                  <span className="text-xs">새로고침</span>
                </Button>
              </div>

              {/* Smart Notification List Style */}
              <div className="relative min-h-[200px]">
                {aiInsightsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-sm text-indigo-600 font-bold animate-pulse">AI 분석 엔진 가동중...</p>
                  </div>
                ) : (
                  <>
                    {(aiInsights?.meta?.access_restricted || aiInsights?.upgrade_required) && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-amber-800 font-bold leading-tight">
                            이전 분석 결과 표시 중 (한도 초과)
                          </p>
                          <p className="text-[10px] text-amber-700/80 leading-tight">
                            {aiInsights?.meta?.reason || '새로운 인사이트를 보려면 요금제 상향이 필요합니다.'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] font-bold text-amber-700 hover:bg-amber-100 px-2"
                          onClick={() => setCurrentView('subscription')}
                        >
                          업그레이드
                        </Button>
                      </div>
                    )}

                    {filteredOpportunities.length > 0 ? (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredOpportunities.map((opp, idx) => {
                          const rawUsername = String(opp.username || '');
                          const validHandles = rawUsername.match(/[a-zA-Z0-9][\w.]{0,28}[a-zA-Z0-9\w]/g)?.filter(u => u.length <= 30 && u.length >= 1) || [];
                          const displayReason = opp.reason && !opp.reason.includes('{') ? opp.reason : null;

                          return (
                            <div key={idx} className={`flex items-center gap-4 bg-white rounded-2xl px-5 py-4 border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${opp.type === 'SALES' ? 'border-l-emerald-400' : opp.type === 'URGENT' ? 'border-l-rose-400' : 'border-l-indigo-400'}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider ${opp.type === 'SALES' ? 'bg-emerald-100 text-emerald-700' : opp.type === 'URGENT' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {opp.type === 'SALES' ? 'SALES' : opp.type === 'URGENT' ? 'URGENT' : 'VIP'}
                                  </span>
                                  {validHandles.length > 0 ? validHandles.map((u, i) => (<span key={i} className="font-bold text-gray-900 text-sm">@{u}</span>)) : <span className="font-bold text-gray-400 text-sm">알 수 없는 사용자</span>}
                                </div>
                                {displayReason && <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{displayReason}</p>}
                              </div>
                              <a href={`https://instagram.com/direct/t/${opp.thread_id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all">답장하기 <ArrowRight className="w-3 h-3" /></a>
                            </div>
                          );
                        })}
                      </div>
                    ) : (aiInsights?.error && !aiInsights?.meta?.access_restricted) ? (
                      <div className="py-20 text-center bg-red-50/30 rounded-[2rem] border border-dashed border-red-100">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-4">
                          <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">분석 오류</h3>
                        <p className="text-gray-600 max-w-xs mx-auto leading-relaxed text-sm whitespace-pre-wrap">{aiInsights?.error}</p>
                      </div>
                    ) : (
                      <div className="py-24 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-emerald-100 to-teal-50 mb-6 shadow-inner ring-4 ring-white">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">{dashboardSearchTerm ? '검색 결과가 없습니다' : '모든 기회를 잡았습니다!'}</h3>
                        <p className="text-gray-500 max-w-xs mx-auto leading-relaxed font-medium">
                          {dashboardSearchTerm ? '계정명을 다시 확인해 주세요.' : '현재 놓치고 있는 중요한 대화가 없습니다.\n새로운 알림이 오면 이곳에 스마트 카드로 표시됩니다.'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderSubscription = () => {
    return (
      <div className="w-full">
        <Subscription
          customerId={customerId}
          subscriptionStatus={subscriptionStatus}
          showNotify={showNotify}
        />
      </div>
    );
  };




  // Render Insights View (Account Status + Insights)
  const renderInsights = () => {
    // Calculate simple engagement metrics
    const recentPosts = igInsights?.recent_media || [];
    const totalLikes = recentPosts.reduce((acc, post) => acc + (post.like_count || 0), 0);
    const totalComments = recentPosts.reduce((acc, post) => acc + (post.comments_count || 0), 0);
    const avgEngagement = recentPosts.length > 0 ? Math.round((totalLikes + totalComments) / recentPosts.length) : 0;
    const totalReach = recentPosts.reduce((acc, post) => acc + (post.reach || 0), 0);
    const avgReach = recentPosts.length > 0 ? Math.round(totalReach / recentPosts.length) : 0;

    // Determine account health status
    const isHealthy = customerStatus?.integration_status === 'APPROVED' && !webhookStatus?.error;

    return (
      <>
        <div className="mb-12 relative w-full flex flex-col items-center justify-center text-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
              서비스 인사이트
            </h1>
            <p className="text-sm text-gray-500 font-medium whitespace-pre-wrap">계정의 주요 성과와 성장 지표를 확인합니다.</p>
          </div>
          <div className="mt-6 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium"
              onClick={async () => {
                if (isPremiumFeatureLocked) {
                  showPremiumLockToast('프리미엄 요금제로 연장해야 지표를 새로고침할 수 있습니다.');
                  return;
                }
                await loadIgInsights(customerId);
                loadPerformanceReport(customerId, true); // Force refresh AI report
                showNotify('지표를 새로고침합니다...', 'info');
              }}
            >
              <Loader2 className={`w-3.5 h-3.5 mr-2 ${igInsightsLoading || performanceReportLoading ? 'animate-spin' : ''}`} />
              지표 새로고침
            </Button>
          </div>
        </div>

        {/* Automation Performance Hero (New) */}
        {!automationStatsLoading && automationStats && (automationStats.total_activities > 0) && (
          <div className="mb-8">
            <Card className="rounded-[2rem] border border-indigo-50 shadow-lg bg-gradient-to-br from-white via-white to-indigo-50/50 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Bot className="w-48 h-48 text-indigo-600 font-bold" />
              </div>
              <CardContent className="p-8 relative z-10">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold text-indigo-900 flex items-center justify-center md:justify-start gap-2 mb-2">
                      <Clock className="w-6 h-6 text-indigo-600" />
                      AI가 고객님을 위해 절약한 시간
                    </h3>
                    <div className="text-5xl font-black text-indigo-600 tracking-tighter my-4">
                      {Math.floor((automationStats.time_saved_minutes || 0) / 60) > 0 ? `${Math.floor((automationStats.time_saved_minutes || 0) / 60)}시간 ` : ''}
                      {Math.floor((automationStats.time_saved_minutes || 0) % 60)}분
                    </div>
                    <p className="text-indigo-800 font-medium whitespace-pre-wrap">
                      최근 30일 동안 총 <span className="font-bold text-indigo-900 border-b-2 border-indigo-300">{automationStats.total_activities}건</span>의 고객 문의를 자동으로 처리했습니다.
                    </p>
                  </div>

                  <div className="flex-1 w-full bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col gap-4">
                    <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-2">주요 활성 채널</h4>
                    {(automationStats.event_distribution || []).slice(0, 3).map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-gray-700">
                            {item.type === 'AI_CHAT_REPLY' ? 'AI 자동 상담' :
                              (item.type === 'STORY_REPLY' || item.type === 'MENTION_REPLY') ? '스토리 멘션 응대' :
                                item.type === 'COMMENT_REPLY' ? '댓글 자동 DM' :
                                  item.type === 'DM_REPLY' ? 'DM 기본형 응대' :
                                    item.type === 'KEYWORD_REPLY' ? '키워드 자동답장' :
                                      item.type === 'FLOW_TRIGGER' ? '시나리오 챗봇' : item.type}
                          </span>
                          <span className="text-indigo-700">{item.count}건</span>
                        </div>
                        <div className="w-full bg-indigo-100/50 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min((item.count / automationStats.total_activities) * 100, 100)}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(automationStats.intent_distribution || []).length > 0 && (
                    <div className="flex-1 w-full bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-indigo-100 shadow-sm">
                      <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4">고객 관심사 분석 (Top 3)</h4>
                      <div className="flex flex-col gap-3">
                        {(automationStats.intent_distribution || []).slice(0, 3).map((intent, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-600'}`}>
                              {idx + 1}
                            </div>
                            <span className="text-sm font-medium text-gray-800 truncate flex-1">{intent.intent}</span>
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">{intent.count}건</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 1. Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Followers */}
          <div className="group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-400 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="group-hover:scale-110 transition-transform duration-300 flex justify-center items-center">
                <img src="/assets/instagram-logo.svg" alt="Instagram" className="w-[52px] h-[52px] object-contain drop-shadow-sm" />
              </div>
              <p className="text-right text-[11px] font-bold text-gray-400 tracking-wide uppercase pt-1">총 팔로워</p>
            </div>
            <div className="relative z-10">
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                  {safeString((customerStatus?.instagram_account?.follows_count ?? igInsights?.follows_count)?.toLocaleString()) || '-'}
                </h3>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
            </div>
          </div>

          {/* Avg Engagement */}
          <div className="group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-rose-400 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="p-3.5 rounded-2xl bg-white border border-gray-100 drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Heart className="w-6 h-6 text-rose-600" />
              </div>
              <p className="text-right text-[11px] font-bold text-gray-400 tracking-wide uppercase pt-1">평균 참여도</p>
            </div>
            <div className="relative z-10">
              <div className="flex items-baseline gap-1 mb-3">
                <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                  {avgEngagement.toLocaleString()}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 font-bold">
                <span className="flex items-center gap-1.5" title="Average Likes">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-50" />
                  <span>좋아요 {Math.round(totalLikes / (recentPosts.length || 1))}</span>
                </span>
                <span className="w-px h-3 bg-gray-200"></span>
                <span className="flex items-center gap-1.5" title="Average Comments">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
                  <span>댓글 {Math.round(totalComments / (recentPosts.length || 1))}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Total Media */}
          <div className="group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-indigo-400 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="p-3.5 rounded-2xl bg-white border border-gray-100 drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                <ImageIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="text-right text-[11px] font-bold text-gray-400 tracking-wide uppercase pt-1">총 미디어</p>
            </div>
            <div className="relative z-10">
              <h3 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">
                {safeString((customerStatus?.instagram_account?.media_count ?? igInsights?.media_count)?.toLocaleString()) || '-'}
              </h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                최근 게시물 {recentPosts.length}개 기준
              </p>
            </div>
          </div>
        </div>
        {/* 2. AI Strategy Report Section */}
        <div className="mb-8">
          <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden relative">


            <CardHeader className="border-b border-indigo-100/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                  AI 콘텐츠 마케팅 전략
                </CardTitle>
                <Badge variant="outline" className="bg-indigo-600 text-white border-none px-3 py-1 animate-pulse">
                  AI 분석 리포트
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              {performanceReportLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h4 className="text-lg font-bold text-indigo-900 mb-1">AI가 데이터를 분석 중입니다</h4>
                  <p className="text-sm text-indigo-600/70">최근 게시물의 성과를 바탕으로 최적의 전략을 도출하고 있습니다...</p>
                </div>
              ) : performanceReport?.error ? (
                <div className="py-12 text-center bg-white/50 rounded-2xl border border-dashed border-indigo-200">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-indigo-600 font-bold mb-1">AI 분석 리포트 중단</p>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto whitespace-pre-wrap">
                    {performanceReport.error}
                  </p>
                  <Button
                    variant="link"
                    className="mt-2 text-indigo-600 font-bold text-xs"
                    onClick={() => setCurrentView('subscription')}
                  >
                    내 요금제 한도 확인
                  </Button>
                </div>
              ) : performanceReport ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Stale Warning Banner for Performance Report */}
                  {(performanceReport?.stale || performanceReport?.access_restricted) && (
                    <div className="lg:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-sm mb-2">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-amber-900">이전 분석 리포트 표시 중 (한도 초과)</p>
                          <p className="text-xs text-amber-600/70 font-medium">{performanceReport.upgrade_message || '새로고침하려면 요금제 업그레이드가 필요합니다.'}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-amber-200 text-amber-600 font-bold bg-white hover:bg-amber-50"
                        onClick={() => setCurrentView('subscription')}
                      >
                        업그레이드
                      </Button>
                    </div>
                  )}

                  {/* Left: Summary & Best Post */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">성과 요약</h4>
                      <p className="text-xl font-bold text-gray-900 leading-tight">
                        {safeString(performanceReport.summary)}
                      </p>
                      <p className="mt-4 text-gray-600 leading-relaxed">
                        {safeString(performanceReport.analysis)}
                      </p>
                    </div>

                    {performanceReport.best_post && (
                      <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-indigo-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">🏆 Best Post</Badge>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mb-2 truncate italic">
                          "{safeString(performanceReport.best_post.caption)}"
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                          {safeString(performanceReport.best_post.reason)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Strategy Roadmap */}
                  <div className="bg-indigo-900/5 p-6 rounded-3xl border border-indigo-100/50">
                    <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                      향후 제언 및 전략
                    </h4>
                    <div className="space-y-4">
                      {performanceReport.strategy?.map((s, idx) => (
                        <div key={idx} className="flex gap-4 group">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 leading-relaxed group-hover:text-indigo-900 transition-colors">
                              {s.replace(/\*\*/g, '').replace(/^[\d\s\.]+/g, '').trim()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center bg-white/50 rounded-xl border border-dashed border-indigo-200">
                  <p className="text-indigo-600 font-medium">상단의 '지표 새로고침'을 눌러 AI 분석 리포트를 생성해 보세요!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 mb-8">
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="border-b border-gray-100 py-5 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  최근 게시물 성과
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-900"
                  onClick={() => {
                    if (isPremiumFeatureLocked) {
                      showPremiumLockToast('프리미엄 요금제로 연장해야 지표를 업데이트할 수 있습니다.');
                      return;
                    }
                    loadIgInsights(customerId);
                  }}
                  disabled={igInsightsLoading}
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  {igInsightsLoading ? '업데이트 중...' : '최근 업데이트'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {igInsightsLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : recentPosts.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentPosts.map((post, idx) => {
                    // Calculate max relative to this batch for bar width
                    const maxEngagement = Math.max(...recentPosts.map(p => (p.like_count || 0) + (p.comments_count || 0)));
                    const currentEngagement = (post.like_count || 0) + (post.comments_count || 0);
                    const widthPercent = maxEngagement > 0 ? (currentEngagement / maxEngagement) * 100 : 0;

                    return (
                      <div key={idx} className="p-4 px-6 hover:bg-gray-50/50 transition-colors flex items-center gap-6 group">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          {post.thumbnail_url || post.media_url ? (
                            <img src={post.thumbnail_url || post.media_url} alt="Post" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-8 items-center">
                          {/* Caption & Date */}
                          <div className="col-span-12 md:col-span-5">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors mb-1">
                              {post.message || post.caption || '캡션 없음'}
                            </p>
                            <p className="text-[11px] text-gray-500 font-semibold font-mono">
                              {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : '날짜 정보 없음'}
                            </p>
                          </div>

                          {/* Metrics */}
                          <div className="col-span-12 md:col-span-4 flex items-center gap-6">
                            <div className="flex items-center gap-2 min-w-[60px]">
                              <Heart className="w-4 h-4 text-gray-400 group-hover:text-rose-500 transition-colors" />
                              <span className="text-sm font-medium text-gray-700">{post.like_count}</span>
                            </div>
                            <div className="flex items-center gap-2 min-w-[60px]">
                              <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                              <span className="text-sm font-medium text-gray-700">{post.comments_count}</span>
                            </div>
                            <div className="flex items-center gap-2 min-w-[70px] border-l border-gray-100 pl-4 ml-2">
                              <Users className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                              <span className="text-sm font-medium text-gray-700">{post.reach?.toLocaleString() || 0}</span>
                            </div>
                          </div>

                          {/* Engagement Bar */}
                          <div className="col-span-12 md:col-span-3 hidden md:block">
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-[10px] text-gray-400 font-bold w-12 text-right">
                                {post.reach > 0
                                  ? Math.min((currentEngagement / post.reach) * 100, 100).toFixed(1) + '%'
                                  : (igInsights?.followers_count > 0
                                    ? Math.min((currentEngagement / igInsights.followers_count) * 100, 100).toFixed(1) + '%'
                                    : '0.0%')}
                              </span>
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                                <div
                                  className="h-full bg-indigo-500 rounded-full opacity-80"
                                  style={{
                                    width: `${Math.min(
                                      post.reach > 0
                                        ? (currentEngagement / post.reach) * 100
                                        : (igInsights?.followers_count > 0
                                          ? (currentEngagement / igInsights.followers_count) * 100
                                          : 0),
                                      100
                                    )}%`
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">Reach ER</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
                    <BarChart3 className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500">분석할 최근 게시물이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  // --- AI Clean Guard (Moderation) UI Components ---
  const renderPostAnalysis = () => {
    if (!postAnalysisResult) return null;

    const allDetectedComments = postAnalysisResult.comments.filter(c =>
      ['TOXIC', 'SPAM', 'COMPLAINT'].includes(c?.analysis?.category)
    );

    const filteredComments = allDetectedComments.filter(c =>
      moderationSubFilter === 'ALL' || c?.analysis?.category === moderationSubFilter
    );

    const counts = {
      ALL: allDetectedComments.length,
      TOXIC: allDetectedComments.filter(c => c?.analysis?.category === 'TOXIC').length,
      SPAM: allDetectedComments.filter(c => c?.analysis?.category === 'SPAM').length,
      COMPLAINT: allDetectedComments.filter(c => c?.analysis?.category === 'COMPLAINT').length,
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header with Back Button and Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 backdrop-blur-sm p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedPost(null);
                setPostAnalysisResult(null);
                setIsSelectionMode(false);
                setSelectedCommentIds(new Set());
              }}
              className="rounded-2xl hover:bg-white hover:shadow-md transition-all h-12 w-12"
            >
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </Button>
            <div>
              <h3 className="text-xl font-black text-gray-900 leading-tight">게시물 분석 결과</h3>
              <p className="text-sm text-gray-500 font-bold">
                {moderationSubFilter === 'ALL' ? '탐지된 모든 댓글' :
                  moderationSubFilter === 'TOXIC' ? '탐지된 악플' :
                    moderationSubFilter === 'SPAM' ? '탐지된 스팸' : '탐지된 불만'} ({counts[moderationSubFilter]}개)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedCommentIds(new Set());
              }}
              className={`h-11 px-6 rounded-2xl font-bold text-sm transition-all ${isSelectionMode ? 'bg-indigo-600 text-white border-none shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'}`}
            >
              {isSelectionMode ? '선택 취소' : '선택 삭제'}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const ids = filteredComments.map(c => c.id);
                if (ids.length > 0) {
                  setModerationActionType('HIDE');
                  setIdsToConfirmDelete(ids);
                  setShowDeleteConfirmModal(true);
                }
              }}
              disabled={filteredComments.length === 0 || isSelectionMode}
              className="h-11 px-6 rounded-2xl font-bold text-sm bg-white border-gray-100 text-gray-600 hover:border-gray-300 transition-all disabled:opacity-30"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              {moderationSubFilter === 'ALL' ? '전체 숨김' :
                moderationSubFilter === 'TOXIC' ? '악플 전체 숨김' :
                  moderationSubFilter === 'SPAM' ? '스팸 전체 숨김' : '불만 전체 숨김'}
            </Button>

            <Button
              onClick={() => {
                const ids = filteredComments.map(c => c.id);
                if (ids.length > 0) {
                  setModerationActionType('DELETE');
                  setIdsToConfirmDelete(ids);
                  setShowDeleteConfirmModal(true);
                }
              }}
              disabled={filteredComments.length === 0 || isSelectionMode}
              className="bg-red-600 text-white hover:bg-red-700 h-11 px-6 rounded-2xl font-black text-sm shadow-lg shadow-red-100 border-none transition-all disabled:opacity-30 disabled:grayscale"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {moderationSubFilter === 'ALL' ? '전체 삭제' :
                moderationSubFilter === 'TOXIC' ? '악플 전체 삭제' :
                  moderationSubFilter === 'SPAM' ? '스팸 전체 삭제' : '불만 전체 삭제'}
            </Button>
          </div>
        </div>

        {/* Selection Actions Bar (Appears when items are selected) */}
        {isSelectionMode && selectedCommentIds.size > 0 && (
          <div className="flex items-center justify-between gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
            <span className="text-sm font-black text-indigo-900 ml-2">
              {selectedCommentIds.size}개의 댓글 선택됨
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setModerationActionType('HIDE');
                  setIdsToConfirmDelete(Array.from(selectedCommentIds));
                  setShowDeleteConfirmModal(true);
                }}
                className="bg-white border-indigo-200 text-indigo-600 h-10 px-4 rounded-xl font-bold text-sm"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                선택 숨김
              </Button>
              <Button
                onClick={() => {
                  setModerationActionType('DELETE');
                  setIdsToConfirmDelete(Array.from(selectedCommentIds));
                  setShowDeleteConfirmModal(true);
                }}
                className="bg-red-500 text-white hover:bg-red-600 h-10 px-4 rounded-xl font-bold text-sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                선택 삭제
              </Button>
            </div>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 p-1 bg-gray-100/50 rounded-2xl w-fit">
          {[
            { id: 'ALL', label: '전체' },
            { id: 'TOXIC', label: '악플' },
            { id: 'SPAM', label: '스팸' },
            { id: 'COMPLAINT', label: '불만' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setModerationSubFilter(tab.id);
                setIsSelectionMode(false);
                setSelectedCommentIds(new Set());
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${moderationSubFilter === tab.id
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${moderationSubFilter === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Comment List */}
        {filteredComments.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredComments.map((comment, idx) => (
              <div
                key={comment.id}
                onClick={() => {
                  if (isSelectionMode) {
                    const newSet = new Set(selectedCommentIds);
                    if (newSet.has(comment.id)) {
                      newSet.delete(comment.id);
                    } else {
                      newSet.add(comment.id);
                    }
                    setSelectedCommentIds(newSet);
                  }
                }}
                className={`group p-5 bg-white rounded-2xl border ${isSelectionMode && selectedCommentIds.has(comment.id) ? 'border-indigo-200 bg-indigo-50/20 shadow-md' : 'border-gray-100 hover:border-gray-300 hover:shadow-lg'} transition-all duration-300 flex gap-4 items-start ${isSelectionMode ? 'cursor-pointer' : ''}`}
              >
                {isSelectionMode && (
                  <div className="pt-1">
                    {selectedCommentIds.has(comment.id) ? (
                      <CheckCircle2 className="w-5 h-5 text-indigo-600 animate-in zoom-in-50 duration-200" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-200 group-hover:text-gray-300" />
                    )}
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900 text-sm">{comment.username}</span>
                    <Badge className={`${comment?.analysis?.category === 'SPAM' ? 'bg-orange-100 text-orange-600' :
                      comment?.analysis?.category === 'COMPLAINT' ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      } border-none rounded-full px-2.5 py-0.5 text-[10px] font-black`}>
                      {comment?.analysis?.category === 'SPAM' ? '스팸' : comment?.analysis?.category === 'COMPLAINT' ? '불만' : '악플'}
                    </Badge>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-gray-700 text-sm font-medium leading-relaxed break-all">
                      {comment.text}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400 pl-1">
                    {new Date(comment.timestamp).toLocaleString()}
                  </p>
                </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModerationActionType('HIDE');
                        setIdsToConfirmDelete([comment.id]);
                        setShowDeleteConfirmModal(true);
                      }}
                      className="text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all h-9 w-9"
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModerationActionType('DELETE');
                        setIdsToConfirmDelete([comment.id]);
                        setShowDeleteConfirmModal(true);
                      }}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all h-9 w-9"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <div className="text-center space-y-2">
              <p className="text-gray-400 font-medium">이 카테고리에는 탐지된 댓글이 없습니다.</p>
              <Button variant="link" onClick={() => setModerationSubFilter('ALL')} className="text-indigo-600 font-bold">
                전체 댓글 보기
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderComments = () => {
    const recentPosts = igInsights?.recent_media || [];

    // Shared header for all states in this tab
    const mainHeader = (
      <div className="mb-12 w-full relative">
        {analysisSelectedPostId && (
          <Button
            variant="ghost"
            onClick={() => setAnalysisSelectedPostId(null)}
            className="md:absolute left-0 top-0 mb-4 md:mb-0 hover:bg-gray-100 text-gray-600 font-bold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
        )}
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
            댓글 분석 요약
          </h1>
          <p className="text-gray-500 font-bold">인스타그램 게시물의 댓글 반응을 AI가 실시간으로 분석합니다.</p>
        </div>
      </div>
    );

    let content = null;

    // 1. Loading State (Initial Fetching - NEW TABLE SKELETON)
    if (igInsightsLoading && recentPosts.length === 0) {
      content = (
        <div className="w-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">썸네일</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">캡션</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">게시 날짜 및 시간</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">좋아요</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">댓글</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">저장됨</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">공유</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">도달</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">조회수</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">반응</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">참여율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="w-12 h-12 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-100 rounded-full w-32"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-100 rounded-full w-24"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-10 mx-auto"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-10 mx-auto"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-10 mx-auto"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-10 mx-auto"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-16 mx-auto"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-16 mx-auto"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-6 bg-gray-100 rounded-full w-12 mx-auto"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-6 bg-gray-100 rounded-md w-16 mx-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    // 2. Empty State (No posts found)
    else if (!igInsightsLoading && recentPosts.length === 0) {
      content = (
        <div className="flex flex-col items-center justify-center py-40 bg-gray-50/30 rounded-[3rem] border-2 border-dashed border-gray-100/50">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
            <ImageIcon className="w-10 h-10 text-gray-200" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">게시물이 없습니다</h2>
          <p className="text-gray-500 font-bold">분석할 인스타그램 게시물이 아직 생성되지 않았습니다.</p>
          <Button
            onClick={() => {
              if (isPremiumFeatureLocked) {
                showPremiumLockToast('프리미엄 요금제로 연장해야 데이터를 업데이트할 수 있습니다.');
                return;
              }
              loadIgInsights(customerId);
            }}
            variant="outline"
            className="mt-6 rounded-2xl font-bold border-gray-200 hover:bg-gray-50 h-12 px-8"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      );
    }
    // 3. Selection Mode (Post List - NEW TABLE VIEW)
    else if (!analysisSelectedPostId) {
      content = (
        <div className="w-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">썸네일</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">캡션</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">게시 날짜 및 시간</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">좋아요</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">댓글</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">저장됨</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">공유</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">도달</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">조회수</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">반응</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">참여율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentPosts.map((post) => {
                  const reach = post.reach || post.impressions || 1; // Avoid division by zero
                  const engagement = (post.like_count || 0) + (post.comments_count || 0) + (post.share_count || 0) + (post.save_count || 0);
                  const engagementRate = Math.min((engagement / reach) * 100, 100).toFixed(2) + '%';

                  return (
                    <tr
                      key={post.id}
                      className="hover:bg-purple-50/30 cursor-pointer transition-colors group"
                      onClick={() => analyzePost(post.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                          {post.thumbnail_url || post.media_url ? (
                            <img
                              src={post.thumbnail_url || post.media_url}
                              alt="thumbnail"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <ImageIcon className="w-full h-full p-3 text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900 line-clamp-1 max-w-[250px]">
                          {post.message || post.caption || '(캡션 없음)'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[13px] text-gray-500 font-medium whitespace-nowrap">
                          {post.timestamp ? new Date(post.timestamp).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[13px] font-bold text-gray-900 flex items-center justify-center gap-1 whitespace-nowrap">
                          <Heart className="w-3 h-3 fill-gray-900 text-gray-900" />
                          {post.like_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[13px] font-bold text-gray-900 flex items-center justify-center gap-1 whitespace-nowrap">
                          <MessageSquare className="w-3 h-3 fill-gray-900 text-gray-900" />
                          {post.comments_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[13px] font-bold text-gray-900 flex items-center justify-center gap-1 whitespace-nowrap">
                          <Bookmark className="w-3 h-3 fill-gray-900 text-gray-900" />
                          {post.save_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[13px] font-bold text-gray-900 flex items-center justify-center gap-1 whitespace-nowrap">
                          <Share2 className="w-3 h-3 fill-gray-900 text-gray-900" />
                          {post.share_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-bold text-gray-700 whitespace-nowrap text-center">{post.reach || 0}</td>
                      <td className="px-6 py-4 text-[13px] font-bold text-gray-700 whitespace-nowrap text-center">{post.view_count || post.plays || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-[12px] font-black border border-purple-100 whitespace-nowrap">
                          {engagement}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-[13px] font-black text-gray-900 bg-gray-50 px-2 py-1 rounded-md whitespace-nowrap">
                          {engagementRate}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    // 4. Loading Individual Analysis
    else if (analysisLoading) {
      content = (
        <Card className="max-w-3xl mx-auto mt-12 border-none shadow-none bg-transparent">
          <CardContent className="text-center p-12">
            <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
              <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-white rounded-full p-6 shadow-xl">
                <Sparkles className="w-10 h-10 text-purple-600 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI가 댓글을 분석 중입니다
            </h2>
            <p className="text-gray-500 font-bold">
              댓글의 감정, 긴급도, 주요 이슈를 파악하고 요약하고 있습니다...
            </p>
          </CardContent>
        </Card>
      );
    }
    // 5. Analysis Results
    else if (analysisResult) {
      const { post, analysis, comments } = analysisResult;
      if (analysisResult.error) {
        content = (
          <div className="p-12 bg-gray-50 rounded-[2.5rem] flex flex-col items-start text-left">
            <p className="text-red-500 mb-4 font-bold">{analysisResult.error}</p>
          </div>
        );
      } else {
        const cats = analysis?.categories || {};
        const totalAnalyzed = comments?.length || 0;
        content = (
          <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            <Card className="mb-8 border border-gray-100 bg-white shadow-sm overflow-hidden rounded-[2.5rem]">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-80 bg-gray-50/30 p-6 flex flex-col justify-center items-center md:border-r border-gray-100">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 shadow-sm bg-gray-100 relative group/carousel">
                    {post?.media_url ? (
                      <>
                        {/* Media Display */}
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                          {post.children?.data?.length > 0 ? (
                            <img
                              src={post.children.data[analysisMediaIndex]?.thumbnail_url || post.children.data[analysisMediaIndex]?.media_url || post.thumbnail_url || post.media_url}
                              onError={(e) => { e.target.src = '/assets/instagram-logo.svg'; e.target.className = 'w-12 h-12 opacity-20 object-contain'; }}
                              alt={`Post content ${analysisMediaIndex + 1}`}
                              className="w-full h-full object-cover transition-all duration-500"
                            />
                          ) : (
                            <img
                              src={post.thumbnail_url || post.media_url || '/assets/instagram-logo.svg'}
                              onError={(e) => { e.target.src = '/assets/instagram-logo.svg'; e.target.className = 'w-12 h-12 opacity-20 object-contain'; }}
                              alt="Post content"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Navigation Controls */}
                        {post.children?.data?.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnalysisMediaIndex(prev => (prev === 0 ? post.children.data.length - 1 : prev - 1));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnalysisMediaIndex(prev => (prev === post.children.data.length - 1 ? 0 : prev + 1));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>

                            {/* Indicators */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/10 backdrop-blur-sm">
                              {post.children.data.map((_, idx) => (
                                <div
                                  key={idx}
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${idx === analysisMediaIndex ? 'bg-white w-3' : 'bg-white/50'
                                    }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-gray-300" /></div>
                    )}
                  </div>
                  <div className="text-center w-full">
                    <div className="flex items-center justify-center gap-3.5 mb-4 py-2 border-b border-gray-50">
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <Heart className="w-4 h-4 text-gray-900 fill-gray-900" />
                        <span className="text-sm font-bold">{post?.like_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <MessageSquare className="w-4 h-4 text-gray-900 fill-gray-900" />
                        <span className="text-sm font-bold">{post?.comments_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <Share2 className="w-4 h-4 text-gray-900 fill-gray-900" />
                        <span className="text-sm font-bold">{post?.share_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <Bookmark className="w-4 h-4 text-gray-900 fill-gray-900" />
                        <span className="text-sm font-bold">{post?.save_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <Eye className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-bold">{post?.view_count || post?.impressions || post?.reach || 0}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(post?.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex-1 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-black text-gray-900 uppercase">
                        AI 분석 리포트
                      </h2>
                      <button
                        onClick={() => analyzePost(post.id, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm"
                        title="분석 결과 최신화"
                      >
                        <RefreshCw className={`w-3 h-3 ${analysisLoading ? 'animate-spin text-indigo-500' : ''}`} />
                        다시 분석
                      </button>
                    </div>
                    {analysis?.dominant_sentiment && (
                      <Badge className={`text-[10px] font-black px-3 py-1 rounded-full border-none shadow-sm ${analysis.dominant_sentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' :
                        analysis.dominant_sentiment === 'NEGATIVE' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                        {analysis.dominant_sentiment === 'POSITIVE' ? '긍정적 여론' :
                          analysis.dominant_sentiment === 'NEGATIVE' ? '부정적 여론' : '중립적 여론'}
                      </Badge>
                    )}
                  </div>

                  <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 mb-8">
                    <p className="text-gray-700 text-base leading-relaxed font-bold">
                      {analysis?.summary || '요약 정보를 생성하지 못했습니다.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { k: 'PRAISE', label: '칭찬', color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-100', icon: ThumbsUp, blob: 'bg-pink-400' },
                      { k: 'COMPLAINT', label: '불만', color: 'text-red-600', bgColor: 'bg-red-50 border-red-100', icon: ThumbsDown, blob: 'bg-red-400' },
                      { k: 'QUESTION', label: '문의', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-100', icon: HelpCircle, blob: 'bg-blue-400' },
                      { k: 'FEEDBACK', label: '피드백', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-100', icon: Lightbulb, blob: 'bg-amber-400' },
                      { k: 'NEUTRAL', label: '일반', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-100', icon: Meh, blob: 'bg-gray-400' },
                    ].map(cat => (
                      <div key={cat.k} className="group relative bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-28 flex flex-col justify-between">
                        <div className={`absolute -right-4 -top-4 w-12 h-12 rounded-full opacity-5 blur-xl group-hover:opacity-10 transition-opacity ${cat.blob}`}></div>
                        <div className="flex items-start justify-between relative z-10">
                          <div className={`p-2 rounded-lg ${cat.bgColor}`}>
                            <cat.icon className={`w-4 h-4 ${cat.color}`} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat.label}</span>
                        </div>
                        <div className="relative z-10">
                          <span className="text-2xl font-black text-gray-900">{cats[cat.k?.toLowerCase()] || cats[cat.k] || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 shrink-0">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
                상세 댓글 분석 ({comments.filter(c => {
                  const catMatch = analysisFilterCategory === 'ALL' || (c.analysis?.category || 'NEUTRAL').toUpperCase() === analysisFilterCategory;
                  const searchLower = analysisSearchTerm.toLowerCase();
                  const searchMatch = !analysisSearchTerm ||
                    (c.text || '').toLowerCase().includes(searchLower) ||
                    (c.username || '').toLowerCase().includes(searchLower);
                  return catMatch && searchMatch;
                }).length})
              </h3>

              <div className="flex flex-col sm:flex-row gap-3 items-center flex-1 justify-end">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="댓글 또는 계정 검색..."
                    value={analysisSearchTerm}
                    onChange={(e) => setAnalysisSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold placeholder:text-gray-300 shadow-sm"
                  />
                  {analysisSearchTerm && (
                    <button
                      onClick={() => setAnalysisSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar shadow-inner">
                  {[
                    { id: 'ALL', label: '전체' },
                    { id: 'PRAISE', label: '칭찬' },
                    { id: 'COMPLAINT', label: '불만' },
                    { id: 'QUESTION', label: '문의' },
                    { id: 'FEEDBACK', label: '피드백' },
                    { id: 'NEUTRAL', label: '일반' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setAnalysisFilterCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${analysisFilterCategory === cat.id
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(() => {
                const filtered = comments.filter(c => {
                  const catMatch = analysisFilterCategory === 'ALL' || (c.analysis?.category || 'NEUTRAL').toUpperCase() === analysisFilterCategory;
                  const searchLower = analysisSearchTerm.toLowerCase();
                  const searchMatch = !analysisSearchTerm ||
                    (c.text || '').toLowerCase().includes(searchLower) ||
                    (c.username || '').toLowerCase().includes(searchLower);
                  return catMatch && searchMatch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200/50 mt-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <MessageSquare className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="text-gray-500 font-black text-lg">해당하는 댓글이 없습니다</p>
                      <p className="text-gray-400 text-sm font-bold mt-1 text-center">검색어나 필터를 변경하거나<br />다시 확인해 보세요.</p>
                      {(analysisSearchTerm || analysisFilterCategory !== 'ALL') && (
                        <Button
                          variant="ghost"
                          className="mt-6 text-indigo-600 font-black hover:bg-indigo-50 rounded-xl h-11 px-6 border border-indigo-100"
                          onClick={() => {
                            setAnalysisFilterCategory('ALL');
                            setAnalysisSearchTerm('');
                          }}
                        >
                          필터 초기화
                        </Button>
                      )}
                    </div>
                  );
                }

                return filtered.map((c) => {
                  const commentAnalysis = c.analysis || {};
                  return (
                    <Card key={c.id} className={`hover:shadow-lg transition-all duration-300 border-l-4 rounded-2xl ${commentAnalysis.urgency === 'HIGH' ? 'border-l-red-500 bg-red-50/30' : 'border-l-gray-300 bg-white'}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-xl border flex-shrink-0 shadow-sm ${commentAnalysis.category === 'PRAISE' ? 'bg-pink-50 border-pink-100 text-pink-600' :
                            commentAnalysis.category === 'COMPLAINT' ? 'bg-red-50 border-red-100 text-red-600' :
                              commentAnalysis.category === 'QUESTION' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                commentAnalysis.category === 'FEEDBACK' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                  'bg-gray-50 border-gray-100 text-gray-400'
                            }`}>
                            {commentAnalysis.category === 'PRAISE' ? <ThumbsUp className="w-5 h-5" /> :
                              commentAnalysis.category === 'COMPLAINT' ? <ThumbsDown className="w-5 h-5" /> :
                                commentAnalysis.category === 'QUESTION' ? <HelpCircle className="w-5 h-5" /> :
                                  commentAnalysis.category === 'FEEDBACK' ? <Lightbulb className="w-5 h-5" /> :
                                    <Meh className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-gray-900">@{c.username || '익명'}</span>
                                <span className="text-[10px] text-gray-400 font-bold">{new Date(c.timestamp).toLocaleDateString()}</span>
                              </div>
                              <div className="flex gap-2">
                                {commentAnalysis.urgency === 'HIGH' && <Badge className="bg-red-500 text-white animate-pulse border-none rounded-full px-3 py-0.5 text-[10px] font-black">긴급</Badge>}
                                {commentAnalysis.category === 'question' && <Badge className="bg-indigo-600 text-white border-none rounded-full px-3 py-0.5 text-[10px] font-black">답변 필요</Badge>}
                              </div>
                            </div>
                            <p className="text-gray-700 mb-3 text-sm font-bold leading-relaxed">{c.text}</p>
                            <div className="bg-gray-50/80 rounded-xl p-3 text-xs border border-gray-100 flex items-start gap-2 shadow-inner">
                              <Sparkles className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                              <p className="text-gray-600 font-medium"><strong className="text-purple-700 mr-2">AI Insight</strong> {commentAnalysis.summary || '상세 분석을 생성하지 못했습니다.'}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="animate-in fade-in duration-500">
        {mainHeader}
        {content}
      </div>
    );
  };



  const renderAiGuard = () => {
    if (selectedPost) {
      return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          {isPostAnalyzing ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in duration-700">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
                <Bot className="absolute inset-0 m-auto w-10 h-10 text-indigo-600 animate-pulse" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">AI 정밀 분석 중</h3>
                <p className="text-gray-500 font-bold text-lg">
                  댓글의 유해성을 판단하고 있습니다...
                </p>
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          ) : (
            renderPostAnalysis()
          )}
        </div>
      );
    }

    return (
      <div className="space-y-8 w-full mx-auto py-8 animate-in fade-in duration-500">
        <div className="mb-12 flex flex-col items-center justify-center text-center relative border-b border-gray-100 pb-10 w-full mx-auto">
          <div className="flex flex-col items-center gap-1 mb-6">
            <h1 className="text-2xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3 text-center uppercase">AI Clean Guard</h1>
            <p className="text-gray-500 font-bold text-sm max-w-2xl">
              검사하고 싶은 게시물을 선택하세요. AI가 즉시 스팸과 악성 댓글을 진단합니다.
            </p>
          </div>

          {/* Global Master Toggle */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <span className={`text-sm font-black ${isModerationAlertActive ? 'text-indigo-950' : 'text-gray-400'}`}>
                전체 탐지 알림 {isModerationAlertActive ? 'ON' : 'OFF'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newState = !isModerationAlertActive;
                  setIsModerationAlertActive(newState);
                  saveModerationSettings(newState);
                }}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none ${isModerationAlertActive ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${isModerationAlertActive ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 font-bold">
              * 서비스 전체의 실시간 알림을 한 번에 제어합니다.
            </p>
          </div>
        </div>

        {isGalleryLoading ? (
          <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="w-full aspect-square bg-gray-100 rounded-[2rem] border border-gray-100 shadow-lg animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {galleryPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => {
                  if (isPremiumFeatureLocked) {
                    showPremiumLockToast('프리미엄 요금제로 연장해야 새로운 게시물을 분석할 수 있습니다.');
                    return;
                  }
                  handlePostAnalysis(post);
                }}
                className="group relative aspect-square bg-white rounded-[2rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                <img
                  src={post.thumbnail_url || post.url}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt="Post thumbnail"
                />

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                  <div className="bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full flex items-center gap-2 text-white font-bold border border-white/30 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>정밀 분석 시작</span>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                  <div className="flex gap-2 text-white text-xs font-bold drop-shadow-md">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-white" /> {post.like_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 fill-white" /> {post.comments_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  // Render AI Style Lab (Real-time Style Coach Before Upload)
  // Render AI Viral Post Maker
  const renderAiViralPostMaker = () => {
    const fetchIgMedia = async (id) => {
      const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-media?limit=10`);
      if (!res.ok) throw new Error('Failed to load IG feed.');
      const data = await res.json();
      return data.images || [];
    };

    const handleFileUpload = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      if (viralPostMedia.length + files.length > 10) {
        setViralPostError("최대 10개까지만 업로드 가능합니다.");
        return;
      }

      setIsUploading(true);
      setViralPostError(null);

      try {
        const newMedia = await Promise.all(
          files.map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({
              url: e.target.result,
              file: file,
              name: file.name,
              type: file.type.startsWith('video/') ? 'video' : 'image'
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }))
        );

        setViralPostMedia(prev => [...prev, ...newMedia]);
      } catch (err) {
        setViralPostError("파일 읽기 중 오류가 발생했습니다.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    const removeViralMedia = (index) => {
      setViralPostMedia(prev => prev.filter((_, i) => i !== index));
    };

    const handleAnalysis = async () => {
      if (viralPostMedia.length === 0) return;

      setViralPostLoading(true);
      setViralPostError(null);
      setViralPostResult(null);

      try {
        const images = viralPostMedia.filter(m => m.type === 'image').map(img => img.url);
        const videos = viralPostMedia.filter(m => m.type === 'video').map(v => v.url);

        const res = await apiFetch(`/ai/generate-viral-post`, {
          method: 'POST',
          body: JSON.stringify({
            images: images,
            videos: videos,
            user_intent: viralPostIntent,
            customer_id: customerId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || '분석 요청에 실패했습니다.');
        }

        const data = await res.json();
        setViralPostResult(data);
      } catch (err) {

        setViralPostError(err.message || '분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setViralPostLoading(false);
      }
    };


    const copyToClipboard = (text) => {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        showNotify('클립보드에 복사되었습니다.');
      }).catch(() => { });
    };

    const scrollImages = (direction) => {
      const node = viralPostScrollRef.current;
      if (!node) return;
      const delta = 240;
      const amount = direction === 'left' ? -delta : delta;
      node.scrollBy({ left: amount, behavior: 'smooth' });
    };

    const hasMedia = viralPostMedia && viralPostMedia.length > 0;

    // Derived: recommended sequence images
    const recommendedImages = (viralPostResult?.recommended_sequence?.map(idx => viralPostMedia[idx]) || viralPostMedia).filter(Boolean);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* 1. Header Section - Text Only Hero */}
        <div className="mb-12 w-full flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex flex-col items-center">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-2 text-center uppercase">
              AI Viral Post Maker
            </h2>
            <p className="text-gray-500 font-medium text-center">
              최신 알고리즘 데이터로 게시물의 바이럴 성과를 극대화하는 <span className="text-indigo-600 font-bold">프리미엄 포스팅 비서</span>
            </p>
          </div>
        </div>

        {/* 2. Setup Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="p-2.5 bg-indigo-50 rounded-xl">
                  <Camera className="w-5 h-5 text-indigo-600" />
                </div>
                업로드 미디어 구성 (이미지/릴스 최대 10개)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="relative group">
                {viralPostMedia.length > 0 ? (
                  <div className="relative">
                    <div className="overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide" ref={viralPostScrollRef}>
                      <div className="flex gap-4 min-w-max">
                        {viralPostMedia.map((media, idx) => (
                          <div key={idx} className="relative group/img">
                            <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-lg border-2 border-transparent group-hover/img:border-indigo-400 transition-all flex items-center justify-center bg-gray-100">
                              {media.type === 'video' ? (
                                <video src={media.url} className="w-full h-full object-cover" controls={false} autoPlay muted loop playsInline />
                              ) : (
                                <img src={media.url} className="w-full h-full object-cover" alt="" />
                              )}
                            </div>
                            <button
                              onClick={() => removeViralMedia(idx)}
                              className="absolute top-2 right-2 w-8 h-8 bg-rose-500/90 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-xl opacity-100 group-hover/img:bg-rose-600 transition-all z-20 hover:scale-110 active:scale-95"
                              title="삭제하기"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                              #{idx + 1} {media.type === 'video' ? '(영상)' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => scrollImages('left')} className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center hover:scale-110 transition-transform border border-gray-100"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => scrollImages('right')} className="absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center hover:scale-110 transition-transform border border-gray-100"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[21/9] w-full flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-300 transition-all group-hover:shadow-inner cursor-pointer"
                  >
                    <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                      <UploadCloud className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="font-bold text-gray-600">내 컴퓨터에서 이미지/영상 업로드</p>
                    <p className="text-sm text-gray-400 mt-2">분석할 이미지 또는 릴스를 최대 10개까지 선택하세요</p>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*,video/*"
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (isPremiumFeatureLocked) {
                      showNotify('프리미엄 요금제로 연장해야 미디어를 추가할 수 있습니다.', 'error');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={viralPostLoading || isUploading}
                  className="flex-1 h-14 rounded-2xl border-gray-200 font-bold hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  미디어 추가하기
                </Button>
                <Button onClick={() => {
                  if (isPremiumFeatureLocked) {
                    showPremiumLockToast('프리미엄 요금제로 연장해야 분석을 시작할 수 있습니다.');
                    return;
                  }
                  handleAnalysis();
                }} disabled={viralPostLoading || viralPostMedia.length === 0} className="flex-[1.5] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg shadow-indigo-100">
                  {viralPostLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                  AI 바이럴 분석 시작
                </Button>
              </div>
              {viralPostError && <div className="text-sm text-rose-500 font-medium bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-2"><Zap className="w-4 h-4" /> {viralPostError}</div>}
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-xl bg-white rounded-[2.5rem] overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mb-10 -mr-10 opacity-50"></div>
            <CardHeader className="p-8">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-3 text-gray-900">
                  <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  분석 의도 설정
                </CardTitle>
                <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black tracking-widest px-2.5 py-1">HYBRID AI GUIDE</Badge>
              </div>
              <p className="text-sm text-gray-400 mt-2 font-medium">업종별 전문가 패키지를 선택하거나 직접 요구사항을 입력하세요.</p>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              {/* Row 1: Professional Analysis Packages (Chips) */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '📸 시네마틱 스튜디오', value: '시네마틱한 조명과 인물의 감정선이 강조된 고관여 스튜디오 컨셉으로 분석해 주세요.' },
                  { label: '🍱 비비드 F&B 바이럴', value: '음식의 질감이 살아있는 비비드한 색감과 생동감 넘치는 연출 중심의 컨셉으로 분석해 주세요.' },
                  { label: '💡 깔끔한 정보성 카드뷰', value: '텍스트 가독성을 극대화한 여백의 미와 정돈된 레이아웃 중심의 지식 전달 컨셉으로 분석해 주세요.' },
                  { label: '🛒 프리미엄 제품 화보', value: '제품의 디테일과 고급스러운 재질감이 강조된 세련된 커머스 화보 컨셉으로 분석해 주세요.' },
                  { label: '🎞️ 필름 무드 브랜딩', value: '아날로그 필름 사진 같은 빈티지한 감성과 브랜드만의 독보적인 톤앤매너 컨셉으로 분석해 주세요.' },
                  { label: '🤝 자연스러운 리얼 라이프', value: '인위적이지 않은 스냅 작업물처럼 자연스러운 구도와 편안한 일상 컨셉으로 분석해 주세요.' }
                ].map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (viralPostIntent === preset.value) {
                        setViralPostIntent(''); // Toggle off
                      } else {
                        setViralPostIntent(preset.value); // Select this one exclusively
                      }
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-[13px] font-bold border transition-all duration-300 ${viralPostIntent === preset.value
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30'
                      }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="relative group/text">
                <div className="absolute top-4 left-4 z-10">
                  <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm">
                    <MessageSquareText className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-black text-gray-400 tracking-tighter uppercase">IMAGE CONCEPT REQUEST</span>
                  </div>
                </div>
                <textarea
                  value={viralPostIntent}
                  onChange={(e) => setViralPostIntent(e.target.value)}
                  placeholder="이미지의 시각적 컨셉이나 원하는 분위기를 입력하세요. (예: 따뜻한 햇살이 비치는 아침의 여유로운 무드로 분석해 주세요.)"
                  className="w-full h-40 bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 pt-12 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-200 resize-none transition-all pr-12 font-medium leading-relaxed"
                />
                {viralPostIntent && (
                  <button
                    onClick={() => setViralPostIntent('')}
                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-rose-500 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  의도를 입력하시면 AI가 인스타그램 알고리즘에 딱 맞는 톤으로 캡션을 최적화합니다.
                </p>
                <Button
                  onClick={() => showNotify('작성 의도가 적용되었습니다.')}
                  disabled={!viralPostIntent}
                  variant="outline"
                  className="h-9 px-4 rounded-xl text-xs font-bold border-gray-200 hover:bg-gray-50 hover:text-indigo-600 transition-all"
                >
                  <Check className="w-3 h-3 mr-1.5" />
                  적용 완료
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Result Section */}
        {viralPostResult && (
          <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
            {/* Top: AI Viral Score & Prediction Card */}
            <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden relative group border border-gray-100">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-[100px] -mr-40 -mt-40 opacity-60"></div>
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-50 rounded-full blur-[80px] -ml-20 -mb-20 opacity-60"></div>

              <CardContent className="p-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  {/* Score Gauge */}
                  <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100 pb-8 lg:pb-0 lg:pr-8">
                    {/* Multi-dimensional Score Display */}
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96" cy="96" r="88"
                          fill="none" stroke="currentColor" strokeWidth="12"
                          className="text-gray-50"
                        />
                        <circle
                          cx="96" cy="96" r="88"
                          fill="none" stroke="currentColor" strokeWidth="12"
                          strokeDasharray={2 * Math.PI * 88}
                          strokeDashoffset={2 * Math.PI * 88 * (1 - (typeof viralPostResult.viral_score === 'object' ? viralPostResult.viral_score.total : viralPostResult.viral_score || 0) / 100)}
                          strokeLinecap="round"
                          className="text-indigo-600 drop-shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-6xl font-black text-gray-900 tracking-tighter">
                          {typeof viralPostResult.viral_score === 'object' ? viralPostResult.viral_score.total : viralPostResult.viral_score}
                        </span>
                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">TOTAL SCORE</span>
                      </div>
                    </div>
                    {/* Score Breakout (If object) */}
                    {typeof viralPostResult.viral_score === 'object' && (
                      <div className="mt-8 w-full space-y-3 px-4">
                        {[
                          { label: '후킹 파워', value: viralPostResult.viral_score.hook_power, color: 'bg-rose-500' },
                          { label: '시각적 미감', value: viralPostResult.viral_score.visual_aesthetic, color: 'bg-emerald-500' },
                          { label: '전략 이행도', value: viralPostResult.viral_score.strategic_intent, color: 'bg-indigo-500' }
                        ].map((s, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{s.label}</span>
                              <span className="text-xs font-black text-gray-700">{safeString(s.value)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${s.color} rounded-full transition-all duration-1000`} style={{ width: `${s.value}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Prediction & Benchmarks */}
                  <div className="lg:col-span-8 space-y-8">
                    {/* Video Critique Section (New) */}
                    {viralPostResult.video_critique && viralPostResult.video_critique.length > 0 && (
                      <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100">
                        <h5 className="text-amber-700 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4" /> 릴스 구간별 1:1 밀착 코칭 (Timestamp Critique)
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viralPostResult.video_critique.map((c, idx) => (
                            <div key={idx} className="bg-white/80 p-4 rounded-2xl border border-white shadow-sm space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">{c.timestamp}</span>
                                <span className="text-[11px] font-bold text-amber-900/60 uppercase">Dianogsis</span>
                              </div>
                              <p className="text-[13px] text-gray-700 font-bold leading-relaxed">{c.critique}</p>
                              <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50 uppercase text-[9px] font-black text-indigo-600">
                                <Zap className="w-3 h-3" /> ACTION: <span className="text-gray-500">{c.action}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-indigo-600/60 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4" /> AI 바이럴 예측 보고서
                      </h4>
                      <p className="text-2xl font-bold text-gray-900 leading-tight">
                        {safeString(viralPostResult.predicted_performance)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Benchmarks */}
                      <div className="space-y-3">
                        <h5 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">과거 성공 사례 비교 (Benchmark)</h5>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          {safeString(viralPostResult.benchmark_analysis)}
                        </p>
                      </div>

                      {/* Improvement Tips */}
                      <div className="space-y-3">
                        <h5 className="text-rose-500/60 text-[10px] font-black uppercase tracking-widest">바이럴 점수 심폐소생술 (Tips)</h5>
                        <div className="space-y-2">
                          {(viralPostResult.improvement_tips || []).map((tip, i) => (
                            <div key={i} className="flex items-start gap-3 bg-rose-50/30 p-3 rounded-xl border border-rose-100/30 min-h-[50px] items-center">
                              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm border border-rose-600">
                                {i + 1}
                              </div>
                              <p className="text-[13px] text-gray-700 font-bold leading-tight">{safeString(tip)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left: Sequencing */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    추천 업로드 순서
                  </h3>
                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">AI Optimized</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {recommendedImages.map((img, idx) => (
                    <div key={idx} className={`relative rounded-3xl overflow-hidden shadow-md border-2 ${idx === 0 ? 'border-amber-400 scale-105 z-10' : 'border-transparent'}`}>
                      {img.type === 'video' ? (
                        <video src={img.url} className="w-full aspect-square object-cover" autoPlay muted loop playsInline />
                      ) : (
                        <img src={img.url} className="w-full aspect-square object-cover" alt="" />
                      )}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-xl">
                        {idx === 0 ? '👑 THUMBNAIL' : `${idx + 1}nd`}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <p className="text-sm text-indigo-900 font-bold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI의 추천 사유</p>
                  <p className="text-sm text-indigo-800/80 leading-relaxed font-medium">{safeString(viralPostResult.reasoning)}</p>
                </div>
              </div>

              {/* Right: Content Card */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquareText className="w-5 h-5 text-indigo-600" />
                    마케팅 캡션 기획
                  </h3>
                </div>
                <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-white/50">
                  <div className="flex p-2 bg-gray-50/80 m-6 mb-0 rounded-2xl gap-1">
                    {[
                      { id: 'engagement', label: '기본 포스팅', icon: Layout },
                      { id: 'informative', label: '정보성 슬라이드', icon: BookOpen },
                      { id: 'emotional', label: '참여/홍보', icon: Zap }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveCaptionTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${activeCaptionTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <CardContent className="p-6 pt-6 space-y-6">
                    <div className="p-6 bg-indigo-50/50 rounded-[2rem] relative group border border-indigo-100/50 min-h-[350px]">
                      <p className="text-[14px] text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {safeString(viralPostResult.captions[activeCaptionTab])}
                      </p>
                      <Button
                        onClick={() => copyToClipboard(viralPostResult.captions[activeCaptionTab])}
                        className="absolute top-4 right-4 p-2.5 bg-white hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-xl shadow-lg border border-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom: Viral Strategy Package (Horizontal Grid for Balance) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* 1. Automation Trigger */}
              <Card className="border border-indigo-100 shadow-xl bg-white rounded-[2.5rem] relative overflow-hidden group">
                <CardContent className="p-7 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-bold text-base text-gray-900 leading-tight">자동화 트리거 (Conversion)</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">추천 키워드</span>
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black border border-indigo-100">{safeString(viralPostResult.automation_strategy.keyword)}</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-[13px] leading-relaxed text-gray-700 relative group/phrase">
                      {safeString(viralPostResult.automation_strategy.phrase)}
                      <button
                        onClick={() => copyToClipboard(viralPostResult.automation_strategy.phrase)}
                        className="absolute bottom-2 right-2 p-1.5 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-gray-100 transition-colors opacity-0 group-hover/phrase:opacity-100"
                      >
                        <Copy className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. SEO & Alt Text */}
              <Card className="border border-blue-100 shadow-lg bg-white rounded-[2.5rem] overflow-hidden group">
                <CardContent className="p-7 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-100">
                      <Search className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-bold text-base text-gray-900">검색 최적화 (SEO)</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 mb-2 tracking-widest uppercase">ALT TEXT - 시각 분석</p>
                      <p className="text-[12px] text-gray-600 font-medium leading-relaxed bg-blue-50/30 p-4 rounded-2xl border border-blue-50 overflow-hidden text-ellipsis line-clamp-3">
                        {safeString(viralPostResult.seo_optimization.alt_text)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {viralPostResult.seo_optimization.keywords.slice(0, 5).map((kw, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-lg border border-blue-100">
                          {safeString(kw)}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Story Teasers */}
              <Card className="border border-amber-100 shadow-lg bg-white rounded-[2.5rem] overflow-hidden group">
                <CardContent className="p-7 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-100">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-bold text-base text-gray-900">스토리 티저 (Traffic Loop)</h4>
                  </div>
                  <div className="space-y-2">
                    {viralPostResult.story_teasers.slice(0, 2).map((teaser, i) => (
                      <div key={i} className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50 flex items-start gap-3 group/teaser hover:bg-amber-50 transition-colors">
                        <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[9px] font-black text-amber-700 shadow-sm shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="flex-1 text-[12px] font-bold text-amber-900/80 leading-snug line-clamp-2">
                          {safeString(teaser)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* Contact Detail Modal */
  const ContactDetailModal = ({ contact, isOpen, onClose }) => {
    if (!isOpen || !contact) return null;

    return (
      <div
        className="fixed inset-0 z-[1110] bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto custom-scrollbar"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="relative min-h-full flex items-start justify-center p-4 pt-6 md:pt-8 pointer-events-none pb-10">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300 border border-white/20 pointer-events-auto flex flex-col h-fit max-h-[92vh] my-auto overflow-hidden">
            {/* Header with Pattern - Fixed */}
            <div className="h-32 bg-gray-900 relative rounded-t-[2.5rem] overflow-hidden shrink-0">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>

              <div className="absolute right-6 top-6 z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white border-none"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="px-8 pb-10 -mt-16 relative z-10 flex-1 overflow-y-auto custom-scrollbar">
              <div className="text-center">
                <div className="inline-block p-1.5 bg-white rounded-[2.2rem] shadow-2xl border border-gray-50">
                  <div className="w-28 h-28 rounded-[1.8rem] overflow-hidden border-4 border-white bg-gray-50 shadow-inner">
                    {contact.profile_pic ? (
                      <img src={contact.profile_pic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                        <User className="w-14 h-14" />
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="mt-5 font-black text-2xl text-gray-900 tracking-tighter truncate max-w-full px-2" title={`@${contact.username || contact.instagram_id}`}>
                  @{contact.username || contact.instagram_id || 'PRIVATE'}
                </h3>
                {contact.full_name && <p className="text-gray-400 font-bold text-sm tracking-widest uppercase mt-1">{contact.full_name}</p>}

                <div className="mt-8 grid grid-cols-2 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
                  <div className="bg-white p-5 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5">소통 지수</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{Math.round(contact.engagement_score || 0)}<span className="text-xs font-bold text-gray-400 ml-1">%</span></p>
                  </div>
                  <div className="bg-white p-5 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5">활동 횟수</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{contact.interaction_count || 0}<span className="text-xs font-bold text-gray-400 ml-1">번</span></p>
                  </div>
                </div>
              </div>

              <div className="mt-10 text-left space-y-8">
                <div className="relative">
                  <div className="absolute -left-4 -top-4 w-12 h-12 bg-amber-50 rounded-full -z-10 blur-xl opacity-50"></div>
                  <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    AI 행동 분석
                  </h4>
                  <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-700 leading-relaxed shadow-sm">
                    <div className="flex gap-2">
                      <span className="text-2xl text-gray-300 font-black leading-none mt-1">“</span>
                      <p className="font-bold tracking-tight italic opacity-90">{contact.ai_summary || "데이터를 수집하여 성향을 파악 중입니다."}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4">
                    <Tag className="w-4 h-4 text-gray-300" />
                    AI 분석 키워드
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags?.length > 0 ? (
                      contact.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 px-4 py-1.5 rounded-xl font-black text-[10px] transition-all hover:scale-105 active:scale-95 cursor-default">
                          {tag.toUpperCase()}
                        </Badge>
                      ))
                    ) : (
                      <div className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed text-center">
                        <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">No Tags Detected</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-8 pt-4 bg-white border-t border-gray-50 shrink-0">
              <Button
                className="w-full bg-gray-900 text-white hover:bg-black h-14 rounded-2xl text-sm font-black shadow-xl shadow-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                onClick={() => {
                  setSelectedConversation({
                    id: contact.instagram_id,
                    username: contact.username || contact.instagram_id,
                    profile_picture: contact.profile_pic
                  });
                  setCurrentView('inbox');
                  onClose();
                }}
              >
                <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                START DIRECT MESSAGE
              </Button>
              <p className="mt-3 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">Last Activity: {contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleDateString() : 'NO ACTIVITY'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContacts = () => {
    // 1. Filter Logic using real contact state
    const filteredContacts = (contacts || []).filter(c => {
      // Search text
      const matchesSearch = !contactsSearch ||
        (c.username?.toLowerCase().includes(contactsSearch.toLowerCase()) ||
          c.full_name?.toLowerCase().includes(contactsSearch.toLowerCase()) ||
          (c.instagram_id && c.instagram_id.includes(contactsSearch)));

      // AI Segments
      let matchesSegment = true;
      if (activeSegment === 'new') {
        // 최초 소통 인원: 최근 48시간 이내 생성된 컨택트
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        matchesSegment = new Date(c.created_at) >= twoDaysAgo;
      }
      if (activeSegment === 'review') {
        // 미응대/우선 검토: '응대필요' 태그가 있는 경우
        matchesSegment = c.tags?.includes('응대필요');
      }
      if (activeSegment === 'vip') {
        // VIP 오디언스: 참여도 80% 이상
        matchesSegment = (c.engagement_score || 0) >= 80;
      }
      if (activeSegment === 'casual') {
        matchesSegment = c.buying_phase === '일상소통';
      }
      if (activeSegment === 'inquiry') {
        matchesSegment = c.buying_phase === '정보/문의';
      }
      if (activeSegment === 'biz') {
        matchesSegment = c.buying_phase === '비즈니스';
      }

      // Tag Filter
      const matchesTags = filterTags.length === 0 || filterTags.every(t => c.tags?.includes(t));

      // Engagement Filter
      const matchesEngagement = (c.engagement_score || 0) >= filterEngagement;

      return matchesSearch && matchesSegment && matchesTags && matchesEngagement;
    });

    const allAvailableTags = Array.from(new Set((contacts || []).flatMap(c => c.tags || [])));

    return (
      <div className="space-y-6">
        <div className="mb-12 w-full flex flex-col items-center justify-center text-center space-y-4 relative">
          <div className="p-4 bg-gray-50 rounded-2xl w-fit mx-auto">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 text-center">
              고객 관리
            </h2>
            <p className="text-gray-500 font-medium text-center">실시간으로 소통 중인 고객들을 AI가 똑똑하게 분류해 드립니다.</p>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadContacts(customerId)}
            disabled={contactsLoading}
            className="absolute right-0 top-0 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 group overflow-hidden"
          >
            <div className={`flex items-center gap-2 ${contactsLoading ? 'opacity-50' : ''}`}>
              <RotateCw className={`w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors ${contactsLoading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-black text-gray-400 group-hover:text-indigo-600">새로고침</span>
            </div>
          </button>
        </div>

        {/* Search Bar - Centered */}
        <div className="flex justify-center mb-10">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="고객 아이디, 이름 검색..."
              className="w-full pl-12 pr-6 py-4 bg-white border-2 border-gray-100 rounded-[1.5rem] text-base focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold shadow-sm"
              value={contactsSearch}
              onChange={(e) => setContactsSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Audience Segments & Advanced Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-9 xl:col-span-9 border-gray-200 shadow-sm bg-white">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveSegment('all')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  전체 현황
                </button>
                <button
                  onClick={() => setActiveSegment('new')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  최초 소통
                </button>
                <button
                  onClick={() => setActiveSegment('vip')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'vip' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  핵심 오디언스 (VIP)
                </button>
                <button
                  onClick={() => setActiveSegment('casual')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'casual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  일상 소통
                </button>
                <button
                  onClick={() => setActiveSegment('inquiry')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'inquiry' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  정보 / 문의
                </button>
                <button
                  onClick={() => setActiveSegment('biz')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'biz' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  비즈니스
                </button>
                <button
                  onClick={() => setActiveSegment('review')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'review' ? 'bg-rose-500 text-white shadow-md' : 'text-rose-400 hover:text-rose-500'}`}
                >
                  미응대 / 우선 검토
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">참여도</span>
                  <input
                    type="range"
                    min="0" max="100"
                    value={filterEngagement}
                    onChange={(e) => setFilterEngagement(parseInt(e.target.value))}
                    className="w-24 accent-gray-900"
                  />
                  <span className="text-xs font-bold text-gray-900 w-8">{filterEngagement}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 xl:col-span-3 border-gray-200 shadow-sm bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">필터링된 오디언스</p>
              <p className="text-2xl font-black text-gray-900">{filteredContacts.length}<span className="text-xs text-gray-400 ml-1">명</span></p>
            </CardContent>
          </Card>
        </div>

        {/* Tag Cloud Filter */}
        {allAvailableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">인기 태그:</span>
            {allAvailableTags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (filterTags.includes(tag)) setFilterTags(filterTags.filter(t => t !== tag));
                  else setFilterTags([...filterTags, tag]);
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${filterTags.includes(tag) ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
              >
                #{tag}
              </button>
            ))}
            {filterTags.length > 0 && (
              <button
                onClick={() => setFilterTags([])}
                className="text-[10px] font-bold text-red-500 hover:underline ml-2"
              >
                필터 초기화
              </button>
            )}
          </div>
        )}

        {contactsLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className="w-10 h-10 text-gray-900 animate-spin mb-4" />
            <p className="text-gray-500 font-medium animate-pulse">고객 데이터를 분석하며 불러오고 있습니다...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-gray-200 border-dashed text-center p-12">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Filter className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-gray-900 font-bold text-xl">조건에 맞는 고객이 없습니다</p>
            <p className="text-gray-500 text-sm mt-3 max-w-sm mx-auto leading-relaxed">필터 조건을 변경하거나 검색어를 다르게 입력해 보세요.<br />아직 소통이 없다면 첫 댓글이나 DM을 기다려야 합니다.</p>
            <Button
              variant="outline"
              className="mt-6 border-gray-200 font-bold text-gray-600 rounded-xl"
              onClick={() => {
                setContactsSearch('');
                setActiveSegment('all');
                setFilterTags([]);
                setFilterEngagement(0);
              }}
            >
              모든 필터 초기화
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Contacts List Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              <div className="col-span-4">오디언스 정보</div>
              <div className="col-span-3 text-center">소통 지수 / 누적 횟수</div>
              <div className="col-span-3 text-center">최근 소통일</div>
              <div className="col-span-2 text-right">상세 보기</div>
            </div>

            {/* Contacts Rows */}
            <div className="space-y-3">
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`grid grid-cols-12 gap-4 items-center p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group ${selectedContact?.id === contact.id ? 'ring-2 ring-indigo-500 shadow-lg' : ''}`}
                >
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 group-hover:rotate-3 transition-transform">
                      {contact.profile_pic ? (
                        <img src={contact.profile_pic} alt={contact.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-900 truncate text-sm tracking-tight flex items-center gap-2">
                        @{contact.username || contact.instagram_id}
                        {(contact.engagement_score || 0) > 85 && <Badge className="bg-rose-400 text-white border-0 text-[8px] px-1.5 h-3.5 font-black">SUPER FAN</Badge>}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{contact.full_name || contact.username || `Instagram User (${(contact.instagram_id || '').slice(-4)})`}</p>
                      {contact.buying_phase && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-[9px] font-black rounded-md border border-gray-100">
                          {contact.buying_phase}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-3 flex justify-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-gray-900">{Math.round(contact.engagement_score || 0)}%</span>
                        <span className="text-[10px] text-gray-400 font-bold">({contact.interaction_count || 0}회)</span>
                      </div>
                      <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${(contact.engagement_score || 0) > 70 ? 'bg-rose-500' : (contact.engagement_score || 0) > 40 ? 'bg-orange-500' : 'bg-gray-400'}`}
                          style={{ width: `${contact.engagement_score || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 flex justify-center">
                    <Badge variant="outline" className="text-[10px] py-0.5 px-3 bg-white border-gray-100 text-gray-400 font-bold rounded-lg shadow-sm whitespace-nowrap">
                      {contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleDateString() : '소통 전'}
                    </Badge>
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="sm" className="rounded-xl group-hover:bg-rose-50 group-hover:text-rose-600 text-gray-200 transition-all">
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>


          </div>
        )}
      </div>
    );
  };

  // Render Inbox View with Message Sending
  const renderInbox = () => {
    const instagramAccount = customerStatus?.instagram_account;
    const pageId = instagramAccount?.page_id || webhookStatus?.page_id || 'N/A';
    const instagramUsername = instagramAccount?.instagram_username || igInsights?.username || 'N/A';
    const instagramUserId = instagramAccount?.instagram_user_id || igInsights?.instagram_user_id || 'N/A';
    const pageName = webhookStatus?.page_name || (pageId !== 'N/A' ? `Page (${pageId})` : 'Connected Page');

    // Check if Instagram account is connected: considered connected if pageId exists and is not 'N/A'
    const isInstagramConnected = pageId !== 'N/A' && (instagramAccount?.page_id || webhookStatus?.page_id);

    // Debugging: Check Instagram connection status
    if (process.env.NODE_ENV === 'development') {

    }

    return (
      <>
        <div className="mb-12 w-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3 text-center">통합 인박스</h1>
          <p className="text-gray-500 font-medium text-center">웹훅을 통해 수신된 메시지와 응답 현황을 확인합니다</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 h-[calc(100vh-200px)] min-h-[600px]">
          {/* Instagram style conversation list (left) */}
          <div className={`md:col-span-4 lg:col-span-3 border-r border-gray-200 bg-white flex flex-col h-full min-h-0 ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="px-6 py-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">메시지 목록</h2>
              <button
                onClick={loadConversations}
                disabled={conversationsLoading}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                title="새로고침"
              >
                <Loader2 className={`w-4 h-4 text-gray-600 ${conversationsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {conversationsLoading ? (
                <div>
                  {/* Skeleton Loading */}
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="p-3 border-b border-gray-100 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">대화 내역이 없습니다</p>
                </div>
              ) : (
                <div>
                  {conversations.filter(c => {
                    // Safety Filter: Ensure the conversation has at least one participant that IS NOT ME
                    const participants = c.participants?.data || [];
                    const hasOther = participants.some(p =>
                      (p.id !== instagramUserId && instagramUserId !== 'N/A') ||
                      (p.username !== instagramUsername && instagramUsername !== 'N/A')
                    );
                    return hasOther;
                  }).map((conv) => {
                    const latestMessage = conv.latest_message;
                    const participants = conv.participants?.data || [];

                    // Robust finding of 'other' participant
                    const otherParticipant = participants.find(p =>
                      (p.id !== instagramUserId && instagramUserId !== 'N/A') ||
                      (p.username !== instagramUsername && instagramUsername !== 'N/A')
                    ) || participants[0];

                    const isSelected = selectedConversation?.id === conv.id;

                    // Calculate relative time
                    const getRelativeTime = (dateString) => {
                      if (!dateString) return '';
                      const date = new Date(dateString);
                      const now = new Date();
                      const diffMs = now - date;
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);

                      if (diffMins < 1) return '방금';
                      if (diffMins < 60) return `${diffMins}분 전`;
                      if (diffHours < 24) return `${diffHours}시간 전`;
                      if (diffDays < 7) return `${diffDays}일 전`;
                      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                    };

                    const otherUsername = (otherParticipant?.username && !['사용자', 'Instagram User'].includes(otherParticipant.username) ? otherParticipant.username : null) || (otherParticipant?.name && !['사용자', 'Instagram User'].includes(otherParticipant.name) ? otherParticipant.name : null) || (otherParticipant?.id ? `Instagram User (${otherParticipant.id.slice(-4)})` : 'Instagram User');
                    const otherName = (otherParticipant?.name && !['사용자', 'Instagram User'].includes(otherParticipant.name) ? otherParticipant.name : null) || otherUsername;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`group w-full p-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${isSelected ? 'bg-gray-50' : ''
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Profile Image */}
                          {otherParticipant?.profile_picture_url ? (
                            <img
                              src={otherParticipant.profile_picture_url}
                              alt={otherUsername}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 ring-2 ring-white" style={{ display: otherParticipant?.profile_picture_url ? 'none' : 'flex' }}>
                            {otherParticipant?.username ? (
                              <span className="text-white font-semibold text-sm">
                                {otherUsername.charAt(0).toUpperCase()}
                              </span>
                            ) : (
                              <MessageSquare className="w-6 h-6 text-white" />
                            )}
                          </div>

                          {/* Message Information */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {otherName}
                              </p>
                              {conv.updated_time && (
                                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                  {getRelativeTime(conv.updated_time)}
                                </span>
                              )}
                            </div>
                            {conv.updated_time && (
                              <p className="text-xs text-gray-500 truncate">
                                {(() => {
                                  const date = new Date(conv.updated_time);
                                  const now = new Date();
                                  const diffMs = now - date;
                                  const diffMins = Math.floor(diffMs / 60000);
                                  const diffHours = Math.floor(diffMs / 3600000);
                                  const diffDays = Math.floor(diffMs / 86400000);

                                  if (diffMins < 1) return '방금';
                                  if (diffMins < 60) return `${diffMins}분 전`;
                                  if (diffHours < 24) return `${diffHours}시간 전`;
                                  if (diffDays < 7) return `${diffDays}일 전`;
                                  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                                })()}
                              </p>
                             )}
                          </div>
                          
                          {/* Delete Button */}
                          <div className="flex-shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleDeleteConversation(e, conv.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              title="채팅방 삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Instagram style message view (right) */}
          <div className={`md:col-span-8 lg:col-span-9 flex flex-col bg-white h-full min-h-0 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation ? (
              <>
                {/* Message Header */}
                <div className="px-6 py-6 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
                  {(() => {
                    // Get latest participant data from conversations list (which has fresh data)
                    // Get latest participant data from conversations list
                    const latestConvo = conversations.find(c => c.id === selectedConversation.id);
                    const participants = latestConvo?.participants?.data || selectedConversation.participants?.data || [];
                    const otherParticipant = participants.find(p =>
                      (p.id !== instagramUserId && instagramUserId !== 'N/A') ||
                      (p.username !== instagramUsername && instagramUsername !== 'N/A')
                    ) || participants[0];
                    const otherUsername = (otherParticipant?.username && !['사용자', 'Instagram User'].includes(otherParticipant.username) ? otherParticipant.username : null) || (otherParticipant?.name && !['사용자', 'Instagram User'].includes(otherParticipant.name) ? otherParticipant.name : null) || (otherParticipant?.id ? `Instagram User (${otherParticipant.id.slice(-4)})` : 'Instagram User');
                    const otherName = (otherParticipant?.name && !['사용자', 'Instagram User'].includes(otherParticipant.name) ? otherParticipant.name : null) || otherUsername;

                    return (
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Profile Image */}
                          {otherParticipant?.profile_picture_url ? (
                            <img
                              src={otherParticipant.profile_picture_url}
                              alt={otherUsername}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0" style={{ display: otherParticipant?.profile_picture_url ? 'none' : 'flex' }}>
                            {otherParticipant?.username ? (
                              <span className="text-white font-semibold text-sm">
                                {otherUsername.charAt(0).toUpperCase()}
                              </span>
                            ) : (
                              <MessageSquare className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex flex-col justify-center">
                            <p className="text-sm font-bold text-gray-900 leading-tight">{otherName}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => loadConversationMessages(selectedConversation.id)}
                          disabled={messagesLoading}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                          title="메시지 새로고침"
                        >
                          <Loader2 className={`w-4 h-4 text-gray-600 ${messagesLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Message area - Latest messages at the bottom */}
                <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6 flex flex-col gap-4 min-h-0">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : conversationMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm text-gray-500">메시지가 없습니다</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {conversationMessages
                        .filter((msg) => {
                          const messageText = typeof msg.message === 'string'
                            ? msg.message
                            : msg.message?.text;
                          return messageText && messageText.trim();
                        })
                        .map((msg, idx) => {
                          const isFromMe = ourAccountIds.includes(msg.from?.id);
                          const filteredMessages = conversationMessages
                            .filter((m) => {
                              const mText = typeof m.message === 'string' ? m.message : m.message?.text;
                              return mText && mText.trim();
                            });
                          const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
                          const showTime = !prevMsg ||
                            new Date(msg.created_time) - new Date(prevMsg.created_time) > 300000;

                          return (
                            <div key={msg.id} className={`flex ${isFromMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 px-1`}>
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
                                <span className="text-white text-xs font-semibold">
                                  {isFromMe
                                    ? (displayName?.charAt(0).toUpperCase() || 'M')
                                    : (msg.from?.username?.charAt(0).toUpperCase() || 'U')}
                                </span>
                              </div>

                              <div className={`flex ${isFromMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[85%] gap-2`}>
                                <div
                                  className={`rounded-2xl px-3 py-1.5 shadow-sm ${isFromMe
                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-sm'
                                    : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'
                                    }`}
                                >
                                  {(() => {
                                    const messageText = typeof msg.message === 'string'
                                      ? msg.message
                                      : msg.message?.text;
                                    if (!messageText || !messageText.trim()) return null;
                                    return (
                                      <p className="text-[13px] leading-tight whitespace-pre-wrap break-words">
                                        {messageText?.trim()}
                                      </p>
                                    );
                                  })()}
                                </div>

                                {showTime && msg.created_time && (
                                  <span className="text-[10px] text-gray-400 mb-0.5 whitespace-nowrap">
                                    {new Date(msg.created_time).toLocaleTimeString('ko-KR', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input Bottom Area */}
                <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                  <div className="relative flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all duration-300">
                    <button className="text-gray-400 hover:text-purple-500 transition-colors">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="메시지를 입력하세요..."
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-gray-400 text-gray-900"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className={`p-2 rounded-xl transition-all duration-300 ${newMessage.trim() && !sendingMessage
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      {sendingMessage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 ml-4 flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    관리용 답장 메시지입니다. Instagram 정책에 따라 24시간 이내의 대화에만 답장할 수 있습니다.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">대화를 선택해주세요</h3>
                  <p className="text-sm text-gray-500">메시지를 확인하거나 답장할 대화를 선택하세요</p>
                </div>
              </div>
            )}
          </div>
        </div >
      </>
    );
  };

  // Render Placeholder View for other sections
  const renderTemplates = () => {
    return (
      <div className="space-y-8">
        <div className="mb-12 w-full flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-2">성장 템플릿</h2>
          <p className="text-sm text-gray-500 font-medium text-center px-4">전문 마케터들이 사용하는 검증된 자동화 시나리오를 즉시 적용하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {GROWTH_TEMPLATES.map((tmpl) => (
            <Card key={tmpl.id} className="group relative overflow-hidden rounded-[2.5rem] p-8 border-2 border-gray-100 bg-white transition-all duration-500 hover:border-indigo-600 hover:shadow-[0_15px_40px_rgba(99,102,241,0.12)] hover:-translate-y-1">
              <CardContent className="p-0 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="px-3 py-1.5 bg-gray-900 text-white rounded-full font-black text-[9px] tracking-widest uppercase">
                    {tmpl.category}
                  </div>
                </div>

                <div className="mb-2">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{safeString(tmpl.name)}</h3>
                </div>

                <div className="text-gray-500 text-[14px] mb-8 font-medium">
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
                    {safeString(tmpl.description)}
                  </span>
                </div>

                <div className="space-y-4 mb-8">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">포함된 액션</p>
                  <div className="flex flex-wrap gap-2">
                    {tmpl.nodes.map((node, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200">
                        <span className="text-[10px] font-black text-gray-600">
                          {node.type === 'message' ? '메시지 발송' : node.type === 'tag' ? '태그 지정' : '시간 지연'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto">
                  <Button
                    onClick={() => {
                      setFlowForm({
                        name: tmpl.name,
                        keyword: tmpl.keyword,
                        nodes: tmpl.nodes,
                        is_active: true
                      });
                      setShowFlowModal(true);
                      setCurrentView('automation');
                    }}
                    className="w-full bg-gray-50 text-gray-900 bg-white border border-gray-200 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white h-14 rounded-2xl font-black transition-all"
                  >
                    이 템플릿 사용하기
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Custom Template Placeholder */}
          <Card className="border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-white transition-all duration-300 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center group cursor-pointer"
            onClick={() => {
              setFlowForm({
                name: '',
                keyword: '',
                nodes: [{ id: 'start', type: 'message', content: '', buttons: [] }],
                is_active: true
              });
              setShowScenarioModal(true);
              setCurrentView('automation');
            }}>
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-gray-300 group-hover:text-gray-900" />
            </div>
            <p className="font-black text-gray-900 text-lg">나만의 템플릿 만들기</p>
            <p className="text-sm text-gray-400 font-bold mt-2">완전 새로운 자동화 플로우를<br />처음부터 설계하세요.</p>
          </Card>
        </div>
      </div>
    );
  };

  const renderPlaceholder = (title, description) => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          {title}
        </h1>
        <p className="text-gray-600">{description}</p>
      </div>
      <Card>
        <CardContent className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 mb-4">
            <Settings className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">곧 출시될 기능입니다</h3>
          <p className="text-sm text-gray-600">
            현재 이 기능을 한창 개발 중입니다. 곧 만나보실 수 있어요!
          </p>
        </CardContent>
      </Card>
    </>
  );

  const renderFlows = () => {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center text-center mb-12 relative w-full">
          <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-2 text-center uppercase">
            자동화 플로우
          </h2>
          <p className="text-sm text-gray-500 font-medium text-center">인스타그램 자동 응답 시퀀스를 효율적으로 관리합니다.</p>
          <div className="mt-6 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
            <Button
              onClick={() => {
                setFlowForm({
                  name: '',
                  trigger_source: 'all',
                  keyword: '',
                  match_type: 'contains',
                  nodes: [
                    { id: 'start', type: 'message', content: '', buttons: [] }
                  ],
                  is_active: true
                });
                setShowScenarioModal(true);
              }}
              className="bg-gray-900 text-white hover:bg-gray-800 h-9 px-4 rounded-xl font-bold shadow-sm transition-all text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              새 플로우 만들기
            </Button>
          </div>
        </div>



        {flowsLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {flows.length === 0 ? (
              <Card className="py-20 border border-dashed border-gray-200 bg-gray-50/50">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Workflow className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-900 font-bold text-lg mb-1">생성된 플로우가 없습니다.</p>
                  <p className="text-sm text-gray-500">첫 번째 자동화 플로우를 만들어보세요.</p>
                </CardContent>
              </Card>
            ) : (
              flows.map((flow) => (
                <div key={flow.id} className={`group relative bg-white border border-gray-100 rounded-xl p-5 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 ${!flow.is_active && 'opacity-70 bg-gray-50/50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex items-start gap-4">
                      {/* Status Indicator */}
                      <div className="pt-1.5">
                        <div className={`w-3 h-3 rounded-full ${flow.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-gray-300'}`} />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900 leading-tight">{safeString(flow.name)}</h3>
                          <Badge variant="outline" className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider border-gray-200 ${flow.is_active ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'}`}>
                            {flow.trigger_source === 'story_mention' ? 'EVENT FLOW' : `${safeString(flow.trigger_type)} flow`}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          {flow.trigger_source === 'story_mention' ? (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              <span className="font-bold text-gray-700">
                                스토리 @태그 시 즉시 실행
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Key className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="font-bold">"{flow.trigger_config?.keyword}"</span>
                              <span className="text-xs text-gray-400">에 반응</span>
                            </div>
                          )}
                          <div className="h-3 w-px bg-gray-200 hidden sm:block"></div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <span className="text-xs font-medium text-gray-400">작동 채널:</span>
                            <span className={`text-xs font-bold ${flow.trigger_source === 'comment' ? 'text-purple-600' : flow.trigger_source === 'dm' ? 'text-blue-600' : 'text-green-600'}`}>
                              {flow.trigger_source === 'comment' ? '댓글' : flow.trigger_source === 'dm' ? 'DM' : flow.trigger_source === 'story_mention' ? 'DM (자동)' : '전체 채널'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 pl-7 sm:pl-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleFlowActive(flow)}
                        className={`h-9 px-4 rounded-lg font-bold text-xs transition-all ${flow.is_active ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-gray-900 text-white hover:bg-gray-800 border-none'}`}
                      >
                        {flow.is_active ? '중단' : '활성화'}
                      </Button>

                      <div className="flex items-center border-l border-gray-100 pl-3 ml-1 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          onClick={() => {
                            const frontendNodes = flow.actions.map((action, idx) => {
                              const nodeId = (idx === 0) ? 'start' : `node_${Date.now()}_${idx}`;
                              if (action.type === 'wait' || action.type === 'delay') {
                                return { id: nodeId, type: 'delay', content: (action.seconds || 1).toString(), buttons: [] };
                              }
                              if (action.type === 'add_tag') {
                                return { id: nodeId, type: 'tag', tag: action.tag, content: '', buttons: [] };
                              }
                              if (action.type === 'send_image') {
                                return { id: nodeId, type: 'image', url: action.url, content: '', buttons: [] };
                              }
                              return {
                                id: nodeId,
                                type: 'message',
                                content: action.content,
                                buttons: action.buttons?.map((b, bidx) => ({
                                  id: `btn_${bidx}`,
                                  label: b.label,
                                  response: b.payload?.startsWith('TEXT:') ? b.payload.substring(5) : '',
                                  url: b.url || ''
                                })) || []
                              };
                            });

                            setFlowForm({
                              id: flow.id,
                              name: flow.name,
                              trigger_source: flow.trigger_source || 'all',
                              keyword: flow.trigger_config?.keyword || '',
                              match_type: flow.trigger_config?.match_type || 'contains',
                              nodes: frontendNodes.length > 0 ? frontendNodes : [{ id: 'start', type: 'message', content: '', buttons: [] }],
                              is_active: flow.is_active
                            });
                            setShowFlowModal(true);
                          }}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => deleteFlow(flow.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )
        }
      </div>
    );
  };
  const renderScenarioModal = () => {
    if (!showScenarioModal) return null;

    const scenarios = [
      {
        id: 'custom',
        title: '커스텀 시나리오 빌더',
        description: '원하는 트리거와 응답 흐름을 백지 상태에서 자유롭게 직접 설계합니다.',
        icon: <Zap className="w-8 h-8 text-indigo-600" />,
        color: 'indigo'
      },
      {
        id: 'story_mention',
        title: '스토리 멘션 감사',
        description: "회원님이 스토리에 소환(Mention)되는 즉시 감사의 메시지와 혜택을 전송합니다.",
        icon: <Camera className="w-8 h-8 text-pink-500" />,
        color: 'pink'
      }
    ];

    const selectScenario = (id) => {
      if (isPremiumFeatureLocked) {
        showPremiumLockToast('프리미엄 요금제로 연장해야 새로운 시나리오를 시작할 수 있습니다.');
        return;
      }

      let initialForm = {
        name: '',
        trigger_source: 'all',
        keyword: '',
        match_type: 'contains',
        nodes: [{ id: 'start', type: 'message', content: '', buttons: [] }],
        is_active: true
      };

      if (id === 'story_mention') {
        initialForm.name = '스토리 멘션 자동 답장';
        initialForm.trigger_source = 'story_mention';
        initialForm.mention_sources = ['story', 'post', 'comment'];
        initialForm.nodes = [
          {
            id: 'start',
            type: 'message',
            content: '저희를 스토리에 언급해주셔서 감사합니다! 😊\n\n감사의 마음을 담아 작은 선물을 준비했어요.'
          }
        ];
      }

      setFlowForm(initialForm);
      setShowScenarioModal(false);
      setShowFlowModal(true);
    };

    return (
      <div
        className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && setShowScenarioModal(false)}
      >
        <div className="relative min-h-full w-full flex justify-center p-4 py-12 pointer-events-none">
          <div className="relative w-full max-w-2xl animate-in zoom-in-95 duration-200 pointer-events-auto">
            <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden rounded-[32px] bg-white w-full relative flex flex-col h-fit max-h-[92vh] my-auto">
              {/* Close Button */}
              <button
                onClick={() => setShowScenarioModal(false)}
                className="absolute right-6 top-6 p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all z-20 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>

              <CardHeader className="p-8 pb-2 text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Workflow className="w-10 h-10 text-indigo-600" />
                </div>
                <CardTitle className="text-3xl font-black text-gray-900 mb-2 tracking-tight">어떤 자동화 시나리오로 시작할까요?</CardTitle>
                <CardDescription className="text-gray-500 font-medium text-lg">브랜드에 가장 필요한 핵심 시나리오를 선택해 보세요.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scenarios.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectScenario(s.id)}
                      className="group relative flex flex-col items-center p-8 rounded-[32px] border-2 border-gray-100 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-center bg-white active:scale-95 h-full"
                    >
                      <div className={`w-16 h-16 rounded-2xl bg-${s.id === 'custom' ? 'indigo' : s.id === 'story_mention' ? 'pink' : 'blue'}-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                        {s.icon}
                      </div>
                      <h4 className="text-xl font-black text-gray-900 mb-2 tracking-tight">{s.title}</h4>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed mb-4">{s.description}</p>
                      <div className="mt-auto flex items-center justify-center gap-2 text-indigo-600 font-black text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>지금 시작하기</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };


  const renderFlowModal = () => {
    const isNew = !flowForm.id;

    const addNode = (type) => {
      // Global node limit (already 10)
      if (flowForm.nodes.length >= 10) {
        showNotify('노드 추가 제한', 'error', '최대 10개까지만 추가할 수 있습니다.');
        return;
      }

      // Specific limit for images (Max 3)
      if (type === 'image') {
        const imageCount = flowForm.nodes.filter(n => n.type === 'image').length;
        if (imageCount >= 3) {
          showNotify('이미지 추가 제한', 'error', '이미지는 최대 3개까지만 보낼 수 있습니다.');
          return;
        }
      }

      const newNode = {
        id: Date.now().toString(),
        type,
        content: '',
        buttons: [],
        tag: '', // for 'tag' type
        url: '',  // for 'image' type
        prompt: '', // for 'ai_message' type
        reply_type: 'dm', // for 'ai_message' type
      };
      setFlowForm({ ...flowForm, nodes: [...flowForm.nodes, newNode] });
    };

    const updateNode = (id, data) => {
      setFlowForm({
        ...flowForm,
        nodes: flowForm.nodes.map(n => n.id === id ? { ...n, ...data } : n)
      });
    };

    const removeNode = (id) => {
      setFlowForm({
        ...flowForm,
        nodes: flowForm.nodes.filter(n => n.id !== id)
      });
    };

    const handleImageUpload = async (e, nodeId) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await safeFetch(`${INSTAGRAM_API_BASE_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        // Construct full URL using the base URL
        const fullUrl = `${INSTAGRAM_API_BASE_URL}${data.url}`;
        updateNode(nodeId, { url: fullUrl });
      } catch (error) {

        alert('이미지 업로드에 실패했습니다. 서버 연결을 확인해주세요.');
      }
    };


    const addButton = (nodeId) => {
      setFlowForm({
        ...flowForm,
        nodes: flowForm.nodes.map(n => {
          if (n.id === nodeId) {
            const newButtons = [...(n.buttons || []), { id: Date.now().toString(), label: '새 버튼', response: '', url: '' }];
            return { ...n, buttons: newButtons };
          }
          return n;
        })
      });
    };

    return (
      <div
        className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && setShowFlowModal(false)}
      >
        <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
          <Card className="w-full max-w-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 border-none overflow-hidden bg-white shadow-purple-500/10 border border-gray-100 h-fit max-h-[92vh] my-auto pointer-events-auto">
            {/* Sticky Header */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-8 px-10 border-b border-gray-100 bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gray-50 text-gray-900 border border-gray-100">
                  <Workflow className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 tracking-tight">
                    {isNew ? '새 자동화 플로우' : '플로우 수정'}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">인터랙티브 캔버스</p>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowFlowModal(false)} className="rounded-lg hover:bg-gray-50 transition-all h-10 w-10 group">
                <X className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              </Button>
            </CardHeader>

            {/* Canvas Scrollable Area */}
            <CardContent className="flex-1 overflow-y-scroll p-10 scrollbar-hide space-y-10 bg-gray-50/20">
              {/* Meta Info Section - Redesigned for Premium UX */}
              <div className="space-y-6">
                <div className="group relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">플로우 정보 설정</label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={flowForm.name}
                      onChange={(e) => setFlowForm({ ...flowForm, name: e.target.value })}
                      placeholder="플로우의 이름을 입력하세요 (예: 신상품 안내)"
                      className="w-full text-xl font-black text-gray-900 placeholder:text-gray-400 border-none bg-indigo-50/60 hover:bg-indigo-50/80 focus:bg-indigo-100/70 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none leading-normal shadow-sm border border-indigo-200/50"
                    />
                  </div>
                  <div className="h-0.5 w-12 bg-gradient-to-r from-indigo-600 to-purple-600 mt-2 rounded-full shadow-sm shadow-indigo-100/50"></div>
                </div>

                {flowForm.trigger_source === 'story_mention' ? (
                  <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-indigo-100 flex-shrink-0">
                      <Zap className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-black text-gray-900 tracking-tight leading-tight mb-1">
                        스토리 멘션 즉시 대응
                      </h4>
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        회원님이 누군가의 스토리에 언급되는 즉시 이 플로우가 자동으로 실행됩니다. 별도의 키워드 설정이 필요하지 않습니다.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                        {flowForm.match_type === 'ai_semantic' ? '트리거 의도 (설명)' : '트리거 키워드'}
                      </label>
                      <div className="relative">
                        {flowForm.match_type === 'ai_semantic' ? (
                          <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-pulse" />
                        ) : (
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                        )}
                        <input
                          type="text"
                          value={flowForm.keyword}
                          onChange={(e) => setFlowForm({ ...flowForm, keyword: e.target.value })}
                          placeholder={flowForm.match_type === 'ai_semantic' ? "예: 가격 및 배송문의" : "예: 가격문의"}
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-indigo-600 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">매칭 방식</label>
                      <div className="relative">
                        <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                          value={flowForm.match_type}
                          onChange={(e) => setFlowForm({ ...flowForm, match_type: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all font-bold text-gray-700 text-sm appearance-none cursor-pointer"
                        >
                          <option value="contains">포함</option>
                          <option value="exact">일치</option>
                          <option value="ai_semantic">AI 시맨틱</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">작동 채널</label>
                      <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                          value={flowForm.trigger_source}
                          onChange={(e) => setFlowForm({ ...flowForm, trigger_source: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-gray-700 text-sm cursor-pointer appearance-none"
                        >
                          <option value="all">전체 (댓글+DM)</option>
                          <option value="comment">댓글 전용</option>
                          <option value="dm">DM 전용</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* The Visual Chain */}
              <div className="relative space-y-8 before:absolute before:left-[23px] before:top-0 before:bottom-0 before:w-0.5 before:bg-indigo-50 before:rounded-full">
                {flowForm.nodes.map((node, index) => (
                  <div key={node.id} className="relative pl-14 group/node">
                    {/* Step Connector Node */}
                    <div className="absolute left-0 top-6 w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center z-10 group-hover/node:border-indigo-200 transition-colors">
                      {node.type === 'message' ? (
                        <MessageSquare className="w-6 h-6 text-purple-600" />
                      ) : node.type === 'tag' ? (
                        <Tag className="w-6 h-6 text-blue-500" />
                      ) : node.type === 'image' ? (
                        <ImageIcon className="w-6 h-6 text-green-500" />
                      ) : node.type === 'ai_message' ? (
                        <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                      ) : (
                        <Clock className="w-6 h-6 text-pink-500" />
                      )}
                      <span className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-gray-900 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                        {index + 1}
                      </span>
                    </div>

                    {/* Bubble Content */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-indigo-100 transition-all duration-300 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className="text-gray-400 border-gray-200 font-bold text-[9px] tracking-wide uppercase px-2 py-0.5">
                          {node.type === 'message' ? '메시지' : node.type === 'tag' ? 'CRM 태그' : node.type === 'image' ? '이미지' : node.type === 'ai_message' ? 'AI 메시지' : '지연'} 액션
                        </Badge>
                        {flowForm.nodes.length > 1 && (
                          <button onClick={() => removeNode(node.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {node.type === 'tag' ? (
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">자동으로 부여할 태그</label>
                          <input
                            type="text"
                            value={node.tag || ''}
                            onChange={(e) => updateNode(node.id, { tag: e.target.value })}
                            placeholder="예: 관심고객, 이벤트참여"
                            className="w-full px-5 py-3 border border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 font-bold bg-gray-50/50"
                          />
                        </div>
                      ) : node.type === 'image' ? (
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">이미지 업로드</label>

                          {!node.url ? (
                            <>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, node.id)}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                              />
                              <div className="flex items-center gap-2 py-1">
                                <div className="h-px bg-gray-100 flex-1"></div>
                                <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest">또는 URL 직접 입력</span>
                                <div className="h-px bg-gray-100 flex-1"></div>
                              </div>
                              <input
                                type="text"
                                value={node.url || ''}
                                onChange={(e) => updateNode(node.id, { url: e.target.value })}
                                placeholder="https://..."
                                className="w-full px-5 py-3 border border-gray-100 rounded-xl focus:outline-none focus:border-green-500 font-bold bg-gray-50/50 text-sm"
                              />
                            </>
                          ) : (
                            <div className="relative">
                              <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative group bg-gray-50">
                                <img src={node.url} alt="Flow preview" className="w-full h-full object-contain" />

                                {/* Hover Overlay with Filename & Actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                  <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 max-w-[80%] truncate">
                                    {node.url.split('/').pop()}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateNode(node.id, { url: '' })}
                                    className="h-8 text-xs font-bold"
                                  >
                                    이미지 변경 / 삭제
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : node.type === 'ai_message' ? (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> AI 응대 지시사항 (프롬프트)
                            </label>
                            <textarea
                              value={node.prompt || ''}
                              onChange={(e) => updateNode(node.id, { prompt: e.target.value })}
                              placeholder="예: 고객이 가격을 물어보면 친절하게 홈페이지 링크(example.com)를 안내해줘."
                              rows={3}
                              className="w-full px-5 py-4 border border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 font-bold bg-indigo-50/30 text-indigo-900 placeholder:text-indigo-200 resize-none leading-relaxed"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">답장 채널 방식</label>
                            <div className="flex gap-2">
                              {['dm', 'comment', 'both'].map((type) => (
                                <button
                                  key={type}
                                  onClick={() => updateNode(node.id, { reply_type: type })}
                                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${node.reply_type === type
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                                    }`}
                                >
                                  {type === 'dm' ? 'DM으로 답장' : type === 'comment' ? '댓글로 답장' : 'DM + 댓글 모두'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <textarea
                          value={node.content}
                          onChange={(e) => updateNode(node.id, { content: e.target.value })}
                          placeholder={node.type === 'message' ? "여기에 응답 메시지를 입력하세요..." : "지연 시간(초 단위, 예: 2)"}
                          rows={node.type === 'message' ? 3 : 1}
                          className="w-full p-0 border-none focus:ring-0 text-lg font-bold text-gray-800 placeholder:text-gray-200 bg-transparent resize-none leading-relaxed"
                        />
                      )}

                      {/* Interactive Buttons Slot */}
                      {node.type === 'message' && (
                        <div className="mt-6 pt-5 border-t border-gray-50 flex flex-wrap gap-2">
                          {node.buttons?.map(btn => (
                            <div key={btn.id} className="group/btn relative bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-3 min-w-[200px] hover:border-indigo-200 transition-all">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">버튼 라벨</label>
                                <input
                                  value={btn.label}
                                  onChange={(e) => {
                                    const newBtns = node.buttons.map(b => b.id === btn.id ? { ...b, label: e.target.value } : b);
                                    updateNode(node.id, { buttons: newBtns });
                                  }}
                                  placeholder="버튼 이름 (예: 위치)"
                                  className="bg-white border border-gray-200 text-gray-900 px-3 py-1.5 rounded-lg text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">자동 답장 (옵션)</label>
                                <input
                                  value={btn.response || ''}
                                  onChange={(e) => {
                                    const newBtns = node.buttons.map(b => b.id === btn.id ? { ...b, response: e.target.value } : b);
                                    updateNode(node.id, { buttons: newBtns });
                                  }}
                                  placeholder="메시지 내용..."
                                  className="bg-white border border-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-400 transition-all"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">링크 URL (옵션)</label>
                                <input
                                  value={btn.url || ''}
                                  onChange={(e) => {
                                    const newBtns = node.buttons.map(b => b.id === btn.id ? { ...b, url: e.target.value } : b);
                                    updateNode(node.id, { buttons: newBtns });
                                  }}
                                  placeholder="https://..."
                                  className="bg-white border border-gray-100 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-400 transition-all"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const newBtns = node.buttons.filter(b => b.id !== btn.id);
                                  updateNode(node.id, { buttons: newBtns });
                                }}
                                className="absolute -top-4 -right-5 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-all shadow-lg hover:scale-110 z-10"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addButton(node.id)}
                            title="버튼 추가"
                            className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-500 hover:bg-purple-50 transition-all shadow-sm"
                          >
                            <Plus className="w-6 h-6" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Action Choice */}
                <div className="pl-16 flex gap-4">
                  <button
                    onClick={() => addNode('message')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-purple-400 hover:shadow-lg transition-all"
                  >
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <span className="text-[10px] font-black text-gray-400">메시지</span>
                  </button>
                  <button
                    onClick={() => addNode('ai_message')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-indigo-500 hover:shadow-lg transition-all"
                  >
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <span className="text-[10px] font-black text-gray-400">AI 메시지</span>
                  </button>
                  <button
                    onClick={() => addNode('delay')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-pink-400 hover:shadow-lg transition-all"
                  >
                    <Clock className="w-5 h-5 text-pink-500" />
                    <span className="text-[10px] font-black text-gray-400">지연</span>
                  </button>
                  <button
                    onClick={() => addNode('tag')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-blue-400 hover:shadow-lg transition-all"
                  >
                    <Tag className="w-5 h-5 text-blue-500" />
                    <span className="text-[10px] font-black text-gray-400">태그</span>
                  </button>
                  <button
                    onClick={() => addNode('image')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-green-400 hover:shadow-lg transition-all"
                  >
                    <ImageIcon className="w-5 h-5 text-green-500" />
                    <span className="text-[10px] font-black text-gray-400">이미지</span>
                  </button>
                </div>
              </div>
            </CardContent>

            {/* Sticky Footer */}
            <CardFooter className="px-10 py-6 border-t border-gray-100 bg-white flex justify-between items-center z-10">
              <div className="hidden md:flex"></div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowFlowModal(false)} className="rounded-xl px-6 h-10 text-gray-400 hover:text-gray-600 font-bold text-sm">
                  취소
                </Button>
                <Button
                  onClick={async () => {
                    const isSpecialTrigger = ['story_mention', 'mention'].includes(flowForm.trigger_source);
                    if (!flowForm.name || (!isSpecialTrigger && !flowForm.keyword)) return;

                    // Convert nodes to backend actions format
                    const backendActions = flowForm.nodes.map(node => {
                      if (node.type === 'delay') {
                        return { type: 'wait', seconds: parseInt(node.content) || 1 };
                      }
                      if (node.type === 'tag') {
                        return { type: 'add_tag', tag: node.tag };
                      }
                      if (node.type === 'image') {
                        return { type: 'send_image', url: node.url };
                      }
                      if (node.type === 'ai_message') {
                        return { type: 'send_ai_message', prompt: node.prompt, reply_type: node.reply_type || 'dm' };
                      }
                      if (node.buttons?.length > 0) {
                        return {
                          type: 'send_rich_message',
                          content: node.content,
                          buttons: node.buttons.map(b => ({
                            label: b.label,
                            payload: b.response ? `TEXT:${b.response}` : `FLOW_${flowForm.id || 'NEW'}_BUTTON_${b.id}`,
                            url: b.url || undefined
                          }))
                        };
                      }
                      return { type: 'send_text', content: node.content };
                    });

                    const success = await saveFlow({
                      ...flowForm,
                      trigger_type: 'keyword',
                      trigger_source: flowForm.trigger_source || 'all',
                      trigger_config: { keyword: flowForm.keyword, match_type: flowForm.match_type || 'exact' },
                      actions: backendActions
                    });
                    if (success) {
                      showNotify('자동화 플로우가 성공적으로 저장되었습니다.');
                      setShowFlowModal(false);
                    }
                  }}
                  disabled={flowsSaving || !flowForm.name || (!['story_mention', 'mention'].includes(flowForm.trigger_source) && !flowForm.keyword)}
                  className="bg-gray-900 text-white rounded-xl px-10 h-12 font-bold text-sm shadow-sm hover:bg-gray-800 transition-all disabled:opacity-30"
                >
                  {flowsSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (isNew ? '플로우 저장' : '변경사항 저장')}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  const renderAiKbModal = () => {
    return (
      <div
        className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && setShowAiKbModal(false)}
      >
        <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
          <Card className="w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300 border-none overflow-hidden bg-white rounded-3xl flex flex-col h-fit max-h-[92vh] my-auto pointer-events-auto">
            <CardHeader className="bg-white p-8 border-b border-gray-100">
              <div className="flex items-center justify-between w-full">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-emerald-100">
                  <FileText className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="flex-1 text-center px-4">
                  <CardTitle className="text-2xl font-black text-emerald-950">AI 참조 파일 설정</CardTitle>
                  <p className="text-sm text-emerald-600 font-bold">참고할 파일을 업로드하여 AI의 지능을 높이세요.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAiKbModal(false)} className="rounded-xl hover:bg-emerald-100 transition-all h-12 w-12 group">
                  <X className="w-6 h-6 text-emerald-800 group-hover:scale-110 transition-transform" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-10 overflow-y-scroll flex-1">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    업로드하신 파일은 AI가 답변을 생성할 때 참고 자료로 사용됩니다.
                    상품 가격표, 운영 매뉴얼, 서비스 소개서 등을 등록해보세요.
                  </p>
                </div>

                {aiKnowledgeBaseUrl ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-emerald-50 rounded-[32px] border-2 border-emerald-100 border-dashed">
                    <div className="p-5 bg-white rounded-3xl shadow-sm mb-4">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <p className="text-xl font-black text-emerald-950 mb-1">{safeString(aiKnowledgeBaseFilename)}</p>
                    <p className="text-sm text-emerald-600 font-bold mb-8 uppercase tracking-widest">Active Knowledge Base</p>

                    <div className="flex flex-col w-full gap-3">
                      <Button
                        className="w-full bg-white text-emerald-600 hover:bg-emerald-100 border-none h-14 rounded-2xl font-black shadow-sm transition-all active:scale-95"
                        onClick={() => {
                          document.getElementById('kb-modal-upload').click();
                        }}
                      >
                        파일 교체하기
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full text-rose-500 hover:bg-rose-50 h-14 rounded-2xl font-bold transition-all"
                        onClick={removeAiKb}
                      >
                        현재 파일 삭제
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      id="kb-modal-upload"
                      className="hidden"
                      accept=".txt,.pdf,.docx"
                      onChange={handleAiKbUpload}
                      disabled={aiKbUploading}
                    />
                    <label
                      htmlFor="kb-modal-upload"
                      className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-gray-100 rounded-[40px] hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                    >
                      <div className="p-6 bg-gray-50 rounded-[28px] group-hover:bg-emerald-100 transition-colors mb-6 shadow-sm">
                        {aiKbUploading ? (
                          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                        ) : (
                          <Upload className="w-12 h-12 text-gray-400 group-hover:text-emerald-600" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-black text-2xl text-gray-900 mb-2">참조 파일 업로드</p>
                        <p className="text-sm text-gray-400 font-bold">TXT, PDF, DOCX 형식을 지원합니다 (최대 10MB)</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
              <Button
                onClick={() => {
                  setShowAiKbModal(false);
                  saveAiSettings();
                }}
                className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white hover:opacity-90 font-black px-10 h-14 rounded-2xl text-lg shadow-xl shadow-indigo-200 transition-all active:scale-95 border-none"
              >
                설정 완료 및 저장
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  /* New Preset Selector Modal */
  const PresetSelectorModal = ({ 
    isOpen, 
    onClose, 
    onSelect, 
    initialSelected = [], 
    presetData = REPLY_PRESETS,
    title = "추천 답글 선택",
    description = "원하는 문구들을 체크하여 선택해주세요." 
  }) => {
    const [selectedPresets, setSelectedPresets] = useState([]);

    useEffect(() => {
      if (isOpen) {
        setSelectedPresets(initialSelected);
      }
    }, [isOpen, initialSelected]);

    if (!isOpen) return null;

    const togglePreset = (preset) => {
      setSelectedPresets(prev =>
        prev.includes(preset)
          ? prev.filter(p => p !== preset)
          : [...prev, preset]
      );
    };

    const handleRandomPick = () => {
      const shuffled = [...presetData].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, Math.min(10, presetData.length));
      setSelectedPresets(picked);
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-gray-100 relative flex justify-center items-center bg-gray-50/50 rounded-t-3xl text-center">
            <div>
              <h3 className="text-xl font-black text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 font-medium">{description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full absolute right-6 top-6">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 border-b border-gray-100 flex justify-end bg-white">
            <Button
              variant="outline"
              onClick={handleRandomPick}
              className="w-auto bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none hover:opacity-90 font-bold px-6 rounded-xl h-10 shadow-sm"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              랜덤 뽑기
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-gray-50/30">
            <div className="grid grid-cols-1 gap-3">
              {/* Custom Added Items (that are not in default presets) */}
              {selectedPresets.filter(p => !presetData.includes(p)).map((customMsg, idx) => (
                <div
                  key={`custom-${idx}`}
                  onClick={() => togglePreset(customMsg)}
                  className="p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 cursor-pointer flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-md border-2 bg-indigo-600 border-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-indigo-900 break-all">{safeString(customMsg)}</span>
                    <span className="ml-2 text-[10px] bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-bold">기존 입력</span>
                  </div>
                </div>
              ))}

              {presetData.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => togglePreset(preset)}
                  className={`
                    p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3
                    ${selectedPresets.includes(preset)
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-gray-100 hover:border-indigo-200 hover:bg-white'}
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                    ${selectedPresets.includes(preset) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}
                  `}>
                    {selectedPresets.includes(preset) && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                  </div>
                  <span className={`text-sm font-medium ${selectedPresets.includes(preset) ? 'text-indigo-900' : 'text-gray-600'}`}>
                    {preset}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-white rounded-b-3xl flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <span className="text-sm font-bold text-gray-500">
              {selectedPresets.length}개 선택됨
            </span>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl font-bold bg-white hover:bg-gray-50 border-gray-200">
                취소
              </Button>
              <Button
                onClick={() => {
                  onSelect(selectedPresets);
                  onClose();
                }}
                disabled={selectedPresets.length === 0}
                className="bg-gray-900 hover:bg-black text-white rounded-xl font-bold px-6 shadow-lg shadow-gray-200 transition-all active:scale-95"
              >
                선택 완료 ({selectedPresets.length})
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderKeywordSettings = () => {
    // Filter replies based on selected scope
    const filteredReplies = keywordReplies.filter(reply => {
      if (selectedMedia) {
        return String(reply.media_id) === String(selectedMedia.id);
      }
      return !reply.media_id; // Global
    });

    const getImageUrl = (url) => {
      if (!url) return null;
      if (typeof url !== 'string') return null;
      if (url.startsWith('http')) return url;
      return `${INSTAGRAM_API_BASE_URL}${url}`;
    };

    return (
      <div className="space-y-8 p-0 sm:p-2">
        <div className="flex flex-col items-center justify-center text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3 text-center">
            키워드 답장 설정
          </h1>
          <p className="text-gray-500 font-medium max-w-2xl text-center px-4">
            특정 키워드 발견 시 자동으로 전송될 대댓글과 DM 답변을 한 번에 구성하세요.
          </p>
        </div>

        {/* Media Selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">키워드를 설정할 게시물 선택</label>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            <div
              onClick={() => {
                if (selectedMedia !== null) {
                  setSelectedMedia(null);
                }
              }}
              className={`flex-shrink-0 w-24 h-24 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${!selectedMedia ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'
                }`}
            >
              <span className="text-[11px] font-bold text-center text-gray-900">전체 설정<br />(모든 게시물)</span>
            </div>
            {mediaListLoading ? (
              <div className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              mediaList.map((media) => (
                <div
                  key={media.id}
                  onClick={() => {
                    if (selectedMedia?.id !== media.id) {
                      setSelectedMedia(media);
                    }
                  }}
                  className={`flex-shrink-0 w-24 h-24 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${selectedMedia?.id === media.id ? 'border-purple-600 ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-300'
                    }`}
                >
                  <img
                    src={media.url}
                    alt="ig-post"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) return; // Prevent duplicate fallbacks
                      
                      const fallback = document.createElement('div');
                      fallback.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:#f3f4f6;';
                      fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><span style="font-size:9px;color:#9ca3af;font-weight:600;text-align:center;">미리보기 불가</span>';
                      e.target.parentElement.appendChild(fallback);
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-8 mb-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
              {selectedMedia ? '게시물별 개별 답장' : '전체 설정 (모든 게시물)'}
            </h2>
            <p className="text-gray-500 font-medium max-w-2xl">
              {selectedMedia ? '이 게시물에 특화된 자동 응답 규칙을 관리합니다.' : '개별 설정이 없는 모든 게시물에 공통 적용되는 규칙입니다.'}
            </p>
          </div>
          <Button
            onClick={() => {
              const newReply = {
                keyword: '',
                link: '',
                message: '',
                media_id: selectedMedia ? selectedMedia.id : null,
                is_active: true,
                is_follow_check: false,
                interaction_type: 'immediate',
                button_text: '자세히 보기 🔍',
                card_title: '반가워요! 댓글 남겨주셔서 감사합니다.',
                card_subtitle: '상세 내용을 확인하려면 아래 버튼을 클릭하세요.',
                card_image_url: null,
                reply_variations: []
              };
              setKeywordReplies([...keywordReplies, newReply]);
            }}
            className="bg-indigo-600 text-white hover:bg-indigo-700 h-14 px-10 rounded-2xl font-black text-base shadow-xl shadow-indigo-100 transition-all active:scale-95 group"
          >
            <Plus className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            새 키워드 추가하기
          </Button>
        </div>

        {keywordRepliesLoading ? (
          <div className="flex flex-col gap-6">
            {[1, 2, 3].map((_, i) => (
              <Card key={i} className="animate-pulse border-none shadow-xl bg-white/60 backdrop-blur-3xl rounded-[2.5rem] p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="w-32 h-6 bg-gray-200 rounded-lg"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-12 bg-gray-100 rounded-2xl"></div>
                    <div className="w-3/4 h-12 bg-gray-100 rounded-2xl"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredReplies.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-100 bg-white/50 rounded-[2.5rem] py-24 shadow-none">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6">
                <MessageSquareText className="w-12 h-12 text-gray-300" />
              </div>
              <p className="font-black text-2xl text-gray-900 mb-2">등록된 키워드가 없습니다.</p>
              <p className="text-gray-500 font-medium">새 키워드를 추가하여 편리한 자동응답을 시작해보세요.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {filteredReplies.map((reply) => {
              const masterIndex = keywordReplies.indexOf(reply);
              if (masterIndex === -1) return null;
              const replyKey = masterIndex; 
              const activeTab = activeTabMap[replyKey] || 'private';

              return (
                <div
                  key={masterIndex}
                  className={`group relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] border transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(79,70,229,0.1)] ${reply.is_active ? 'border-gray-100 shadow-sm' : 'border-gray-200 shadow-none grayscale-[0.5] opacity-80'}`}
                >
                  <div className="p-8 md:p-10">
                    {/* Card Top: Keyword & Activation Toggle */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
                      <div className="w-full max-w-sm space-y-2">
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <Tag className="w-3.5 h-3.5 text-indigo-500" />
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">감지할 키워드</label>
                        </div>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-indigo-500 pointer-events-none" />
                          <input
                            type="text"
                            value={reply.keyword}
                            onChange={(e) => {
                              const updated = [...keywordReplies];
                              updated[masterIndex].keyword = e.target.value;
                              setKeywordReplies(updated);
                            }}
                            className="w-full pl-12 pr-4 h-14 bg-gray-50/50 border border-transparent rounded-2xl text-base font-black text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-gray-300"
                            placeholder="예: 가격, 정보, 공구링크"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-gray-50/80 p-2 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3 px-2">
                          <span className={`text-xs font-black tracking-tight transition-colors ${reply.is_active ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {reply.is_active ? '활성화됨' : '비활성'}
                          </span>
                          <div
                            onClick={async () => {
                              const updated = [...keywordReplies];
                              updated[masterIndex].is_active = !updated[masterIndex].is_active;
                              setKeywordReplies(updated);
                              await saveKeywordSettings(updated);
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none shadow-inner ${reply.is_active ? 'bg-indigo-600' : 'bg-gray-200'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${reply.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                        </div>
                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          onClick={() => {
                            setKeywordToDelete(reply);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Tab Selection */}
                    <div className="grid grid-cols-2 gap-3 mb-8 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
                      <button
                        onClick={() => setActiveTabMap(prev => ({ ...prev, [replyKey]: 'private' }))}
                        className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-xs font-black transition-all ${activeTab === 'private'
                          ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-100'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                          }`}
                      >
                        <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'private' ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-gray-400'}`}>
                          <Lock className="w-4 h-4" />
                        </div>
                        비공개 답장 (DM 전송)
                      </button>
                      <button
                        onClick={() => setActiveTabMap(prev => ({ ...prev, [replyKey]: 'public' }))}
                        className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-xs font-black transition-all ${activeTab === 'public'
                          ? 'bg-white text-indigo-600 shadow-md ring-1 ring-indigo-50'
                          : 'text-gray-500 hover:text-indigo-600 hover:bg-white/50'
                          }`}
                      >
                        <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'public' ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-gray-400'}`}>
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        공개 답장 (대댓글 작성)
                      </button>
                    </div>

                    {/* Response Editor Area */}
                    <div className="relative">
                      {activeTab === 'private' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          {/* --- NEW: Smart Interaction Section --- */}
                          <div className="p-6 bg-indigo-50/40 border border-indigo-100/50 rounded-[2.5rem] space-y-6">
                            <div className="flex flex-col items-center justify-center text-center space-y-2">
                              <div>
                                <h4 className="text-base font-black text-indigo-900 leading-tight">스마트 버튼 인터랙션</h4>
                                <p className="text-[10px] text-indigo-400 font-bold mt-1 uppercase tracking-tight">버튼을 클릭하면 상세 정보를 전송합니다.</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-indigo-100/30">
                              <button
                                onClick={() => {
                                  const updated = [...keywordReplies];
                                  updated[masterIndex].interaction_type = 'immediate';
                                  updated[masterIndex].is_follow_check = false;
                                  setKeywordReplies(updated);
                                }}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${reply.interaction_type !== 'follow_check' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                <Zap className="w-4 h-4" />
                                <span className="text-[11px] font-black">즉시 전송</span>
                              </button>
                              <button
                                onClick={() => {
                                  const updated = [...keywordReplies];
                                  updated[masterIndex].interaction_type = 'follow_check';
                                  updated[masterIndex].is_follow_check = true;
                                  setKeywordReplies(updated);
                                }}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all relative overflow-hidden ${reply.interaction_type === 'follow_check' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                <UserCheck className="w-4 h-4" />
                                <span className="text-[11px] font-black">팔로우 확인 필수</span>
                              </button>
                            </div>

                            {/* --- NEW: Follow Reminder Message Customization --- */}
                            {reply.interaction_type === 'follow_check' && (
                              <div className="space-y-3 p-5 bg-white/40 rounded-3xl border border-white/50 shadow-inner animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 px-1">
                                    <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">팔로우 안내 문구 (미팔로워용)</label>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setTargetReplyForModal(reply);
                                      setPresetModalType('follow_fail');
                                      setShowPresetModal(true);
                                    }}
                                    className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white font-black text-xs h-9 px-4 rounded-xl shadow-sm transition-all"
                                  >
                                    <Sparkles className="w-3 h-3 mr-2" />
                                    추천 문구 꾸러미
                                  </Button>
                                </div>
                                <textarea
                                  value={reply.follow_fail_message || ''}
                                  onChange={(e) => {
                                    const updated = [...keywordReplies];
                                    updated[masterIndex].follow_fail_message = e.target.value;
                                    setKeywordReplies(updated);
                                  }}
                                  className="w-full p-4 bg-white/80 border border-indigo-50 rounded-2xl text-[11px] font-bold text-indigo-900 h-24 resize-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm placeholder:text-gray-300"
                                  placeholder="예: 정보를 받으시려면 먼저 저희 계정을 팔로우해주세요! 😊"
                                />
                                <p className="text-[9px] text-gray-400 font-medium px-1">
                                  * 사용자가 팔로우하지 않은 경우에만 전송되는 전용 안내 문구입니다.
                                </p>
                              </div>
                            )}
                            
                            <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                              {/* Card Image Upload */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                                  <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">카드 커버 이미지</label>
                                </div>
                                <div className="flex items-center gap-4">
                                  {reply.card_image_url ? (
                                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-indigo-100 shadow-sm transition-transform hover:scale-105">
                                      <img src={getImageUrl(reply.card_image_url)} alt="Card Cover" className="w-full h-full object-cover" />
                                      <button 
                                        onClick={() => {
                                          const updated = [...keywordReplies];
                                          updated[masterIndex].card_image_url = null;
                                          setKeywordReplies(updated);
                                        }}
                                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => document.getElementById(`card-image-upload-${masterIndex}`).click()}
                                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-indigo-100 bg-white/50 flex flex-col items-center justify-center gap-2 text-indigo-400 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                                    >
                                      <div className="p-2 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform">
                                        <ImagePlus className="w-5 h-5 text-indigo-500" />
                                      </div>
                                      <span className="text-[10px] font-black uppercase tracking-tighter">이미지 추가</span>
                                    </button>
                                  )}
                                  <input 
                                    id={`card-image-upload-${masterIndex}`}
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files[0];
                                      if (!file) return;
                                      
                                      const formData = new FormData();
                                      formData.append('file', file);
                                      try {
                                        const res = await apiFetch('/api/upload', {
                                          method: 'POST',
                                          body: formData,
                                        }, true);
                                        const data = await res.json();
                                        const updated = [...keywordReplies];
                                        updated[masterIndex].card_image_url = data.url;
                                        setKeywordReplies(updated);
                                      } catch (err) {
                                        showNotify('이미지 업로드에 실패했습니다.', 'error');
                                      }
                                    }}
                                  />
                                  <div className="flex-1">
                                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                                      인스타그램 카드 상단에 노출될 이미지를 선택하세요.<br/> 
                                      <span className="text-indigo-500 uppercase font-black tracking-tighter">추천 비율: 1.91:1 또는 1:1</span>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 px-1">
                                    <Palette className="w-3.5 h-3.5 text-indigo-400" />
                                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">버튼 문구 설정</label>
                                  </div>
                                  <input
                                    type="text"
                                    value={reply.button_text || '자세히 보기 🔍'}
                                    onChange={(e) => {
                                      const updated = [...keywordReplies];
                                    updated[masterIndex].button_text = e.target.value;
                                    setKeywordReplies(updated);
                                  }}
                                  className="w-full px-4 h-12 bg-white border border-indigo-100 rounded-xl text-xs font-semibold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                  placeholder="버튼에 표시될 문구를 입력하세요... (예: 신청하기)"
                                />
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 px-1">
                                    <Type className="w-3.5 h-3.5 text-indigo-400" />
                                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">첫 카드 제목 (Bold)</label>
                                  </div>
                                  <input
                                    type="text"
                                    value={reply.card_title || ''}
                                    onChange={(e) => {
                                      const updated = [...keywordReplies];
                                      updated[masterIndex].card_title = e.target.value;
                                      setKeywordReplies(updated);
                                    }}
                                    className="w-full px-4 h-12 bg-white border border-indigo-100 rounded-xl text-xs font-semibold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    placeholder="카드의 제목을 입력하세요... (최대 80자)"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 px-1">
                                    <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
                                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">첫 카드 부제목 (Gray)</label>
                                  </div>
                                  <input
                                    type="text"
                                    value={reply.card_subtitle || ''}
                                    onChange={(e) => {
                                      const updated = [...keywordReplies];
                                      updated[masterIndex].card_subtitle = e.target.value;
                                      setKeywordReplies(updated);
                                    }}
                                    className="w-full px-4 h-12 bg-white border border-indigo-100 rounded-xl text-xs font-semibold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    placeholder="카드 하단에 표시될 짧은 설명을 입력하세요..."
                                  />
                                </div>
                                
                                {/* Luxury Card Preview */}
                                <div className="mt-6 p-6 bg-[#0f0f0f] rounded-[2.5rem] shadow-2xl relative overflow-hidden group/preview border border-white/5 mx-auto max-w-sm">
                                  <div className="bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 ring-1 ring-white/5 flex flex-col">
                                    {/* Card Preview Image */}
                                    <div className="aspect-[1.91/1] w-full bg-gray-800/50 relative overflow-hidden">
                                      {reply.card_image_url ? (
                                        <img src={getImageUrl(reply.card_image_url)} alt="Preview" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ImageIcon className="w-8 h-8 text-white/10" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Card Preview Text Content */}
                                    <div className="p-4 space-y-1.5 bg-gradient-to-b from-[#1a1a1a] to-[#161616]">
                                      <p className="text-[13px] text-white font-black leading-snug tracking-tight">
                                        {reply.card_title || '첫 카드 제목을 입력하세요'}
                                      </p>
                                      <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                                        {reply.card_subtitle || '카드 부제목을 보강해주세요'}
                                      </p>
                                    </div>

                                    {/* Card Preview Button */}
                                    <div className="px-4 pb-4 mt-auto">
                                      <div className="w-full py-2.5 bg-white/10 rounded-xl text-center border border-white/10 group-hover/preview:bg-white/20 transition-all cursor-default">
                                        <span className="text-[11px] font-black text-white tracking-tight">{reply.button_text || '자세히 보기 🔍'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Glass reflection effect */}
                                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 translate-y-[100%] group-hover/preview:translate-y-[-100%] transition-transform duration-1000" />
                                </div>
                              </div>
                            </div>
                          </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                              <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">상세 정보 메시지</label>
                            </div>
                            <textarea
                              value={reply.message}
                              onChange={(e) => {
                                const updated = [...keywordReplies];
                                updated[masterIndex].message = e.target.value;
                                setKeywordReplies(updated);
                              }}
                              className="w-full p-5 bg-white border border-gray-100 rounded-[2rem] text-sm font-medium h-32 resize-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
                              placeholder="버튼 클릭 후 전송될 상세 내용을 입력하세요..."
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                              <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                              <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">상세 확인 링크 (전환용)</label>
                            </div>
                            <div className="relative">
                              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-300" />
                              <input
                                type="text"
                                value={reply.link || ''}
                                onChange={(e) => {
                                  const updated = [...keywordReplies];
                                  updated[masterIndex].link = e.target.value;
                                  setKeywordReplies(updated);
                                }}
                                className="w-full pl-12 h-14 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
                                placeholder="https://example.com/product-link"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                              <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                              <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">사진 첨부 (최대 3장)</label>
                            </div>
                            <div className="flex flex-wrap gap-4 min-h-[128px]">
                              {/* [MULTI-IMAGE SUPPORT] - Render all attached images */}
                              {((reply.image_urls || []).concat(reply.image_url ? [reply.image_url] : []))
                                .filter((url, idx, self) => url && self.indexOf(url) === idx)
                                .map((url, imgIdx) => (
                                <div key={imgIdx} className="relative group overflow-hidden rounded-[1.5rem] border-2 border-indigo-100 shadow-lg bg-gray-50 w-32 h-32 transform hover:scale-[1.05] transition-all duration-500">
                                  <img
                                    src={getImageUrl(url)}
                                    alt={`Attached ${imgIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <button
                                      onClick={async () => {
                                        const updated = [...keywordReplies];
                                        if (updated[masterIndex].image_urls) {
                                          updated[masterIndex].image_urls = updated[masterIndex].image_urls.filter(u => u !== url);
                                        }
                                        if (updated[masterIndex].image_url === url) {
                                          updated[masterIndex].image_url = null;
                                        }
                                        setKeywordReplies(updated);
                                        await saveKeywordSettings(updated);
                                      }}
                                      className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg active:scale-90"
                                      title="이미지 제거"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Upload Button */}
                              {(() => {
                                const allImages = [...(reply.image_urls || []), ...(reply.image_url ? [reply.image_url] : [])];
                                const uniqueImages = [...new Set(allImages)].filter(Boolean);
                                return uniqueImages.length < 3;
                              })() && (
                                <div className="w-32 h-32 relative">
                                  <input
                                    type="file"
                                    className="hidden"
                                    id={`keyword-img-upload-${masterIndex}`}
                                    accept="image/*"
                                    onChange={(e) => handleKeywordImageUpload(e, masterIndex)}
                                  />
                                  <label
                                    htmlFor={`keyword-img-upload-${masterIndex}`}
                                    className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-200 rounded-[1.5rem] bg-gray-50/50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all cursor-pointer group ${keywordImageUploading[masterIndex] ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    {keywordImageUploading[masterIndex] ? (
                                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                    ) : (
                                      <>
                                        <div className="p-2.5 bg-white rounded-lg shadow-sm border border-gray-100 mb-1 group-hover:scale-110 transition-transform">
                                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 group-hover:text-indigo-900 tracking-tighter text-center">사진 추가</p>
                                      </>
                                    )}
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100/50">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
                              <div className="text-center sm:text-left">
                                <h4 className="text-base font-black text-indigo-900 leading-tight">다양한 대댓글 랜덤 응답</h4>
                                <p className="text-xs text-indigo-400 font-bold mt-1">인스타그램 봇 감지를 방지하기 위해 여러 문구를 활용하세요.</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTargetReplyForModal(reply);
                                  setPresetModalType('reply');
                                  setShowPresetModal(true);
                                }}
                                className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white font-black text-xs h-11 px-5 rounded-xl shadow-sm transition-all"
                              >
                                <Sparkles className="w-4 h-4 mr-2" />
                                추천 문구 꾸러미
                              </Button>
                            </div>

                            <textarea
                              value={reply.reply_variations ? reply.reply_variations.join('\n') : ''}
                              onChange={(e) => {
                                const updated = [...keywordReplies];
                                updated[masterIndex].reply_variations = e.target.value.split('\n');
                                setKeywordReplies(updated);
                              }}
                              className="w-full p-6 bg-white border border-indigo-100 rounded-[2rem] text-sm font-bold text-indigo-900 h-44 resize-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                              placeholder={`공개 답글 내용을 한 줄씩 입력하세요.\n엔터(줄바꿈)로 구분하여 무작위 전송될 문장을 추가할 수 있습니다.`}
                            />

                            <div className="mt-6 flex flex-wrap gap-2">
                              {reply.reply_variations?.filter(v => v.trim()).map((v, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-indigo-100 text-indigo-600 text-[10px] font-black shadow-sm group/tag">
                                  <span className="truncate max-w-[200px]">{v}</span>
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredReplies.length > 0 && (
          <div className="sticky bottom-8 left-0 right-0 flex justify-center z-20 pointer-events-none py-10 mt-10">
            <Button
              onClick={saveKeywordSettings}
              disabled={keywordRepliesSaving}
              className="pointer-events-auto h-16 px-12 rounded-full bg-gray-900 hover:bg-black text-white text-lg font-black shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_60px_-10px_rgba(0,0,0,0.4)] transition-all active:scale-95 group border border-white/10 backdrop-blur-sm"
            >
              {keywordRepliesSaving ? (
                <div className="flex items-center gap-3">
                  <RotateCw className="w-6 h-6 animate-spin" />
                  <span className="tracking-tighter">변경사항 저장 중...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="tracking-tighter">모든 설정 저장하기</span>
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Preset Modal Injection */}
        <PresetSelectorModal
          isOpen={showPresetModal && presetModalType === 'reply'}
          onClose={() => setShowPresetModal(false)}
          initialSelected={targetReplyForModal?.reply_variations || []}
          presetData={REPLY_PRESETS}
          title="추천 문구 꾸러미"
          description="원하는 문구들을 체크하여 선택해주세요."
          onSelect={(selected) => {
            if (targetReplyForModal) {
              setKeywordReplies(prev => {
                const updated = [...prev];
                const index = updated.findIndex(r => r === targetReplyForModal);
                if (index === -1) return prev;

                const currentVariations = updated[index].reply_variations || [];
                const merged = [...new Set([...currentVariations, ...selected])].filter(s => s.trim());

                updated[index] = {
                  ...updated[index],
                  reply_variations: merged
                };
                return updated;
              });
            }
          }}
        />

        <PresetSelectorModal
          isOpen={showPresetModal && presetModalType === 'follow_fail'}
          onClose={() => setShowPresetModal(false)}
          initialSelected={targetReplyForModal?.follow_fail_message ? targetReplyForModal.follow_fail_message.split('\n').filter(Boolean) : []}
          presetData={FOLLOW_REMINDER_PRESETS}
          title="팔로우 안내 문구 추천"
          description="원하는 팔로우 안내 문구를 선택해주세요. (여러 개 선택 시 결합됩니다)"
          onSelect={(selected) => {
            if (targetReplyForModal) {
              setKeywordReplies(prev => {
                const updated = [...prev];
                const index = updated.findIndex(r => r === targetReplyForModal);
                if (index === -1) return prev;

                updated[index] = {
                  ...updated[index],
                  follow_fail_message: selected.join('\n')
                };
                return updated;
              });
            }
          }}
        />
      </div>
    );
  };

  // Render AI Settings
  const renderAiSettings = () => (
    <>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="w-full flex flex-col items-center justify-center text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3 text-center">
            AI 센터
          </h1>
          <p className="text-gray-500 font-medium max-w-2xl text-center px-4">인스타그램 고객에게 응답할 AI 어시스턴트의 페르소나와 동작 규칙을 설정합니다.</p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 p-8 border-b border-indigo-100/50">
              <div className="grid grid-cols-1 lg:grid-cols-[120px_1fr_180px] items-center gap-6">
                  {/* Left Spacer - Smaller than button side to nudge center towards start */}
                  <div className="hidden lg:block"></div>

                  <div className="text-center flex-1 min-w-0">
                    <CardTitle className="text-2xl font-black text-indigo-950 truncate">AI 페르소나 (시스템 프롬프트)</CardTitle>
                    <p className="text-sm text-indigo-400 font-bold text-center">AI가 고객과 어떤 어투로 대화할지 상세하게 알려주세요.</p>
                  </div>

                  <div className="flex justify-center lg:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowAiKbModal(true)}
                      className="bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold gap-2 rounded-xl h-12 px-5 shadow-sm transition-all active:scale-95"
                    >
                      <FileText className="w-5 h-5" />
                      파일 설정
                      {aiKnowledgeBaseUrl && <Badge className="ml-2 bg-emerald-500 text-[10px] h-5 min-w-5 flex items-center justify-center p-0 px-1 border-none">ON</Badge>}
                    </Button>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="예: 당신은 '스테이무드 스테이'의 공식 AI 어시스턴트입니다. 항상 친절하고 정중한 어투를 사용하며, 예약 문의에 답변하고 주변 맛집을 추천해주세요."
                className="w-full h-96 p-8 rounded-3xl border-2 border-gray-100 focus:border-indigo-400 focus:ring-0 transition-all text-gray-800 text-xl leading-relaxed shadow-inner resize-none bg-gray-50/30"
                disabled={aiPromptLoading || aiPromptSaving}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Operational Settings */}
        <div className="space-y-8">
          {/* Master Toggle Card */}
          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden transform transition-all hover:scale-[1.01]">
            <div className="p-6 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
              <div className="flex items-center gap-3">
                <span className={`text-base font-black ${isAiActive ? 'text-indigo-950' : 'text-gray-400'}`}>
                  AI 자동 응답 {isAiActive ? '활성화됨' : '비활성'}
                </span>
              </div>
              <button
                onClick={() => {
                  const newState = !isAiActive;
                  setIsAiActive(newState);
                  setTimeout(() => saveAiSettings(newState), 0);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isAiActive ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${isAiActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </Card>

          <Card className="border-none shadow-xl rounded-3xl bg-white">
            <CardHeader className="p-6 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-purple-600" />
                <CardTitle className="text-lg font-black text-gray-900">운영 시간 설정</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-sm text-gray-500 font-medium">인공지능이 자동으로 응답을 처리할 시간대를 지정합니다.</p>

              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '🕒 24시간', start: '00:00', end: '23:59' },
                    { label: '🏢 업무 시간 (09~18)', start: '09:00', end: '18:00' },
                    { label: '🌙 야간 운영 (18~09)', start: '18:00', end: '09:00' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setAiOperateStart(preset.start);
                        setAiOperateEnd(preset.end);
                      }}
                      className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black border border-purple-100/50 transition-all active:scale-95 shadow-sm"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">시작 시간</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select
                        value={aiOperateStart}
                        onChange={(e) => setAiOperateStart(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl pl-11 p-4 text-sm focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                      >
                        {Array.from({ length: 48 }).map((_, i) => {
                          const h = Math.floor(i / 2).toString().padStart(2, '0');
                          const m = (i % 2 === 0 ? '00' : '30');
                          const time = `${h}:${m}`;
                          return <option key={time} value={time}>{time}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">종료 시간</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select
                        value={aiOperateEnd}
                        onChange={(e) => setAiOperateEnd(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl pl-11 p-4 text-sm focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                      >
                        {Array.from({ length: 48 }).map((_, i) => {
                          const h = Math.floor(i / 2).toString().padStart(2, '0');
                          const m = (i % 2 === 0 ? '00' : '30');
                          const time = `${h}:${m}`;
                          return <option key={time} value={time}>{time}</option>;
                        })}
                        <option value="23:59">23:59</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => saveAiSettings()}
                  disabled={aiPromptSaving}
                  className="w-full bg-gradient-to-br from-indigo-600 to-purple-700 hover:opacity-90 text-white font-black h-12 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 border-none"
                >
                  {aiPromptSaving ? '저장 중...' : '시간 설정 저장'}
                </Button>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                <p className="text-xs text-purple-700 leading-relaxed">
                  <span className="font-black">TIP:</span> 밤늦은 시간이나 주말 등 직접 응답이 어려운 시간대에만 AI를 활성화하여 CS 부담을 덜 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden relative">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black">설정 완료</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <p className="text-sm text-indigo-100 font-medium leading-relaxed">
                변경하신 페르소나와 운영 시간 설정은 저장 즉시 모든 인스타그램 계정에 반영됩니다.
              </p>
              <Button
                className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-black h-14 rounded-2xl text-lg shadow-xl transition-all active:scale-95"
                onClick={saveAiSettings}
                disabled={aiPromptLoading || aiPromptSaving}
              >
                {aiPromptSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    저장하는 중...
                  </>
                ) : (
                  '변경사항 저장하기'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-8 bg-indigo-50 border-2 border-white rounded-[40px] shadow-sm flex flex-col items-center text-center gap-4 relative overflow-hidden mt-12">
        <div className="absolute right-0 top-0 h-full w-32 bg-indigo-100/30 skew-x-12 translate-x-16"></div>
        <div className="p-4 bg-white rounded-3xl shadow-md border border-indigo-100 relative z-10 w-fit">
          <ShieldCheck className="w-8 h-8 text-green-500" />
        </div>
        <div className="relative z-10">
          <h4 className="font-black text-xl text-indigo-900 mb-2">실시간 자동화 점검</h4>
          <p className="text-indigo-700/80 font-medium max-w-2xl">
            설정을 저장한 후 운영 시간 내에 인스타그램으로 메시지를 보내보세요. 설정한 말투와 적극성에 따라 AI가 실시간으로 고객을 응대하며 CRM 태그를 부여합니다.
          </p>
        </div>
      </div>
    </>
  );


  const renderNotification = () => {
    if (!notification.show) return null;
    // Use the outer safeString for consistency

    return (
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] animate-in slide-in-from-top-full duration-500 max-w-md w-full px-4">
        <div className={`
          flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border bg-white
          ${notification.type === 'success' ? 'border-green-100 shadow-green-500/10' : 'border-red-100 shadow-red-500/10'}
        `}>
          <div className={`p-2.5 rounded-xl ${notification.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-gray-900 tracking-tight leading-tight">{safeString(notification.message)}</p>
            {notification.description && (
              <p className="text-[11px] font-medium text-gray-500 mt-1 leading-snug">{safeString(notification.description)}</p>
            )}
          </div>
          {notification.actionButton && (
            <button
              onClick={() => {
                notification.actionButton.onClick();
                setNotification({ ...notification, show: false });
              }}
              className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all ${notification.type === 'error'
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                }`}
            >
              {notification.actionButton.label}
            </button>
          )}
          <button
            onClick={() => setNotification({ ...notification, show: false })}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderAutomationCenter = () => {
    return (
      <div className="space-y-8 p-0 sm:p-2">
        <div className="flex flex-col items-center justify-center text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3 text-center">
            자동화 센터
          </h1>
          <p className="text-gray-500 font-medium max-w-2xl text-center px-4">
            고객 유입부터 응대까지, 브랜드 맞춤형 인공지능 자동화를 한 곳에서 관리하세요.
          </p>
        </div>

        {/* Sub-Tabs: Bento Style Navigation */}
        <div className="flex items-center justify-center gap-2 mb-10 bg-gray-100/50 p-1.5 rounded-2xl w-fit mx-auto border border-gray-100">
          <button
            onClick={() => setAutomationView('active')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${automationView === 'active'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Zap className={`w-3.5 h-3.5 ${automationView === 'active' ? 'text-indigo-600' : 'text-gray-400'}`} />
            운영 중인 플로우
          </button>
          <button
            onClick={() => setAutomationView('templates')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${automationView === 'templates'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <LayoutGrid className={`w-3.5 h-3.5 ${automationView === 'templates' ? 'text-purple-600' : 'text-gray-400'}`} />
            마케팅 템플릿
          </button>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {automationView === 'active' && (
            <div className="space-y-12">
              {renderFlows()}
            </div>
          )}
          {automationView === 'templates' && (
            <div className="space-y-16">
              <section>
                <div className="flex flex-col items-center justify-center text-center mb-12">
                  <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-2">
                    마케팅 템플릿
                  </h2>
                  <p className="text-sm text-gray-500 font-medium text-center">검증된 마케팅 템플릿을 클릭 한 번으로 시작하세요.</p>
                </div>
                <Campaigns
                  customerId={customerId}
                  onPromoteToFlow={(campaign) => {
                    setFlowForm({
                      name: `[Advanced] ${campaign.type === 'CUSTOM' ? campaign.config?.name : campaign.type}`,
                      trigger_type: 'keyword',
                      trigger_source: campaign.type === 'COMMENT_GROWTH' ? 'comment' : 'all',
                      match_type: 'contains',
                      keyword: campaign.config?.keyword_trigger || '',
                      nodes: [
                        {
                          id: 'start',
                          type: 'message',
                          content: campaign.config?.message || '',
                          buttons: campaign.config?.buttons || []
                        }
                      ],
                      is_active: campaign.is_active
                    });
                    setShowFlowModal(true);
                  }}
                />
              </section>

              <section>
                {renderTemplates()}
              </section>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAccountModal = () => {
    return (
      <div
        className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && setShowAccountModal(false)}
      >
        <div className="relative min-h-full flex items-start justify-center p-4 pt-12 md:pt-20 pointer-events-none">
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col h-fit max-h-[92vh] my-auto overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-2">AIDM과 연결할 인스타그램 계정을 선택해주세요.</h2>
                <p className="text-sm text-gray-600 font-bold">계정이 보이지 않을 경우 인스타그램 계정을 직접 추가할 수 있어요.</p>
              </div>
              <button onClick={() => setShowAccountModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6">

              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-widest">인스타그램 계정</th>
                      <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-widest text-center">서비스 연결</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Current Linked Account */}
                    {customerStatus?.instagram_account && (
                      <tr className="group bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors">
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-black overflow-hidden ring-4 ring-white shadow-sm">
                              {profileImage ? <img src={profileImage} className="w-full h-full object-cover" alt="p" /> : customerStatus.instagram_account.instagram_username.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-gray-900 text-base">@{customerStatus.instagram_account.instagram_username}</div>
                              <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> 서비스 연결됨
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <button
                            onClick={() => setShowDisconnectConfirm(true)}
                            className="bg-white text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-[11px] font-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
                          >
                            연결해제
                          </button>
                        </td>
                      </tr>
                    )}

                    {/* Available Options */}
                    {accountOptions.filter(opt => opt.instagram_username !== customerStatus?.instagram_account?.instagram_username).map((opt, idx) => (
                      <tr key={idx} className="group hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-black">
                              {opt.instagram_username.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-700">@{opt.instagram_username}</div>
                              <div className="text-[10px] text-gray-400 font-medium">연결 가능</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={async () => {
                              try {
                                // 1. 중복 체크

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

                                // 2. 계정 연결 진행
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
                            }}
                            className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-lg text-[11px] font-black hover:bg-gray-900 hover:text-white transition-all"
                          >
                            연결하기
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Empty State */}
                    {!customerStatus?.instagram_account && accountOptions.length === 0 && (
                      <tr>
                        <td colSpan="2" className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                              <Instagram className="w-8 h-8 text-gray-200" />
                            </div>
                            <p className="text-gray-400 font-bold">연결된 계정이 내역이 없습니다.</p>
                            <Button onClick={handleInstagramLogin} variant="outline" size="sm" className="rounded-xl font-black">지금 연결하기</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>


            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFlowDeleteConfirmModal = () => {
    if (!showFlowDeleteConfirm) return null;
    return (
      <div
        className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md flex justify-center"
        onClick={(e) => e.target === e.currentTarget && setShowFlowDeleteConfirm(false)}
      >
        <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
          <Card className="bg-white rounded-[2.5rem] shadow-2xl border-none p-8 text-center pointer-events-auto overflow-hidden relative h-fit my-auto max-w-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="p-5 bg-red-50 rounded-[2rem] w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Trash2 className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">플로우를 삭제하시겠습니까?</h3>
            <p className="text-gray-500 font-bold leading-relaxed mb-10 px-4">삭제된 플로우는 복구할 수 없으며, 모든 자동 응답이 즉시 중단됩니다.</p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowFlowDeleteConfirm(false)}
                className="flex-1 h-14 bg-gray-50 border-gray-100 text-gray-500 rounded-2xl text-base font-black hover:bg-gray-100 hover:text-gray-900 transition-all border-none"
              >
                취소
              </Button>
              <Button
                onClick={executeDeleteFlow}
                disabled={isDeletingFlow}
                className="flex-1 h-14 bg-gray-900 text-white rounded-2xl text-base font-black hover:bg-black shadow-xl shadow-gray-200 transition-all active:scale-95 border-none disabled:opacity-50"
              >
                {isDeletingFlow ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  '삭제하기'
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderConversationDeleteModal = () => {
    if (!showConversationDeleteModal) return null;
    return (
      <div
        className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md flex justify-center"
        onClick={(e) => e.target === e.currentTarget && (!isDeletingConversation && setShowConversationDeleteModal(false))}
      >
        <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
          <Card className="bg-white rounded-[2.5rem] shadow-2xl border-none p-8 text-center pointer-events-auto overflow-hidden relative h-fit my-auto max-w-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="p-5 bg-red-50 rounded-[2rem] w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Trash2 className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">채팅방을 삭제하시겠습니까?</h3>
            <p className="text-gray-500 font-bold leading-relaxed mb-10 px-4">이 작업은 취소할 수 없습니다. 채팅방과 모든 메시지 내역이 즉시 영구 삭제됩니다.</p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => !isDeletingConversation && setShowConversationDeleteModal(false)}
                disabled={isDeletingConversation}
                className="flex-1 h-14 bg-gray-50 border-gray-100 text-gray-500 rounded-2xl text-base font-black hover:bg-gray-100 hover:text-gray-900 transition-all border-none disabled:opacity-50"
              >
                취소
              </Button>
              <Button
                onClick={executeDeleteConversation}
                disabled={isDeletingConversation}
                className="flex-1 h-14 bg-red-600 text-white rounded-2xl text-base font-black hover:bg-red-700 shadow-xl shadow-red-200 transition-all active:scale-95 border-none disabled:opacity-50"
              >
                {isDeletingConversation ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  '삭제하기'
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirm || !keywordToDelete) return null;

    return (
      <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-start justify-center p-4 pt-12 md:pt-32 animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-red-50 animate-in zoom-in-95 duration-200 h-fit relative pointer-events-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-red-50/50">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>

            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">정말로 삭제하시겠습니까?</h2>
            <p className="text-gray-500 font-bold mb-8 text-sm px-4">
              키워드 <span className="text-red-500 font-black">"{keywordToDelete.keyword}"</span> 설정이 영구적으로 삭제됩니다.<br />삭제 후에는 복구할 수 없습니다.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setKeywordToDelete(null);
                }}
                className="h-14 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all border border-gray-100"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  const updated = keywordReplies.filter(r => r !== keywordToDelete);
                  setKeywordReplies(updated);
                  setShowDeleteConfirm(false);
                  setKeywordToDelete(null);
                  await saveKeywordSettings(updated);
                }}
                className="h-14 bg-red-500 text-white rounded-2xl font-black text-base shadow-lg shadow-red-200 hover:bg-red-600 transition-all active:scale-[0.98]"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModerationConfirmModal = () => {
    if (!showDeleteConfirmModal) return null;

    const isDelete = moderationActionType === 'DELETE';
    const count = idsToConfirmDelete.length;

    return (
      <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-start justify-center p-4 pt-12 md:pt-32 animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-gray-100 animate-in zoom-in-95 duration-200 h-fit relative pointer-events-auto">
          <div className="flex flex-col items-center text-center">
            <div className={`w-20 h-20 ${isDelete ? 'bg-red-50 ring-red-50/50' : 'bg-indigo-50 ring-indigo-50/50'} rounded-3xl flex items-center justify-center mb-6 ring-8`}>
              {isDelete ? (
                <Trash2 className="w-10 h-10 text-red-500" />
              ) : (
                <EyeOff className="w-10 h-10 text-indigo-500" />
              )}
            </div>

            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
              {count}개의 댓글을 {isDelete ? '삭제' : '숨김'}하시겠습니까?
            </h2>
            <p className="text-gray-500 font-bold mb-8 text-sm px-4 leading-relaxed">
              {isDelete 
                ? '삭제된 댓글은 인스타그램에서 영구히 사라지며 복구할 수 없습니다.' 
                : '숨겨진 댓글은 작성자와 본인에게만 보이며, 타인에겐 노출되지 않습니다.'}
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                disabled={isModerationActionLoading}
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setIdsToConfirmDelete([]);
                }}
                className="h-14 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all border border-gray-100 disabled:opacity-50"
              >
                취소
              </button>
              <button
                disabled={isModerationActionLoading}
                onClick={handleModerationAction}
                className={`h-14 ${isDelete ? 'bg-red-500 shadow-red-200 hover:bg-red-600' : 'bg-indigo-500 shadow-indigo-200 hover:bg-indigo-600'} text-white rounded-2xl font-black text-base shadow-lg transition-all active:scale-[0.98] flex items-center justify-center`}
              >
                {isModerationActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  '확인'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const renderDisconnectConfirmModal = () => {
    return (
      <div
        className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md flex justify-center"
        onClick={(e) => e.target === e.currentTarget && setShowDisconnectConfirm(false)}
      >
        <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
          <Card className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl scale-in-center overflow-hidden border-none p-8 text-center pointer-events-auto h-fit my-auto">
            <div className="p-4 bg-red-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <LogOut className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tighter">연결을 해제하시겠습니까?</h3>
            <p className="text-sm text-gray-600 font-bold leading-relaxed mb-8">인스타 연결 해제 시 자동화 및 분석 기능이 중단됩니다.</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-200 transition-all"
              >
                취소
              </Button>
              <Button
                onClick={handleDisconnectAccount}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
              >
                해제하기
              </Button>
            </div>
          </Card>
        </div>
      </div>
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

  const renderTransferConfirmModal = () => {
    return (
      <div
        className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md flex justify-center"
        onClick={(e) => e.target === e.currentTarget && (setShowTransferConfirm(false), setPendingTransferPageId(null))}
      >
        <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
          <Card className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl scale-in-center overflow-hidden border-none p-8 text-center animate-in zoom-in-95 duration-200 pointer-events-auto h-fit my-auto">
            <div className="p-4 bg-orange-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tighter">이미 연결된 계정입니다</h3>
            <p className="text-sm text-gray-600 font-bold leading-relaxed mb-8">
              이 인스타그램 계정은 다른 AIDM 사용자에게 연결되어 있습니다.<br />내 계정으로 가져오시겠습니까?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTransferConfirm(false);
                  setPendingTransferPageId(null);
                }}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-200 transition-all"
              >
                취소
              </Button>
              <Button
                onClick={handleForcedTransfer}
                disabled={loginLoading}
                className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-orange-200"
              >
                {loginLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '네, 가져오겠습니다'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
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
            console.warn("Non-critical background data failed to load:", err);
          }
        });

      } catch (error) {
        console.error("Critical Dashboard initialization error:", error);
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
      loadContacts(customerId);
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

  // Is user effectively on a free tier (either naturally or downgraded due to expiration)
  const isFreePlan = subscriptionStatus?.plan_name === 'free' || !subscriptionStatus?.plan_name;

  // Is the user's subscription expired / past_due (was a paid user but didn't renew)
  const isExpiredPaidPlan = ['past_due', 'canceled', 'expired'].includes(subscriptionStatus?.status);

  // usageLocked means they hit their limit (e.g. 50/50 replies) — only for free plan
  const usageLocked = isFreePlan && subscriptionStatus?.usage_count >= (subscriptionStatus?.usage_limit || 50);

  // Premium features are locked for free users OR expired paid users (past_due)
  const isPremiumFeatureLocked = isFreePlan || isExpiredPaidPlan;

  // Previously this auto-redirected users, but we now use a Post-Subscription Data Retention Policy.
  // Users can view their historical dashboard data, but actions will be blocked via 'isPremiumFeatureLocked'.
  useEffect(() => {
    // Only redirect if absolutely necessary (e.g., they try to access a strictly locked route directly)
    // For now, we allow them to stay on their current view and let local components handle the block.
  }, [usageLocked, currentView, showOnboarding]);



  return (
    <div className="min-h-screen bg-white relative overflow-hidden font-sans selection:bg-purple-100">
      {pageLoading && renderLoadingScreen()}
      {renderNotification()}
      {/* Ambient Background (Matching Home) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-l from-blue-100/40 to-cyan-100/40 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150"></div>
      </div>

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-50">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left: Logo + Menu Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/assets/aidm-logo-ultra.png"
                alt="AIDM"
                className="h-16 w-auto object-contain cursor-pointer"
                onClick={() => navigate('/')}
              />
            </div>

            {/* Account Selector - Only show when connected */}
            {customerStatus?.instagram_account && (
              <div className="ml-8">
                <button
                  onClick={() => {
                    loadAccountOptions();
                    setShowAccountModal(true);
                  }}
                  className="flex items-center gap-3 px-6 py-2.5 bg-gray-50/50 border border-gray-200 rounded-[2rem] hover:bg-white hover:border-gray-300 hover:shadow-xl hover:shadow-gray-100 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">연결된 계정</span>
                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                    <span className="text-sm font-black text-gray-900 tracking-tight">
                      @{customerStatus.instagram_account.instagram_username}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-y-0.5 transition-all" />
                </button>
              </div>
            )}
          </div>


          {/* Right: Notifications + Profile */}
          <div className="flex items-center gap-3">
            {/* Subscription Status Pill (Header) with Dropdown */}
            <div className="relative" ref={subscriptionMenuRef}>
              {!subscriptionLoading && subscriptionStatus && (
                <div
                  className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:shadow-sm ${subscriptionStatus?.plan_name !== 'free'
                    ? 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                    }`}
                  onClick={() => setShowSubscriptionMenu(!showSubscriptionMenu)}
                >
                  <div className={`w-2 h-2 rounded-full ${subscriptionStatus?.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className={`text-xs font-bold ${subscriptionStatus?.plan_name !== 'free' ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {subscriptionStatus?.plan_name
                      ? (subscriptionStatus.plan_name.charAt(0).toUpperCase() + subscriptionStatus.plan_name.slice(1))
                      : 'Free Plan'}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showSubscriptionMenu ? 'rotate-180 text-indigo-600' : 'text-indigo-400'}`} />
                </div>
              )}

              {/* Subscription Dropdown Overlay */}
              {showSubscriptionMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">구독 정보</span>
                    <Badge className={subscriptionStatus?.plan_name !== 'free' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 text-slate-600'}>
                      {subscriptionStatus?.status === 'active' ? '사용 중' : '만료됨'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-2 rounded-xl bg-gray-50/50">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 font-medium">현재 플랜</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">
                          {subscriptionStatus?.plan_name?.toUpperCase() || 'FREE'} PLAN
                        </p>
                      </div>
                    </div>

                    {subscriptionStatus?.last_payment_date && (
                      <div className="px-1 space-y-1">
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-gray-500">최근 결제일</span>
                          <span className="font-semibold text-gray-900">
                            {new Date(subscriptionStatus.last_payment_date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-gray-500">결제 수단</span>
                          <span className="font-semibold text-gray-900">
                            {subscriptionStatus.payment_method === 'tosspayments'
                              ? `토스페이먼츠${subscriptionStatus.card_name ? ` (${subscriptionStatus.card_name}${subscriptionStatus.card_number ? ` ${subscriptionStatus.card_number}` : ''})` : ''}`
                              : (subscriptionStatus.payment_method || '카드결제')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setShowSubscriptionModal(true);
                        setShowSubscriptionMenu(false);
                      }}
                      className="w-full py-2 px-3 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      구독 및 결제 상세 관리
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={notificationMenuRef}>
              <button
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className={`relative p-2 rounded-lg transition-colors ${showNotificationMenu ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <Bell className="w-5 h-5" />
                {activities?.some(a => ['HUMAN_INTERVENTION_NEEDED', 'AUTH_ERROR', 'SALES_OPPORTUNITY', 'SYSTEM_ALERT'].includes(a.event_type)) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-bounce border-2 border-white shadow-sm"></span>
                )}
              </button>

              {showNotificationMenu && (
                <div className="absolute right-0 mt-3 w-[360px] bg-white border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">알림</h3>
                  </div>

                  <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                    {(() => {
                      const displayAlerts = activities?.filter(a =>
                        a.event_type === 'HUMAN_INTERVENTION_NEEDED' ||
                        a.event_type === 'AUTH_ERROR' ||
                        a.event_type === 'SALES_OPPORTUNITY' ||
                        a.event_type === 'SYSTEM_ALERT'
                      ) || [];

                      if (displayAlerts.length > 0) {
                        return (
                          <div className="divide-y divide-gray-50">
                            {displayAlerts.map((alert) => {
                              const isUrgent = alert.type === 'URGENT' || alert.event_type === 'HUMAN_INTERVENTION_NEEDED' || alert.event_type === 'AUTH_ERROR';
                              const isSales = alert.type === 'SALES' || alert.event_type === 'SALES_OPPORTUNITY';
                              const isSystem = alert.type === 'SYSTEM' || alert.event_type === 'SYSTEM_ALERT';

                              return (
                                <div
                                  key={alert.id}
                                  className={`p-4 transition-colors cursor-pointer group border-l-4 ${isUrgent ? 'hover:bg-red-50/30 border-red-500' :
                                    isSales ? 'hover:bg-emerald-50/30 border-emerald-500' :
                                      isSystem ? 'hover:bg-amber-50/30 border-amber-500' :
                                        'hover:bg-indigo-50/30 border-indigo-500'
                                    }`}
                                  onClick={() => {
                                    if (!alert.id.startsWith('demo') && alert.contact_id) {
                                      setSelectedContact({ id: alert.contact_id });
                                      setCurrentView('dashboard');
                                    }
                                    setShowNotificationMenu(false);
                                  }}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-black text-gray-900">{alert.contact_username ? `@${alert.contact_username}` : 'System'}</span>
                                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-0 font-bold uppercase ${isUrgent ? 'bg-red-50 text-red-700' :
                                            isSales ? 'bg-emerald-50 text-emerald-700' :
                                              isSystem ? 'bg-amber-50 text-amber-700' :
                                                'bg-indigo-50 text-indigo-700'
                                            }`}>
                                            {alert.event_type === 'AUTH_ERROR' ? 'AUTH' : (alert.type || 'Activity')}
                                          </Badge>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium tabular-nums">
                                          {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <p className={`text-[13px] font-bold leading-snug line-clamp-2 mb-1.5 ${isUrgent ? 'text-red-700' :
                                        isSales ? 'text-emerald-700' :
                                          isSystem ? 'text-amber-700' :
                                            'text-indigo-700'
                                        }`}>
                                        {alert.action_text}
                                      </p>
                                      {alert.trigger_text && (
                                        <div className={`rounded-lg p-2 border ${isUrgent ? 'bg-white/50 border-red-100/50' :
                                          isSales ? 'bg-white/50 border-emerald-100/50' :
                                            isSystem ? 'bg-white/50 border-amber-100/50' :
                                              'bg-white/50 border-indigo-100/50'
                                          }`}>
                                          <p className="text-[11px] text-gray-500 font-medium truncate italic">
                                            "{alert.trigger_text}"
                                          </p>
                                        </div>
                                      )}

                                      {alert.event_type === 'AUTH_ERROR' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentView('settings');
                                            setShowNotificationMenu(false);
                                          }}
                                          className="mt-2 w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-md transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                        >
                                          <i className="fa-solid fa-link"></i>
                                          계정 다시 연결하기
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return (
                        <div className="py-12 px-6 text-center">
                          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-6 h-6 text-gray-200" />
                          </div>
                          <p className="text-sm font-bold text-gray-400">새로운 알림이 없습니다.</p>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="p-3 bg-gray-50/50 border-t border-gray-50">
                    <Button
                      variant="ghost"
                      className="w-full text-[11px] font-bold text-gray-500 hover:text-indigo-600 py-1"
                      onClick={() => setShowNotificationMenu(false)}
                    >
                      알림 닫기
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-base font-medium">
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{customerStatus?.email || displayName}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-red-50 flex items-center gap-2 text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <aside
        className={`fixed left-0 top-16 bottom-0 bg-white shadow-sm z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'
          }`}
      >
        <div className="h-full overflow-y-auto py-4">
          {menuItems.map((item, index) => {
            const isLocked = showOnboarding && item.view !== 'dashboard';
            const isActive = currentView === item.view;

            return (
              <button
                key={index}
                onClick={() => {
                  if (isLocked) return;

                  // NEW: Usage Limit Blocking Logic REMOVED (Replaced by persistent banner inside main content)
                  // messagingAllowed currently checks integration_status === 'APPROVED'
                  // We also check if instagram account is connected (page_id is no longer strictly required for DMs).
                  if (item.requiresApproval && !customerStatus?.instagram_account) {
                    // If not connected, we should probably just show onboarding or do nothing
                    // Let's just return for now as onboarding is handled by showOnboarding flag
                    return;
                  }
                  setCurrentView(item.view);
                }}
                disabled={(item.requiresApproval && !customerStatus?.instagram_account) || (isLocked && isActive)}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-all relative group ${isActive
                  ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-600'
                  : 'hover:bg-gray-50'
                  } ${((item.requiresApproval && !customerStatus?.instagram_account) || isLocked) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0 ${isLocked ? 'grayscale' : ''}`} />
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                    <div className="flex items-center justify-center gap-2 w-full">
                      <div className="text-sm font-medium text-gray-700 text-center">{item.label}</div>
                      {isLocked && <Lock className="w-3 h-3 text-gray-400" />}
                      {item.isNew && (
                        <Badge className="bg-indigo-600 text-[10px] text-white px-1.5 py-0 border-none scale-75 animate-bounce">NEW</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5 text-center w-full">{item.description}</div>
                    {item.requiresApproval && !messagingAllowed && (
                      <div className="text-[10px] text-amber-600 mt-0.5 text-center w-full">승인 필요</div>
                    )}
                  </div>
                )}
                {!sidebarCollapsed && item.badge && !isLocked && (
                  <Badge className="ml-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white flex-shrink-0">
                    {item.badge}
                  </Badge>
                )}
                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    <div className="font-medium flex items-center gap-2">
                      {item.label}
                      {isLocked && <Lock className="w-3 h-3 text-gray-400" />}
                    </div>
                    <div className="text-xs text-gray-300 mt-1">{item.description}</div>
                    {item.requiresApproval && !messagingAllowed && (
                      <div className="text-xs text-amber-400 mt-1">승인 필요</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'pl-16' : 'pl-60'}`}>
        <div className="p-6 relative z-10 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-64px)] flex flex-col">

          {/* Usage Exhaustion or Membership Expired Warning Banner */}
          {(usageLocked || isExpiredPaidPlan) && currentView !== 'subscription' && (
            <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-2xl p-4 shadow-xl mb-6 flex items-center justify-between border border-red-400 group relative overflow-hidden animate-in slide-in-from-top-4 duration-500 fade-in cursor-pointer" onClick={() => setCurrentView('subscription')}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg mb-0.5 tracking-tight flex items-center gap-2">
                    {isExpiredPaidPlan ? '멤버십 기간 만료 / 결제 수단 확인 필요' : '🚨 당월 무료 한도(50건) 소진'}
                  </h3>
                  <p className="text-red-50 text-sm font-medium opacity-90">
                    {isExpiredPaidPlan
                      ? '멤버십 기간이 종료되어 모든 자동화 기능이 중지되었습니다. 서비스를 계속 이용하시려면 플랜을 갱신해 주세요.'
                      : '자동 답장 봇 기능이 일시 중지되었습니다. 끊김 없는 자동화를 위해 무제한 플랜으로 업그레이드하세요. 과거 기록은 정상적으로 조회 가능합니다.'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="relative z-10 bg-white/10 hover:bg-white text-white hover:text-red-600 border-white/30 h-10 px-6 rounded-xl font-bold transition-all shadow-sm group-hover:shadow-md border-transparent whitespace-nowrap hidden md:flex items-center"
              >
                {isExpiredPaidPlan ? '멤버십 갱신하기' : '무제한 플랜 열기'} <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
              </Button>
            </div>
          )}

          {/* Business Connection Required Banner Removed - Unified with main login */}

          {/* Messaging eligibility banner (Show if Page connected but not admin approved) */}
          {!showOnboarding && pageConnected && !messagingAllowed && (
            <Card className="border border-amber-200 bg-amber-50/50 mb-8 rounded-2xl">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">
                    관리자 승인 대기 중
                  </p>
                  <p className="text-sm text-amber-700 font-medium tracking-tight">
                    {eligibilityLoading ? '승인 상태 확인 중...' : (safeString(messagingDetail) || '계정 연결은 완료되었습니다. 관리자 승인 후 모든 기능을 사용할 수 있습니다.')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dynamic Content based on currentView */}
          {(showOnboarding && currentView !== 'subscription') ? (
            renderOnboarding()
          ) : (
            <>
              {currentView === 'dashboard' && renderDashboard()}
              {currentView === 'insights' && renderInsights()}
              {currentView === 'comments' && renderComments()}
              {currentView === 'aiguard' && renderAiGuard()}
              {currentView === 'inbox' && renderInbox()}
              {currentView === 'automation' && renderAutomationCenter()}
              {currentView === 'contacts' && renderContacts()}
              {currentView === 'templates' && renderTemplates()}
              {currentView === 'keywordsettings' && renderKeywordSettings()}
              {currentView === 'aisettings' && renderAiSettings()}
              {currentView === 'stylelab' && renderAiViralPostMaker()}
              {currentView === 'subscription' && renderSubscription()}
            </>
          )}

        </div>
      </main>

      {showScenarioModal && renderScenarioModal()}
      {showFlowModal && renderFlowModal()}
      {showAiKbModal && renderAiKbModal()}
      {showAccountModal && renderAccountModal()}
      {renderFlowDeleteConfirmModal()}
      {renderConversationDeleteModal()}
      {showDisconnectConfirm && renderDisconnectConfirmModal()}
      {showTransferConfirm && renderTransferConfirmModal()}
      {renderEmergencyModal()}
      {renderDeleteConfirmModal()}
      {renderModerationConfirmModal()}

      {/* Customer Detail Modal - Root level for full screen dimming and sidebar overlay */}
      <ContactDetailModal
        contact={selectedContact}
        isOpen={!!selectedContact}
        onClose={() => setSelectedContact(null)}
      />

      {/* Subscription Modal Overlay - Root level for layout isolation */}
      {showSubscriptionModal && (
        <div
          className="fixed inset-0 z-[1110] bg-black/60 backdrop-blur-md overflow-y-auto overflow-x-hidden custom-scrollbar animate-in fade-in duration-300"
          onClick={(e) => e.target === e.currentTarget && setShowSubscriptionModal(false)}
        >
          {/* Modal Content - Scrollable container for the Subscription component */}
          <div 
            className="min-h-full px-4 md:px-8 py-12 pb-24 md:pb-32 flex justify-center items-center"
            onClick={(e) => e.target === e.currentTarget && setShowSubscriptionModal(false)}
          >
            <div className="relative w-full max-w-5xl pointer-events-auto h-fit">
              <div className="shadow-2xl rounded-[3rem]">
                <Subscription
                  customerId={customerId}
                  subscriptionStatus={subscriptionStatus}
                  showNotify={showNotify}
                  onClose={() => setShowSubscriptionModal(false)}
                  onSwitchView={setCurrentView}
                  variant="modal"
                />
              </div>
            </div>
          </div>
        </div>
      )}
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
