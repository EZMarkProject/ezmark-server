import { pdfToPng } from "pdf-to-png-converter"

export default async function pdf2png(pdfPath: string, outputFolder: string) {
    await pdfToPng(pdfPath, {
        viewportScale: 3,
        outputFolder,
        outputFileMaskFunc: (pageNumber) => `page-${pageNumber - 1}.png`,
    })
    console.log('PDF -> PNG done')
}