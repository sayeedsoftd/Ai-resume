import React from 'react';
import AppLayout from './AppLayout';

/**
 * DashboardLayout wraps authenticated candidate and recruiter dashboard views
 * to ensure the left Sidebar remains persistently visible, active, and pinned.
 */
const DashboardLayout = ({ children }) => {
  return (
    <AppLayout requireSidebar={true}>
      {children}
    </AppLayout>
  );
};

export default DashboardLayout;
