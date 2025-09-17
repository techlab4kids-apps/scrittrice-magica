import { StoryProject } from "../types";
import { sanitizeFilename } from "../utils/textUtils";

// JSZip is loaded globally via a script tag in index.html
declare var JSZip: any;

const CURRENT_VERSION = "1.0.0";
const FILE_SIGNATURE = "TL4KB"; // Tell Me a Story for Kids Book

/**
 * Saves the story project to a local .tl4kb file.
 */
export const saveProject = (project: StoryProject) => {
    const dataToSave = {
        signature: FILE_SIGNATURE,
        version: CURRENT_VERSION,
        ...project,
    };

    const jsonString = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    
    const title = project.pages[0]?.text || 'storia';
    const filename = sanitizeFilename(title);
    a.download = `${filename}.tl4kb`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Loads a story project from a .tl4kb file.
 * This function can handle both plain JSON files and ZIP archives.
 */
export const loadProject = (file: File): Promise<StoryProject> => {
    return new Promise((resolve, reject) => {
        if (!file.name.endsWith('.tl4kb')) {
            return reject(new Error("File non valido. Seleziona un file .tl4kb"));
        }

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const buffer = event.target?.result as ArrayBuffer;
                if (!buffer || buffer.byteLength < 2) {
                    return reject(new Error("Il file è vuoto o illeggibile."));
                }

                let projectJsonText: string | null = null;
                
                // Check for ZIP file signature "PK" (0x50, 0x4B)
                const view = new Uint8Array(buffer);
                if (view[0] === 0x50 && view[1] === 0x4B) {
                    try {
                        const jszip = new JSZip();
                        const zip = await jszip.loadAsync(buffer);
                        
                        let projectFile: any = null;

                        // Create a list of candidate files, filtering out directories and system files.
                        const candidateFiles = Object.values(zip.files).filter((f: any) => 
                            !f.dir && !f.name.startsWith('__MACOSX/')
                        );

                        if (candidateFiles.length === 0) {
                            return reject(new Error("L'archivio .tl4kb è vuoto o non contiene file validi."));
                        }

                        // 1. Prioritize a file named 'story.json'.
                        projectFile = zip.file("story.json");

                        // 2. If not found, look for the first file ending in '.json'.
                        if (!projectFile) {
                            const jsonFile = candidateFiles.find((f: any) => f.name.endsWith('.json'));
                            if (jsonFile) {
                                projectFile = jsonFile;
                            }
                        }
                        
                        // 3. If still no file, and there is only one file in the zip, assume that's the one.
                        if (!projectFile && candidateFiles.length === 1) {
                            projectFile = candidateFiles[0];
                        }
                        
                        if (projectFile) {
                            projectJsonText = await projectFile.async("string");
                        } else {
                            return reject(new Error("File .tl4kb non valido. Impossibile trovare un file di progetto (es. 'story.json') all'interno dell'archivio."));
                        }
                    } catch (zipError) {
                        console.error("Error reading zip file:", zipError);
                        return reject(new Error("Impossibile leggere il file .tl4kb come archivio. Potrebbe essere corrotto."));
                    }
                } else {
                    // Not a zip file, assume it's a plain JSON text file
                    try {
                        projectJsonText = new TextDecoder().decode(buffer);
                    } catch (decodeError) {
                         console.error("Error decoding file:", decodeError);
                         return reject(new Error("Impossibile decodificare il file. Assicurarsi che sia un file di testo valido."));
                    }
                }

                if (!projectJsonText) {
                    return reject(new Error("Impossibile estrarre i dati del progetto dal file."));
                }
                
                const data = JSON.parse(projectJsonText);

                if (data.signature === FILE_SIGNATURE) {
                    // Standard, signed file format.
                    if (data.version !== CURRENT_VERSION) {
                        console.warn(`La versione del file (${data.version}) è diversa da quella dell'app (${CURRENT_VERSION}). Potrebbero esserci problemi di compatibilità.`);
                    }

                    if (!data.promptData || !Array.isArray(data.pages)) {
                         return reject(new Error("Il file di progetto è corrotto o mancano dati essenziali."));
                    }
                    
                    const project: StoryProject = {
                        promptData: data.promptData,
                        pages: data.pages,
                        createdAt: data.createdAt,
                        version: data.version,
                    };
                    resolve(project);
                } else if (data.promptData && Array.isArray(data.pages)) {
                    // This looks like a valid project object, but without the signature.
                    // Likely from an old version or from the 'Copy JSON' feature.
                    console.warn("Caricamento di un file di progetto senza firma. Si presume un formato legacy valido.");
                    
                    const project: StoryProject = {
                        promptData: data.promptData,
                        pages: data.pages,
                        createdAt: data.createdAt || new Date().toISOString(),
                        version: data.version || '0.9.0', // Mark as legacy
                    };
                    resolve(project);
                } else {
                    // If it has neither signature nor the required project keys, it's invalid.
                    return reject(new Error("Formato file non riconosciuto. Firma del progetto non valida o dati essenziali mancanti (promptData, pages)."));
                }

            } catch (error) {
                console.error("Error parsing project file:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.toLowerCase().includes("json")) {
                     reject(new Error("Impossibile analizzare i dati del progetto. Il formato JSON interno sembra essere corrotto."));
                } else {
                     reject(new Error(`Impossibile analizzare il file di progetto. Dettagli: ${errorMessage}`));
                }
            }
        };

        reader.onerror = () => {
            reject(new Error("Impossibile leggere il file."));
        };

        // Read as ArrayBuffer to handle both text (JSON) and binary (ZIP) files
        reader.readAsArrayBuffer(file);
    });
};