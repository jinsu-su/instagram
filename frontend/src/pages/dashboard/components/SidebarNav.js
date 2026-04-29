import React from 'react';
import { Lock } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

const SidebarNav = ({
  sidebarCollapsed,
  menuItems,
  showOnboarding,
  currentView,
  customerStatus,
  messagingAllowed,
  setCurrentView,
}) => {
  return (
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
  );
};

export default SidebarNav;
