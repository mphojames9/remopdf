self.options = {
    "domain": "3nbf4.com",
    "zoneId": 10291924
}
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')




async function downloadSplitZip() {
  if (isAndroidWebView()) {
    showToast(
      'Downloading pages individually is safer on Android. Use page buttons.',
      'error'
    );
    return;
  }

  if (!splitData) return;

  downloadZipBtn.disabled = true;

  /* showOverlayLoader(
    'Preparing download',
    'Packaging pages…'
  ); */

  try {
    const { sourcePdf, baseName, splitMode, totalPages } = splitData;
    const zip = new JSZip();

    const orderedWrappers = Array.from(
      splitPreview.querySelectorAll('.page-wrapper')
    );

    if (splitMode === 'all') {
      let i = 0;

      for (const wrapper of orderedWrappers) {
        i++;

        updateOverlayLoader(
          `Packaging page ${i} of ${orderedWrappers.length}`
        );

        const label = wrapper.querySelector('div:last-child');
        const pageIndex =
          parseInt(label.textContent.replace('Page', '').trim(), 10) - 1;

        if (
          isNaN(pageIndex) ||
          pageIndex < 0 ||
          pageIndex >= totalPages ||
          removedPages.has(pageIndex)
        ) continue;

        const newPdf = await PDFLib.PDFDocument.create();
        const [page] = await newPdf.copyPages(sourcePdf, [pageIndex]);
        newPdf.addPage(page);

        zip.file(
          `${baseName}_page_${String(pageIndex + 1).padStart(3, '0')}.pdf`,
          await newPdf.save()
        );
      }
    } else {
      const pages = orderedWrappers
        .map(w => {
          const label = w.querySelector('div:last-child');
          return parseInt(label.textContent.replace('Page', '').trim(), 10) - 1;
        })
        .filter(p => p >= 0 && p < totalPages && !removedPages.has(p));

      if (!pages.length) {
        showToast('No pages left to download.', 'error');
        return;
      }

      updateOverlayLoader('Packaging selected pages…');

      const newPdf = await PDFLib.PDFDocument.create();
      const copied = await newPdf.copyPages(sourcePdf, pages);
      copied.forEach(p => newPdf.addPage(p));

      zip.file(`${baseName}_pages.pdf`, await newPdf.save());
    }

    updateOverlayLoader('Finalizing ZIP…');

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_split.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    showToast('Failed to prepare ZIP.', 'error');
  } finally {
    hideOverlayLoader();
    downloadZipBtn.disabled = false;
  }
}

