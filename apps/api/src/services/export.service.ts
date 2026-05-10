import { Router } from 'express';
import PdfPrinter from 'pdfmake';

const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

const printer = new PdfPrinter(fonts);

interface PdfExportRequest {
  imageDataUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor?: string;
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  multiplier: number;
}

const PAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

export const exportRouter = Router();

exportRouter.post('/pdf', async (req, res) => {
  try {
    const body: PdfExportRequest = req.body;

    if (!body.imageDataUrl) {
      res.status(400).json({ error: 'imageDataUrl is required' });
      return;
    }

    const pageSize = body.pageSize || 'a4';
    const orientation = body.orientation || 'portrait';
    const pageDims = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.a4;

    const pageWidth = orientation === 'landscape' ? pageDims.height : pageDims.width;
    const pageHeight = orientation === 'landscape' ? pageDims.width : pageDims.height;

    const margin = 40;
    const availWidth = pageWidth - margin * 2;
    const availHeight = pageHeight - margin * 2;

    const canvasAspect = body.canvasWidth / body.canvasHeight;
    let imgWidth: number;
    let imgHeight: number;

    if (canvasAspect > availWidth / availHeight) {
      imgWidth = availWidth;
      imgHeight = availWidth / canvasAspect;
    } else {
      imgHeight = availHeight;
      imgWidth = availHeight * canvasAspect;
    }

    const yOffset = (pageHeight - imgHeight) / 2 - margin;

    const docDefinition: any = {
      pageSize: { width: pageWidth, height: pageHeight },
      pageMargins: [margin, margin, margin, margin],
      content: [
        {
          image: body.imageDataUrl,
          width: imgWidth,
          height: imgHeight,
          alignment: 'center',
          margin: [0, yOffset > 0 ? yOffset : 0, 0, 0],
        },
      ],
      defaultStyle: { font: 'Roboto' },
    };

    if (body.backgroundColor && body.backgroundColor !== '#ffffff' && body.backgroundColor !== '#fff') {
      docDefinition.background = {
        canvas: [{
          type: 'rect',
          x: 0, y: 0,
          w: pageWidth,
          h: pageHeight,
          color: body.backgroundColor,
        }],
      };
    }

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const result = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="design.pdf"');
      res.setHeader('Content-Length', result.length.toString());
      res.send(result);
    });

    pdfDoc.end();
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});