import React from 'react';
import AchievementsField from './AchievementsField';
import SpellCheckPanel from './SpellCheckPanel';

const SummarySection = ({ data, updateSummary }) => {
  if (!data) return null;

  return (
    <div className="max-w-[1000px] mx-auto pb-32">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Briefly tell us about your background</h1>
      <p className="text-sm text-slate-500 mb-6">Write a few sentences about your experience and strengths.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Spelling column: the live spelling and grammar check */}
        <div className="flex flex-col gap-4">
          <SpellCheckPanel text={data.summary} onChange={updateSummary} />
        </div>

        {/* Editor Column: bold, italic and bullets, with a live preview underneath */}
        <div className="flex flex-col gap-4">
          <AchievementsField
            id="summary-text"
            label="Summary"
            placeholder="Write your summary here..."
            rows={12}
            minHeightClass="min-h-[260px]"
            value={data.summary}
            onChange={updateSummary}
          />
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
