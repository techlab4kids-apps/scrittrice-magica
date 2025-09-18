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
  
  // 1. First, strip any potential HTML and normalize whitespace to have a clean string to work with.
  // This is safe because this function is used on raw text returned from the AI, not user-formatted content.
  const cleanedText = stripHtml(text).replace(/\s+/g, ' ').trim();
  
  // 2. Split the text into sentences. The regex uses a positive lookbehind `(?<=...)`
  // to split the string on spaces that are preceded by sentence-ending punctuation.
  // It handles punctuation (. ! ?) that might be inside closing quotes (' " »).
  // This prevents incorrect breaks, for example in: `"What was that?!" she asked.`
  const sentences = cleanedText.split(/(?<=[.!?]['"»]?)\s+/);
  
  // 3. Rejoin the sentences with an HTML break tag for rendering.
  return sentences.join('<br/>');
};