import React from 'react';

const DashboardOverlays = ({
  showScenarioModal,
  renderScenarioModal,
  showPostPicker,
  renderPostPickerModal,
  showTargetPostPreview,
  renderTargetPostPreviewModal,
  showTargetPostsPreview,
  renderTargetPostsPreviewModal,
  showFlowModal,
  renderFlowModal,
  showAiKbModal,
  renderAiKbModal,
  showAccountModal,
  renderAccountModal,
  renderFlowDeleteConfirmModal,
  renderConversationDeleteModal,
  showDisconnectConfirm,
  renderDisconnectConfirmModal,
  showTransferConfirm,
  renderTransferConfirmModal,
  renderEmergencyModal,
  renderDeleteConfirmModal,
  renderModerationConfirmModal,
  renderContactDetailModal,
  renderSubscriptionModalOverlay,
  renderBasicKpiDetailModal,
}) => {
  return (
    <>
      {showScenarioModal && renderScenarioModal()}
      {showPostPicker && renderPostPickerModal()}
      {showTargetPostPreview && renderTargetPostPreviewModal()}
      {showTargetPostsPreview && renderTargetPostsPreviewModal()}
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
      {renderContactDetailModal()}
      {renderSubscriptionModalOverlay()}
      {renderBasicKpiDetailModal()}
    </>
  );
};

export default DashboardOverlays;
