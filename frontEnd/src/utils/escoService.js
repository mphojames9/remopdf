/**
 * Fetches skills and achievements based on an array of job titles from the ESCO API.
 * Mirrored directly from the working vanilla HTML implementation.
 */
export const fetchEscoSuggestions = async (titles) => {
  if (!titles || titles.length === 0) return { skills: [], achievementsMap: {} };

  const uniqueTitles = [...new Set(titles.filter(t => typeof t === 'string' && t.trim().length > 2))];
  const suggestedSkills = new Set();
  const achievementsMap = {};

  for (const title of uniqueTitles) {
    try {
      // Step 1: Search for the occupation (Identical to HTML performSearch)
      const searchUrl = `https://ec.europa.eu/esco/api/search?text=${encodeURIComponent(title)}&type=occupation&language=en`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!searchRes.ok) throw new Error(`ESCO Search failed: ${searchRes.status}`);
      const searchData = await searchRes.json();

      // Find the results array using the HTML's safe extraction logic
      let items = [];
      if (searchData._embedded) {
          const embeddedKeys = Object.keys(searchData._embedded);
          for (let key of embeddedKeys) {
              if (Array.isArray(searchData._embedded[key])) {
                  items = searchData._embedded[key];
                  break;
              }
          }
      } else if (Array.isArray(searchData)) {
          items = searchData;
      }

      if (items.length === 0) continue;

      // Grab the URI of the top match
      const uri = items[0].uri;

      // Step 2: Fetch the specific occupation details (Identical to HTML fetchSkills)
      const occUrl = `https://ec.europa.eu/esco/api/resource/occupation?uri=${encodeURIComponent(uri)}&language=en`;
      const occRes = await fetch(occUrl, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!occRes.ok) throw new Error(`ESCO Occupation fetch failed: ${occRes.status}`);
      const occData = await occRes.json();

      // Extract skills using the HTML's exact link paths
      const essentialSkills = occData._links?.hasEssentialSkill || [];
      const optionalSkills = occData._links?.hasOptionalSkill || [];

      // Normalize in case the API returns a single object instead of an array
      const essArray = Array.isArray(essentialSkills) ? essentialSkills : [essentialSkills];
      const optArray = Array.isArray(optionalSkills) ? optionalSkills : [optionalSkills];
      const allSkills = [...essArray, ...optArray];

      const roleAchievements = [];

      // Sort titles into skills vs bullet points based on length
      allSkills.forEach(skill => {
        if (skill && skill.title) {
          const skillText = skill.title;
          if (skillText.length < 40) {
            suggestedSkills.add(skillText);
          } else {
            // Capitalize first letter for a resume bullet point
            roleAchievements.push(skillText.charAt(0).toUpperCase() + skillText.slice(1));
          }
        }
      });
      
      if (roleAchievements.length > 0) {
        achievementsMap[title] = roleAchievements;
      }

    } catch (error) {
      console.error(`ESCO API Error for "${title}":`, error);
    }
  }

  return { 
    skills: Array.from(suggestedSkills), 
    achievementsMap 
  };
};