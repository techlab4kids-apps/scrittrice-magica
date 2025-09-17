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

export const exportToPdf = async (project: StoryProject) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    doc.setFont('Helvetica');

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
                const imageProperties = doc.getImageProperties(imageBase64);
                const aspectRatio = imageProperties.width / imageProperties.height;
                const areaWidth = (A4_HEIGHT_MM / 2) - (MARGIN_MM * 1.5);
                const areaHeight = A4_WIDTH_MM - (MARGIN_MM * 2);
                
                let imgWidth = areaWidth;
                let imgHeight = areaWidth / aspectRatio;

                if (imgHeight > areaHeight) {
                    imgHeight = areaHeight;
                    imgWidth = areaHeight * aspectRatio;
                }

                const x = MARGIN_MM + (areaWidth - imgWidth) / 2;
                const y = MARGIN_MM + (areaHeight - imgHeight) / 2;

                doc.addImage(imageBase64, 'JPEG', x, y, imgWidth, imgHeight);
             } catch(e) {
                console.error("Error adding image to PDF:", e);
                doc.text("Immagine non disponibile", MARGIN_MM + 20, A4_WIDTH_MM / 2);
             }
        } else {
             doc.text("Immagine non disponibile", MARGIN_MM + 20, A4_WIDTH_MM / 2);
        }

        // --- Right side: Text ---
        const textX = (A4_HEIGHT_MM / 2) + (A4_HEIGHT_MM / 4); // Center of the right half
        const textY = A4_WIDTH_MM / 2; // Center vertically
        const textAreaWidth = (A4_HEIGHT_MM / 2) - (MARGIN_MM * 2);

        doc.setFontSize(isCover ? FONT_SIZE_TITLE : FONT_SIZE_BODY);
        
        const text = stripHtml(page.text);
        const splitText = doc.splitTextToSize(text, textAreaWidth);
        
        doc.text(splitText, textX, textY, { align: 'center', baseline: 'middle' });
    }
    
    const title = project.pages[0]?.text || 'storia';
    const filename = sanitizeFilename(title);
    doc.save(`${filename}.pdf`);
};