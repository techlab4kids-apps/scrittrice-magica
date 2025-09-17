export interface StoryPage {
  text: string;
  imageUrl: string;
  imagePrompt: string; // The base prompt from text generation
  finalImagePrompt?: string; // The full, final prompt used for image generation
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
}

export interface StoryProject {
  promptData: PromptData;
  pages: StoryPage[];
  createdAt: string;
  version: string;
}