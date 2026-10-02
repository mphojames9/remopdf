import BlueSidebarTemplate from './BlueSidebarTemplate';
import GreenHeaderTemplate from './GreenHeaderTemplate';
import PinkHeaderTemplate from './PinkHeaderTemplate';
import DarkTopTemplate from './DarkTopTemplate';
import TealTimelineTemplate from './TealTimelineTemplate';
import BurgundyExecutiveTemplate from './BurgundyExecutiveTemplate';
import SteelMinimalTemplate from './SteelMinimalTemplate';
import ForestClassicTemplate from './ForestClassicTemplate';
import CharcoalCompactTemplate from './CharcoalCompactTemplate';
import IndigoCreativeTemplate from './IndigoCreativeTemplate';
import PlumElegantTemplate from './PlumElegantTemplate';
import CrimsonBoldTemplate from './CrimsonBoldTemplate';
import CobaltContemporaryTemplate from './CobaltContemporaryTemplate';
import CopperStudioTemplate from './CopperStudioTemplate';
import CyanMetroTemplate from './CyanMetroTemplate';
import OliveHeritageTemplate from './OliveHeritageTemplate';
import SkyNordicTemplate from './SkyNordicTemplate';
import MagentaVividTemplate from './MagentaVividTemplate';
import GoldPrestigeTemplate from './GoldPrestigeTemplate';
import KhakiPioneerTemplate from './KhakiPioneerTemplate';
import SlateRefinedTemplate from './SlateRefinedTemplate';
import MidnightCorporateTemplate from './MidnightCorporateTemplate';
import EmeraldFreshTemplate from './EmeraldFreshTemplate';
import UmberScholarTemplate from './UmberScholarTemplate';
import StoneJournalTemplate from './StoneJournalTemplate';
import RoseGracefulTemplate from './RoseGracefulTemplate';
import VioletGalleryTemplate from './VioletGalleryTemplate';
import SageSereneTemplate from './SageSereneTemplate';
import DenimEditorialTemplate from './DenimEditorialTemplate';
import OrchidBoutiqueTemplate from './OrchidBoutiqueTemplate';

// One entry per template, keyed by the id that ResumeBuilder saves.
export const TEMPLATE_COMPONENTS = {
  'blue-sidebar': BlueSidebarTemplate,
  'green-header': GreenHeaderTemplate,
  'pink-header': PinkHeaderTemplate,
  'dark-top': DarkTopTemplate,
  'teal-timeline': TealTimelineTemplate,
  'burgundy-executive': BurgundyExecutiveTemplate,
  'steel-minimal': SteelMinimalTemplate,
  'forest-classic': ForestClassicTemplate,
  'charcoal-compact': CharcoalCompactTemplate,
  'indigo-creative': IndigoCreativeTemplate,
  'plum-elegant': PlumElegantTemplate,
  'crimson-bold': CrimsonBoldTemplate,
  'cobalt-contemporary': CobaltContemporaryTemplate,
  'copper-studio': CopperStudioTemplate,
  'cyan-metro': CyanMetroTemplate,
  'olive-heritage': OliveHeritageTemplate,
  'sky-nordic': SkyNordicTemplate,
  'magenta-vivid': MagentaVividTemplate,
  'gold-prestige': GoldPrestigeTemplate,
  'khaki-pioneer': KhakiPioneerTemplate,
  'slate-refined': SlateRefinedTemplate,
  'midnight-corporate': MidnightCorporateTemplate,
  'emerald-fresh': EmeraldFreshTemplate,
  'umber-scholar': UmberScholarTemplate,
  'stone-journal': StoneJournalTemplate,
  'rose-graceful': RoseGracefulTemplate,
  'violet-gallery': VioletGalleryTemplate,
  'sage-serene': SageSereneTemplate,
  'denim-editorial': DenimEditorialTemplate,
  'orchid-boutique': OrchidBoutiqueTemplate,
};

export const TEMPLATE_IDS = Object.keys(TEMPLATE_COMPONENTS);
export const DEFAULT_TEMPLATE = 'blue-sidebar';

export { BlueSidebarTemplate, GreenHeaderTemplate, PinkHeaderTemplate, DarkTopTemplate, TealTimelineTemplate, BurgundyExecutiveTemplate, SteelMinimalTemplate, ForestClassicTemplate, CharcoalCompactTemplate, IndigoCreativeTemplate, PlumElegantTemplate,
  CrimsonBoldTemplate,
  CobaltContemporaryTemplate,
  CopperStudioTemplate,
  CyanMetroTemplate,
  OliveHeritageTemplate,
  SkyNordicTemplate,
  MagentaVividTemplate,
  GoldPrestigeTemplate,
  KhakiPioneerTemplate,
  SlateRefinedTemplate,
  MidnightCorporateTemplate,
  EmeraldFreshTemplate,
  UmberScholarTemplate,
  StoneJournalTemplate,
  RoseGracefulTemplate,
  VioletGalleryTemplate,
  SageSereneTemplate,
  DenimEditorialTemplate,
  OrchidBoutiqueTemplate,
};
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
