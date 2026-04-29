import React from 'react';
import { Instagram, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const AccountModal = ({
  setShowAccountModal,
  customerStatus,
  profileImage,
  setShowDisconnectConfirm,
  accountOptions,
  onLinkAccount,
  showNotify,
  handleInstagramLogin,
}) => {
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
                          onClick={() => onLinkAccount(opt)}
                          className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-lg text-[11px] font-black hover:bg-gray-900 hover:text-white transition-all"
                        >
                          연결하기
                        </button>
                      </td>
                    </tr>
                  ))}

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

export default AccountModal;
