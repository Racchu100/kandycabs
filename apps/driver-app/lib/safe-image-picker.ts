export interface ImagePickerOptions {
  mediaTypes?: any;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  base64?: boolean;
}

export interface ImagePickerAsset {
  uri: string;
  width: number;
  height: number;
  type: string;
  base64?: string;
}

export const MediaTypeOptions = {
  Images: 'Images',
  All: 'All',
  Videos: 'Videos',
};

export async function requestCameraPermissionsAsync() {
  return { status: 'granted', granted: true };
}

export async function requestMediaLibraryPermissionsAsync() {
  return { status: 'granted', granted: true };
}

export interface ImagePickerResult {
  canceled: boolean;
  assets?: ImagePickerAsset[];
}

export async function launchCameraAsync(_options?: any): Promise<ImagePickerResult> {
  return {
    canceled: false,
    assets: [
      {
        uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
        width: 800,
        height: 600,
        type: 'image',
        base64: 'sample_base64_data',
      },
    ],
  };
}

export async function launchImageLibraryAsync(_options?: any): Promise<ImagePickerResult> {
  return {
    canceled: false,
    assets: [
      {
        uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
        width: 800,
        height: 600,
        type: 'image',
        base64: 'sample_base64_data',
      },
    ],
  };
}
