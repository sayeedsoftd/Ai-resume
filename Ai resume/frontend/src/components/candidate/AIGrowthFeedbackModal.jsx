import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import AIGrowthFeedbackCard from './AIGrowthFeedbackCard';

export default function AIGrowthFeedbackModal({
  isOpen,
  onClose,
  application,
}) {
  if (!isOpen || !application) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🌱 Candidate Growth Roadmap & Evaluation Feedback"
    >
      <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        <AIGrowthFeedbackCard
          applicationId={application.id}
          initialFeedback={application.ai_growth_feedback}
          jobTitle={application.job?.title}
          companyName={application.job?.company_name}
          defaultExpanded={true}
        />
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
          >
            Close Roadmap
          </Button>
        </div>
      </div>
    </Modal>
  );
}
