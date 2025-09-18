export interface StoryPage {
  text: string;
  imageUrl: string;
  imagePrompt: string; // The base prompt from text generation
  imagePromptHistory: string[]; // A history of all prompts used for image generation
  imageStatus: 'pending' | 'generating' | 'done' | 'error';
  imageError?: string | null;
  textAlign?: 'left' | 'center' | 'right';
  textStyle?: {
    fontFamily: string;
    fontSize: string;
    textTransform: 'none' | 'uppercase' | 'lowercase';
  };
}

export interface PromptData {
  themes: string;
  otherElements: string;
  targetAge: string;
  bookStyle: 'toddler' | 'classic' | 'comic' | 'photo';
  author: string;
  license: string;
  referenceImageUrls: {
    style: string | null;
    character: string | null;
  };
  textStyle: {
    fontFamily: string;
    fontSize: string;
    textTransform: 'none' | 'uppercase' | 'lowercase';
  };
  autoGenerateImages?: boolean;
  // New fields for flexible story input
  storyInputMode: 'generate' | 'custom';
  pageCount?: string; // e.g., "5-7"
  customTitle?: string;
  customText?: string;
}

export interface StoryProject {
  promptData: PromptData;
  pages: StoryPage[];
  createdAt: string;
  version: string; // e.g., "1.0.0", "1.1.0"
}
