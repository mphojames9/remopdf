import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'About Us', path: '/about' },
  { label: 'Trust Center', path: '/PrivacyPolicy' },
  { label: 'Contact Support', path: '/contact' }
];

export default function Terms() {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Scroll logic for navbar visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (!isMobileMenuOpen) {
        setIsNavVisible(currentScrollY < lastScrollY || currentScrollY <= 50);
      }
      setLastScrollY(currentScrollY);

      // ScrollSpy logic for Table of Contents
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          current = section.getAttribute('id');
        }
      });
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col bg-[#FAFAFA] overflow-x-hidden antialiased relative selection:bg-orange-500/30 min-w-[330px]"
      style={{ fontFamily: "'Outfit', 'Metropolis', sans-serif" }}
    >
      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[140vw] lg:max-w-7xl h-[600px] bg-gradient-to-b from-orange-400/10 via-red-400/5 to-transparent rounded-full filter blur-[120px] lg:blur-[160px] pointer-events-none"></div>

      {/* Premium Sticky Navigation */}
      <nav 
        className={`w-full flex justify-between items-center py-3 lg:py-4 px-4 lg:px-12 z-50 fixed top-0 transition-all duration-500 ease-out border-b border-slate-200/50 bg-white/70 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] ${
          isNavVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="nav-logo shrink-0 relative z-50">
          <Link to="/" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg">
            <i className="fa-solid fa-file-pdf text-red-500 text-xl lg:text-2xl drop-shadow-sm"></i>
            <span className="font-medium text-[1.1rem] lg:text-xl text-slate-900 tracking-tight">
              Remo<span className="text-[#ff2d2d] font-normal">PDF</span>
            </span>
          </Link>
        </div>
  
        <div className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((link, idx) => (
            <Link 
              key={idx}
              to={link.path} 
              className="text-[0.95rem] font-medium tracking-wide transition-colors duration-200 text-slate-500 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
  
        <div className="flex items-center gap-4 shrink-0 relative z-50">
          <Link 
            to="/resume-builder" 
            className="hidden lg:flex group relative items-center justify-center gap-2.5 px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[14px] font-bold tracking-wide shadow-[0_8px_20px_-6px_rgba(249,115,22,0.6)] hover:shadow-[0_12px_25px_-6px_rgba(249,115,22,0.8)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden isolate"
          >
            <div className="absolute inset-0 z-[-1] bg-gradient-to-r from-red-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 left-0 w-full h-full -translate-x-full group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-1000 ease-in-out z-[-1]" />
            <div className="absolute inset-0 rounded-full border border-white/20 mix-blend-overlay"></div>
            <span className="relative z-10 drop-shadow-sm">Build Resume</span>
            <i className="fa-solid fa-wand-magic-sparkles text-[12px] relative z-10 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 drop-shadow-sm"></i>
          </Link>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden relative w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200/60 backdrop-blur-md rounded-full shadow-sm hover:bg-slate-100/80 transition-colors"
          >
            <div className="flex flex-col gap-[4.5px] items-center justify-center w-5">
              <span className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 origin-center ${isMobileMenuOpen ? 'w-5 translate-y-[6.5px] rotate-45 bg-slate-900' : 'w-5'}`} />
              <span className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'w-5 opacity-100 scale-x-100'}`} />
              <span className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 origin-center ${isMobileMenuOpen ? 'w-5 -translate-y-[6.5px] -rotate-45 bg-slate-900' : 'w-5'}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer Overlay */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-sm transition-opacity duration-500" onClick={() => setIsMobileMenuOpen(false)} />
        <div className={`absolute top-0 right-0 w-full max-w-[310px] h-full bg-white/95 backdrop-blur-3xl shadow-[-25px_0_50px_-15px_rgba(15,23,42,0.06)] border-l border-slate-200/60 p-6 flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col pt-16">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 mb-6 px-1">Navigation</p>
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link, idx) => (
                <Link key={idx} to={link.path} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between text-[1.15rem] font-medium tracking-wide py-3.5 px-2 rounded-xl text-slate-800 hover:text-orange-500 hover:bg-slate-50/60 transition-all duration-200">
                  <span>{link.label}</span>
                  <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 mr-1"></i>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Legal Content Container */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 relative z-10 pt-32 lg:pt-40 pb-24 flex-1 flex flex-col lg:flex-row gap-12 items-start">
        
        {/* Sticky Table of Contents (Desktop Only) */}
        <aside className="hidden lg:block w-[280px] shrink-0 sticky top-32">
          <div className="bg-white/60 backdrop-blur-3xl border border-slate-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2rem] p-6">
            <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-slate-900 mb-6">Table of Contents</h3>
            <div className="flex flex-col gap-3 text-[13px] font-medium max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {[
                { id: 'important-notice', title: 'Important Notice' },
                { id: 'binding-arbitration', title: 'Binding Arbitration' },
                { id: 'acceptance', title: '1. Acceptance of Terms' },
                { id: 'account', title: '2. Account Registration' },
                { id: 'use', title: '3. Use of the Service' },
                { id: 'third-party', title: '4. Third-Party Services' },
                { id: 'fees', title: '5. Subscription Fees' },
                { id: 'representation', title: '6. User Representation' },
                { id: 'warranties', title: '7. Disclaimer of Warranties' },
                { id: 'liability', title: '8. Limitation of Liability' },
                { id: 'indemnification', title: '9. Indemnification' },
                { id: 'international', title: '10. International Use' },
                { id: 'dispute', title: '11. Dispute Resolution' },
                { id: 'opt-out', title: '12. Opting Out' },
                { id: 'governing-law', title: '13. Governing Law' },
                { id: 'claims', title: '14. Limitation on Claims' },
                { id: 'misc', title: '15. Miscellaneous Provisions' }
              ].map((item) => (
                <a 
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToSection(e, item.id)}
                  className={`transition-colors duration-200 line-clamp-1 ${activeSection === item.id ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Legal Document Text Area */}
        <article className="flex-1 w-full bg-white/60 backdrop-blur-3xl border border-slate-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2rem] p-6 sm:p-10 lg:p-14">
          
          <div className="mb-12 border-b border-slate-200 pb-8">
            <h1 className="text-3xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">Terms and Conditions of Use</h1>
            <p className="text-sm text-slate-500 font-medium">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="prose prose-slate prose-orange max-w-none text-[15px] leading-relaxed text-slate-600 space-y-10">

            <section id="important-notice" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-orange-500 text-lg"></i> Important Notice Regarding Automatic Renewals
              </h2>
              <p>
                This service includes subscriptions that automatically renew. Please read these terms and conditions of use (the "Terms") carefully (in particular, Section 5) before starting a trial or completing a purchase for our website's auto-renewing subscription service.
              </p>
              <p>
                To avoid being charged, you must cancel your subscription at least 24 hours before the end of your trial or current billing cycle. By purchasing an automatically renewing subscription, you acknowledge and agree to its recurring nature, as explained near the point of purchase. If you do not cancel in time, your subscription will automatically renew, and the applicable charges will be applied. Please contact our support team at <a href="mailto:support@remopdf.com" className="text-orange-600 font-semibold hover:underline">support@remopdf.com</a> for assistance.
              </p>
              <p>
                If you intend to cancel, ensure you follow the appropriate cancellation process for your platform. You may also wish to take a screenshot of this notice for future reference. More details can be found in our Subscription Terms.
              </p>
              <p>
                Our privacy practices are described in detail in our Privacy Policy. Please review it to understand how we collect, use, and share your personal information.
              </p>
            </section>

            <section id="binding-arbitration" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-gavel text-orange-500 text-lg"></i> Binding Arbitration & Dispute Resolution
              </h2>
              <p>
                Section 11 of these Terms governs how disputes between you and RemoPDF are resolved. In particular, it includes a binding arbitration agreement, which means:
              </p>
              <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
                <li>You agree to resolve disputes with us through final and binding arbitration, rather than in court, except for certain limited exceptions.</li>
                <li>You waive your right to file a lawsuit or participate in a class action lawsuit against us.</li>
                <li>You may opt out of the arbitration agreement by following the process outlined in Section 12.</li>
              </ul>
              <p>
                Please read this section carefully, as it significantly affects your legal rights.
              </p>
            </section>

            <section id="acceptance" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
              <p>
                The provisions of the “Terms” govern the relationship between you and RemoPDF (“we”, “us”, “our” or the “Company”) regarding your use of the Company’s websites, devices and related services (the “Service”), including all information, text, graphics, software, and services available for your use (the “Content”).
              </p>
              <p>
                By accessing or using any part of the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms, forming a legally binding agreement between you and the Company. If you do not agree to these Terms, you must immediately stop using the Service, delete your account, and cancel any active subscriptions.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Additional Terms and Policies</h3>
              <p>
                Our Privacy Policy forms an integral part of these Terms and describes how we collect, use, and protect your personal data. We may also post additional policies, supplemental terms, or notices on the Service from time to time. Such terms are hereby incorporated by reference and will apply to your use of the Service.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Changes to these Terms</h3>
              <p>
                We may update, modify, or remove portions of these Terms at our sole discretion, to the extent permitted by applicable law. This may occur when we introduce or discontinue features, technologies, or services, to comply with legal, regulatory, or contractual requirements, or in response to exceptional or unforeseen circumstances. Where required by law, we will notify you of such changes.
              </p>
            </section>

            <section id="account" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Account Registration</h2>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Creating an Account</h3>
              <p>
                To access certain features of the Service, you may be required to register an account ("Account") and provide accurate and complete information during the registration process.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Your Responsibilities</h3>
              <p>
                By creating an Account, you represent and warrant that: (1) the information you provide is truthful, accurate, and up to date; (2) you will update your Account information as needed to keep it accurate; (3) your use of the Service complies with all applicable laws, regulations, and these Terms.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Age Restriction</h3>
              <p>
                The Service is intended for users aged 18 and older. By creating an Account, you confirm that you are at least 18 years old and have the legal authority to enter into and comply with these Terms. If you are under 18, you are prohibited from using the Service.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Account Security</h3>
              <p>
                You are responsible for maintaining the confidentiality of your Account credentials, including login details and passwords, and for all activity conducted under your Account. You should not share your login information with anyone, as you assume full responsibility for any actions taken through your Account. If you suspect unauthorized access or a security breach, you must notify us immediately at <a href="mailto:support@remopdf.com" className="text-orange-600 hover:underline">support@remopdf.com</a>.
              </p>
            </section>

            <section id="use" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Use of the Service</h2>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Ownership and Intellectual Property</h3>
              <p>
                The Service, including its software, content, logos, trademarks, and any associated materials, remains the exclusive property of the Company or its licensors. Accessing or using the Service does not grant you ownership of any intellectual property rights beyond what is explicitly stated in these Terms. You may not copy, modify, distribute, sell, or reverse-engineer any portion of the Service unless expressly permitted.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">User-Generated Content</h3>
              <p>
                The Service may allow you to submit, upload, or share text, images, messages, feedback, and other materials ("User Content"). By submitting User Content, you grant the Company, its sublicensees, successors, and assigns a royalty-free, perpetual, irrevocable, sublicensable, assignable, worldwide license to use, reproduce, modify, adapt, translate, publish, distribute, publicly display, and create derivative works from your content in any form, media, or technology, whether now known or later developed.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Prohibited Conduct</h3>
              <p>
                You agree not to use the Service to distribute illegal, deceptive, or harmful content, impersonate another individual or misrepresent your affiliation, reverse-engineer, extract, or manipulate any part of the Service, or interfere with the security, availability, or integrity of the Service. Violation of these Terms may result in the immediate suspension or termination of your account, as well as legal consequences.
              </p>
            </section>

            <section id="third-party" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Third-Party Services, Materials, and Advertising</h2>
              <p>
                The Service may integrate, provide access to, or display content from third-party services, websites, software, advertisements, and other materials ("Third-Party Services" and "Third-Party Materials"). This includes external links, embedded content, and user-generated materials contributed by third parties. While these features may be accessible through the Service, the Company does not control or assume responsibility for the content, functionality, or policies of any Third-Party Services.
              </p>
              <p>
                By using the Service, you acknowledge that the Company does not endorse, verify, or assume responsibility for the accuracy, legality, quality, or reliability of any Third-Party Services or Third-Party Materials. Some of this content may be objectionable, offensive, or misleading, and the Company is not liable for any exposure to such material.
              </p>
            </section>

            <section id="fees" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Subscription Fees and Payment</h2>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Subscription Options and Purchases</h3>
              <p>
                The Service offers subscription-based access to its features and content, which may be purchased either directly from the Company through the Website ("Web Purchase"). All applicable subscription fees, billing terms, and durations (e.g., weekly, monthly, quarterly, annually) will be displayed on the payment screen or at checkout before payment authorization.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Auto-Renewal and Subscription Continuity</h3>
              <p>
                All subscriptions automatically renew unless canceled. The renewal period matches the initial subscription term unless otherwise disclosed at the time of purchase. To avoid renewal, you must cancel your subscription at least 24 hours before the renewal date.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Refunds</h3>
              <p>
                When you make the Web Purchase, you acknowledge and agree that all Web Purchases are non-refundable or exchangeable. Notwithstanding anything to the contrary in the foregoing, the Company will provide refunds and/or Purchase cancellations in cases and to the extent required by mandatory provisions of the applicable law.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Right of Withdrawal for EU and UK Residents</h3>
              <p>
                If you are a resident of the European Union, you have the legal right to withdraw from a contract for the purchase of digital services within 14 days of your purchase, without providing any reason and without incurring any additional costs. To exercise your right of withdrawal, you must notify us by email at <a href="mailto:support@remopdf.com" className="text-orange-600 hover:underline">support@remopdf.com</a> stating your decision to withdraw from the contract.
              </p>
            </section>

            <section id="representation" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. User Representation and Restrictions</h2>
              <p>By accessing or using the Service, you confirm that:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
                <li>You have the legal capacity to enter into and comply with these Terms.</li>
                <li>You are at least 18 years old and legally permitted to use the Service.</li>
                <li>You will not access the Service through automated or non-human means, including bots, scripts, or similar methods.</li>
                <li>You will not use the Service for any unlawful, fraudulent, or unauthorized purpose.</li>
                <li>Your use of the Service complies with all applicable laws and regulations.</li>
              </ul>
            </section>

            <section id="warranties" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. Disclaimer of Warranties</h2>
              <p className="font-semibold uppercase tracking-wide text-slate-700">General Disclaimers</p>
              <p>
                Except to the extent prohibited by law or otherwise inapplicable, you expressly acknowledge and agree that your use of the service is at your own risk. The service and any products or content provided through it are made available "as is" and "as available," without any warranties or guarantees of any kind, express or implied.
              </p>
              <p>
                In particular, we do not warrant that the service will meet your expectations or requirements, or that it will be uninterrupted, secure, error-free, or free from technical issues.
              </p>
            </section>

            <section id="liability" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, we (including our affiliates, officers, employees, agents, partners, and licensors) shall not be liable to you or any third party for any indirect, incidental, consequential, exemplary, special, or punitive damages, including but not limited to lost profits, lost data, business interruption, or any other losses arising from your use of or inability to use the service.
              </p>
              <p>
                Notwithstanding anything to the contrary herein, our total liability to you for any claims arising out of or related to your use of the service, products, or content shall be limited to the total amount paid by you to us for access to the service during the twelve (12) months immediately preceding the event giving rise to the claim.
              </p>
            </section>

            <section id="indemnification" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">9. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless the Company, along with its affiliates, officers, employees, and agents, from and against any losses, damages, liabilities, claims, demands, judgments, settlements, penalties, fines, costs, and expenses of any kind arising directly or indirectly from your User Content, your breach of these Terms, or your violation of any applicable law or third-party rights.
              </p>
            </section>

            <section id="international" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">10. International Use</h2>
              <p>
                The Company makes no representation that the Service is accessible, appropriate or legally available for use in your jurisdiction, and accessing and using the Service is prohibited from territories where doing so would be illegal. You access the Service at your own initiative and are responsible for compliance with local laws.
              </p>
            </section>

            <section id="dispute" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">11. Informal Dispute Resolution Procedures</h2>
              <p>
                Please read this provision carefully to ensure that you understand—this section controls how disputes between you and the company will be addressed. By agreeing to this provision, you are waiving your right to participate in a class action lawsuit and you are waiving your right to a jury trial.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Mandatory Pre-Filing Notice Procedure</h3>
              <p>
                You and we agree that good faith, informal efforts to resolve disputes often result in a faster, inexpensive outcome. Therefore, if you intend to assert a claim for any Dispute against the Company, you must first send the Company a written notice of the Dispute (“Notice”) that gives the Company some basic information about you and the Dispute.
              </p>
              <p>
                You must send the Notice to the Company via email at: <a href="mailto:legal@remopdf.com" className="text-orange-600 hover:underline">legal@remopdf.com</a>
              </p>
            </section>

            <section id="opt-out" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">12. Opting Out of this Arbitration Agreement</h2>
              <p>
                New Users who create an account with the Company for the first time may opt out of this Arbitration Agreement. You may opt out by sending written notice of your decision to <a href="mailto:support@remopdf.com" className="text-orange-600 hover:underline">support@remopdf.com</a> within 31 days after the Arbitration Agreement became effective or upon your first use of the Services.
              </p>
            </section>

            <section id="governing-law" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">13. Governing Law</h2>
              <p>
                The laws of the jurisdiction where RemoPDF operates, excluding its body of law governing conflicts of law principles, govern these Terms. To the extent that any action relating to any dispute hereunder is permitted to be brought in a court of law, such action will be subject to the exclusive jurisdiction of the competent courts determined by RemoPDF.
              </p>
            </section>

            <section id="claims" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">14. Limitation on Claims Period</h2>
              <p>
                You agree that, regardless of any statute or law to the contrary or any applicable dispute resolution process, any claim or cause of action arising from or related to the use of the Service or these Terms must be filed within one (1) year from the date the claim or cause of action first arose. Failure to do so will result in your claim being permanently barred.
              </p>
            </section>

            <section id="misc" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">15. Miscellaneous Provisions</h2>
              <p>
                No failure or delay by the Company in exercising any of its rights under these Terms shall be deemed a waiver of such rights. If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remainder of these Terms shall remain in full force and effect.
              </p>
              <p>
                These Terms constitute the entire agreement between you and the Company regarding the subject matter herein and supersede all prior agreements, understandings, and representations, whether written or oral.
              </p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Contact Information</h3>
                <p className="mb-2">For any inquiries, support, or to exercise your legal rights, please contact us at:</p>
                <a href="mailto:support@remopdf.com" className="text-lg font-bold text-orange-600 hover:text-orange-700 transition-colors">
                  support@remopdf.com
                </a>
              </div>
            </section>

          </div>
        </article>
      </main>

      {/* Modern Technical Footer */}
      <footer className="w-full bg-white border-t border-slate-200/60 py-6 px-4 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-400 shrink-0">
        <div>
          &copy; {new Date().getFullYear()} RemoPDF. All Rights Reserved.
        </div>
        <div className="flex items-center gap-6">
          {NAV_LINKS.map((link, idx) => (
            <Link key={idx} to={link.path} className="hover:text-slate-800 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}