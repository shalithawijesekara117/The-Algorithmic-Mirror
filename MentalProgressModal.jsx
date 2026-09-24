import React from 'react';
import ProgressChartSection from './ProgressChartSection';

export default function MentalProgressModal({ 
  isOpen, 
  onClose, 
  history = [], 
  currentAssessment = null,
  currentUser = null,
  activeHabits = null
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 120 }}>
      <div 
        className="modal-card modal-card-wide" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '1.8rem 2rem' }}
      >
        <ProgressChartSection
          history={history}
          currentAssessment={currentAssessment}
          currentUser={currentUser}
          activeHabits={activeHabits}
          isModal={true}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
