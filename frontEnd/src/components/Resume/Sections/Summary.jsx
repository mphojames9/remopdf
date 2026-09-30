import React from 'react';
import AchievementsField from './AchievementsField';

const SummarySection = ({ data, updateSummary }) => {
  if (!data) return null;

  const predefinedSummaries = [
    { id: 's1', text: 'Thorough team contributor with strong organizational capabilities. Experienced in handling numerous projects at once while ensuring accuracy.' },
    { id: 's2', text: 'Detail-oriented individual with exceptional communication and project management skills. Proven ability to handle multiple tasks effectively.' }
  ];

  const handleAddSummary = (text) => {
    const current = data.summary?.trim() || '';
    updateSummary(current === '' ? text : `${current} ${text}`);
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-32">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Briefly tell us about your background</h1>
      <p className="text-sm text-slate-500 mb-6">Choose from our pre-written examples below or write your own.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Examples Column */}
        <div className="flex flex-col gap-4">
          <div className="border border-slate-200 rounded-md bg-white overflow-hidden flex flex-col max-h-[380px]">
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Ready to use examples</span>
            </div>
            <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-2">
              {predefinedSummaries.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handleAddSummary(item.text)} 
                  className="flex items-start gap-3 p-2.5 rounded border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <button className="w-5 h-5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                    +
                  </button>
                  <p className="text-xs leading-relaxed text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor Column: bold, italic and bullets, with a live preview underneath */}
        <div className="flex flex-col">
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
