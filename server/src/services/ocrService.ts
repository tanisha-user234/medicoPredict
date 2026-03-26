import Tesseract from 'tesseract.js'

export const extractTextFromImage= async (imageBuffer:Buffer):Promise<string>=>{
    try {
        const { data:{text}}=await Tesseract.recognize(imageBuffer,
            'eng',{
                logger:m=>console.log(`Progress ${m}`)
            }
        )
        //we are removing blank spaces and extra characters
        const cleanText= text.trim().replace('/\n\g',"");

        console.log(`Text extracted ${cleanText.substring(0,50)}....`);
        return cleanText;
    } catch (error) {
        console.error(`OCR Error ${error}`);
        throw new Error('Failed to extract text fromt the image');
    }
}