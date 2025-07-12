export interface SavedMarkSet {
    id: string; // Unique ID, e.g., a timestamp
    name: string; // User-defined name
    indices: number[];
}

export interface CoordinateSet {
    id: string; // A hash of the coordinates string to uniquely identify it
    coords: { x: number; y: number }[];
    savedMarkSets: SavedMarkSet[];
}

export interface LibraryItem {
    id: string; // The persistent file URI, acting as a unique ID
    imageUri: string; // The persistent URI of the image in the app's directory
    originalUri: string; // The original URI from the picker, for reference
    contentHash: string; // SHA256 hash of the image file to prevent duplicates
    width: number;
    height: number;
    coordinates: CoordinateSet[];
}
