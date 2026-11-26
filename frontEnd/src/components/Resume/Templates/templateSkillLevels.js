/*
  Which resume templates print the level of each skill (Novice ... Expert), and how.

    skillLevelDisplay(templateId)   'words' | 'visual' | 'none'
        words    the level is printed as a word next to the skill ("Leadership (Novice)", "Leadership · Novice")
        visual   the level is drawn as dots, bars or a filled pill (one dot of five is Novice); the word is only a tooltip
        none     the skills are plain text: the template never shows a level
    showsSkillLevels(templateId)    true unless 'none'
    TEMPLATES_WITHOUT_SKILL_LEVELS  [{ id, name }] for the advice on the Skills step

  Read off the templates themselves (what each Skills section renders), and kept here as plain data so the Skills step can
  warn about a Novice skill without rendering anything. When a template is added, add one line below; an unknown id counts
  as 'visual', which is the cautious answer (the person is warned rather than left unaware).
*/

export const SKILL_LEVEL_DISPLAY = {
  'blue-sidebar': { name: 'Sidebar', shows: 'words' },
  'copper-studio': { name: 'Studio', shows: 'words' },
  'olive-heritage': { name: 'Heritage', shows: 'words' },
  'magenta-vivid': { name: 'Vivid', shows: 'words' },
  'umber-scholar': { name: 'Scholar', shows: 'words' },
  'violet-gallery': { name: 'Gallery', shows: 'words' },
  'basic-classic': { name: 'Basic Classic', shows: 'words' },
  'basic-centered': { name: 'Basic Centered', shows: 'words' },
  'basic-split': { name: 'Basic Split', shows: 'words' },
  'basic-sidebar': { name: 'Basic Sidebar', shows: 'words' },

  'green-header': { name: 'Accent', shows: 'visual' },
  'pink-header': { name: 'Modern', shows: 'visual' },
  'dark-top': { name: 'Professional', shows: 'visual' },
  'burgundy-executive': { name: 'Executive', shows: 'visual' },
  'steel-minimal': { name: 'Minimal', shows: 'visual' },
  'forest-classic': { name: 'Classic', shows: 'visual' },
  'charcoal-compact': { name: 'Compact', shows: 'visual' },
  'indigo-creative': { name: 'Creative', shows: 'visual' },
  'plum-elegant': { name: 'Elegant', shows: 'visual' },
  'cobalt-contemporary': { name: 'Contemporary', shows: 'visual' },
  'cyan-metro': { name: 'Metro', shows: 'visual' },
  'sky-nordic': { name: 'Nordic', shows: 'visual' },
  'slate-refined': { name: 'Refined', shows: 'visual' },
  'midnight-corporate': { name: 'Corporate', shows: 'visual' },
  'emerald-fresh': { name: 'Fresh', shows: 'visual' },
  'rose-graceful': { name: 'Graceful', shows: 'visual' },
  'sage-serene': { name: 'Serene', shows: 'visual' },
  'denim-editorial': { name: 'Editorial', shows: 'visual' },
  'orchid-boutique': { name: 'Boutique', shows: 'visual' },

  'teal-timeline': { name: 'Timeline', shows: 'none' },
  'crimson-bold': { name: 'Bold', shows: 'none' },
  'gold-prestige': { name: 'Prestige', shows: 'none' },
  'khaki-pioneer': { name: 'Pioneer', shows: 'none' },
  'stone-journal': { name: 'Journal', shows: 'none' },
  'basic-compact': { name: 'Basic Compact', shows: 'none' },
};

export const skillLevelDisplay = (templateId) => (SKILL_LEVEL_DISPLAY[templateId] ? SKILL_LEVEL_DISPLAY[templateId].shows : 'visual');

export const showsSkillLevels = (templateId) => skillLevelDisplay(templateId) !== 'none';

export const templateName = (templateId) => (SKILL_LEVEL_DISPLAY[templateId] ? SKILL_LEVEL_DISPLAY[templateId].name : 'this');

// Plain-text templates first: they read cleanest to an ATS as well as to a person.
const PREFERRED_WITHOUT_LEVELS = ['stone-journal', 'gold-prestige', 'khaki-pioneer', 'crimson-bold', 'teal-timeline'];
export const TEMPLATES_WITHOUT_SKILL_LEVELS = PREFERRED_WITHOUT_LEVELS.map((id) => ({ id, name: SKILL_LEVEL_DISPLAY[id].name }));
