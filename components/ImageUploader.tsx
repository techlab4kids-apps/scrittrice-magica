import React, { useState, useRef } from 'react';
import { ImageIcon } from './icons/ImageIcon';

interface ImageUploaderProps {
  title: string;
  onFileSelect: (file: File | null) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ title, onFileSelect }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File | null | undefined) => {
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      onFileSelect(null);
      setPreview(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0]);
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-800 mb-2">{title}</h3>
      <div 
        onClick={handleAreaClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors bg-gray-50 ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-500'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        {preview ? (
          <img src={preview} alt="Anteprima" className="h-full w-full object-cover rounded-md" />
        ) : (
          <div className="text-center text-gray-500 pointer-events-none">
            <ImageIcon className="mx-auto h-12 w-12" />
            <p>Trascina un'immagine qui</p>
            <p className="text-sm">o clicca per caricarla</p>
            <p className="text-xs mt-1">PNG, JPG, WEBP</p>
          </div>
        )}
      </div>
    </div>
  );
};