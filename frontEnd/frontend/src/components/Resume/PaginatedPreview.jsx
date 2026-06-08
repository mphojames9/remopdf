import React, { useEffect, useState } from 'react';
import ResumePreview from './ResumePreview';
import { renderToString } from 'react-dom/server';

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
    temp.style.left = '-9999px'; // Render safely off-screen
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

    // Gather all chunks into queues
    const sidebarQueue = Array.from(sidebar.children);
    const mainQueue = Array.from(main.children);

    // Clear the original columns so we can clone an empty layout
    sidebar.innerHTML = '';
    main.innerHTML = '';

    const createPage = () => {
      const page = root.cloneNode(true);
      return {
        page: page,
        sidebar: page.querySelector('aside'),
        main: page.querySelector('main')
      };
    };

    let pagesData = [createPage()];

    // Engine to process columns
    const processQueue = (queue, colName) => {
      let pageIndex = 0;

      while (queue.length > 0) {
        let current = pagesData[pageIndex];
        
        // If we ran out of generated pages, create a new one
        if (!current) {
          current = createPage();
          pagesData.push(current);
        }

        // 🚨 CRITICAL FIX: Ensure ONLY the page we are measuring is actively in the DOM
        if (temp.firstChild !== current.page) {
            temp.innerHTML = '';
            temp.appendChild(current.page);
        }

        const el = queue.shift();
        current[colName].appendChild(el);

        // Check if adding this broke the height limit
        if (current.page.scrollHeight > PAGE_HEIGHT) {
            // Safety measure: if this single element is taller than a whole page, force it here
            if (current[colName].children.length === 1) {
                console.warn("Element larger than A4 page detected! Forcing placement.");
                pageIndex++;
            } else {
                // Remove it from this page, create/move to next page, and evaluate again
                current[colName].removeChild(el);
                pageIndex++;
                queue.unshift(el); 
            }
        }
      }
    };

    // Process both columns independently from Page 1 downwards!
    processQueue(sidebarQueue, 'sidebar');
    processQueue(mainQueue, 'main');

    // Extract the final HTML strings
    setPages(pagesData.map(p => p.page.outerHTML));
    document.body.removeChild(temp);
  };

  return (
    // By setting origin-top, scaling from ResumeBuilder affects this cleanly
    <div className="flex flex-col gap-8 items-center origin-top w-full">
      {pages.map((pageHtml, index) => (
        <div 
          key={index}
          className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-1 ring-slate-800/20 shrink-0 relative"
          style={{ width: '794px', height: '1123px', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: pageHtml }}
        />
      ))}
    </div>
  );
}