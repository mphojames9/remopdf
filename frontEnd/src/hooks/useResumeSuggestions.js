import { useState, useEffect } from 'react';
import { fetchEscoSuggestions } from '../utils/escoService'; 

export default function useResumeSuggestions(data) {
  const [suggestions, setSuggestions] = useState({ skills: [], achievementsMap: {} });
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const extractTitle = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object') return val.title || val.name || val.label || val.value || '';
      return '';
    };

    // 1. Get the Main Profile Title
    const rawJobTitle = data?.personalInfo?.jobTitle || data?.jobTitle || '';
    const jobTitle = extractTitle(rawJobTitle);
    
    // 2. Get ALL Experience Titles
    const currentRoles = (data?.experience || [])
      .map(exp => extractTitle(exp.role || exp.jobTitle))
      .filter(Boolean);

    // 3. Combine them all into one unique array
    const allTitles = [...new Set([...currentRoles, jobTitle].filter(t => t.trim().length > 2))];

    if (allTitles.length === 0) {
      setSuggestions({ skills: [], achievementsMap: {} });
      setIsSuggesting(false);
      return;
    }

    async function fetchAllSuggestions() {
      setIsSuggesting(true);
      try {
        const { skills, achievementsMap } = await fetchEscoSuggestions(allTitles);
        
        if (isMounted) {
          // --- NEW: Bulletproof Capitalization Helper ---
          const capitalizeFirstLetter = (str) => {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
          };

          // Capitalize every single skill
          const finalSkills = Array.isArray(skills) 
            ? skills.slice(0, 30).map(capitalizeFirstLetter) 
            : [];

          // Capitalize every single achievement bullet point
          const finalAchievementsMap = {};
          if (achievementsMap) {
            Object.keys(achievementsMap).forEach(role => {
              finalAchievementsMap[role] = achievementsMap[role].map(capitalizeFirstLetter);
            });
          }

          setSuggestions({
            skills: finalSkills,
            achievementsMap: finalAchievementsMap
          });
        }
      } catch (error) {
        console.error("ESCO API connection error:", error);
        if (isMounted) {
          setSuggestions({ skills: [], achievementsMap: {} });
        }
      } finally {
        if (isMounted) setIsSuggesting(false);
      }
    }

    const timeoutId = setTimeout(() => fetchAllSuggestions(), 1000);

    return () => {
      clearTimeout(timeoutId);
      isMounted = false;
    };
  }, [data]);

  return { suggestions, isSuggesting };
}