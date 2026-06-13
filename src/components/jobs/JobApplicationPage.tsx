import React, { useState } from 'react';
import JobDetail from './JobDetail';
import JobApplicationModal from './JobApplicationModal';

interface JobApplicationPageProps {
  jobId: string;
  lang?: 'es' | 'en';
}

const JobApplicationPage: React.FC<JobApplicationPageProps> = ({
  jobId,
  lang = 'es',
}) => {
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  return (
    <>
      <div
        onClick={(e) => {
          // Check if the click target is the apply button
          const target = e.target as HTMLElement;
          if (
            target?.textContent?.includes(
              lang === 'es' ? 'Aplicar ahora' : 'Apply now'
            )
          ) {
            e.preventDefault();
            setShowApplicationModal(true);
          }
        }}
      >
        <JobDetail jobId={jobId} lang={lang} />
      </div>

      <JobApplicationModal
        jobId={jobId}
        lang={lang}
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
      />
    </>
  );
};

export default JobApplicationPage;
