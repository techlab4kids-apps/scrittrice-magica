export const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

export const sanitizeFilename = (name: string): string => {
  if (!name || name.trim() === '') {
    return `storia-${Date.now()}`;
  }
  // Strip HTML, remove special characters, replace spaces, and limit length.
  const stripped = stripHtml(name);
  const sanitized = stripped
    .toLowerCase()
    .replace(/\s+/g, '-') // replace spaces with -
    .replace(/[^\w-.]+/g, '') // remove all non-word chars except dots
    .replace(/--+/g, '-') // replace multiple - with single -
    .replace(/^-+/, '') // trim - from start of text
    .replace(/-+$/, ''); // trim - from end of text

  // Limit the length to avoid issues with filesystems
  const finalName = sanitized.substring(0, 60);

  if (finalName.trim() === '') {
    return `storia-${Date.now()}`;
  }
  
  return finalName;
};

export const formatTextWithLineBreaks = (text: string): string => {
  if (!text) return '';
  // 1. Normalize all line breaks to a single space to start fresh.
  // This removes user-entered newlines and existing <br> tags to enforce a consistent sentence-based formatting.
  const cleanedText = text.replace(/<br\s*\/?>/gi, ' ').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
  
  // 2. Add a newline character after each sentence terminator (. ! ?).
  // The regex ensures that we don't add multiple newlines if there are already spaces.
  const formattedText = cleanedText.replace(/([.!?])\s*/g, '$1\n');
  
  // 3. Convert all temporary newline characters to HTML <br/> tags.
  let finalHtml = formattedText.replace(/\n/g, '<br/>');
  
  // 4. Remove any trailing <br/> tag that might have been added to the very end of the text.
  finalHtml = finalHtml.replace(/<br\s*\/?>\s*$/g, '');

  return finalHtml;
};
