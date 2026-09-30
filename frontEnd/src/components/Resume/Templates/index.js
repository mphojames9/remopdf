import BlueSidebarTemplate from './BlueSidebarTemplate';
import GreenHeaderTemplate from './GreenHeaderTemplate';
import PinkHeaderTemplate from './PinkHeaderTemplate';
import DarkTopTemplate from './DarkTopTemplate';

// One entry per template, keyed by the id that ResumeBuilder saves.
export const TEMPLATE_COMPONENTS = {
  'blue-sidebar': BlueSidebarTemplate,
  'green-header': GreenHeaderTemplate,
  'pink-header': PinkHeaderTemplate,
  'dark-top': DarkTopTemplate,
};

export const TEMPLATE_IDS = Object.keys(TEMPLATE_COMPONENTS);
export const DEFAULT_TEMPLATE = 'blue-sidebar';

export { BlueSidebarTemplate, GreenHeaderTemplate, PinkHeaderTemplate, DarkTopTemplate };
export { TemplateThumb, TEMPLATE_CARDS } from './TemplateThumbs';
export {
  IconPencil,
  IconTrash,
  PAGE_NUMBER_FORMATS,
  DEFAULT_PAGE_NUMBERS,
  normalizePageNumbers,
  PageNumberContext,
  SECTION_META,
  PAGE_WIDTH_PX,
  DEFAULT_ACCENT,
  ACCENT_SWATCHES,
} from './templateShared';
