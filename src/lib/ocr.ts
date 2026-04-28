// OCR via Tesseract.js. Loads the worker on demand and reuses it across calls.
import { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng", undefined, {
      // suppress verbose logs unless explicitly enabled
      logger: () => {},
    });
  }
  return workerPromise;
}

export async function runOcr(filePath: string): Promise<string> {
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(filePath);
    return data.text || "";
  } catch (err) {
    console.error("OCR failed:", err);
    return "";
  }
}
