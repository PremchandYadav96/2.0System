import { createWorker } from 'tesseract.js';
import Jimp from 'jimp';

export const preprocessImage = async (imageData: string) => {
  const image = await Jimp.read(imageData);
  return image
    .greyscale()
    .contrast(0.2)
    .normalize()
    .getBase64Async(Jimp.MIME_PNG);
};

export const performOCR = async (imageData: string) => {
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  
  const preprocessedImage = await preprocessImage(imageData);
  const { data: { text } } = await worker.recognize(preprocessedImage);
  
  await worker.terminate();
  return text;
};