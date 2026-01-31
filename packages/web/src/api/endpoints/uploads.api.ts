import { apiClient } from '../client';

interface UploadResponse {
  url: string;
  filename: string;
}

export const uploadsApi = {
  image: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post<UploadResponse>('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
