import React from 'react';
import Dashboard from '../Dashboard';
import RecentActivity from '../../components/dashboard/RecentActivity';
import CareerRoadmapMentor from './CareerRoadmapMentor';
import DailySkillDrill from './DailySkillDrill';

/**
 * Candidate Dashboard
 *
 * Status badges inside "Recent Applications" card list:
 * For applications where status is 'REJECTED':
 * - Keep existing `Review Completed` badge (clickable to open rejection details/reason).
 * - Red `REJECTED` badge right beside it:
 *   <span className="px-2.5 py-1 text-xs font-semibold rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400">
 *     REJECTED
 *   </span>
 */

export const RejectedStatusBadge = () => (
  <span className="px-2.5 py-1 text-xs font-semibold rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400">
    REJECTED
  </span>
);

export { RecentActivity, CareerRoadmapMentor, DailySkillDrill };
export default Dashboard;
