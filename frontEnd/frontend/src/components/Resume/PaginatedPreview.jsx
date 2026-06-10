import React, { useEffect, useState } from 'react';
import { renderToString } from 'react-dom/server';
import ResumePreview from './ResumePreview';

const PAGE_HEIGHT = 1122; // Strict A4 Height

export default function PaginatedPreview({ data, template }) {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    const rawHtml = renderToString(<ResumePreview data={data} template={template} />);
    paginate(rawHtml);
  }, [data, template]);

  const paginate = (html) => {
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.top = '0';
    temp.style.left = '-9999px';
    temp.style.width = '794px'; 
    temp.innerHTML = html;
    document.body.appendChild(temp);

    const root = temp.firstElementChild;
    if (!root) {
      document.body.removeChild(temp);
      return;
    }

    const sidebar = root.querySelector('aside');
    const main = root.querySelector('main');

    if (!sidebar || !main) {
      setPages([html]);
      document.body.removeChild(temp);
      return;
    }

    const sidebarQueue = Array.from(sidebar.children);
    const mainQueue = Array.from(main.children);

    // Remove the original root from the container so it doesn't mess with height calculations
    temp.removeChild(root);

    let pagesData = [];

    const createNewPage = () => {
      const clone = root.cloneNode(true);
      
      // CRITICAL FIX: The clone MUST be attached to the DOM to accurately measure scrollHeight
      temp.appendChild(clone);

      const cloneSidebar = clone.querySelector('aside');
      const cloneMain = clone.querySelector('main');
      
      cloneSidebar.innerHTML = '';
      cloneMain.innerHTML = '';

      // Clean up the header and summary on page 2+ so they don't duplicate
      if (pagesData.length > 0) {
        const header = clone.querySelector('header');
        if (header) header.remove();
        
        const summary = clone.querySelector('#summary-section');
        if (summary) summary.remove();
        
        // Add padding so text doesn't hit the absolute ceiling of the new page
        cloneMain.style.paddingTop = '40px';
        cloneSidebar.style.paddingTop = '40px';
      }

      const pageObj = {
        page: clone,
        sidebar: cloneSidebar,
        main: cloneMain
      };
      
      pagesData.push(pageObj);
      return pageObj;
    };

    let currentPage = createNewPage();
    let pageIndex = 0;

    const processQueue = (queue, colName) => {
      while (queue.length > 0) {
        const el = queue.shift();
        let current = pagesData[pageIndex];
        current[colName].appendChild(el);

        // Uses scrollHeight to detect overflow 
        if (current.page.scrollHeight > PAGE_HEIGHT) {
          if (current[colName].children.length === 1) {
            pageIndex++;
            if (!pagesData[pageIndex]) createNewPage();
          } else {
            current[colName].removeChild(el);
            pageIndex++;
            if (!pagesData[pageIndex]) createNewPage();
            queue.unshift(el); 
          }
        }
      }
      pageIndex = 0; 
    };

    processQueue(sidebarQueue, 'sidebar');
    processQueue(mainQueue, 'main');

    setPages(pagesData.map(p => p.page.outerHTML));
    document.body.removeChild(temp);
  };

  return (
    // Added the ID here
    <div id="premium-export-container" className="flex flex-col gap-8 items-center origin-top w-full">
      {pages.map((pageHtml, index) => (
        <div 
          key={index}
          // Added 'export-page' class here
          className="export-page bg-white shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-1 ring-slate-800/20 shrink-0 relative overflow-hidden"
          style={{ width: '794px', height: '1122px' }}
          dangerouslySetInnerHTML={{ __html: pageHtml }}
        />
      ))}
    </div>
  );
}