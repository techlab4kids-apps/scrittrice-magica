import { jsPDF } from 'jspdf';
import { StoryProject } from '../types';
import { stripHtml, sanitizeFilename } from '../utils/textUtils';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 15;
const FONT_SIZE_TITLE = 24;
const FONT_SIZE_BODY = 12;

// Helper to fetch image and convert to base64
const getImageAsBase64 = async (url: string): Promise<string | null> => {
    if (url.startsWith('data:')) {
        return url;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok.');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error fetching or converting image:', error);
        return null; // Return null if fetching fails
    }
};

const mapFontToPdf = (fontFamily: string): string => {
    const family = fontFamily.toLowerCase();
    if (family.includes('georgia') || family.includes('serif')) {
        return 'Times-Roman';
    }
    // Use Helvetica as a robust default for sans-serif and playful fonts like Comic Sans
    return 'Helvetica';
};

export const exportToPdf = async (project: StoryProject) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    for (let i = 0; i < project.pages.length; i++) {
        const page = project.pages[i];
        const isCover = i === 0;

        if (i > 0) {
            doc.addPage('a4', 'landscape');
        }

        // --- Left side: Image ---
        const imageBase64 = await getImageAsBase64(page.imageUrl);
        if (imageBase64) {
             try {
                // Image area is the left half of the page, with margins
                const imageAreaWidth = (A4_HEIGHT_MM / 2) - (MARGIN_MM * 2);
                const imageAreaHeight = A4_WIDTH_MM - (MARGIN_MM * 2);

                const imageProperties = doc.getImageProperties(imageBase64);
                const aspectRatio = imageProperties.width / imageProperties.height;
                
                let imgWidth = imageAreaWidth;
                let imgHeight = imageAreaWidth / aspectRatio;

                if (imgHeight > imageAreaHeight) {
                    imgHeight = imageAreaHeight;
                    imgWidth = imageAreaHeight * aspectRatio;
                }

                // Center the image within its area (which starts at MARGIN_MM)
                const x = MARGIN_MM + (imageAreaWidth - imgWidth) / 2;
                const y = MARGIN_MM + (imageAreaHeight - imgHeight) / 2;

                doc.addImage(imageBase64, 'JPEG', x, y, imgWidth, imgHeight);
             } catch(e) {
                console.error("Error adding image to PDF:", e);
                doc.text("Immagine non disponibile", A4_HEIGHT_MM / 4, A4_WIDTH_MM / 2, { align: 'center' });
             }
        } else {
             doc.text("Immagine non disponibile", A4_HEIGHT_MM / 4, A4_WIDTH_MM / 2, { align: 'center' });
        }

        // --- Right side: Text ---
        const rightHalfXStart = A4_HEIGHT_MM / 2;
        const textY = A4_WIDTH_MM / 2; // Center vertically
        const textAreaWidth = rightHalfXStart - (MARGIN_MM * 2);

        const effectiveTextStyle = page.textStyle || project.promptData.textStyle;
        
        // 1. Set Font Family
        doc.setFont(mapFontToPdf(effectiveTextStyle.fontFamily));
        
        // 2. Set Font Size
        const fontSize = parseInt(effectiveTextStyle.fontSize, 10) || (isCover ? FONT_SIZE_TITLE : FONT_SIZE_BODY);
        doc.setFontSize(fontSize);
        
        // 3. Process Text for Line Breaks and HTML
        const BR_PLACEHOLDER = '[[BR]]';
        let text = page.text.replace(/<br\s*\/?>/gi, BR_PLACEHOLDER);
        text = stripHtml(text);
        text = text.replace(/\[\[BR\]\]/g, '\n');

        // 4. Apply Text Transform
        if (effectiveTextStyle.textTransform === 'uppercase') {
            text = text.toUpperCase();
        } else if (effectiveTextStyle.textTransform === 'lowercase') {
            text = text.toLowerCase();
        }
        
        const splitText = doc.splitTextToSize(text, textAreaWidth);
        
        // 5. Apply Text Alignment and calculate X coordinate
        const align = page.textAlign || (isCover ? 'center' : 'left');
        
        let textX: number;
        if (align === 'center') {
            textX = rightHalfXStart + (rightHalfXStart / 2); // Center of right half
        } else if (align === 'right') {
            textX = A4_HEIGHT_MM - MARGIN_MM; // Right edge of text area
        } else { // 'left'
            textX = rightHalfXStart + MARGIN_MM; // Left edge of text area
        }
        
        doc.text(splitText, textX, textY, { align: align, baseline: 'middle' });
    }
    
    const title = project.pages[0]?.text || 'storia';
    const filename = sanitizeFilename(title);
    doc.save(`${filename}.pdf`);
};